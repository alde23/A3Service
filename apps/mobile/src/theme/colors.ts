// theme/colors.ts — complete color token system for A3S redesign
export const darkColors = {
  // Backgrounds (darkest → lightest)
  bg: '#0b0f17', // page / safe area
  surface1: '#111827', // card
  surface2: '#1a2234', // input, elevated
  surface3: '#212d42', // hover, header start

  // Borders
  border: '#2a3548',
  border2: '#374356',

  // Text
  textPrimary: '#e8edf5',
  textSecondary: '#7b8ba4',
  textTertiary: '#3d4f68',
  placeholder: '#3d4f68',

  // Accent
  blue: '#4f8ef7',
  blueSoft: '#1e3a6e',
  teal: '#0fb896',
  tealSoft: '#0a3d33',

  // Status
  green: '#3fd68a',
  greenSoft: '#0d3d26',
  amber: '#f0a243',
  amberSoft: '#3d2300',
  red: '#f26b6b',
  redSoft: '#3d1010',

  // Header gradient stops
  headerFrom: '#212d42',
  headerTo: '#0b0f17',
} as const;

export const lightColors = {
  // Backgrounds (darkest → lightest)
  bg: '#ffffff', // page / safe area
  surface1: '#f8fafc', // card
  surface2: '#f1f5f9', // input, elevated
  surface3: '#e2e8f0', // hover, header start

  // Borders
  border: '#e2e8f0',
  border2: '#cbd5e1',

  // Text
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  placeholder: '#94a3b8',

  // Accent
  blue: '#2563eb',
  blueSoft: '#eff6ff',
  teal: '#0d9488',
  tealSoft: '#f0fdfa',

  // Status
  green: '#16a34a',
  greenSoft: '#f0fdf4',
  amber: '#d97706',
  amberSoft: '#fffbeb',
  red: '#dc2626',
  redSoft: '#fef2f2',

  // Header gradient stops
  headerFrom: '#f8fafc',
  headerTo: '#ffffff',
} as const;

export type ColorsType = typeof darkColors;

// Header gradient — use with gradient library or approximate with start color
export const HEADER_GRADIENT_DARK = ['#212d42', '#0b0f17'] as const;
export const HEADER_GRADIENT_LIGHT = ['#f8fafc', '#ffffff'] as const;
