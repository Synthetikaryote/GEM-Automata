// Vite replaces this public constant in both server and browser bundles.
// Sites keeps its original root URLs; Halo coexists with other public games.
export const GAME_BASE = process.env.NEXT_PUBLIC_GAME_BASE_PATH ?? '';
export const gamePath = (pathname: string) => GAME_BASE + pathname;
export const PUBLIC_ORIGIN = GAME_BASE
  ? 'https://halo.tail34c017.ts.net:8443'
  : 'https://gem-automata.synthetikaryote.chatgpt.site';
