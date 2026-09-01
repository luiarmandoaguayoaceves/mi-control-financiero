// Menú "Más": acceso a las pantallas secundarias.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';
import type { MoreStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<MoreStackParamList>;

const ITEMS: { route: keyof MoreStackParamList; label: string; emoji: string; desc: string }[] = [
  { route: 'Presupuesto', label: 'Presupuesto', emoji: '🎯', desc: 'Semáforo por categoría' },
  { route: 'Servicios', label: 'Servicios', emoji: '🧾', desc: 'Gastos fijos y suscripciones' },
  { route: 'Metas', label: 'Metas', emoji: '🎓', desc: 'Emergencia, provisiones, inversión' },
  { route: 'Patrimonio', label: 'Patrimonio', emoji: '📈', desc: 'Activos, pasivos y evolución' },
  { route: 'Reportes', label: 'Reportes', emoji: '📊', desc: 'Resumen mensual y gráficas' },
  { route: 'Configuracion', label: 'Configuración', emoji: '⚙️', desc: 'Cuentas, categorías, exportar' },
];

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  return (
    <Screen>
      {ITEMS.map((item) => (
        <Pressable
          key={item.route}
          onPress={() => navigation.navigate(item.route)}
          accessibilityRole="button"
          style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={styles.emoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.desc, { color: theme.textMuted }]}>{item.desc}</Text>
          </View>
          <Text style={[styles.arrow, { color: theme.textMuted }]}>›</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  emoji: { fontSize: 22 },
  label: { fontSize: font.body, fontWeight: '700' },
  desc: { fontSize: font.tiny },
  arrow: { fontSize: 24 },
});
