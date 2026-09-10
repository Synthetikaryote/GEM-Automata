import hashlib
import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("local_ci", Path(__file__).parents[1] / "scripts/local_ci.py")
ci = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ci)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)

    def tearDown(self):
        for file in self.root.rglob("*"):
            if file.is_file():
                file.chmod(stat.S_IWRITE | stat.S_IREAD)
        self.temp.cleanup()

    def artifact(self, root, sha, clean=True):
        (root / "web").mkdir(parents=True)
        content = f"GEM {sha}".encode()
        (root / "web/index.html").write_bytes(content)
        ci.save_json(root / ".release.json", {"app": "gem-automata", "commit": sha, "clean": clean,
            "files": {"web/index.html": hashlib.sha256(content).hexdigest()}})
        return root

    def test_changed_missing_extra_and_dirty_artifacts_fail(self):
        root = self.artifact(self.root / "artifact", "a")
        self.assertEqual(ci.verify(root, "a")["commit"], "a")
        with self.assertRaises(ValueError):
            ci.verify(root, "b")
        (root / "secret.txt").write_text("never public")
        with self.assertRaises(ValueError):
            ci.verify(root, "a")
        (root / "secret.txt").unlink()
        (root / "web/index.html").write_text("changed")
        with self.assertRaises(ValueError):
            ci.verify(root, "a")
        dirty = self.artifact(self.root / "dirty", "a", clean=False)
        with self.assertRaises(ValueError):
            ci.verify(dirty, "a")

    def test_broad_and_overlapping_runtime_paths_fail(self):
        dev = self.root / "dev"
        for runtime in [self.root, dev, dev / "gem-automata", self.root / "necrofleet"]:
            with self.assertRaises(ValueError):
                ci.validate_runtime(dev, runtime)
        ci.validate_runtime(dev, self.root / "runtime/gem-automata")

    def test_cached_ci_does_not_repost_github_status_every_five_minutes(self):
        automation = self.root / "ci"
        artifact = self.artifact(automation / "artifacts/tested", "tested")
        ci.save_json(automation / "passed/tested.json", {
            "manifest_sha256": hashlib.sha256((artifact / ".release.json").read_bytes()).hexdigest()})
        with patch.object(ci, "status") as publish_status:
            self.assertEqual(ci.test_candidate(self.root / "dev", automation, "tested", "main"), artifact)
        publish_status.assert_not_called()

    def test_failed_start_restores_previous_release_and_preserves_both(self):
        dev, automation = self.root / "dev", self.root / "ci"
        runtime = self.artifact(self.root / "runtime/gem-automata", "old")
        artifact = self.artifact(self.root / "artifact", "new")
        ci.save_json(automation / "passed/new.json", {
            "manifest_sha256": hashlib.sha256((artifact / ".release.json").read_bytes()).hexdigest()})
        with patch.object(ci, "command"), patch.object(ci, "git", return_value="new"), \
             patch.object(ci, "ensure_server"), patch.object(ci, "health", side_effect=RuntimeError("startup failed")):
            with self.assertRaisesRegex(RuntimeError, "startup failed"):
                ci.publish(dev, automation, runtime, artifact, "new")
        self.assertEqual(ci.verify(runtime)["commit"], "old")
        failed = list(runtime.parent.glob(".gem-automata.failed-*"))
        self.assertEqual(len(failed), 1)
        self.assertEqual(ci.verify(failed[0])["commit"], "new")
        self.assertFalse((automation / "deploying.json").exists())

    def test_advancing_main_is_not_published(self):
        dev, automation = self.root / "dev", self.root / "ci"
        artifact = self.artifact(self.root / "artifact", "tested")
        ci.save_json(automation / "passed/tested.json", {
            "manifest_sha256": hashlib.sha256((artifact / ".release.json").read_bytes()).hexdigest()})
        runtime = self.root / "runtime/gem-automata"
        with patch.object(ci, "command"), patch.object(ci, "git", return_value="newer"):
            with self.assertRaisesRegex(RuntimeError, "Main advanced"):
                ci.publish(dev, automation, runtime, artifact, "tested")
        self.assertFalse(runtime.exists())


if __name__ == "__main__":
    unittest.main()
