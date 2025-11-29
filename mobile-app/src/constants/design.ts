import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Brand Colors - Professional Construction Industry Palette
export const COLORS = {
  // Primary Colors
  primary: '#2B5CE6',        // Modern blue - trust, professionalism
  primaryDark: '#1E40AF',    // Darker blue for depth
  primaryLight: '#3B82F6',   // Lighter blue for accents
  
  // Secondary Colors
  secondary: '#F59E0B',      // Construction orange - energy, action
  secondaryDark: '#D97706',  // Darker orange
  secondaryLight: '#FCD34D', // Lighter orange
  
  // Accent Colors
  accent: '#10B981',         // Success green
  accentDark: '#059669',     // Dark green
  accentWarning: '#F59E0B',  // Warning amber
  accentError: '#EF4444',    // Error red
  
  // Neutral Colors
  neutral100: '#FFFFFF',     // Pure white
  neutral200: '#F8FAFC',     // Very light gray
  neutral300: '#E2E8F0',     // Light gray
  neutral400: '#CBD5E1',     // Medium light gray
  neutral500: '#64748B',     // Medium gray
  neutral600: '#475569',     // Medium dark gray
  neutral700: '#334155',     // Dark gray
  neutral800: '#1E293B',     // Very dark gray
  neutral900: '#0F172A',     // Almost black
  
  // Semantic Colors
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  text: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  
  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Shadow Colors
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.16)',
};

// Typography System
export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },
  
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
    '6xl': 48,
  },
  
  // Line Heights
  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 32,
    '3xl': 36,
    '4xl': 40,
    '5xl': 44,
    '6xl': 56,
  },
  
  // Font Weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

// Spacing System (8pt grid)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  '6xl': 96,
};

// Border Radius
export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
};

// Elevation/Shadow System
export const ELEVATION = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: COLORS.shadowDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
};

// Screen Dimensions
export const DIMENSIONS = {
  width,
  height,
  isSmallScreen: width < 375,
  isMediumScreen: width >= 375 && width < 768,
  isLargeScreen: width >= 768,
};

// Animation Durations
export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};

// Layout Helpers
export const LAYOUT = {
  headerHeight: 64,
  tabBarHeight: 80,
  buttonHeight: 48,
  inputHeight: 48,
  cardPadding: SPACING.md,
  screenPadding: SPACING.md,
  sectionSpacing: SPACING.lg,
};

// Component Variants
export const VARIANTS = {
  button: {
    primary: {
      backgroundColor: COLORS.primary,
      color: COLORS.neutral100,
    },
    secondary: {
      backgroundColor: COLORS.neutral200,
      color: COLORS.neutral700,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: COLORS.primary,
      color: COLORS.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: COLORS.primary,
    },
    success: {
      backgroundColor: COLORS.success,
      color: COLORS.neutral100,
    },
    warning: {
      backgroundColor: COLORS.warning,
      color: COLORS.neutral100,
    },
    error: {
      backgroundColor: COLORS.error,
      color: COLORS.neutral100,
    },
  },
  card: {
    default: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      ...ELEVATION.sm,
    },
    elevated: {
      backgroundColor: COLORS.surfaceElevated,
      borderRadius: RADIUS.lg,
      padding: SPACING.md,
      ...ELEVATION.md,
    },
  },
};

// Icon System - Common icons used throughout the app
export const ICONS = {
  // Navigation
  home: 'home-outline' as const,
  projects: 'folder-outline' as const,
  profile: 'person-outline' as const,
  back: 'arrow-back' as const,
  forward: 'arrow-forward' as const,
  
  // Authentication
  email: 'mail-outline' as const,
  password: 'lock-closed-outline' as const,
  eye: 'eye-outline' as const,
  eyeOff: 'eye-off-outline' as const,
  
  // Construction/Project
  construction: 'construct-outline' as const,
  building: 'business-outline' as const,
  location: 'location-outline' as const,
  calendar: 'calendar-outline' as const,
  
  // Recording/Media
  microphone: 'mic-outline' as const,
  microphoneOff: 'mic-off-outline' as const,
  camera: 'camera-outline' as const,
  image: 'image-outline' as const,
  play: 'play' as const,
  pause: 'pause' as const,
  stop: 'stop' as const,
  record: 'radio-button-on' as const,
  
  // Actions
  add: 'add' as const,
  edit: 'create-outline' as const,
  delete: 'trash-outline' as const,
  save: 'checkmark' as const,
  cancel: 'close' as const,
  refresh: 'refresh' as const,
  
  // Status
  success: 'checkmark-circle' as const,
  error: 'close-circle' as const,
  warning: 'warning' as const,
  info: 'information-circle' as const,
  
  // Priority
  priorityLow: 'arrow-down' as const,
  priorityMedium: 'remove' as const,
  priorityHigh: 'arrow-up' as const,
  priorityUrgent: 'flash' as const,
  
  // UI Elements
  settings: 'settings-outline' as const,
  menu: 'menu' as const,
  search: 'search' as const,
  filter: 'filter' as const,
  sort: 'swap-vertical' as const,
  expand: 'chevron-down' as const,
  collapse: 'chevron-up' as const,
  
  // File/Storage
  folder: 'folder' as const,
  folderOpen: 'folder-open' as const,
  download: 'download' as const,
  upload: 'cloud-upload' as const,
  
  // Time/Clock
  time: 'time-outline' as const,
  clock: 'alarm-outline' as const,
} as const;

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  ELEVATION,
  DIMENSIONS,
  ANIMATION,
  LAYOUT,
  VARIANTS,
  ICONS,
};