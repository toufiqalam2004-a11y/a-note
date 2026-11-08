export type ThemeId = 'lavender-mint' | 'midnight' | 'ocean-blue' | 'rose-pink';

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundAlt: string;
  backgroundSubtle: string;

  // Floating 3D surfaces
  surface: string;
  surfaceLavender: string;
  surfaceElevated: string;
  surfaceSubtle: string;

  // Primary action & highlights
  mint: string;
  mintDark: string;
  mintLight: string;
  mintGlow: string;
  mintBorder: string;

  // Accent action & indicators
  purple: string;
  purpleDark: string;
  purpleLight: string;
  purpleGlow: string;
  purpleBorder: string;

  // Secondary accent
  pink: string;
  pinkLight: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textNavy: string;

  // Borders & bevels
  border: string;
  borderLight: string;
  borderSubtle: string;

  // Status & indicators
  amber: string;
  amberLight: string;
  danger: string;
  dangerLight: string;
  success: string;

  // Elevation & shadow
  shadowColor: string;
  overlay: string;
}

export interface ThemePreset {
  id: ThemeId;
  name: string;
  tagline: string;
  isDark: boolean;
  preview: {
    bg: string;
    surface: string;
    primary: string;
    accent: string;
  };
  colors: ThemeColors;
  typography: {
    fontFamily: { regular: string };
    sizes: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      xxl: number;
      huge: number;
    };
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  clay: {
    card: any;
    cardElevated: any;
    buttonMint: any;
    buttonPurple: any;
    buttonWhite: any;
  };
}

const COMMON_TYPOGRAPHY = {
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
};

const COMMON_RADIUS = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
  full: 9999,
};

const COMMON_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

function createClayStyles(colors: ThemeColors, isDark: boolean) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.borderLight,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.35 : 0.12,
      shadowRadius: 16,
      elevation: 4,
    },
    cardElevated: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 26,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.45 : 0.15,
      shadowRadius: 20,
      elevation: 6,
    },
    buttonMint: {
      backgroundColor: colors.mint,
      borderRadius: 9999,
      shadowColor: colors.mint,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.45 : 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonPurple: {
      backgroundColor: colors.purple,
      borderRadius: 9999,
      shadowColor: colors.purple,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.45 : 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    buttonWhite: {
      backgroundColor: colors.surface,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowRadius: 10,
      elevation: 3,
    },
  };
}

// 1. LAVENDER MINT (Original / Default)
const LAVENDER_MINT_COLORS: ThemeColors = {
  background: '#F0EBF8',
  backgroundAlt: '#F6F2FB',
  backgroundSubtle: '#EAE4F5',
  surface: '#FFFFFF',
  surfaceLavender: '#F9F6FE',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F4EFFB',
  mint: '#00D287',
  mintDark: '#00B775',
  mintLight: '#E6FBF2',
  mintGlow: 'rgba(0, 210, 135, 0.22)',
  mintBorder: 'rgba(0, 210, 135, 0.35)',
  purple: '#7C5CFC',
  purpleDark: '#6846EB',
  purpleLight: '#EDE8FD',
  purpleGlow: 'rgba(124, 92, 252, 0.22)',
  purpleBorder: 'rgba(124, 92, 252, 0.3)',
  pink: '#E84393',
  pinkLight: '#FDEBF3',
  textPrimary: '#1E1B38',
  textSecondary: '#4A4568',
  textMuted: '#8E8AAB',
  textNavy: '#1E1B38',
  border: '#E8E1F3',
  borderLight: 'rgba(255, 255, 255, 0.95)',
  borderSubtle: '#F2EDFA',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#00D287',
  shadowColor: '#9684B8',
  overlay: 'rgba(30, 27, 56, 0.45)',
};

