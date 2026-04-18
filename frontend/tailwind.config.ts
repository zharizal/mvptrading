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
          bg: "#050505",
          panel: "#0f0f11",
          border: "#222222",
          muted: "#888888",
          text: "#e0e0e0",
          green: "#00c853",
          red: "#ff3d00",
          cyan: "#00e5ff",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
