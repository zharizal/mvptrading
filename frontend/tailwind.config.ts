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
          bg: "#0A0E17",
          panel: "#131722",
          border: "#1E222D",
          muted: "#787B86",
          text: "#D1D4DC",
          green: "#089981",
          red: "#F23645",
          cyan: "#2962FF",
        },
      },
      boxShadow: {
        glow: "none",
      },
    },
  },
  plugins: [],
};

export default config;
