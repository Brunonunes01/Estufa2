// src/screens/Estufas/EstufaDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Share 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getEstufaById } from '../../services/estufaService';
import { listPlantiosByEstufa } from '../../services/plantioService';
import { Estufa, Plantio } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';

const EstufaDetailScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); 
  const estufaId = route?.params?.estufaId;
  const isFocused = useIsFocused();

  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwner = estufa?.userId === user?.uid;

  const loadData = async () => {
    if (!estufaId) { setLoading(false); return; }
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) { setLoading(false); return; }

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

  const handleShareLocation = async () => {
    if (!estufa?.latitude || !estufa?.longitude) return;
    const url = `http://maps.google.com/maps?q=${estufa.latitude},${estufa.longitude}`;
    const msg = `📍 Localização exata da ${estufa.nome}\nVeja no Google Maps: ${url}`;
    try {
      await Share.share({ message: msg });
    } catch (error) {
      console.error('Erro ao partilhar', error);
    }
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} color={COLORS.primary} />;

  if (!estufaId || !estufa) {
      return (
          <View style={[styles.centered, { padding: 20 }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.danger} style={{marginBottom: 10}} />
              <Text style={styles.errorText}>{!estufaId ? 'Conexão da tela perdida.' : 'Não foi possível carregar a estufa.'}</Text>
              <TouchableOpacity style={{backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 15}} onPress={() => navigation.navigate('EstufasList')}>
                  <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Voltar</Text>
              </TouchableOpacity>
          </View>
      );
  }

  const plantioAtivo = plantios.find(p => p.status !== 'finalizado');

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />}>
      
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
        
        {/* BOTÃO DE PARTILHAR GPS DA ESTUFA */}
        {estufa.latitude && estufa.longitude && (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareLocation}>
                <MaterialCommunityIcons name="map-marker-radius" size={18} color={COLORS.primary} style={{marginRight: 6}} />
                <Text style={styles.shareBtnText}>Partilhar GPS desta Estufa</Text>
            </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsContainer}>
          <Text style={styles.sectionLabel}>{plantioAtivo ? 'Ações Rápidas (Ciclo Atual)' : 'Gestão de Ciclo'}</Text>
          {plantioAtivo ? (
              <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionCard, {backgroundColor: '#ECFDF5'}]} onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })}>
                      <MaterialCommunityIcons name="basket" size={28} color="#059669" />
                      <Text style={[styles.actionCardText, {color: '#059669'}]}>Vender Colheita</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionCard, {backgroundColor: '#EFF6FF'}]} onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantioAtivo.id, estufaId: estufa.id })}>
                      <MaterialCommunityIcons name="flask" size={28} color="#3B82F6" />
                      <Text style={[styles.actionCardText, {color: '#3B82F6'}]}>Aplicar Insumo</Text>
                  </TouchableOpacity>
              </View>
          ) : (
              <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.actionCard, styles.emptyActionCard]} onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
                      <MaterialCommunityIcons name="sprout" size={36} color="#059669" />
                      <Text style={styles.emptyActionTitle}>Iniciar Novo Plantio</Text>
                      <Text style={styles.emptyActionSub}>A estufa está livre. Comece um novo ciclo.</Text>
                  </TouchableOpacity>
              </View>
          )}
      </View>

      <View style={styles.listContainer}>
          <View style={styles.listHeader}>
              <Text style={styles.sectionLabel}>Histórico de Ciclos</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}>
                  <Text style={styles.linkText}>+ Novo</Text>
              </TouchableOpacity>
          </View>

          {plantios.length === 0 ? (
              <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nenhum plantio registado ainda.</Text>
              </View>
          ) : (
              plantios.map(p => (
                  <TouchableOpacity key={p.id} style={styles.plantioItem} onPress={() => navigation.navigate('PlantioDetail', { plantioId: p.id })}>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.primary, padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 5 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  estufaTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textLight },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },
  editBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8 },
  statsGrid: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statLabel: { color: '#D1FAE5', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { color: COLORS.textLight, fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  
  shareBtn: { flexDirection: 'row', backgroundColor: COLORS.primaryLight, padding: 10, borderRadius: 8, marginTop: 15, justifyContent: 'center', alignItems: 'center' },
  shareBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },

  actionsContainer: { padding: 20, paddingBottom: 0 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 15 },
  actionCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 100, elevation: 1 },
  actionCardText: { marginTop: 8, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  emptyActionCard: { backgroundColor: '#F0FDF4', borderWidth: 2, borderColor: '#86EFAC', borderStyle: 'dashed', paddingVertical: 24 },
  emptyActionTitle: { fontSize: 16, fontWeight: '700', color: '#059669', marginTop: 8 },
  emptyActionSub: { fontSize: 13, color: '#4B5563', textAlign: 'center', marginTop: 6, paddingHorizontal: 10 },
  listContainer: { padding: 20 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  linkText: { color: COLORS.info, fontWeight: '700' },
  plantioItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, marginBottom: 10, elevation: 1 },
  plantioIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  plantioName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  plantioDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  emptyState: { padding: 20, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12 },
  emptyText: { color: COLORS.textSecondary },
  errorText: { textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: COLORS.danger, marginBottom: 8 }
});

export default EstufaDetailScreen;