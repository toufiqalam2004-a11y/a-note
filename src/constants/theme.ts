export const THEME = {
  colors: {
    // Soft pastel lavender background from the reference image
    background: '#F0EBF8',
    backgroundAlt: '#F6F2FB',
    backgroundSubtle: '#EAE4F5',

    // Floating 3D clay cards
    surface: '#FFFFFF',
    surfaceLavender: '#F9F6FE',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F4EFFB',

    // Mint green primary actions & highlights
    mint: '#00D287',
    mintDark: '#00B775',
    mintLight: '#E6FBF2',
    mintGlow: 'rgba(0, 210, 135, 0.22)',
    mintBorder: 'rgba(0, 210, 135, 0.35)',

    // Purple accent actions & indicators
    purple: '#7C5CFC',
    purpleDark: '#6846EB',
    purpleLight: '#EDE8FD',
    purpleGlow: 'rgba(124, 92, 252, 0.22)',
    purpleBorder: 'rgba(124, 92, 252, 0.3)',

    // Pink / Magenta secondary avatar
    pink: '#E84393',
    pinkLight: '#FDEBF3',

    // Clean dark navy typography with high readability
    textPrimary: '#1E1B38',
    textSecondary: '#4A4568',
    textMuted: '#8E8AAB',
    textNavy: '#1E1B38',

    // Clay borders & bevel highlights
    border: '#E8E1F3',
    borderLight: 'rgba(255, 255, 255, 0.95)',
    borderSubtle: '#F2EDFA',

    // Status & warnings
    amber: '#F59E0B',
    amberLight: '#FEF3C7',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    success: '#00D287',

    // Clay Shadow Tone
    shadowColor: '#9684B8',
    overlay: 'rgba(30, 27, 56, 0.45)',
  },

  typography: {
    fontFamily: {
      regular: 'System',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      huge: 32,
    },
  },

  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 30,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },

  clay: {
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.95)',
      shadowColor: '#9684B8',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    cardElevated: {
      backgroundColor: '#FFFFFF',
      borderRadius: 26,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.98)',
      shadowColor: '#8C77B0',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 6,
    },
    buttonMint: {
      backgroundColor: '#00D287',
      borderRadius: 9999,
      shadowColor: '#00D287',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonPurple: {
      backgroundColor: '#7C5CFC',
      borderRadius: 9999,
      shadowColor: '#7C5CFC',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonWhite: {
      backgroundColor: '#FFFFFF',
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.9)',
      shadowColor: '#9684B8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 3,
    },
  },
};
