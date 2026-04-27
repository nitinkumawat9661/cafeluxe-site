export const WEBSITE_COLORS = {
  background: "#FFE6E6",
  surface: "#C1C1BD",
  accent: "#59001C",
  text: "#0D1216",
  secondaryText: "#30332F",
} as const;

export const WEBSITE_TEXT_TOKENS = {
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    hero: "1.78rem",
  },
  fontWeights: {
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  styles: {
    brandWordmark: "truncate text-[1.78rem] font-bold leading-none tracking-[0.04em]",
    sectionTitle: "text-sm font-semibold",
    panelHeading: "text-lg font-semibold",
    metaLabel: "text-[11px]",
    microLabel: "text-[10px] uppercase tracking-[0.16em]",
    ctaLabel: "text-sm font-semibold",
  },
} as const;

export const WEBSITE_RADIUS_TOKENS = {
  xs: "0.5rem",
  sm: "0.75rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
} as const;

export const WEBSITE_SHADOW_TOKENS = {
  soft3d: "0 20px 48px -34px rgba(13,18,22,0.28)",
  card3d: "0 24px 58px -44px rgba(13,18,22,0.3)",
  panel3d: "0 28px 66px -42px rgba(13,18,22,0.28)",
  floating: "0 30px 80px -44px rgba(0,0,0,0.98)",
} as const;

export const WEBSITE_SPACING_TOKENS = {
  x2: "0.5rem",
  x3: "0.75rem",
  x4: "1rem",
  x5: "1.25rem",
  x6: "1.5rem",
} as const;

export const WEBSITE_STYLE_CLASSES = {
  text: WEBSITE_TEXT_TOKENS.styles,
  radius: {
    card: "rounded-2xl",
    panel: "rounded-3xl",
    control: "rounded-xl",
    pill: "rounded-full",
  },
  shadow: {
    soft3d: "shadow-[0_20px_48px_-34px_rgba(13,18,22,0.28)]",
    card3d: "shadow-[0_24px_58px_-44px_rgba(13,18,22,0.3)]",
    panel3d: "shadow-[0_28px_66px_-42px_rgba(13,18,22,0.28)]",
    floating: "shadow-[0_30px_80px_-44px_rgba(0,0,0,0.98)]",
  },
} as const;
