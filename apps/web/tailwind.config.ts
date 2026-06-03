import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#E7E3DA",
        bg: "#FFFFFF",
        "bg-warm": "#FCFAF5",
        ink: "#221E17",
        "ink-soft": "#6E655A",
        "ink-faint": "#A69D8F",
        line: "#ECE7DD",
        "line-soft": "#F4F1EA",
        amber: {
          DEFAULT: "#B9770C",
          bright: "#E0951A",
          wash: "#FAF1DC",
        },
        warrior: {
          bg: "#FCF4E3",
        }
      },
      fontFamily: {
        display: ["Spectral", "serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
