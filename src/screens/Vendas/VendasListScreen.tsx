// src/screens/Vendas/VendasListScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, RefreshControl 
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
import { shareVendaReceipt } from '../../services/receiptService';

// --- PALETA DE CORES MODERNA ---
const COLORS = {
  background: '#F8FAFC', // Cinza azulado bem claro (fundo premium)
  card: '#FFFFFF',
  primary: '#10B981',    // Verde vibrante
  textDark: '#1E293B',   // Azul escuro quase preto
  textGray: '#64748B',   // Cinza médio
  textLight: '#94A3B8',  // Cinza claro
  danger: '#EF4444',
  blue: '#3B82F6',
  border: '#E2E8F0'
};

const VendasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, isOwner } = useAuth();
  const isFocused = useIsFocused();

  const [vendas, setVendas] = useState<Colheita[]>([]);
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [mapaEstufas, setMapaEstufas] = useState<Record<string, string>>({});
  const [mapaCulturas, setMapaCulturas] = useState<Record<string, string>>({});
  const [mapaClientes, setMapaClientes] = useState<Record<string, string>>({}); 
  const [filtroEstufaId, setFiltroEstufaId] = useState<string>('todas');
  const [loading, setLoading] = useState(true);

  const carregarDados = async () => {
    const idBusca = selectedTenantId || user?.uid;
    if (!idBusca) return;

    setLoading(true);
    try {
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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]);

  const handleDelete = (item: Colheita) => {
    Alert.alert("Excluir Venda", "Tem certeza? Isso afetará o caixa.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: async () => {
            await deleteColheita(item.id);
            carregarDados();
        }}
    ]);
  };

  const handleReceipt = async (item: Colheita) => {
      try {
          const nomeEstufa = mapaEstufas[item.estufaId] || 'Estufa';
          const nomeProduto = mapaCulturas[item.plantioId] || 'Produto';
          let nomeCliente = item.destino || 'Avulso';
          if (item.clienteId && mapaClientes[item.clienteId]) {
              nomeCliente = mapaClientes[item.clienteId];
          }
          const nomeProdutor = user?.name || "Produtor Rural";

          await shareVendaReceipt({ venda: item, nomeProdutor, nomeCliente, nomeProduto, nomeEstufa });
      } catch (e) {
          Alert.alert("Erro", "Falha ao gerar recibo.");
      }
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

  const getPaymentIconInfo = (method: string | null) => {
      switch(method) {
          case 'pix': return { icon: 'qrcode', color: '#10B981', label: 'Pix' };
          case 'dinheiro': return { icon: 'cash', color: '#10B981', label: 'Dinheiro' };
          case 'prazo': return { icon: 'clock-outline', color: '#F59E0B', label: 'A Prazo' }; // Laranja
          case 'boleto': return { icon: 'barcode', color: '#6366F1', label: 'Boleto' };
          case 'cartao': return { icon: 'credit-card', color: '#3B82F6', label: 'Cartão' };
          default: return { icon: 'help-circle-outline', color: '#94A3B8', label: 'Outro' };
      }
  };

  // HEADER COMPONENTE
  const HeaderComponent = () => (
    <View style={styles.headerContainer}>
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Faturamento Total</Text>
        <Text style={styles.totalValue}>R$ {resumoFinanceiro.toFixed(2)}</Text>
        <Text style={styles.totalSub}>
            {vendasFiltradas.length} vendas registradas
        </Text>
      </View>

      {/* FILTRO MAIS LIMPO */}
      <View style={styles.filterRow}>
        <MaterialCommunityIcons name="filter-variant" size={20} color={COLORS.textGray} />
        <View style={styles.pickerBox}>
            <Picker
                selectedValue={filtroEstufaId}
                onValueChange={setFiltroEstufaId}
                style={styles.picker}
                dropdownIconColor={COLORS.textDark}
            >
                <Picker.Item label="Todas as Estufas" value="todas" style={{fontSize: 14}} />
                {estufas.map(e => <Picker.Item key={e.id} label={e.nome} value={e.id} style={{fontSize: 14}} />)}
            </Picker>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      <FlatList
        data={vendasFiltradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarDados} colors={[COLORS.primary]} />}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Nenhuma venda encontrada.</Text> : null}
        renderItem={({ item }) => {
            const nomeEstufa = mapaEstufas[item.estufaId] || 'Estufa ?';
            const nomeCultura = mapaCulturas[item.plantioId] || 'Produto ?';
            let destinoTexto = item.destino || 'Cliente Avulso';
            if (item.clienteId && mapaClientes[item.clienteId]) destinoTexto = mapaClientes[item.clienteId];
            
            const payInfo = getPaymentIconInfo(item.metodoPagamento);
            const totalItem = (item.quantidade * (item.precoUnitario || 0));

            return (
                <View style={styles.card}>
                    {/* TOPO DO CARD: DATA E STATUS */}
                    <View style={styles.cardTop}>
                        <Text style={styles.dateText}>
                            {item.dataColheita.toDate().toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                        </Text>
                        <View style={[styles.badge, { backgroundColor: payInfo.color + '20' }]}>
                            <MaterialCommunityIcons name={payInfo.icon as any} size={12} color={payInfo.color} />
                            <Text style={[styles.badgeText, { color: payInfo.color }]}> {payInfo.label}</Text>
                        </View>
                    </View>

                    {/* MIOLO: PRODUTO E CLIENTE */}
                    <View style={styles.cardMain}>
                        <View style={styles.iconCircle}>
                            <MaterialCommunityIcons name="basket" size={24} color={COLORS.primary} />
                        </View>
                        <View style={{flex: 1, paddingLeft: 12}}>
                            <Text style={styles.productTitle}>{nomeCultura}</Text>
                            <Text style={styles.clientName}>
                                <MaterialCommunityIcons name="account" size={12} /> {destinoTexto}
                            </Text>
                            <Text style={styles.originText}>{nomeEstufa}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.priceValue}>R$ {totalItem.toFixed(2)}</Text>
                            <Text style={styles.quantityText}>{item.quantidade} {item.unidade}</Text>
                        </View>
                    </View>

                    {/* RODAPÉ: AÇÕES */}
                    <View style={styles.cardActions}>
                        <TouchableOpacity onPress={() => handleReceipt(item)} style={styles.actionBtn}>
                            <MaterialCommunityIcons name="share-variant-outline" size={18} color={COLORS.blue} />
                            <Text style={[styles.actionText, {color: COLORS.blue}]}>Recibo</Text>
                        </TouchableOpacity>

                        {isOwner && (
                            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color={COLORS.danger} />
                                <Text style={[styles.actionText, {color: COLORS.danger}]}>Excluir</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ColheitaForm')}>
        <MaterialCommunityIcons name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  
  // Header
  headerContainer: {
      marginBottom: 10,
  },
  totalCard: {
      backgroundColor: COLORS.primary,
      padding: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      alignItems: 'center',
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      elevation: 5,
      marginBottom: 15,
  },
  totalLabel: { color: '#D1FAE5', fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  totalValue: { color: '#FFFFFF', fontSize: 36, fontWeight: 'bold', marginVertical: 5 },
  totalSub: { color: '#A7F3D0', fontSize: 13 },

  // Filtro
  filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
  },
  pickerBox: {
      flex: 1,
      backgroundColor: '#FFF',
      borderRadius: 10,
      marginLeft: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      height: 45,
      justifyContent: 'center',
  },
  picker: { height: 45, width: '100%', color: COLORS.textDark },

  // Lista
  listContent: { paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textGray, fontSize: 16 },

  // CARD DE VENDA (Novo Design)
  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  dateText: {
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.textGray,
      textTransform: 'uppercase',
  },
  badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
  },
  badgeText: {
      fontSize: 10,
      fontWeight: '700',
      marginLeft: 4,
  },
  
  cardMain: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#ECFDF5',
      alignItems: 'center',
      justifyContent: 'center',
  },
  productTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: COLORS.textDark,
  },
  clientName: {
      fontSize: 13,
      color: COLORS.textGray,
      marginTop: 2,
  },
  originText: {
      fontSize: 11,
      color: COLORS.textLight,
      marginTop: 2,
  },
  priceValue: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.primary,
  },
  quantityText: {
      fontSize: 12,
      color: COLORS.textGray,
      marginTop: 2,
  },

  cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 12,
      gap: 20,
  },
  actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  actionText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
});

export default VendasListScreen;