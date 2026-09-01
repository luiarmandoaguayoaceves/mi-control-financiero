// Pantalla Patrimonio: activos, pasivos, patrimonio neto y evolución.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import BarChart from '../components/BarChart';
import ModalInput from '../components/ModalInput';
import EmptyState from '../components/EmptyState';
import { useAppData } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';
import { money, formatMonthKeyShort, toMonthKey } from '../utils/format';
import { netWorth, totalCardDebt, msiPendingTotal } from '../services/financeService';
import type { Asset, Liability } from '../models/types';

export default function AssetsScreen() {
  const { data, upsertAsset, deleteAsset, upsertLiability, deleteLiability } = useAppData();
  const theme = useTheme();
  const [assetModal, setAssetModal] = useState<{ asset?: Asset } | null>(null);
  const [liabModal, setLiabModal] = useState<{ liability?: Liability } | null>(null);

  const m = useMemo(() => {
    if (!data) return null;
    const totalAssets = data.assets.reduce((a, x) => a + x.estimatedValue, 0);
    const totalLiabilities = data.liabilities.reduce((a, x) => a + x.outstandingBalance, 0);
    const cardDebt = totalCardDebt(data.creditCards);
    const instDebt = msiPendingTotal(data.installmentPurchases);
    return {
      totalAssets,
      totalLiabilities,
      cardDebt,
      instDebt,
      net: netWorth(totalAssets, totalLiabilities, cardDebt, instDebt),
      evolution: data.snapshots
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({ label: formatMonthKeyShort(toMonthKey(new Date(s.date + 'T00:00:00'))), value: s.netWorth })),
    };
  }, [data]);

  if (!data || !m) return <Screen><EmptyState message="Cargando…" /></Screen>;

  const saveAsset = async (values: Record<string, string>) => {
    const name = values.name?.trim();
    const value = parseFloat((values.value || '').replace(',', '.'));
    if (!name || !Number.isFinite(value)) return;
    if (assetModal?.asset) {
      await upsertAsset({ ...assetModal.asset, name, estimatedValue: value, notes: values.notes || undefined });
    } else {
      await upsertAsset({
        id: `as-${Date.now()}`,
        name,
        estimatedValue: value,
        type: values.type?.trim() || 'Otro',
        notes: values.notes || undefined,
      });
    }
  };

  const saveLiability = async (values: Record<string, string>) => {
    const name = values.name?.trim();
    const value = parseFloat((values.value || '').replace(',', '.'));
    if (!name || !Number.isFinite(value)) return;
    if (liabModal?.liability) {
      await upsertLiability({ ...liabModal.liability, name, outstandingBalance: value });
    } else {
      await upsertLiability({
        id: `li-${Date.now()}`,
        name,
        outstandingBalance: value,
        type: values.type?.trim() || 'Préstamo',
      });
    }
  };

  return (
    <Screen>
      <SectionCard title="Patrimonio neto">
        <Text style={[styles.netWorth, { color: m.net >= 0 ? theme.success : theme.danger }]} adjustsFontSizeToFit numberOfLines={1}>
          {money(m.net)}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Activos {money(m.totalAssets)} − Pasivos {money(m.totalLiabilities)} − TDC {money(m.cardDebt)} − MSI {money(m.instDebt)}
        </Text>
      </SectionCard>

      <SectionCard
        title="Activos"
        action={
          <Pressable onPress={() => setAssetModal({})} accessibilityRole="button" style={[styles.addBtn, { backgroundColor: theme.primarySoft }]}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>+ Agregar</Text>
          </Pressable>
        }
      >
        {data.assets.length === 0 ? (
          <EmptyState message="Sin activos registrados" />
        ) : (
          data.assets.map((a) => (
            <View key={a.id} style={[styles.item, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.text }]}>{a.name}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>{a.type}{a.notes ? ` · ${a.notes}` : ''}</Text>
              </View>
              <Text style={[styles.itemValue, { color: theme.success }]}>{money(a.estimatedValue)}</Text>
              <Pressable onPress={() => setAssetModal({ asset: a })} accessibilityRole="button" style={[styles.miniBtn, { backgroundColor: theme.cardAlt }]}>
                <Text style={{ color: theme.textMuted, fontSize: font.tiny }}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => deleteAsset(a.id)} accessibilityRole="button" style={[styles.miniBtn, { backgroundColor: theme.dangerSoft }]}>
                <Text style={{ color: theme.danger, fontSize: font.tiny }}>Borrar</Text>
              </Pressable>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Pasivos"
        action={
          <Pressable onPress={() => setLiabModal({})} accessibilityRole="button" style={[styles.addBtn, { backgroundColor: theme.primarySoft }]}>
            <Text style={{ color: theme.primary, fontWeight: '700' }}>+ Agregar</Text>
          </Pressable>
        }
      >
        {data.liabilities.length === 0 ? (
          <EmptyState message="Sin pasivos registrados" />
        ) : (
          data.liabilities.map((l) => (
            <View key={l.id} style={[styles.item, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: theme.text }]}>{l.name}</Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>{l.type}</Text>
              </View>
              <Text style={[styles.itemValue, { color: theme.danger }]}>{money(l.outstandingBalance)}</Text>
              <Pressable onPress={() => setLiabModal({ liability: l })} accessibilityRole="button" style={[styles.miniBtn, { backgroundColor: theme.cardAlt }]}>
                <Text style={{ color: theme.textMuted, fontSize: font.tiny }}>Editar</Text>
              </Pressable>
              <Pressable onPress={() => deleteLiability(l.id)} accessibilityRole="button" style={[styles.miniBtn, { backgroundColor: theme.dangerSoft }]}>
                <Text style={{ color: theme.danger, fontSize: font.tiny }}>Borrar</Text>
              </Pressable>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Evolución del patrimonio">
        {m.evolution.length === 0 ? (
          <EmptyState message="Aún no hay histórico" />
        ) : (
          <BarChart data={m.evolution} formatValue={money} />
        )}
      </SectionCard>

      <ModalInput
        visible={!!assetModal}
        title={assetModal?.asset ? 'Editar activo' : 'Nuevo activo'}
        fields={[
          { key: 'name', label: 'Nombre', value: assetModal?.asset?.name || '', placeholder: 'Ej. KTM RC 200' },
          { key: 'value', label: 'Valor estimado ($)', keyboardType: 'decimal-pad', value: assetModal?.asset ? String(assetModal.asset.estimatedValue) : '' },
          { key: 'type', label: 'Tipo', value: assetModal?.asset?.type || '', placeholder: 'Vehículo, efectivo, inversión…' },
          { key: 'notes', label: 'Notas', value: assetModal?.asset?.notes || '' },
        ]}
        onClose={() => setAssetModal(null)}
        onSave={saveAsset}
      />
      <ModalInput
        visible={!!liabModal}
        title={liabModal?.liability ? 'Editar pasivo' : 'Nuevo pasivo'}
        fields={[
          { key: 'name', label: 'Nombre', value: liabModal?.liability?.name || '' },
          { key: 'value', label: 'Saldo ($)', keyboardType: 'decimal-pad', value: liabModal?.liability ? String(liabModal.liability.outstandingBalance) : '' },
          { key: 'type', label: 'Tipo', value: liabModal?.liability?.type || '', placeholder: 'Préstamo, deuda…' },
        ]}
        onClose={() => setLiabModal(null)}
        onSave={saveLiability}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  netWorth: { fontSize: 32, fontWeight: '800' },
  meta: { fontSize: font.tiny },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemName: { fontSize: font.body, fontWeight: '600' },
  itemValue: { fontSize: font.body, fontWeight: '700' },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  miniBtn: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 6 },
});
