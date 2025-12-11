// src/screens/Estufas/EstufaDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getEstufaById } from '../../services/estufaService';
import { listPlantiosByEstufa } from '../../services/plantioService';
import { Estufa, Plantio } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

// --- TEMA ---
const COLORS = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#059669',
  textDark: '#111827',
  textGray: '#6B7280',
  border: '#E5E7EB',
  secondary: '#3B82F6',
  danger: '#EF4444', // <--- CORREÇÃO: Adicionado danger
};

const EstufaDetailScreen = ({ route, navigation }: any) => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [estufaId, isFocused, selectedTenantId]);

  if (loading && !estufa) return <ActivityIndicator size="large" style={styles.centered} color={COLORS.primary} />;
  if (!estufa) return <Text style={styles.errorText}>Estufa não encontrada.</Text>;

  const plantioAtivo = plantios.find(p => p.status !== 'finalizado');

  return (
    <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />}
    >
      
      {/* HEADER TIPO CAPA */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
            <View>
                <Text style={styles.estufaTitle}>{estufa.nome}</Text>
                <View style={styles.statusPill}>
                    <View style={[styles.dot, {backgroundColor: estufa.status === 'ativa' ? '#10B981' : '#EF4444'}]} />
                    <Text style={styles.statusText}>{estufa.status.toUpperCase()}</Text>
                </View>
            </View>
            {isOwner && (
                <TouchableOpacity onPress={() => navigation.navigate('EstufaForm', { estufaId: estufa.id })} style={styles.editBtn}>
                    <MaterialCommunityIcons name="pencil" size={20} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.statsGrid}>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Área Total</Text>
                <Text style={styles.statValue}>{estufa.areaM2} m²</Text>
            </View>
            <View style={[styles.statItem, styles.statBorder]}>
                <Text style={styles.statLabel}>Dimensões</Text>
                <Text style={styles.statValue}>{estufa.comprimentoM}x{estufa.larguraM}x{estufa.alturaM}</Text>
            </View>
            <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ciclos</Text>
                <Text style={styles.statValue}>{plantios.length}</Text>
            </View>
        </View>
      </View>

      {/* AÇÕES OPERACIONAIS */}
      {plantioAtivo && (
          <View style={styles.actionsContainer}>
              <Text style={styles.sectionLabel}>Ações Rápidas (Ciclo Atual)</Text>
              <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionCard, {backgroundColor: '#ECFDF5'}]}
                    onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })}
                  >
                      <MaterialCommunityIcons name="basket" size={28} color="#059669" />
                      <Text style={[styles.actionCardText, {color: '#059669'}]}>Registrar Colheita</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionCard, {backgroundColor: '#EFF6FF'}]}
                    onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })}
                  >
                      <MaterialCommunityIcons name="flask" size={28} color="#3B82F6" />
                      <Text style={[styles.actionCardText, {color: '#3B82F6'}]}>Registrar Aplicação</Text>
                  </TouchableOpacity>
              </View>
          </View>
      )}

      {/* LISTA DE CICLOS */}
      <View style={styles.listContainer}>
          <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>Histórico de Ciclos</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
                  <Text style={styles.linkText}>+ Novo</Text>
              </TouchableOpacity>
          </View>

          {plantios.length === 0 ? (
              <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nenhum plantio iniciado.</Text>
              </View>
          ) : (
              plantios.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={styles.plantioItem}
                    onPress={() => navigation.navigate('PlantioDetail', { plantioId: p.id })}
                  >
                      <View style={styles.plantioIcon}>
                          <MaterialCommunityIcons name="sprout" size={24} color={p.status === 'finalizado' ? '#9CA3AF' : COLORS.primary} />
                      </View>
                      <View style={{flex: 1}}>
                          <Text style={styles.plantioName}>{p.cultura}</Text>
                          <Text style={styles.plantioDetail}>{p.quantidadePlantada} {p.unidadeQuantidade} • {p.dataPlantio.toDate().toLocaleDateString()}</Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
                  </TouchableOpacity>
              ))
          )}
      </View>
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center' },
  
  // Header Estilizado
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    elevation: 5,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  estufaTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8 },

  statsGrid: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statLabel: { color: '#D1FAE5', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 2 },

  // Ações
  actionsContainer: { padding: 20, paddingBottom: 0 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 15 },
  actionCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 100 },
  actionCardText: { marginTop: 8, fontWeight: '700', fontSize: 13 },

  // Lista
  listContainer: { padding: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  linkText: { color: COLORS.secondary, fontWeight: '700' },
  
  plantioItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 12, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 1 },
  plantioIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  plantioName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  plantioDetail: { fontSize: 12, color: COLORS.textGray, marginTop: 2 },

  emptyState: { padding: 20, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12 },
  emptyText: { color: COLORS.textGray },
  errorText: { textAlign: 'center', marginTop: 50, color: COLORS.danger }
});

export default EstufaDetailScreen;