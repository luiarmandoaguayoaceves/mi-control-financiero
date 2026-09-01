// Tema: diseño limpio, moderno, sobrio, estilo dashboard financiero.
// Soporta modo claro/oscuro automático (sigue al sistema).

export interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  tabBar: string;
}

export const lightColors: ThemeColors = {
  background: '#F4F6FA',
  card: '#FFFFFF',
  cardAlt: '#EEF1F6',
  border: '#E3E7EE',
  text: '#151A23',
  textMuted: '#6B7280',
  primary: '#2F5BEA',
  primarySoft: '#E7EDFF',
  success: '#0F9D58',
  successSoft: '#E3F6EC',
  warning: '#D97706',
  warningSoft: '#FDF1DC',
  danger: '#DC2626',
  dangerSoft: '#FDE7E7',
  info: '#0EA5E9',
  infoSoft: '#E0F4FE',
  tabBar: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  background: '#0F1217',
  card: '#1A1F28',
  cardAlt: '#232936',
  border: '#2B3340',
  text: '#F1F4F9',
  textMuted: '#9AA4B2',
  primary: '#6E8DFF',
  primarySoft: '#232F55',
  success: '#34D399',
  successSoft: '#14332A',
  warning: '#FBBF24',
  warningSoft: '#3A2E12',
  danger: '#F87171',
  dangerSoft: '#3D1F1F',
  info: '#38BDF8',
  infoSoft: '#122F3D',
  tabBar: '#161B24',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

export const font = {
  title: 22,
  subtitle: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

export function getTheme(dark: boolean): ThemeColors {
  return dark ? darkColors : lightColors;
}
