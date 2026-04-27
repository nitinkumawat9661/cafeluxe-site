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
        "brand-dark": "#2E2A26",
        "brand-accent": "#7A6D60",
        "brand-surface": "#E8D9C5",
        "brand-bg": "#F8F5F0",
      },
    },
  },
  plugins: [],
} satisfies Config;
