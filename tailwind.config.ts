import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "brand-dark": "#1C1C1C",
        "brand-accent": "#302A18",
        "brand-surface": "#FDE4C3",
        "brand-bg": "#F6F6F6",
      },
    },
  },
  plugins: [],
} satisfies Config;
