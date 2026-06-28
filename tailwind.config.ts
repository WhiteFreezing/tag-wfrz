import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: {
      ink: "#0a0b0d", surface: "#13161b", muted: "#1c2026", border: "#2a2e36",
      text: "#e8eaef", dim: "#8b9099",
      brand: { DEFAULT: "#34d399", soft: "#34d399cc", deep: "#34d39988" },
      accent: { cyan: "#22d3ee", amber: "#fbbf24", rose: "#fb7185" },
    },
    fontFamily: { sans: ["Inter","system-ui"], mono: ["JetBrains Mono","ui-monospace"] },
  } },
} satisfies Config;
