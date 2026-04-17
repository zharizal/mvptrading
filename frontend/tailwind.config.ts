import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#070b11",
          panel: "#0d141d",
          border: "#1b2a3a",
          muted: "#7f8ea3",
          text: "#e5eef9",
          green: "#22c55e",
          red: "#ef4444",
          cyan: "#22d3ee",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,197,94,.15), 0 10px 40px rgba(0,0,0,.35)",
      },
    },
  },
  plugins: [],
};

export default config;
