// src/screens/Fornecedores/FornecedoresListScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listFornecedores } from '../../services/fornecedorService';
import { Fornecedor } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const FornecedoresListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); // <--- ID SELECIONADO
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const load = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
        const lista = await listFornecedores(idBusca); // <--- BUSCA CORRETA
        setFornecedores(lista);
    } catch(e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, selectedTenantId]);

  return (
    <View style={styles.container}>
      <FlatList
        data={fornecedores}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Nenhum fornecedor encontrado nesta conta.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.item} 
            onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: item.id })}
          >
            <View style={styles.header}>
              <Text style={styles.name}>{item.nome}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textPlaceholder} />
            </View>
            {item.telefone ? <Text style={styles.info}>{item.telefone}</Text> : <Text style={styles.info}>Sem telefone cadastrado</Text>}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('FornecedorForm')}
      >
        <MaterialCommunityIcons name="plus" size={30} color={COLORS.textLight} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  item: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary },
  info: { color: COLORS.textSecondary, marginTop: 6 },
  empty: { textAlign: 'center', marginTop: 50, color: COLORS.textSecondary },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.warning, alignItems: 'center', justifyContent: 'center', ...SHADOWS.floating }
});

export default FornecedoresListScreen;
