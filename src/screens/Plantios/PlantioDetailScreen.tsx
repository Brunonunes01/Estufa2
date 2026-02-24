// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listAplicacoesByPlantio } from '../../services/aplicacaoService';
import { calculateRentabilidadeByPlantio } from '../../services/rentabilidadeService';
import { getEstufaById } from '../../services/estufaService';
import { Plantio, Colheita } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

// --- TEMA ---
const COLORS = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  primary: '#059669',
  textDark: '#111827',
  textGray: '#6B7280',
  danger: '#EF4444',
  success: '#10B981',
  blue: '#3B82F6'
};

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); 
  
  // PROTEÇÃO 1: Evita quebra se a rota for nula
  const plantioId = route?.params?.plantioId;
  const isFocused = useIsFocused();

  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [financeiro, setFinanceiro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // PROTEÇÃO 2: Calcula se o usuário é o dono localmente
  const isOwner = plantio?.userId === user?.uid;

  const loadData = async () => {
    // PROTEÇÃO 3: Desliga o loading se não tiver o ID ou o usuário!
    if (!plantioId) {
        setLoading(false);
        return;
    }

    const targetId = selectedTenantId || user?.uid;
    if (!targetId) {
        setLoading(false);
        return;
    }

    setLoading(true);
    try {
      const p = await getPlantioById(plantioId);
      if (p) {
        setPlantio(p);
        
        // Só tenta buscar estufa se o plantio existir
        const estufa = await getEstufaById(p.estufaId);
        const area = estufa?.areaM2 || 0;

        const [listaColheitas, , rentabilidade] = await Promise.all([
            listColheitasByPlantio(targetId, plantioId),
            listAplicacoesByPlantio(targetId, plantioId),
            calculateRentabilidadeByPlantio(targetId, plantioId, area)
        ]);

        setColheitas(listaColheitas);
        setFinanceiro(rentabilidade);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false); // Garante que o loading sempre para!
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [plantioId, isFocused, selectedTenantId]);

  const handleFinalizar = () => {
    Alert.alert("Finalizar", "Deseja encerrar este ciclo?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Finalizar", onPress: async () => {
            await updatePlantioStatus(plantioId, 'finalizado');
            navigation.goBack();
        }}
    ]);
  };

  // --- TELA DE CARREGAMENTO ---
  if (loading) {
      return <ActivityIndicator size="large" style={{flex:1, justifyContent:'center'}} color={COLORS.primary} />;
  }

  // --- TELA DE ERRO BLINDADA ---
  if (!plantioId || !plantio) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', padding: 20}}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.danger} style={{marginBottom: 10}} />
              <Text style={{textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: COLORS.danger, marginBottom: 8}}>
                  {!plantioId ? 'ID do plantio não encontrado.' : 'Não foi possível carregar o plantio.'}
              </Text>
              <Text style={{textAlign: 'center', color: '#666', marginBottom: 20}}>
                  Volte para a estufa e tente abrir novamente.
              </Text>
              <TouchableOpacity 
                  style={{backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8}}
                  onPress={() => navigation.goBack()}
              >
                  <Text style={{color: '#FFF', fontWeight: 'bold'}}>Voltar</Text>
              </TouchableOpacity>
          </View>
      );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>
      
      {/* HEADER SIMPLES */}
      <View style={styles.header}>
        <View>
            <Text style={styles.title}>{plantio.cultura}</Text>
            <Text style={styles.subTitle}>{plantio.variedade || 'Variedade Comum'}</Text>
        </View>
        <View style={[styles.badge, plantio.status === 'finalizado' ? {backgroundColor:'#E5E7EB'} : {backgroundColor:'#D1FAE5'}]}>
            <Text style={[styles.badgeText, plantio.status === 'finalizado' ? {color:'#6B7280'} : {color:'#059669'}]}>
                {plantio.status === 'finalizado' ? 'Finalizado' : 'Em Andamento'}
            </Text>
        </View>
      </View>

      {/* CARD FINANCEIRO DARK MODE */}
      {financeiro && (
          <View style={styles.financeCard}>
              <View style={styles.financeHeader}>
                  <Text style={styles.financeTitle}>Lucro Bruto do Ciclo</Text>
                  <MaterialCommunityIcons name="trending-up" size={24} color="#FFF" />
              </View>
              
              <Text style={[styles.lucroValue, { color: financeiro.lucroBruto >= 0 ? '#FFF' : '#FCA5A5' }]}>
                  R$ {financeiro.lucroBruto.toFixed(2)}
              </Text>

              <View style={styles.financeDivider} />
              
              <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Receita Vendas</Text>
                  <Text style={[styles.financeNum, {color: '#6EE7B7'}]}>+ R$ {financeiro.receitaTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Custos Totais</Text>
                  <Text style={[styles.financeNum, {color: '#FCA5A5'}]}>- R$ {financeiro.custoTotal.toFixed(2)}</Text>
              </View>
          </View>
      )}

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.gridBtns}>
          <TouchableOpacity 
            style={[styles.btnAction, {backgroundColor: COLORS.card, borderColor: COLORS.primary}]}
            onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="basket-plus" size={24} color={COLORS.primary} />
              <Text style={[styles.btnText, {color: COLORS.primary}]}>Nova Venda</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnAction, {backgroundColor: COLORS.card, borderColor: COLORS.blue}]}
            onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="flask-plus" size={24} color={COLORS.blue} />
              <Text style={[styles.btnText, {color: COLORS.blue}]}>Nova Aplicação</Text>
          </TouchableOpacity>
      </View>

      {/* LISTA RECENTE */}
      <Text style={styles.sectionTitle}>Últimas Vendas</Text>
      
      {colheitas.length === 0 ? (
          <View style={{padding: 20, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center'}}>
              <Text style={{color: COLORS.textGray}}>Nenhuma venda registrada neste ciclo.</Text>
          </View>
      ) : (
          colheitas.slice(0, 5).map(c => (
              <View key={c.id} style={styles.listItem}>
                  <View style={styles.listIcon}>
                      <MaterialCommunityIcons name="cash" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{flex:1}}>
                      <Text style={styles.listMain}>{c.quantidade} {c.unidade}</Text>
                      <Text style={styles.listSub}>{c.dataColheita.toDate().toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.listValue}>R$ {(c.quantidade * (c.precoUnitario || 0)).toFixed(2)}</Text>
              </View>
          ))
      )}

      {isOwner && plantio.status !== 'finalizado' && (
          <TouchableOpacity style={styles.dangerBtn} onPress={handleFinalizar}>
              <Text style={styles.dangerText}>Finalizar este Ciclo</Text>
          </TouchableOpacity>
      )}
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: 16, color: COLORS.textGray },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  financeCard: { backgroundColor: '#1F2937', padding: 20, borderRadius: 16, marginBottom: 25, shadowColor: "#000", shadowOffset: {width:0, height:4}, shadowOpacity: 0.2, elevation: 5 },
  financeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  financeTitle: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  lucroValue: { color: '#FFF', fontSize: 32, fontWeight: '800' },
  financeDivider: { height: 1, backgroundColor: '#374151', marginVertical: 15 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  financeLabel: { color: '#D1D5DB', fontSize: 14 },
  financeNum: { fontWeight: '700', fontSize: 14 },

  gridBtns: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  btnAction: { flex: 1, height: 80, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  btnText: { fontWeight: '700', marginTop: 8 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 15 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  listIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listMain: { fontWeight: '700', color: COLORS.textDark },
  listSub: { fontSize: 12, color: COLORS.textGray },
  listValue: { fontWeight: '700', color: COLORS.primary },

  dangerBtn: { marginTop: 20, padding: 15, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 12, alignItems: 'center' },
  dangerText: { color: COLORS.danger, fontWeight: '700' }
});

export default PlantioDetailScreen;