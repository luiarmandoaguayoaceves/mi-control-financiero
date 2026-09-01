import { useColorScheme } from 'react-native';
import { getTheme, ThemeColors } from '../theme';

export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return getTheme(scheme === 'dark');
}
