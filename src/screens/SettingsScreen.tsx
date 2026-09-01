// Pantalla Configuración: exportar, cuentas, tarjeta, categorías, ajustes.
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import ModalInput from '../components/ModalInput';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';
import { money } from '../utils/format';
import type { Account, CreditCard, Category } from '../models/types';

export default function SettingsScreen() {
  const { data, exportJSON, resetData, updateAccount, updateCreditCard, upsertCategory, updateSettings } = useAppData();
  const theme = useTheme();
  const [accModal, setAccModal] = useState<Account | null>(null);
  const [cardModal, setCardModal] = useState<CreditCard | null>(null);
  const [incomeModal, setIncomeModal] = useState(false);

  if (!data) return <Screen><EmptyState message="Cargando…" /></Screen>;

  const toggleCategory = (c: Category) => upsertCategory({ ...c, active: !c.active });

  const saveAccount = async (values: Record<string, string>) => {
    if (!accModal) return;
    const balance = parseFloat((values.balance || '').replace(',', '.'));
    await updateAccount({
      ...accModal,
      name: values.name?.trim() || accModal.name,
      balance: Number.isFinite(balance) ? balance : accModal.balance,
    });
  };

  const saveCard = async (values: Record<string, string>) => {
    if (!cardModal) return;
    const cut = parseInt(values.cutDay || '', 10);
    const limit = parseFloat((values.limit || '').replace(',', '.'));
    await updateCreditCard({
      ...cardModal,
      cutDay: Number.isFinite(cut) && cut >= 1 && cut <= 28 ? cut : cardModal.cutDay,
      creditLimit: Number.isFinite(limit) && limit > 0 ? limit : cardModal.creditLimit,
      availableCredit: Number.isFinite(limit) && limit > 0 ? limit - cardModal.currentBalance : cardModal.availableCredit,
    });
  };

  const saveIncome = async (values: Record<string, string>) => {
    const v = parseFloat((values.income || '').replace(',', '.'));
    await updateSettings({ ...data.settings, monthlyIncome: Number.isFinite(v) && v >= 0 ? v : undefined });
  };

  const confirmReset = () => {
    Alert.alert(
      'Restablecer datos',
      'Se borrarán todos tus datos y volverán los iniciales. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restablecer', style: 'destructive', onPress: () => resetData() },
      ],
    );
  };

  const card = data.creditCards.find((c) => c.active) || data.creditCards[0];

  return (
    <Screen>
      <SectionCard title="Datos">
        <Pressable onPress={exportJSON} accessibilityRole="button" style={[styles.btn, { backgroundColor: theme.primary }]}>
          <Text style={styles.btnText}>Exportar respaldo JSON</Text>
        </Pressable>
        <Pressable onPress={() => setIncomeModal(true)} accessibilityRole="button" style={[styles.btn, { backgroundColor: theme.primarySoft }]}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>
            Ingreso mensual estimado: {data.settings.monthlyIncome ? money(data.settings.monthlyIncome) : 'no definido'}
          </Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          El ingreso estimado solo se usa para calcular % de MSI y tasa de ahorro.
        </Text>
      </SectionCard>

      <SectionCard title="Cuentas">
        {data.accounts.map((a) => (
          <View key={a.id} style={[styles.row, { borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, { color: theme.text }]}>{a.name}</Text>
              <Text style={[styles.hint, { color: theme.textMuted }]}>{a.type} · {a.institution || '—'}</Text>
            </View>
            <Text style={[styles.rowValue, { color: theme.text }]}>{money(a.balance)}</Text>
            <Pressable onPress={() => setAccModal(a)} accessibilityRole="button" style={[styles.miniBtn, { backgroundColor: theme.cardAlt }]}>
              <Text style={{ color: theme.textMuted, fontSize: font.tiny, fontWeight: '700' }}>Editar</Text>
            </Pressable>
          </View>
        ))}
      </SectionCard>

      {card ? (
        <SectionCard title="Tarjeta de crédito">
          <View style={[styles.row, { borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, { color: theme.text }]}>{card.name}</Text>
              <Text style={[styles.hint, { color: theme.textMuted }]}>
                Corte día {card.cutDay} · Línea {money(card.creditLimit)} · {card.points} pts
              </Text>
            </View>
            <Pressable onPress={() => setCardModal(card)} accessibilityRole="button" style={[styles.miniBtn, { backgroundColor: theme.cardAlt }]}>
              <Text style={{ color: theme.textMuted, fontSize: font.tiny, fontWeight: '700' }}>Editar</Text>
            </Pressable>
          </View>
        </SectionCard>
      ) : null}

      <SectionCard title="Categorías">
        {data.categories.map((c) => (
          <View key={c.id} style={[styles.row, { borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowName, { color: theme.text, opacity: c.active ? 1 : 0.4 }]}>{c.name}</Text>
              <Text style={[styles.hint, { color: theme.textMuted }]}>{c.group}</Text>
            </View>
            <Switch value={c.active} onValueChange={() => toggleCategory(c)} accessibilityLabel={`Activar ${c.name}`} />
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Zona de riesgo">
        <Pressable onPress={confirmReset} accessibilityRole="button" style={[styles.btn, { backgroundColor: theme.dangerSoft }]}>
          <Text style={{ color: theme.danger, fontWeight: '700' }}>Restablecer a datos iniciales</Text>
        </Pressable>
      </SectionCard>

      <SectionCard title="Seguridad">
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          • Nunca se almacenan contraseñas, NIP, CVV o tokens bancarios.
          {'\n'}• No se piden números completos de tarjeta (solo los últimos 4).
          {'\n'}• Todos tus datos viven localmente en tu teléfono (v1).
          {'\n'}• Modo oscuro: sigue la configuración del sistema.
        </Text>
      </SectionCard>

      <ModalInput
        visible={!!accModal}
        title={accModal ? `Cuenta: ${accModal.name}` : ''}
        fields={[
          { key: 'name', label: 'Nombre', value: accModal?.name || '' },
          { key: 'balance', label: 'Saldo ($)', keyboardType: 'decimal-pad', value: accModal ? String(accModal.balance) : '' },
        ]}
        onClose={() => setAccModal(null)}
        onSave={saveAccount}
      />
      <ModalInput
        visible={!!cardModal}
        title="Editar tarjeta"
        fields={[
          { key: 'cutDay', label: 'Día de corte (1-28)', keyboardType: 'numeric', value: cardModal ? String(cardModal.cutDay) : '' },
          { key: 'limit', label: 'Línea de crédito ($)', keyboardType: 'decimal-pad', value: cardModal ? String(cardModal.creditLimit) : '' },
        ]}
        onClose={() => setCardModal(null)}
        onSave={saveCard}
      />
      <ModalInput
        visible={incomeModal}
        title="Ingreso mensual estimado"
        fields={[
          { key: 'income', label: 'Monto ($)', keyboardType: 'decimal-pad', value: data.settings.monthlyIncome ? String(data.settings.monthlyIncome) : '' },
        ]}
        onClose={() => setIncomeModal(false)}
        onSave={saveIncome}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.sm },
  btnText: { color: '#FFFFFF', fontWeight: '700' },
  hint: { fontSize: font.tiny },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  rowName: { fontSize: font.body, fontWeight: '600' },
  rowValue: { fontSize: font.body, fontWeight: '700' },
  miniBtn: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: 6 },
});
