import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mahjong: {
          red: "#d33",
          blue: "#3b82f6",
          gold: "#eab308",
        },
      },
    },
  },
  plugins: [],
};

export default config;
