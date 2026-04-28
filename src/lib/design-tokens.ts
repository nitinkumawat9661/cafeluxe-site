export const WEBSITE_COLORS = {
  background: "#F8F5F0",
  surface: "#E8D9C5",
  accent: "#C6A57B",
  text: "#2E2A26",
  secondaryText: "#7A6D60",
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
    brandWordmark: "truncate text-[1.86rem] font-bold leading-none tracking-[0.05em]",
    sectionTitle: "text-sm font-semibold tracking-[0.02em]",
    panelHeading: "text-[1.08rem] font-semibold tracking-[0.015em]",
    metaLabel: "text-[11px] font-medium",
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
  soft3d: "0 14px 30px -20px rgba(122,109,96,0.22), 0 4px 10px -8px rgba(122,109,96,0.16)",
  card3d: "0 20px 44px -26px rgba(122,109,96,0.24), 0 6px 14px -10px rgba(122,109,96,0.18)",
  panel3d: "0 26px 56px -30px rgba(122,109,96,0.26), 0 8px 18px -12px rgba(122,109,96,0.2)",
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
    soft3d: "shadow-[0_14px_30px_-20px_rgba(122,109,96,0.22),0_4px_10px_-8px_rgba(122,109,96,0.16)]",
    card3d: "shadow-[0_20px_44px_-26px_rgba(122,109,96,0.24),0_6px_14px_-10px_rgba(122,109,96,0.18)]",
    panel3d: "shadow-[0_26px_56px_-30px_rgba(122,109,96,0.26),0_8px_18px_-12px_rgba(122,109,96,0.2)]",
    floating: "shadow-[0_30px_80px_-44px_rgba(0,0,0,0.98)]",
  },
} as const;
