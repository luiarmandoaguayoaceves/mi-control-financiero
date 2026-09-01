import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider } from './src/hooks/useAppData';
import AppNavigator from './src/navigation';
import { useTheme } from './src/hooks/useTheme';

function ThemedApp() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.background === '#0F1217' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <ThemedApp />
      </DataProvider>
    </SafeAreaProvider>
  );
}
