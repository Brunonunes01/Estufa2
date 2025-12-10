// src/screens/Estufas/EstufaDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getEstufaById } from '../../services/estufaService';
import { listPlantiosByEstufa } from '../../services/plantioService';
import { Estufa, Plantio } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

const EstufaDetailScreen = ({ route, navigation }: any) => {
  // 1. PEGAR 'isOwner'
  const { user, selectedTenantId, isOwner } = useAuth(); 
  const { estufaId } = route.params;
  const isFocused = useIsFocused();

  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    setLoading(true);
    try {
      const estufaData = await getEstufaById(estufaId);
      setEstufa(estufaData);

      const plantiosData = await listPlantiosByEstufa(targetId, estufaId);
      
      plantiosData.sort((a, b) => {
          if (a.status === 'finalizado' && b.status !== 'finalizado') return 1;
          if (a.status !== 'finalizado' && b.status === 'finalizado') return -1;
          return b.dataPlantio.seconds - a.dataPlantio.seconds;
      });
      
      setPlantios(plantiosData);
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os detalhes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [estufaId, isFocused, selectedTenantId]);

  const handleEdit = () => {
    navigation.navigate('EstufaForm', { estufaId: estufaId });
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (!estufa) return <Text style={styles.errorText}>Estufa não encontrada.</Text>;

  const plantioAtivo = plantios.find(p => p.status !== 'finalizado');

  return (
    <ScrollView style={styles.container}>
      
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
            <MaterialCommunityIcons name="greenhouse" size={32} color="#4CAF50" />
            <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.title}>{estufa.nome}</Text>
                <Text style={styles.subtitle}>{estufa.areaM2} m² • {estufa.status.toUpperCase()}</Text>
            </View>
            
            {/* 2. TRAVA DE SEGURANÇA: Só Dono pode editar estrutura */}
            {isOwner && (
                <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                    <MaterialCommunityIcons name="pencil" size={20} color="#666" />
                </TouchableOpacity>
            )}
        </View>
        
        <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
                <Text style={styles.label}>Comprimento</Text>
                <Text style={styles.value}>{estufa.comprimentoM}m</Text>
            </View>
            <View style={styles.infoItem}>
                <Text style={styles.label}>Largura</Text>
                <Text style={styles.value}>{estufa.larguraM}m</Text>
            </View>
            <View style={styles.infoItem}>
                <Text style={styles.label}>Altura</Text>
                <Text style={styles.value}>{estufa.alturaM}m</Text>
            </View>
        </View>
      </View>

      {/* Ações de trabalho liberadas para todos */}
      {plantioAtivo && (
          <View style={styles.quickActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, {backgroundColor: '#4CAF50'}]}
                onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })}
              >
                  <MaterialCommunityIcons name="basket" size={20} color="#fff" />
                  <Text style={styles.actionText}>Colher</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, {backgroundColor: '#2196F3'}]}
                onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })}
              >
                  <MaterialCommunityIcons name="flask" size={20} color="#fff" />
                  <Text style={styles.actionText}>Aplicar</Text>
              </TouchableOpacity>
          </View>
      )}

      <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Histórico de Plantios</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
              <Text style={styles.linkText}>+ Novo Ciclo</Text>
          </TouchableOpacity>
      </View>

      {plantios.length === 0 ? (
          <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Nenhum plantio registrado nesta estufa.</Text>
              <TouchableOpacity style={styles.btnSmall} onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
                  <Text style={styles.btnSmallText}>Iniciar Primeiro Plantio</Text>
              </TouchableOpacity>
          </View>
      ) : (
          plantios.map(p => (
              <TouchableOpacity 
                key={p.id} 
                style={[styles.plantioCard, p.status === 'finalizado' && styles.plantioInactive]}
                onPress={() => navigation.navigate('PlantioDetail', { plantioId: p.id })}
              >
                  <View style={styles.plantioRow}>
                      <View>
                          <Text style={styles.plantioTitle}>{p.cultura}</Text>
                          <Text style={styles.plantioDate}>
                              Início: {p.dataPlantio.toDate().toLocaleDateString()}
                          </Text>
                      </View>
                      <View style={[styles.statusBadge, p.status === 'finalizado' ? styles.badgeGray : styles.badgeGreen]}>
                          <Text style={styles.statusText}>{p.status === 'finalizado' ? 'Finalizado' : 'Ativo'}</Text>
                      </View>
                  </View>
                  <Text style={styles.plantioInfo}>
                      {p.quantidadePlantada} {p.unidadeQuantidade} {p.variedade ? `• ${p.variedade}` : ''}
                  </Text>
              </TouchableOpacity>
          ))
      )}
      
      <View style={{height: 30}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center' },
  headerCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666' },
  editButton: { padding: 8 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  infoItem: { alignItems: 'center', flex: 1 },
  label: { fontSize: 12, color: '#888' },
  value: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  linkText: { color: '#2196F3', fontWeight: 'bold' },
  plantioCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#4CAF50', elevation: 2 },
  plantioInactive: { borderLeftColor: '#999', opacity: 0.8 },
  plantioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  plantioTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  plantioDate: { fontSize: 12, color: '#888', marginTop: 2 },
  plantioInfo: { marginTop: 8, color: '#555', fontSize: 14 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeGreen: { backgroundColor: '#E8F5E9' },
  badgeGray: { backgroundColor: '#EEE' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: '#333' },
  emptyBox: { alignItems: 'center', padding: 30, backgroundColor: '#f0f0f0', borderRadius: 10 },
  emptyText: { color: '#888', marginBottom: 10 },
  btnSmall: { padding: 8, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#ccc' },
  btnSmallText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  errorText: { textAlign: 'center', marginTop: 50, color: '#D32F2F' }
});

export default EstufaDetailScreen;