// Single theme file — colors AND fonts. Every component in the app reads
// from here; nothing should hardcode a hex value elsewhere.
//
// Tokens below are copied EXACTLY from the PriceCompare Design System Kit
// (sections 03 typography, 04 spacing & shape, 05 components) — do not
// approximate or drift from these values.

export const gradients = {
  // primary: 'linear-gradient(135deg, #12A06A 0%, #0E6B4F 55%, #0A4F3A 100%)'
  primary: ['#12A06A', '#0E6B4F', '#0A4F3A'] as const,
  primaryLocations: [0, 0.55, 1] as const,

  // accent: 'linear-gradient(135deg, #FFC463 0%, #F2A93B 60%, #C9791A 100%)'
  accent: ['#FFC463', '#F2A93B', '#C9791A'] as const,
  accentLocations: [0, 0.6, 1] as const,

  // duo: 'linear-gradient(135deg, #0E6B4F 0%, #155EEF 100%)' — icon
  // squares, avatar, active tab glow ONLY. Never used for buttons.
  duo: ['#0E6B4F', '#155EEF'] as const,

  angle: 135,
};

export const colors = {
  // Surfaces
  background: '#F5F7F3',
  surface: '#FFFFFF',

  // Text
  textPrimary: '#16211A',
  textSecondary: '#5B6660',
  textTertiary: '#8B958E',

  // §04 — card border ("line-soft" token), shadows
  border: '#E9EFE9',
  cardShadowColor: 'rgba(22,36,29,0.18)', // 0 6px 18px -12px
  buttonShadowColor: 'rgba(10,79,58,0.55)', // 0 10px 22px -10px

  // Solid brand green — for links, checkboxes, and anywhere a flat color
  // (not a gradient) is needed. Matches the primary gradient's midpoint.
  accentSolid: '#0E6B4F',
  accentTint: '#EAF4EF', // soft accent background — active tabs, chips
  accentMango: '#F2A93B',
  onAccent: '#FFFFFF',

  danger: '#C0392B',
  success: '#0E6B4F',
};

// §04 — radius & elevation scale. Don't invent new radius values;
// always pick from this list.
export const radii = {
  small: 12, // store badges, small icon squares
  medium: 16, // buttons, cards, chip backgrounds (14–18px range)
  large: 23, // hero cards, onboarding illustration, bottom sheets (20–26px range)
  pill: 100, // chips, tab indicators
};

export const spacing = {
  screenPadding: 20,
};

export const shadows = {
  card: {
    shadowColor: colors.cardShadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 4,
  },
  button: {
    shadowColor: colors.buttonShadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 6,
  },
};

// §03 — three fonts, three jobs.
// Install: npx expo install @expo-google-fonts/fraunces @expo-google-fonts/inter @expo-google-fonts/ibm-plex-mono expo-font
export const fonts = {
  headline: 'Fraunces_600SemiBold', // screen titles, "Welcome back", section headers
  body: 'Inter_400Regular', // paragraphs, placeholders
  label: 'Inter_600SemiBold', // form labels, product names
  button: 'Inter_700Bold', // CTAs, "Forgot password?", tab labels
  mono: 'IBMPlexMono_600SemiBold', // prices, stats, timestamps, codes
  monoEmphasis: 'IBMPlexMono_700Bold', // emphasized prices
};