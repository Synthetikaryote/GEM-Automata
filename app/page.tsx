import type { Metadata } from "next";
import Game from "./Game";

export const metadata: Metadata = {
  title: "GEM — Automata Duel",
  description: "A portrait-first automation battler where gems become machines, creatures, and victory.",
};

export default function Home() {
  return <Game />;
}
