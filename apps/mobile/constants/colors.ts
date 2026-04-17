export const Colors = {
  primary: '#D4A853',
  primaryLight: '#E8C66A',
  primaryDark: '#B8923D',
  primaryGlow: 'rgba(212, 168, 83, 0.14)',

  secondary: '#F5F5F5',
  accent: '#D4A853',
  accentLight: 'rgba(212, 168, 83, 0.12)',
  accentGlow: 'rgba(212, 168, 83, 0.2)',

  background: '#0A0A0A',
  surface: '#141414',
  surfaceSecondary: '#1C1C1C',
  surfaceElevated: '#242424',
  card: '#141414',

  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#555555',
  textInverse: '#0A0A0A',

  border: '#262626',
  borderLight: '#1E1E1E',
  divider: '#1A1A1A',

  success: '#34D399',
  successLight: 'rgba(52, 211, 153, 0.12)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.12)',
  error: '#F87171',
  errorLight: 'rgba(248, 113, 113, 0.12)',
  star: '#FBBF24',

  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.75)',

  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 10,
    },
  },
} as const;
