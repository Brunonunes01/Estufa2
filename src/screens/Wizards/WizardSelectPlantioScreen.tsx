import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuth } from '../../hooks/useAuth';
import { listActivePlantiosByUser } from '../../services/plantioService';
import { Plantio } from '../../types/domain';
import { RootStackParamList } from '../../navigation/types';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WizardSelectPlantio'>;

const WizardSelectPlantioScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const { user, selectedTenantId } = useAuth();
  const tenantId = selectedTenantId || user?.uid;

  const { data: activePlantios, isLoading } = useQuery<Plantio[]>({
    queryKey: ['activePlantios', tenantId],
    queryFn: () => listActivePlantiosByUser(tenantId!),
    enabled: !!tenantId,
  });

  const handleSelectPlantio = (plantio: Plantio) => {
    navigation.navigate('WizardSelectActivity', { plantio });
  };

  const renderPlantioCard = ({ item }: { item: Plantio }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleSelectPlantio(item)}>
      <View style={styles.cardIcon}>
        <MaterialCommunityIcons name="sprout" size={32} color={COLORS.primary} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{item.cultura} ({item.variedade || 'N/A'})</Text>
        <Text style={styles.cardSubtitle}>Lote: {item.codigoLote}</Text>
        <Text style={styles.cardStatus}>{item.status?.replace('_', ' ')}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={activePlantios}
      renderItem={renderPlantioCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Assistente de Atividades</Text>
          <Text style={styles.subtitle}>Passo 1: Selecione o ciclo de produção que recebeu a atividade hoje.</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nenhum ciclo de produção ativo encontrado.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  cardIcon: {
    marginRight: SPACING.md,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardStatus: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default WizardSelectPlantioScreen;
