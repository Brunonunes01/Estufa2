import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listManejosByPlantio, deleteManejo } from '../../services/manejoService';
import { RegistroManejo } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
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
          <MaterialCommunityIcons name="plus-circle-outline" size={28} color="#FFF" />
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
    Alert.alert(
      "Apagar Registo",
      "Deseja remover este evento do diário?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Apagar", style: "destructive", onPress: async () => {
            await deleteManejo(id);
            fetchManejos();
        }}
      ]
    );
  };

  const renderItem = ({ item }: { item: RegistroManejo }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={getManejoIcon(item.tipoManejo) as any} size={22} color="#F59E0B" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.tipoText}>
            {item.tipoManejo === 'praga_doenca' ? 'PRAGA/DOENÇA' : item.tipoManejo.toUpperCase()}
          </Text>
          <Text style={styles.dateText}>{item.dataRegistro.toDate().toLocaleString('pt-BR')}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 5 }}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
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

      <Text style={styles.respText}>Registado por: {item.responsavel || 'Sistema'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : manejos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="notebook-outline" size={60} color="#CBD5E1" />
          <Text style={styles.emptyText}>O Diário de Manejo está vazio.</Text>
          <Text style={styles.emptySub}>Toque no botão '+' para registar o primeiro evento (Clima, Praga, etc).</Text>
        </View>
      ) : (
        <FlatList
          data={manejos}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: COLORS.textSecondary, marginTop: 15 },
  emptySub: { textAlign: 'center', color: '#94A3B8', marginTop: 10 },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  tipoText: { fontWeight: 'bold', color: COLORS.textDark, fontSize: 14 },
  dateText: { color: COLORS.textSecondary, fontSize: 12 },
  
  descricao: { color: COLORS.textDark, fontSize: 14, marginBottom: 10, lineHeight: 20 },
  
  metaDataBox: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, marginTop: 5, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  metaDataText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  
  respText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', textAlign: 'right' }
});

export default ManejosHistoryScreen;