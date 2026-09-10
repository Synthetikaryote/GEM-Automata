"""Halo-local CI and tested-commit publication; no hosted Actions runner required."""
from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import time
import urllib.request
import uuid

REPOSITORY = "Synthetikaryote/GEM-Automata"
CONTEXT = "local/gem-automata"
PUBLIC_URL = "https://halo.tail34c017.ts.net:8443/gem-automata/"


def command(args, cwd=None, capture=False):
    result = subprocess.run([str(arg) for arg in args], cwd=cwd, check=True,
                            stdout=subprocess.PIPE if capture else None,
                            encoding="utf-8", errors="replace")
    return result.stdout.strip() if capture else ""


def git(root, *args):
    return command(["git", "-C", root, *args], capture=True)


def api(endpoint, *args):
    return json.loads(command(["gh", "api", endpoint, *args], capture=True))


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    temporary.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.replace(temporary, path)


def verify(root, commit=None, require_clean=True):
    release = json.loads((root / ".release.json").read_text(encoding="utf-8"))
    if release.get("app") != "gem-automata" or not release.get("files"):
        raise ValueError("Invalid GEM Automata release manifest")
    if commit and release["commit"] != commit:
        raise ValueError("Release commit differs from tested commit")
    if require_clean and release.get("clean") is not True:
        raise ValueError("Refusing an artifact built from uncommitted source")
    actual = {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file() and p.name != ".release.json"}
    if actual != set(release["files"]):
        raise ValueError("Release file inventory differs from manifest")
    for relative, expected in release["files"].items():
        if (root / relative).is_symlink():
            raise ValueError("Unsafe release symlink")
        target = (root / relative).resolve()
        if not target.is_relative_to(root.resolve()) or target.is_symlink():
            raise ValueError("Unsafe release path")
        if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Release hash mismatch: {relative}")
    return release


def status(sha, state, description):
    api(f"repos/{REPOSITORY}/statuses/{sha}", "--method", "POST", "-f", f"state={state}",
        "-f", f"context={CONTEXT}", "-f", f"description={description[:140]}",
        "-f", f"target_url=https://github.com/{REPOSITORY}/commit/{sha}")


