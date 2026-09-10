import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.GEM_HOSTED === "1" ? { basePath: "/gem-automata" } : {}),
};

export default nextConfig;