// 2. MIDNIGHT (Dark Theme)
const MIDNIGHT_COLORS: ThemeColors = {
  background: '#0F111A',
  backgroundAlt: '#141724',
  backgroundSubtle: '#1A1E30',
  surface: '#181C2B',
  surfaceLavender: '#202538',
  surfaceElevated: '#22283E',
  surfaceSubtle: '#1C2134',
  mint: '#00E599',
  mintDark: '#00C782',
  mintLight: '#142E24',
  mintGlow: 'rgba(0, 229, 153, 0.30)',
  mintBorder: 'rgba(0, 229, 153, 0.40)',
  purple: '#8C6CFF',
  purpleDark: '#7853FA',
  purpleLight: '#26224A',
  purpleGlow: 'rgba(140, 108, 255, 0.30)',
  purpleBorder: 'rgba(140, 108, 255, 0.40)',
  pink: '#FF6584',
  pinkLight: '#3A1B28',
  textPrimary: '#F8F9FA',
  textSecondary: '#C5C9DA',
  textMuted: '#8289A3',
  textNavy: '#F8F9FA',
  border: '#282D44',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderSubtle: '#1F2437',
  amber: '#FBBF24',
  amberLight: '#382E18',
  danger: '#F87171',
  dangerLight: '#3B1E22',
  success: '#00E599',
  shadowColor: '#000000',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

// 3. OCEAN BLUE (Teal & Royal Blue)
const OCEAN_BLUE_COLORS: ThemeColors = {
  background: '#EAF4F8',
  backgroundAlt: '#F0F8FA',
  backgroundSubtle: '#E0EFF4',
  surface: '#FFFFFF',
  surfaceLavender: '#F0F7FB',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#EBF5F9',
  mint: '#00A896',
  mintDark: '#028090',
  mintLight: '#E2F6F3',
  mintGlow: 'rgba(0, 168, 150, 0.24)',
  mintBorder: 'rgba(0, 168, 150, 0.35)',
  purple: '#0077B6',
  purpleDark: '#023E8A',
  purpleLight: '#E0F2FE',
  purpleGlow: 'rgba(0, 119, 182, 0.24)',
  purpleBorder: 'rgba(0, 119, 182, 0.32)',
  pink: '#0096C7',
  pinkLight: '#E0F7FA',
  textPrimary: '#0F2537',
  textSecondary: '#334E68',
  textMuted: '#627D98',
  textNavy: '#0F2537',
  border: '#D2E7F0',
  borderLight: 'rgba(255, 255, 255, 0.95)',
  borderSubtle: '#E4F0F6',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#00A896',
  shadowColor: '#7BA6BC',
  overlay: 'rgba(15, 37, 55, 0.50)',
};

// 4. ROSE PINK (Soft Rose & Berry Plum)
const ROSE_PINK_COLORS: ThemeColors = {
  background: '#FCF0F4',
  backgroundAlt: '#FDF5F8',
  backgroundSubtle: '#F7E4EC',
  surface: '#FFFFFF',
  surfaceLavender: '#FDF4F8',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#FBF0F5',
  mint: '#E84393',
  mintDark: '#D63031',
  mintLight: '#FDEBF3',
  mintGlow: 'rgba(232, 67, 147, 0.24)',
  mintBorder: 'rgba(232, 67, 147, 0.35)',
  purple: '#9C27B0',
  purpleDark: '#7B1FA2',
  purpleLight: '#F3E5F5',
  purpleGlow: 'rgba(156, 39, 176, 0.24)',
  purpleBorder: 'rgba(156, 39, 176, 0.32)',
  pink: '#FD79A8',
  pinkLight: '#FFF0F5',
  textPrimary: '#2D1324',
  textSecondary: '#5C334F',
  textMuted: '#99738C',
  textNavy: '#2D1324',
  border: '#F3D5E2',
  borderLight: 'rgba(255, 255, 255, 0.95)',
  borderSubtle: '#FAECF2',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#00D287',
  shadowColor: '#BA8FA3',
  overlay: 'rgba(45, 19, 36, 0.50)',
};

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  'lavender-mint': {
    id: 'lavender-mint',
    name: 'Lavender Mint',
    tagline: 'Default pastel lavender with mint highlights',
    isDark: false,
    preview: {
      bg: '#F0EBF8',
      surface: '#FFFFFF',
      primary: '#00D287',
      accent: '#7C5CFC',
    },
    colors: LAVENDER_MINT_COLORS,
    typography: COMMON_TYPOGRAPHY,
    radius: COMMON_RADIUS,
    spacing: COMMON_SPACING,
    clay: createClayStyles(LAVENDER_MINT_COLORS, false),
  },
  'midnight': {
    id: 'midnight',
    name: 'Midnight',
    tagline: 'Deep dark theme with neon mint & violet',
    isDark: true,
    preview: {
      bg: '#0F111A',
      surface: '#181C2B',
      primary: '#00E599',
      accent: '#8C6CFF',
    },
    colors: MIDNIGHT_COLORS,
    typography: COMMON_TYPOGRAPHY,
    radius: COMMON_RADIUS,
    spacing: COMMON_SPACING,
    clay: createClayStyles(MIDNIGHT_COLORS, true),
  },
  'ocean-blue': {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    tagline: 'Fresh coastal teal with royal blue accents',
    isDark: false,
    preview: {
      bg: '#EAF4F8',
      surface: '#FFFFFF',
      primary: '#00A896',
      accent: '#0077B6',
    },
    colors: OCEAN_BLUE_COLORS,
    typography: COMMON_TYPOGRAPHY,
    radius: COMMON_RADIUS,
    spacing: COMMON_SPACING,
    clay: createClayStyles(OCEAN_BLUE_COLORS, false),
  },
  'rose-pink': {
    id: 'rose-pink',
    name: 'Rose Pink',
    tagline: 'Soft petal pink with berry & plum accents',
    isDark: false,
    preview: {
      bg: '#FCF0F4',
      surface: '#FFFFFF',
      primary: '#E84393',
      accent: '#9C27B0',
    },
    colors: ROSE_PINK_COLORS,
    typography: COMMON_TYPOGRAPHY,
    radius: COMMON_RADIUS,
    spacing: COMMON_SPACING,
    clay: createClayStyles(ROSE_PINK_COLORS, false),
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'lavender-mint';

// Maintain exact backward compatibility for any existing static imports
export const THEME = THEME_PRESETS[DEFAULT_THEME_ID];
