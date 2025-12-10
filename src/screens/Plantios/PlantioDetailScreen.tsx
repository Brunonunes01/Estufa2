// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listAplicacoesByPlantio } from '../../services/aplicacaoService';
import { calculateRentabilidadeByPlantio } from '../../services/rentabilidadeService';
import { getEstufaById } from '../../services/estufaService';
import { Plantio, Colheita, Aplicacao } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../components/Card';

const PlantioDetailScreen = ({ route, navigation }: any) => {
  // 1. PEGAR 'isOwner'
  const { user, selectedTenantId, isOwner } = useAuth(); 
  const { plantioId } = route.params;

  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [financeiro, setFinanceiro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    setLoading(true);
    try {
      const p = await getPlantioById(plantioId);
      if (p) {
        setPlantio(p);
        
        const estufa = await getEstufaById(p.estufaId);
        const area = estufa?.areaM2 || 0;

        const [listaColheitas, listaAplicacoes, rentabilidade] = await Promise.all([
            listColheitasByPlantio(targetId, plantioId),
            listAplicacoesByPlantio(targetId, plantioId),
            calculateRentabilidadeByPlantio(targetId, plantioId, area)
        ]);

        setColheitas(listaColheitas);
        setAplicacoes(listaAplicacoes);
        setFinanceiro(rentabilidade);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Falha ao carregar detalhes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [plantioId, selectedTenantId]);

  const handleFinalizar = () => {
    Alert.alert(
        "Finalizar Ciclo", 
        "Deseja encerrar este plantio? Isso arquivará o histórico.",
        [
            { text: "Cancelar", style: "cancel" },
            { text: "Finalizar", onPress: async () => {
                await updatePlantioStatus(plantioId, 'finalizado');
                navigation.goBack();
            }}
        ]
    );
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;
  if (!plantio) return <Text style={styles.errorText}>Plantio não encontrado.</Text>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{plantio.cultura} {plantio.variedade && `- ${plantio.variedade}`}</Text>
        <View style={[styles.badge, plantio.status === 'finalizado' ? styles.bgGray : styles.bgGreen]}>
            <Text style={styles.badgeText}>{plantio.status.toUpperCase().replace('_', ' ')}</Text>
        </View>
      </View>

      {financeiro && (
          <Card style={styles.financeCard}>
              <View style={styles.financeHeader}>
                  <MaterialCommunityIcons name="finance" size={24} color="#fff" />
                  <Text style={styles.financeTitle}>Resultados Financeiros</Text>
              </View>
              
              <View style={styles.financeRow}>
                  <View>
                      <Text style={styles.financeLabel}>Receita Total</Text>
                      <Text style={styles.financeValueGreen}>+ R$ {financeiro.receitaTotal.toFixed(2)}</Text>
                  </View>
                  <View>
                      <Text style={styles.financeLabel}>Custos Totais</Text>
                      <Text style={styles.financeValueRed}>- R$ {financeiro.custoTotal.toFixed(2)}</Text>
                  </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.financeFooter}>
                  <Text style={styles.lucroLabel}>Lucro Bruto:</Text>
                  <Text style={[styles.lucroValue, financeiro.lucroBruto >= 0 ? styles.textGreen : styles.textRed]}>
                      R$ {financeiro.lucroBruto.toFixed(2)}
                  </Text>
              </View>
          </Card>
      )}

      {/* AÇÕES (Visíveis para todos) */}
      <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ColheitaForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="basket-plus" size={24} color="#fff" />
              <Text style={styles.actionText}>Nova Colheita</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.btnBlue]}
            onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantio.id, estufaId: plantio.estufaId })}
          >
              <MaterialCommunityIcons name="flask-plus" size={24} color="#fff" />
              <Text style={styles.actionText}>Nova Aplicação</Text>
          </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Últimas Colheitas</Text>
      {colheitas.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma colheita registrada.</Text>
      ) : (
          colheitas.slice(0, 5).map(c => (
              <View key={c.id} style={styles.listItem}>
                  <Text style={styles.itemText}>{c.dataColheita.toDate().toLocaleDateString()} - {c.quantidade} {c.unidade}</Text>
                  <Text style={styles.itemValue}>R$ {(c.quantidade * (c.precoUnitario || 0)).toFixed(2)}</Text>
              </View>
          ))
      )}

      {/* 2. TRAVA DE SEGURANÇA: Só Dono pode finalizar */}
      {isOwner && plantio.status !== 'finalizado' && (
          <TouchableOpacity style={styles.finishButton} onPress={handleFinalizar}>
              <Text style={styles.finishText}>Encerrar Ciclo / Finalizar Plantio</Text>
          </TouchableOpacity>
      )}
      
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 5 },
  bgGreen: { backgroundColor: '#4CAF50' },
  bgGray: { backgroundColor: '#999' },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  financeCard: { backgroundColor: '#333', padding: 15, borderRadius: 10, marginBottom: 20 },
  financeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  financeTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  financeLabel: { color: '#ccc', fontSize: 12 },
  financeValueGreen: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  financeValueRed: { color: '#FF5252', fontSize: 16, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#555', marginVertical: 10 },
  financeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lucroLabel: { color: '#fff', fontSize: 16 },
  lucroValue: { fontSize: 22, fontWeight: 'bold' },
  textGreen: { color: '#4CAF50' },
  textRed: { color: '#FF5252' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionButton: { flex: 1, backgroundColor: '#FF9800', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginRight: 10 },
  btnBlue: { backgroundColor: '#2196F3', marginRight: 0 },
  actionText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, elevation: 1 },
  itemText: { color: '#333' },
  itemValue: { fontWeight: 'bold', color: '#006400' },
  emptyText: { color: '#888', fontStyle: 'italic' },
  finishButton: { marginTop: 30, padding: 15, borderColor: '#D32F2F', borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  finishText: { color: '#D32F2F', fontWeight: 'bold' },
  errorText: { textAlign: 'center', marginTop: 50, fontSize: 18, color: '#D32F2F' }
});

export default PlantioDetailScreen;