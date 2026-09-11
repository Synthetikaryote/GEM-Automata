import type { Metadata } from "next";
import Game from "./Game";

export const metadata: Metadata = {
  title: "Riftward | Keepers of the Wild",
  description: "A pocket-sized real-time strategy game. Gather from the wild rift, build your sanctum, and overcome a rival keeper.",
};

export default function Home() {
  return <Game />;
}
