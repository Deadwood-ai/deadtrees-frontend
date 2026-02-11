export const palette = {
  primary: {
    50: "#EEF4FC",
    100: "#DDEAF8",
    500: "#1F5FAF",
    600: "#1A4F92",
    700: "#143C6E",
  },
  secondary: {
    500: "#2F7D4A",
    600: "#25653C",
  },
  forest: {
    100: "#DDF8E8",
    300: "#7CE380",
    500: "#29D280",
    600: "#22C55E",
    700: "#1F8A45",
  },
  deadwood: {
    100: "#FFF4D9",
    500: "#FFB31C",
    600: "#CC8F16",
    700: "#AE5920",
  },
  state: {
    success: "#22C55E",
    error: "#EF4444",
    warning: "#D9A441",
    info: "#1F5FAF",
    pending: "#9CA3AF",
    hover: "#06B6D4",
    selected: "#F97316",
    measure: "#FFCC33",
  },
  neutral: {
    0: "#FFFFFF",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E1EFFF",
    300: "#D7C49A",
    500: "#9CA3AF",
    700: "#6B7280",
    800: "#374151",
    900: "#1F2937",
  },
} as const;

export const semanticColors = {
  textPrimary: palette.neutral[900],
  surfaceBase: palette.neutral[50],
  surfaceRaised: palette.neutral[0],
  borderSubtle: palette.neutral[100],
  infoPanel: palette.primary[50],
} as const;

