import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { font, radius, spacing } from '../theme';

export interface ModalField {
  key: string;
  label: string;
  placeholder?: string;
  value?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  multiline?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  fields: ModalField[];
  submitLabel?: string;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}

/** Modal reutilizable con campos de texto (ingresar/retirar apartado, editar metas, etc.). */
export default function ModalInput({ visible, title, fields, submitLabel = 'Guardar', onClose, onSave }: Props) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      const init: Record<string, string> = {};
      for (const f of fields) init[f.key] = f.value ?? '';
      setValues(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = () => {
    onSave(values);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {fields.map((f) => (
            <View key={f.key} style={styles.fieldWrap}>
              <Text style={[styles.label, { color: theme.textMuted }]}>{f.label}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardAlt, color: theme.text }]}
                value={values[f.key]}
                onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                keyboardType={f.keyboardType || 'default'}
                placeholder={f.placeholder}
                placeholderTextColor={theme.textMuted}
                multiline={f.multiline}
                autoCapitalize="none"
              />
            </View>
          ))}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.cardAlt }]}
              onPress={onClose}
              accessibilityRole="button"
            >
              <Text style={{ color: theme.textMuted, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.primary }]}
              onPress={save}
              accessibilityRole="button"
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{submitLabel}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: font.subtitle, fontWeight: '700' },
  fieldWrap: { gap: spacing.xs },
  label: { fontSize: font.small },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: font.body,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
});
