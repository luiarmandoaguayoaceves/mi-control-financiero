// Pantalla Nuevo/Editar movimiento (modal).
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Screen from '../components/Screen';
import Field from '../components/Field';
import { Chip, ChipRow } from '../components/Chip';
import { useAppData, TransactionInput } from '../hooks/useAppData';
import { useTheme } from '../hooks/useTheme';
import { font, spacing } from '../theme';
import { todayISO, parseISODate, formatDate, toISODate, round2 } from '../utils/format';
import { CATEGORY_IDS, TRANSACTION_TYPES, PAYMENT_METHODS } from '../constants';
import type { RootStackParamList } from '../navigation';
import type { TransactionType } from '../models/types';

type Route = RouteProp<RootStackParamList, 'NuevoMovimiento'>;

function parseAmount(s: string): number | null {
  const clean = s.replace(/\$|,/g, '').trim();
  if (!clean) return null;
  const n = parseFloat(clean.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? round2(n) : null;
}

export default function NewMovementScreen() {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useAppData();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const editingId = route.params?.id;
  const editing = editingId ? data?.transactions.find((t) => t.id === editingId) : undefined;

  const [type, setType] = useState<TransactionType>(editing?.type || 'expense');
  const [date, setDate] = useState(editing?.date || todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState(editing?.description || '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId || CATEGORY_IDS.despensa);
  const [paymentMethod, setPaymentMethod] = useState(editing?.paymentMethod || PAYMENT_METHODS[0]);
  const [accountId, setAccountId] = useState(editing?.accountId || '');
  const [toAccountId, setToAccountId] = useState(editing?.toAccountId || '');
  const [fundId, setFundId] = useState(editing?.fundId || '');
  const [isTdc, setIsTdc] = useState(editing?.isCreditCardPurchase || false);
  const [isPending, setIsPending] = useState(editing?.isPending || false);
  const [notes, setNotes] = useState(editing?.notes || '');
  const [hydrated, setHydrated] = useState(!!editing);

  const accounts = useMemo(() => (data?.accounts || []).filter((a) => a.active), [data]);
  const debitAccounts = accounts.filter((a) => a.type !== 'credit');
  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const categories = useMemo(
    () => (data?.categories || []).filter((c) => c.active),
    [data],
  );
  const expenseCategories = categories.filter((c) => c.group !== 'Ingreso');
  const funds = useMemo(() => (data?.funds || []).filter((f) => f.active), [data]);

  // Hidrata el formulario cuando los datos llegan (o al abrir en modo edición)
  React.useEffect(() => {
    if (!data || !editing || hydrated) return;
    setType(editing.type);
    setDate(editing.date);
    setDescription(editing.description);
    setAmount(String(editing.amount));
    setCategoryId(editing.categoryId);
    setPaymentMethod(editing.paymentMethod);
    setAccountId(editing.accountId);
    setToAccountId(editing.toAccountId || '');
    setFundId(editing.fundId || '');
    setIsTdc(editing.isCreditCardPurchase);
    setIsPending(editing.isPending);
    setNotes(editing.notes || '');
    setHydrated(true);
  }, [data, editing, hydrated]);

  // Valor por defecto de cuenta al cargar datos por primera vez
  React.useEffect(() => {
    if (!data || accountId) return;
    const valid = type === 'transfer' ? debitAccounts : accounts;
    if (valid.length > 0) setAccountId(valid[0].id);
  }, [data, accountId, type, accounts, debitAccounts]);

  const tdcEnabled = type === 'expense' && creditAccounts.length > 0;

  const onDateChange = (event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) setDate(toISODate(selected));
  };

  const save = async () => {
    const amt = parseAmount(amount);
    if (!amt) {
      Alert.alert('Revisa el monto', 'El monto debe ser un número mayor a cero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Revisa la descripción', 'Escribe una descripción corta.');
      return;
    }
    const acc = accounts.find((a) => a.id === accountId) || debitAccounts[0] || accounts[0];
    if (!acc) {
      Alert.alert('Sin cuentas', 'Crea una cuenta en Configuración primero.');
      return;
    }
    const isCardPurchase = type === 'expense' && isTdc && acc.type === 'credit';
    let cat = categoryId;
    if (type === 'income') cat = CATEGORY_IDS.ingreso;
    if (type === 'creditPayment') cat = CATEGORY_IDS.tdcPago;
    if (type === 'transfer') cat = CATEGORY_IDS.otros;

    const input: TransactionInput = {
      date,
      description: description.trim(),
      amount: amt,
      type,
      categoryId: cat,
      paymentMethod,
      accountId: acc.id,
      fundId: fundId || undefined,
      toAccountId: type === 'transfer' ? toAccountId || undefined : undefined,
      isCreditCardPurchase: isCardPurchase,
      isPending,
      notes: notes.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateTransaction(editingId, input);
      } else {
        await addTransaction(input);
      }
      navigation.goBack();
    } catch (e) {
      console.warn('Error al guardar', e);
      Alert.alert('Error', 'No se pudo guardar el movimiento.');
    }
  };

  const confirmDelete = () => {
    if (!editingId) return;
    Alert.alert('Borrar movimiento', `¿Borrar "${editing?.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(editingId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!data) return <Screen><Text style={{ color: theme.textMuted }}>Cargando…</Text></Screen>;

  return (
    <Screen keyboard>
      <Text style={[styles.title, { color: theme.text }]}>
        {editing ? 'Editar movimiento' : 'Nuevo movimiento'}
      </Text>

      <ChipRow>
        {TRANSACTION_TYPES.map((t) => (
          <Chip key={t.value} label={t.label} selected={type === t.value} onPress={() => setType(t.value)} />
        ))}
      </ChipRow>

      <View style={styles.row}>
        <Pressable onPress={() => setShowDatePicker(true)} accessibilityRole="button" style={[styles.dateBtn, { backgroundColor: theme.cardAlt }]}>
          <Text style={{ color: theme.text }}>{formatDate(date)}</Text>
        </Pressable>
        <Field label="Monto ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" flex />
      </View>
      {showDatePicker && (
        <DateTimePicker value={parseISODate(date)} mode="date" display="default" onChange={onDateChange} />
      )}

      <Field label="Descripción" value={description} onChangeText={setDescription} placeholder="Ej. Despensa semanal" />

      {type === 'expense' || type === 'income' ? (
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Categoría</Text>
          <ChipRow>
            {(type === 'expense' ? expenseCategories : categories).map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </ChipRow>
        </View>
      ) : null}

      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Método de pago</Text>
      <ChipRow>
        {PAYMENT_METHODS.map((m) => (
          <Chip key={m} label={m} selected={paymentMethod === m} onPress={() => setPaymentMethod(m)} />
        ))}
      </ChipRow>

      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Cuenta</Text>
      <ChipRow>
        {(type === 'transfer' ? debitAccounts : accounts).map((a) => (
          <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => setAccountId(a.id)} />
        ))}
      </ChipRow>

      {type === 'transfer' && (
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Cuenta destino</Text>
          <ChipRow>
            {debitAccounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={toAccountId === a.id} onPress={() => setToAccountId(a.id)} />
            ))}
          </ChipRow>
        </View>
      )}

      {tdcEnabled && (
        <View style={[styles.toggleRow, { backgroundColor: theme.cardAlt, borderRadius: 12, padding: spacing.md }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Compra con tarjeta de crédito</Text>
            <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Se suma al respaldo TDC (debe cubrirse con efectivo)</Text>
          </View>
          <Switch value={isTdc} onValueChange={setIsTdc} />
        </View>
      )}

      {type === 'income' && funds.length > 0 && (
        <View>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Apartado destino (opcional)</Text>
          <ChipRow>
            {funds.map((f) => (
              <Chip key={f.id} label={f.name} selected={fundId === f.id} onPress={() => setFundId(fundId === f.id ? '' : f.id)} />
            ))}
          </ChipRow>
        </View>
      )}

      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: theme.text }]}>Pendiente</Text>
        <Switch value={isPending} onValueChange={setIsPending} />
      </View>

      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline />

      <Pressable onPress={save} accessibilityRole="button" style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
        <Text style={styles.saveText}>{editing ? 'Guardar cambios' : 'Guardar movimiento'}</Text>
      </Pressable>

      {editing ? (
        <Pressable onPress={confirmDelete} accessibilityRole="button" style={[styles.deleteBtn, { backgroundColor: theme.dangerSoft }]}>
          <Text style={{ color: theme.danger, fontWeight: '700' }}>Borrar movimiento</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.title, fontWeight: '800', marginBottom: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  dateBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    minHeight: 42,
    justifyContent: 'center',
  },
  fieldLabel: { fontSize: font.small, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md },
  toggleLabel: { fontSize: font.body, fontWeight: '600' },
  toggleSub: { fontSize: font.tiny, marginTop: 2 },
  saveBtn: { marginTop: spacing.xl, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: font.body },
  deleteBtn: { marginTop: spacing.md, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center' },
});
