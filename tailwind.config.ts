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
        "brand-dark": "var(--cafe-color-text)",
        "brand-accent": "var(--cafe-color-text-secondary)",
        "brand-surface": "var(--cafe-color-surface)",
        "brand-bg": "var(--cafe-color-bg)",
      },
      fontSize: {
        "token-xs": "var(--cafe-font-size-xs)",
        "token-sm": "var(--cafe-font-size-sm)",
        "token-base": "var(--cafe-font-size-base)",
        "token-lg": "var(--cafe-font-size-lg)",
        "token-xl": "var(--cafe-font-size-xl)",
        "token-hero": "var(--cafe-font-size-hero)",
      },
      fontWeight: {
        "token-medium": "var(--cafe-font-weight-medium)",
        "token-semibold": "var(--cafe-font-weight-semibold)",
        "token-bold": "var(--cafe-font-weight-bold)",
      },
      borderRadius: {
        "token-xs": "var(--cafe-radius-xs)",
        "token-sm": "var(--cafe-radius-sm)",
        "token-md": "var(--cafe-radius-md)",
        "token-lg": "var(--cafe-radius-lg)",
        "token-xl": "var(--cafe-radius-xl)",
      },
      boxShadow: {
        "token-soft-3d": "var(--cafe-shadow-soft-3d)",
        "token-card-3d": "var(--cafe-shadow-card-3d)",
        "token-panel-3d": "var(--cafe-shadow-panel-3d)",
        "token-floating": "var(--cafe-shadow-floating)",
      },
      spacing: {
        "token-2": "var(--cafe-space-2)",
        "token-3": "var(--cafe-space-3)",
        "token-4": "var(--cafe-space-4)",
        "token-5": "var(--cafe-space-5)",
        "token-6": "var(--cafe-space-6)",
      },
    },
  },
  plugins: [],
} satisfies Config;
