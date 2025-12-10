// src/screens/Vendas/VendasListScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { useAuth } from '../../hooks/useAuth';
import { listAllColheitas, deleteColheita } from '../../services/colheitaService';
import { listEstufas } from '../../services/estufaService'; 
import { listAllPlantios } from '../../services/plantioService'; 
import { listClientes } from '../../services/clienteService'; 
import { Colheita, Estufa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Card from '../../components/Card';

const VendasListScreen = ({ navigation }: any) => {
  // 1. PEGAR O ID SELECIONADO
  const { user, selectedTenantId } = useAuth();
  const isFocused = useIsFocused();

  const [vendas, setVendas] = useState<Colheita[]>([]);
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [mapaEstufas, setMapaEstufas] = useState<Record<string, string>>({});
  const [mapaCulturas, setMapaCulturas] = useState<Record<string, string>>({});
  const [mapaClientes, setMapaClientes] = useState<Record<string, string>>({}); 
  const [filtroEstufaId, setFiltroEstufaId] = useState<string>('todas');
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    // 2. DEFINIR QUAL ID USAR
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
      // 3. PASSAR ESSE ID PARA TODOS OS SERVIÇOS
      const [listaVendas, listaEstufas, listaPlantios, listaClientes] = await Promise.all([
        listAllColheitas(idBusca),
        listEstufas(idBusca),
        listAllPlantios(idBusca),
        listClientes(idBusca) 
      ]);

      setVendas(listaVendas);
      setEstufas(listaEstufas);

      const mapE: Record<string, string> = {};
      listaEstufas.forEach(e => mapE[e.id] = e.nome);
      setMapaEstufas(mapE);

      const mapP: Record<string, string> = {};
      listaPlantios.forEach(p => {
        mapP[p.id] = `${p.cultura} ${p.variedade ? '('+p.variedade+')' : ''}`;
      });
      setMapaCulturas(mapP);

      const mapC: Record<string, string> = {};
      listaClientes.forEach(c => mapC[c.id] = c.nome);
      setMapaClientes(mapC);

    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]); // Recarrega se mudar a conta

  const handleDelete = (item: Colheita) => {
    Alert.alert(
        "Excluir", "Remover este lançamento?",
        [
            { text: "Cancelar", style: "cancel" },
            { text: "Excluir", style: "destructive", onPress: async () => {
                    await deleteColheita(item.id);
                    carregarDados();
            }}
        ]
    );
  };

  const vendasFiltradas = useMemo(() => {
      if (filtroEstufaId === 'todas') return vendas;
      return vendas.filter(v => v.estufaId === filtroEstufaId);
  }, [vendas, filtroEstufaId]);

  const resumoFinanceiro = useMemo(() => {
    let total = 0;
    vendasFiltradas.forEach(v => total += (v.quantidade || 0) * (v.precoUnitario || 0));
    return total;
  }, [vendasFiltradas]);

  const getPaymentIcon = (method: string | null) => {
      switch(method) {
          case 'pix': return 'qrcode';
          case 'dinheiro': return 'cash';
          case 'prazo': return 'clock-outline';
          case 'boleto': return 'barcode';
          case 'cartao': return 'credit-card';
          default: return 'help-circle-outline';
      }
  }

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <View style={styles.headerRow}>
            <MaterialCommunityIcons name="cash-multiple" size={28} color="#fff" />
            <Text style={styles.summaryTitle}>
                {filtroEstufaId === 'todas' ? 'Total Geral' : 'Total Estufa'}
            </Text>
        </View>
        <Text style={styles.summaryValue}>R$ {resumoFinanceiro.toFixed(2)}</Text>
      </Card>

      <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filtrar:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
                selectedValue={filtroEstufaId}
                onValueChange={(itemValue) => setFiltroEstufaId(itemValue)}
                style={styles.picker}
                dropdownIconColor="#333"
            >
                <Picker.Item label="Todas as Estufas" value="todas" style={{fontSize: 16}} />
                {estufas.map(estufa => (
                    <Picker.Item key={estufa.id} label={estufa.nome} value={estufa.id} style={{fontSize: 16}} />
                ))}
            </Picker>
          </View>
      </View>

      <FlatList
        data={vendasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Nada encontrado nesta conta.</Text>}
        renderItem={({ item }) => {
            const nomeEstufa = mapaEstufas[item.estufaId] || 'Estufa ?';
            const nomeCultura = mapaCulturas[item.plantioId] || 'Planta ?';
            
            let destinoTexto = item.destino || '';
            if (item.clienteId && mapaClientes[item.clienteId]) {
                destinoTexto = mapaClientes[item.clienteId];
            }

            return (
                <View style={styles.saleItem}>
                    <View style={styles.itemOriginHeader}>
                        <View style={styles.rowCenter}>
                            <MaterialCommunityIcons name="greenhouse" size={12} color="#777" />
                            <Text style={styles.originText}> {nomeEstufa} • {nomeCultura}</Text>
                        </View>
                        <Text style={styles.dateText}>{item.dataColheita.toDate().toLocaleDateString('pt-BR')}</Text>
                    </View>
                    <View style={styles.itemContent}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.rowCenter}>
                                <MaterialCommunityIcons name="account" size={14} color="#333" />
                                <Text style={styles.clientText}> {destinoTexto || 'Avulso'}</Text>
                            </View>
                            <Text style={styles.productText}>
                                {item.quantidade} {item.unidade}
                            </Text>
                            <View style={[styles.rowCenter, {marginTop: 4}]}>
                                <MaterialCommunityIcons name={getPaymentIcon(item.metodoPagamento) as any} size={12} color="#888" />
                                <Text style={styles.paymentText}> {item.metodoPagamento ? item.metodoPagamento.toUpperCase() : 'N/A'}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.priceText}>R$ {(item.quantidade * (item.precoUnitario || 0)).toFixed(2)}</Text>
                            <TouchableOpacity onPress={() => handleDelete(item)}>
                                <Text style={styles.deleteButtonText}>Excluir</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ColheitaForm')} 
      >
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#4CAF50', alignItems: 'center', paddingVertical: 15, marginBottom: 15, borderWidth: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  summaryTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 5 },
  filterContainer: { marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  filterLabel: { fontSize: 14, fontWeight: 'bold', marginRight: 10 },
  pickerWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', height: 55, justifyContent: 'center' },
  picker: { height: 55, width: '100%', color: '#333' },
  saleItem: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#4CAF50', elevation: 2 },
  itemOriginHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f5f5f5', padding: 8, borderTopRightRadius: 8 },
  originText: { fontSize: 11, fontWeight: 'bold', color: '#777' },
  dateText: { fontSize: 11, color: '#888' },
  itemContent: { padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  productText: { fontSize: 14, color: '#555', marginTop: 2 },
  paymentText: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  priceText: { fontSize: 18, fontWeight: 'bold', color: '#006400' },
  deleteButtonText: { fontSize: 12, color: '#D32F2F', marginTop: 5, textDecorationLine: 'underline' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#888', fontSize: 16 },
  fab: { position: 'absolute', width: 60, height: 60, alignItems: 'center', justifyContent: 'center', right: 20, bottom: 20, backgroundColor: '#FF9800', borderRadius: 30, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
});

export default VendasListScreen;