def gauntlet(root):
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm:
        raise RuntimeError("npm not found")
    for args in [["ci", "--no-audit", "--no-fund"], ["run", "typecheck:host"], ["test"], ["run", "build:host"], ["run", "test:host"]]:
        print(f"GATE: npm {' '.join(args)}", flush=True)
        command([npm, *args], cwd=root)
    command([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_release.py"], cwd=root)


@contextlib.contextmanager
def lock(root):
    root.mkdir(parents=True, exist_ok=True)
    with (root / "runner.lock").open("a+b") as stream:
        stream.seek(0)
        stream.write(b"0")
        stream.flush()
        stream.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == "nt":
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)


def test_candidate(dev, automation, sha, label):
    artifact = automation / "artifacts" / sha
    receipt = automation / "passed" / f"{sha}.json"
    if receipt.is_file() and artifact.is_dir():
        try:
            verify(artifact, sha)
            proof = json.loads(receipt.read_text(encoding="utf-8"))
            if proof.get("manifest_sha256") != hashlib.sha256((artifact / ".release.json").read_bytes()).hexdigest():
                raise ValueError("CI receipt does not attest this artifact")
            print(f"REUSE tested {label}: {sha}", flush=True)
            status(sha, "success", f"{label}: local tests and hosted release passed")
            return artifact
        except (ValueError, OSError):
            raise RuntimeError(f"Cached release was modified: {artifact}; inspect it before retrying")
    worktrees = automation / "worktrees"
    worktrees.mkdir(parents=True, exist_ok=True)
    worktree = worktrees / ("run-" + uuid.uuid4().hex)
    status(sha, "pending", f"{label}: Halo local CI running")
    command(["git", "-C", dev, "worktree", "add", "--detach", worktree, sha])
    try:
        gauntlet(worktree)
        if git(worktree, "status", "--porcelain", "--untracked-files=all"):
            raise RuntimeError("Tests changed committed source")
        release = verify(worktree / ".release-build", sha)
        artifact.parent.mkdir(parents=True, exist_ok=True)
        if artifact.exists():
            # An interrupted earlier copy is preserved for inspection.
            artifact.rename(artifact.with_name(sha + ".incomplete-" + uuid.uuid4().hex))
        shutil.copytree(worktree / ".release-build", artifact)
        verify(artifact, sha)
        save_json(receipt, {"commit": sha, "tree": release["tree"], "passed_at": time.time(),
                            "manifest_sha256": hashlib.sha256((artifact / ".release.json").read_bytes()).hexdigest()})
        status(sha, "success", f"{label}: local tests and hosted release passed")
        return artifact
    except Exception:
        status(sha, "failure", f"{label}: local CI failed; see Halo gem_automata_ci log")
        raise
    finally:
        if worktree.parent.resolve() != worktrees.resolve() or not worktree.name.startswith("run-"):
            raise RuntimeError("Unmanaged worktree cleanup rejected")
        command(["git", "-C", dev, "worktree", "remove", "--force", worktree])


def validate_runtime(dev, runtime):
    if runtime.is_symlink():
        raise ValueError("Runtime cannot be a symlink")
    dev, runtime = dev.resolve(), runtime.resolve()
    if runtime.name != "gem-automata" or runtime == dev or runtime.is_relative_to(dev) or dev.is_relative_to(runtime):
        raise ValueError("Runtime must be a separate gem-automata release directory")
    if runtime.parent == runtime or runtime.is_symlink():
        raise ValueError("Unsafe runtime directory")


def ensure_server(dev, runtime, automation, stop=False):
    script = automation / "ensure-server.ps1"
    if not script.is_file():
        script = dev / "scripts/ensure-server.ps1"
    command(["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
             "-File", script, "-RuntimeRoot", runtime,
             "-AutomationRoot", automation, "-Deployment", *(["-StopOnly"] if stop else [])])


def health(commit, url="http://127.0.0.1:8814/gem-automata/healthz"):
    with urllib.request.urlopen(url, timeout=20) as response:
        value = json.load(response)
    if value.get("app") != "gem-automata" or value.get("commit") != commit or value.get("status") != "ok":
        raise RuntimeError("Running server does not match tested release")


def publish(dev, automation, runtime, artifact, sha):
    validate_runtime(dev, runtime)
    verify(artifact, sha)
    receipt = automation / "passed" / f"{sha}.json"
    if not receipt.is_file():
        raise RuntimeError("Missing authoritative CI receipt")
    proof = json.loads(receipt.read_text(encoding="utf-8"))
    if proof.get("manifest_sha256") != hashlib.sha256((artifact / ".release.json").read_bytes()).hexdigest():
        raise RuntimeError("Artifact differs from CI receipt")
    if runtime.is_dir():
        try:
            verify(runtime, sha)
            ensure_server(dev, runtime, automation)
            health(sha)
            print(f"CURRENT {sha}", flush=True)
            return
        except (ValueError, OSError):
            pass
    command(["git", "-C", dev, "fetch", "origin", "main"])
    if git(dev, "rev-parse", "origin/main") != sha:
        raise RuntimeError("Main advanced during testing; next run will test and publish the new commit")
    runtime.parent.mkdir(parents=True, exist_ok=True)
    token = uuid.uuid4().hex
    stage = runtime.parent / (".gem-automata.staging-" + token)
    backup = runtime.parent / (".gem-automata.backup-" + token)
    marker = automation / "deploying.json"
    shutil.copytree(artifact, stage)
    verify(stage, sha)
    save_json(marker, {"pid": os.getpid(), "started": time.time(), "commit": sha})
    moved_old = False
    published = False
    try:
        ensure_server(dev, runtime, automation, stop=True)
        if runtime.exists():
            runtime.rename(backup)
            moved_old = True
        stage.rename(runtime)
        published = True
        for item in runtime.rglob("*"):
            if item.is_file():
                item.chmod(stat.S_IREAD)
        ensure_server(dev, runtime, automation)
        health(sha)
        verify(runtime, sha)
        save_json(automation / "deployed.json", {"commit": sha, "url": PUBLIC_URL, "deployed_at": time.time(), "backup": str(backup) if moved_old else None})
        print(f"RELEASED {sha}: {PUBLIC_URL}", flush=True)
    except Exception:
        if published:
            ensure_server(dev, runtime, automation, stop=True)
            runtime.rename(runtime.parent / (".gem-automata.failed-" + token))
        if moved_old:
            backup.rename(runtime)
            ensure_server(dev, runtime, automation)
        raise
    finally:
        marker.unlink(missing_ok=True)
        # Previous and failed releases remain recoverable. Never touch save data.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--local", action="store_true")
    mode.add_argument("--scheduled", action="store_true")
    mode.add_argument("--deploy", action="store_true")
    mode.add_argument("--verify", action="store_true")
    mode.add_argument("--test-ref", metavar="REF", help="Test and post a status for one explicitly selected commit; do not publish")
    parser.add_argument("--dev", type=Path, default=Path(r"C:\Claude\dev\gem-automata"))
    parser.add_argument("--automation", type=Path, default=Path(r"C:\Claude\automations\gem_automata_ci"))
    parser.add_argument("--runtime", type=Path, default=Path(r"C:\Claude\runtime\gem-automata"))
    args = parser.parse_args()
    if args.local:
        gauntlet(Path.cwd())
        return
    if args.verify:
        release = verify(args.runtime)
        health(release["commit"])
        print(f"Runtime and server verified: {release['commit']}")
        return
    with lock(args.automation):
        command(["git", "-C", args.dev, "fetch", "--prune", "origin"])
        if args.test_ref:
            sha = git(args.dev, "rev-parse", f"{args.test_ref}^{{commit}}")
            test_candidate(args.dev, args.automation, sha, "selected commit")
            return
        sha = git(args.dev, "rev-parse", "origin/main")
        artifact = test_candidate(args.dev, args.automation, sha, "main")
        publish(args.dev, args.automation, args.runtime, artifact, sha)
        if args.scheduled:
            pulls = api(f"repos/{REPOSITORY}/pulls?state=open&per_page=100")
            for pull in pulls:
                # Public fork code must never execute with Halo's local credentials.
                if not pull["head"]["repo"] or pull["head"]["repo"]["full_name"].lower() != REPOSITORY.lower():
                    continue
                number = pull["number"]
                ref = f"refs/remotes/origin/gem-ci-pr-{number}"
                command(["git", "-C", args.dev, "fetch", "origin", f"+refs/pull/{number}/head:{ref}"])
                candidate = git(args.dev, "rev-parse", ref)
                try:
                    test_candidate(args.dev, args.automation, candidate, f"PR #{number}")
                except Exception as exc:
                    print(f"PR #{number} failed: {exc}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"GEM CI ERROR: {exc}", file=sys.stderr, flush=True)
        sys.exit(1)
