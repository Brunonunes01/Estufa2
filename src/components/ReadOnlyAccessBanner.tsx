import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { SPACING } from '../constants/theme';

type Props = {
  roleLabel?: string;
};

const ReadOnlyAccessBanner = ({ roleLabel = 'Consulta' }: Props) => (
  <View style={styles.container}>
    <MaterialCommunityIcons name="eye-lock-outline" size={18} color="#92400E" />
    <View style={styles.textWrap}>
      <Text style={styles.title}>Modo somente leitura</Text>
      <Text style={styles.subtitle}>
        Seu perfil atual ({roleLabel}) pode visualizar os dados, mas não pode criar, editar ou excluir.
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
  },
  subtitle: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '600',
  },
});

export default React.memo(ReadOnlyAccessBanner);
