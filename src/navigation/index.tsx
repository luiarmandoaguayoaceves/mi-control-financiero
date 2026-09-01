// ============================================================
// Navegación: 5 pestañas + stack "Más" + modal de nuevo movimiento.
// ============================================================
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import DashboardScreen from '../screens/DashboardScreen';
import MovementsScreen from '../screens/MovementsScreen';
import NewMovementScreen from '../screens/NewMovementScreen';
import CardScreen from '../screens/CardScreen';
import FundsScreen from '../screens/FundsScreen';
import MoreScreen from '../screens/MoreScreen';
import ServicesScreen from '../screens/ServicesScreen';
import GoalsScreen from '../screens/GoalsScreen';
import BudgetScreen from '../screens/BudgetScreen';
import AssetsScreen from '../screens/AssetsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { useTheme } from '../hooks/useTheme';
import { font } from '../theme';

export type RootStackParamList = {
  MainTabs: undefined;
  NuevoMovimiento: { id?: string } | undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Servicios: undefined;
  Metas: undefined;
  Presupuesto: undefined;
  Patrimonio: undefined;
  Reportes: undefined;
  Configuracion: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function MoreNavigator() {
  const theme = useTheme();
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <MoreStack.Screen name="MoreMenu" component={MoreScreen} options={{ title: 'Más' }} />
      <MoreStack.Screen name="Servicios" component={ServicesScreen} options={{ title: 'Servicios' }} />
      <MoreStack.Screen name="Metas" component={GoalsScreen} options={{ title: 'Metas' }} />
      <MoreStack.Screen name="Presupuesto" component={BudgetScreen} options={{ title: 'Presupuesto' }} />
      <MoreStack.Screen name="Patrimonio" component={AssetsScreen} options={{ title: 'Patrimonio' }} />
      <MoreStack.Screen name="Reportes" component={ReportsScreen} options={{ title: 'Reportes' }} />
      <MoreStack.Screen name="Configuracion" component={SettingsScreen} options={{ title: 'Configuración' }} />
    </MoreStack.Navigator>
  );
}

function MainTabs() {
  const theme = useTheme();
  const icon = (emoji: string, size = 20) => (
    <Text style={{ fontSize: size }} accessibilityElementsHidden>
      {emoji}
    </Text>
  );
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border },
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: '700', fontSize: font.subtitle },
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{ tabBarIcon: () => icon('🏠'), title: 'Inicio' }}
      />
      <Tab.Screen
        name="Movimientos"
        component={MovementsScreen}
        options={{ tabBarIcon: () => icon('💸'), title: 'Movimientos' }}
      />
      <Tab.Screen
        name="Tarjeta"
        component={CardScreen}
        options={{ tabBarIcon: () => icon('💳'), title: 'Tarjeta' }}
      />
      <Tab.Screen
        name="Apartados"
        component={FundsScreen}
        options={{ tabBarIcon: () => icon('🏦'), title: 'Apartados' }}
      />
      <Tab.Screen
        name="Mas"
        component={MoreNavigator}
        options={{ tabBarIcon: () => icon('📊'), title: 'Más', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const theme = useTheme();
  const navTheme = {
    ...(theme.background === '#0F1217' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.background === '#0F1217' ? DarkTheme : DefaultTheme).colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator>
        <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <RootStack.Screen
          name="NuevoMovimiento"
          component={NewMovementScreen}
          options={{ presentation: 'modal', title: 'Nuevo movimiento' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
