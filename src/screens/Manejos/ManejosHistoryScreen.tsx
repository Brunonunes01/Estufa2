import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listManejosByPlantio, deleteManejo } from '../../services/manejoService';
import { RegistroManejo } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useIsFocused } from '@react-navigation/native';

const getManejoIcon = (tipo: string) => {
  switch(tipo) {
    case 'clima': return 'weather-partly-cloudy';
    case 'praga_doenca': return 'bug';
    default: return 'notebook';
  }
};

const ManejosHistoryScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const plantioId = route.params?.plantioId;
  const estufaId = route.params?.estufaId;
  
  const [manejos, setManejos] = useState<RegistroManejo[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('ManejoForm', { plantioId, estufaId })}
          style={{ marginRight: 15 }}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color={COLORS.textLight} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, plantioId, estufaId]);

  const fetchManejos = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !plantioId) return;

    setLoading(true);
    try {
      const data = await listManejosByPlantio(targetId, plantioId);
      setManejos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchManejos();
  }, [isFocused, selectedTenantId, plantioId]);

  const handleDelete = (id: string) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    Alert.alert(
      "Apagar Registo",
      "Deseja remover este evento do diário?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: async () => {
            await deleteManejo(id, targetId);
            fetchManejos();
        }}
      ]
    );
  };

  const renderItem = ({ item }: { item: RegistroManejo }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={getManejoIcon(item.tipoManejo) as any} size={22} color={COLORS.textLight} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.tipoText}>
            {item.tipoManejo === 'praga_doenca' ? 'PRAGA/DOENÇA' : item.tipoManejo.toUpperCase()}
          </Text>
          <Text style={styles.dateText}>{item.dataRegistro.toDate().toLocaleString('pt-BR')}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 5 }}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.descricao}>{item.descricao}</Text>

      {/* Exibição condicional de dados específicos */}
      {(item.temperatura || item.umidade) && (
          <View style={styles.metaDataBox}>
            {item.temperatura && <Text style={styles.metaDataText}>Temperatura: {item.temperatura}°C</Text>}
            {item.umidade && <Text style={styles.metaDataText}>Umidade: {item.umidade}%</Text>}
          </View>
      )}

      {item.severidade && (
          <View style={styles.metaDataBox}>
            <Text style={styles.metaDataText}>Nível de Severidade: {item.severidade.toUpperCase()}</Text>
          </View>
      )}

      {item.fotos && item.fotos.length > 0 && (
        <View style={styles.metaDataBox}>
          <Text style={styles.metaDataText}>Registros visuais: {item.fotos.length} foto(s)</Text>
        </View>
      )}

      <Text style={styles.respText}>Registado por: {item.responsavel || 'Sistema'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : manejos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="notebook-outline" size={60} color={COLORS.textLight} />
          <Text style={styles.emptyText}>O Diário de Manejo está vazio.</Text>
          <Text style={styles.emptySub}>Toque no botão '+' para registar o primeiro evento (Clima, Praga, etc).</Text>
        </View>
      ) : (
        <FlatList
          data={manejos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.xl }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textSecondary, marginTop: 15 },
  emptySub: { textAlign: 'center', color: COLORS.textPrimary, marginTop: 10 },
  
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cFEF3C7, justifyContent: 'center', alignItems: 'center' },
  tipoText: { fontWeight: 'bold', color: COLORS.textDark, fontSize: 14 },
  dateText: { color: COLORS.textSecondary, fontSize: 12 },
  
  descricao: { color: COLORS.textDark, fontSize: 14, marginBottom: 10, lineHeight: 20 },
  
  metaDataBox: { backgroundColor: COLORS.surfaceMuted, padding: 10, borderRadius: RADIUS.sm, marginTop: 5, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  metaDataText: { fontSize: 12, color: COLORS.c475569, fontWeight: '600' },
  
  respText: { fontSize: 11, color: COLORS.textPrimary, fontStyle: 'italic', textAlign: 'right' }
});

export default ManejosHistoryScreen;
