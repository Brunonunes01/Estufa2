// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { calculateRentabilidadeByPlantio } from '../../services/rentabilidadeService';
import { getEstufaById } from '../../services/estufaService';
import { Plantio } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// CORRIGIDO: Adicionado o hífen no @react-navigation
import { useIsFocused } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); 
  
  const plantioId = route?.params?.plantioId;
  const isFocused = useIsFocused();

  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [financeiro, setFinanceiro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = plantio?.userId === user?.uid;

  const loadData = async () => {
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
      const p = await getPlantioById(plantioId, targetId);
      if (p) {
        setPlantio(p);
        
        const estufa = await getEstufaById(p.estufaId, targetId);
        const area = estufa?.areaM2 || 0;

        const rentabilidade = await calculateRentabilidadeByPlantio(targetId, plantioId, area);
        setFinanceiro(rentabilidade);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) loadData();
  }, [plantioId, isFocused, selectedTenantId]);

  const handleFinalizar = () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    Alert.alert("Finalizar", "Deseja encerrar este ciclo?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim, Finalizar", onPress: async () => {
            await updatePlantioStatus(plantioId, 'finalizado', targetId);
            navigation.goBack();
        }}
    ]);
  };

  if (loading) {
      return <ActivityIndicator size="large" style={{flex:1, justifyContent:'center'}} color={COLORS.primary} />;
  }

  if (!plantioId || !plantio) {
      return (
          <View style={{flex:1, justifyContent:'center', alignItems:'center', padding: 20}}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={COLORS.danger} style={{marginBottom: 10}} />
              <Text style={{textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: COLORS.danger, marginBottom: 8}}>
                  Não foi possível carregar o plantio.
              </Text>
              <TouchableOpacity 
                  style={{backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 10}}
                  onPress={() => navigation.goBack()}
              >
                  <Text style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>Voltar</Text>
              </TouchableOpacity>
          </View>
      );
  }

  const isPlantioInactive = plantio.status === 'finalizado' || plantio.status === 'cancelado';
  const statusLabel = plantio.status === 'cancelado' ? 'Cancelado' : plantio.status === 'finalizado' ? 'Finalizado' : 'Em Andamento';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}>
      
      {/* HEADER E SELO DE RASTREABILIDADE */}
      <View style={styles.header}>
        <View style={{flex: 1}}>
            <Text style={styles.title}>{plantio.cultura}</Text>
            <Text style={styles.subTitle}>{plantio.variedade || 'Variedade Comum'}</Text>
            <View style={styles.loteBadge}>
              <MaterialCommunityIcons name="barcode-scan" size={14} color={COLORS.textLight} />
              <Text style={styles.loteText}> LOTE: {plantio.codigoLote || 'Não gerado'}</Text>
            </View>
        </View>
        <View style={[styles.badge, isPlantioInactive ? {backgroundColor:COLORS.cE5E7EB} : {backgroundColor:COLORS.cD1FAE5}]}>
            <Text style={[styles.badgeText, isPlantioInactive ? {color:COLORS.c6B7280} : {color: COLORS.success}]}>
                {statusLabel}
            </Text>
        </View>
      </View>

      {/* CARD FINANCEIRO */}
      {financeiro && (
          <View style={styles.financeCard}>
              <View style={styles.financeHeader}>
                  <Text style={styles.financeTitle}>Lucro Bruto do Ciclo</Text>
                  <MaterialCommunityIcons name="trending-up" size={24} color={COLORS.textLight} />
              </View>
              <Text style={[styles.lucroValue, { color: financeiro.lucroBruto >= 0 ? COLORS.textLight : COLORS.cFCA5A5 }]}>
                  R$ {financeiro.lucroBruto.toFixed(2)}
              </Text>
              <View style={styles.financeDivider} />
              <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Receita Vendas</Text>
                  <Text style={[styles.financeNum, {color: COLORS.c6EE7B7}]}>+ R$ {financeiro.receitaTotal.toFixed(2)}</Text>
              </View>
              <View style={styles.financeRow}>
                  <Text style={styles.financeLabel}>Custos Totais</Text>
                  <Text style={[styles.financeNum, {color: COLORS.cFCA5A5}]}>- R$ {financeiro.custoTotal.toFixed(2)}</Text>
              </View>
          </View>
      )}

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.gridBtns}>
          <TouchableOpacity 
            style={[styles.btnAction, {borderColor: COLORS.primary}]}
            onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="basket-plus" size={26} color={COLORS.primary} />
              <Text style={[styles.btnText, {color: COLORS.primary}]}>Registrar Venda</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnAction, {borderColor: COLORS.blue}]}
            onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="flask-plus" size={26} color={COLORS.blue} />
              <Text style={[styles.btnText, {color: COLORS.blue}]}>Aplicar Insumo</Text>
          </TouchableOpacity>

          {/* O BOTÃO AGORA REDIRECIONA PARA A TELA DE HISTÓRICO */}
          <TouchableOpacity 
            style={[styles.btnAction, {borderColor: COLORS.orange}]}
            onPress={() => navigation.navigate('ManejosHistory', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="notebook-outline" size={26} color={COLORS.orange} />
              <Text style={[styles.btnText, {color: COLORS.orange}]}>Diário</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.secondaryActions}>
          {isOwner ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('PlantioForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
            >
              <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Editar Dados do Ciclo</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('ContasReceber')}>
              <MaterialCommunityIcons name="hand-coin-outline" size={16} color={COLORS.warning} />
              <Text style={styles.secondaryBtnText}>Contas a Receber</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('VendasList')}>
              <MaterialCommunityIcons name="chart-box-outline" size={16} color={COLORS.info} />
              <Text style={styles.secondaryBtnText}>Relatórios de Vendas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('PlantioHistory', { plantioId: plantio.id, estufaId: plantio.estufaId })}>
              <MaterialCommunityIcons name="history" size={16} color={COLORS.textPrimary} />
              <Text style={styles.secondaryBtnText}>Histórico do Ciclo</Text>
          </TouchableOpacity>
      </View>

      {isOwner && !isPlantioInactive && (
          <TouchableOpacity style={styles.dangerBtn} onPress={handleFinalizar}>
              <Text style={styles.dangerText}>Finalizar este Ciclo</Text>
          </TouchableOpacity>
      )}
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  title: { fontSize: TYPOGRAPHY.h2, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: TYPOGRAPHY.body, color: COLORS.textGray },
  loteBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 5, borderWidth: 1, borderColor: COLORS.c86EFAC },
  loteText: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill },
  badgeText: { fontSize: 12, fontWeight: '700' },
  financeCard: { backgroundColor: COLORS.secondary, padding: SPACING.xl, borderRadius: RADIUS.lg, marginBottom: 25, ...SHADOWS.card },
  financeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  financeTitle: { color: COLORS.c9CA3AF, fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  lucroValue: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '800' },
  financeDivider: { height: 1, backgroundColor: COLORS.c374151, marginVertical: 15 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  financeLabel: { color: COLORS.cD1D5DB, fontSize: 14 },
  financeNum: { fontWeight: '700', fontSize: 14 },
  gridBtns: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  btnAction: { flex: 1, height: 80, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  btnText: { fontWeight: '700', fontSize: 13, marginTop: 6 },
  secondaryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -10, marginBottom: 24 },
  secondaryBtn: { minWidth: '48%', flex: 1, height: 40, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  secondaryBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  dangerBtn: { marginTop: 20, padding: 15, borderWidth: 1, borderColor: COLORS.danger, borderRadius: RADIUS.md, alignItems: 'center' },
  dangerText: { color: COLORS.danger, fontWeight: '700' }
});

export default PlantioDetailScreen;
