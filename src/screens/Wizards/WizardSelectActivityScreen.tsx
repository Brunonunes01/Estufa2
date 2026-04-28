import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { RootStackParamList } from '../../navigation/types';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

type ScreenRouteProp = RouteProp<RootStackParamList, 'WizardSelectActivity'>;
type ScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'WizardSelectActivity'>;

const ACTIVITIES = [
  { id: 'manejo', label: 'Manejo', icon: 'notebook-edit-outline', targetScreen: 'ManejoForm', color: COLORS.info },
  { id: 'aplicacao', label: 'Aplicação', icon: 'flask-outline', targetScreen: 'AplicacaoForm', color: COLORS.primaryDark },
  { id: 'venda', label: 'Colheita / Venda', icon: 'basket-outline', targetScreen: 'ColheitaForm', color: COLORS.success },
  { id: 'despesa', label: 'Despesa', icon: 'cash-minus', targetScreen: 'DespesaForm', color: COLORS.danger },
];

const WizardSelectActivityScreen = () => {
  const navigation = useNavigation<ScreenNavigationProp>();
  const route = useRoute<ScreenRouteProp>();
  const { plantio } = route.params;

  const handleSelectActivity = (targetScreen: keyof RootStackParamList) => {
    navigation.navigate(targetScreen as any, { // O 'as any' é um workaround para a complexidade de tipos do navigator
      plantioId: plantio.id,
      estufaId: plantio.estufaId,
    });
  };

  const renderActivityButton = ({ item }: { item: typeof ACTIVITIES[0] }) => (
    <TouchableOpacity 
      style={[styles.card, { borderColor: item.color }]} 
      onPress={() => handleSelectActivity(item.targetScreen as keyof RootStackParamList)}
    >
      <MaterialCommunityIcons name={item.icon as any} size={40} color={item.color} />
      <Text style={[styles.cardTitle, { color: item.color }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ciclo Selecionado</Text>
        <Text style={styles.plantioTitle}>{plantio.cultura} ({plantio.codigoLote})</Text>
        <Text style={styles.subtitle}>Passo 2: O que você deseja registrar para este ciclo?</Text>
      </View>

      <FlatList
        data={ACTIVITIES}
        renderItem={renderActivityButton}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  plantioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  grid: {
    paddingHorizontal: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.sm,
    ...SHADOWS.card,
    borderWidth: 2,
    minHeight: 150,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default WizardSelectActivityScreen;
