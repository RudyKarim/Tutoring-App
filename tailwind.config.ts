import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#07070a", 900: "#0b0b0f", 800: "#111117", 700: "#18181f", 600: "#22222b" },
        bone: { DEFAULT: "#ece8e1", dim: "#a9a59e", mute: "#6d6a65" },
        eng: "#5aa9ff",
        fin: "#d8b35a",
        law: "#b0384a",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { widest2: "0.32em" },
    },
  },
  plugins: [],
};
export default config;
