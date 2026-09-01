import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  padded?: boolean;
}

/** Contenedor base de pantalla: SafeArea + fondo del tema + scroll opcional. */
export default function Screen({ children, scroll = true, keyboard = false, padded = true }: Props) {
  const theme = useTheme();
  const content = padded ? <View style={{ padding: spacing.lg }}>{children}</View> : children;

  let body: React.ReactNode;
  if (scroll) {
    body = (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
      >
        {content}
      </ScrollView>
    );
  } else {
    body = <View style={styles.flex}>{content}</View>;
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
