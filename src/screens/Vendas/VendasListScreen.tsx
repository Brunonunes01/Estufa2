import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, 
  Modal, TextInput, ScrollView, Alert, Share 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { listAllColheitas } from '../../services/colheitaService';
import { listClientes } from '../../services/clienteService';
import { listEstufas } from '../../services/estufaService';
import { shareVendaReceipt } from '../../services/receiptService';
import { Colheita, Cliente, Estufa } from '../../types/domain';

const VendasListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  
  // --- ESTADOS DE DADOS ---
  const [allVendas, setAllVendas] = useState<Colheita[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]); 
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({}); 
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DO FILTRO ---
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterCliente, setFilterCliente] = useState('todos'); 
  const [filterObs, setFilterObs] = useState(''); 
  const [filterStatus, setFilterStatus] = useState('todos'); 
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // --- ESTADO DO RELATÓRIO ---
  const [showReportModal, setShowReportModal] = useState(false);

  // Controles de Data
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // --- BOTÕES NO HEADER ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{flexDirection: 'row', gap: 15, marginRight: 10}}>
            <TouchableOpacity onPress={() => setShowReportModal(true)}>
                <MaterialCommunityIcons name="file-chart-outline" size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFilterModal(true)}>
                <MaterialCommunityIcons name="filter-variant" size={26} color="#FFF" />
            </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  // --- CARREGAMENTO INICIAL ---
  const loadData = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    setLoading(true);
    try {
      const [vendasData, clientesData, estufasData] = await Promise.all([
        listAllColheitas(targetId),
        listClientes(targetId),
        listEstufas(targetId)
      ]);

      setClientesList(clientesData);

      // Mapeamento de Clientes
      const cMap: Record<string, string> = {};
      clientesData.forEach(c => cMap[c.id] = c.nome);
      setClientesMap(cMap);

      // Mapeamento de Estufas
      const eMap: Record<string, string> = {};
      estufasData.forEach(e => eMap[e.id] = e.nome);
      setEstufasMap(eMap);

      setAllVendas(vendasData);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível carregar as vendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTenantId]);

  // --- LÓGICA DE FILTRAGEM ---
  const filteredVendas = useMemo(() => {
    return allVendas.filter(venda => {
      let matchCliente = true;
      if (filterCliente === 'todos') matchCliente = true;
      else if (filterCliente === 'avulso') matchCliente = !venda.clienteId;
      else matchCliente = venda.clienteId === filterCliente;

      const matchObs = !filterObs || (venda.observacoes && venda.observacoes.toLowerCase().includes(filterObs.toLowerCase()));

      const matchStatus = 
        filterStatus === 'todos' || 
        (venda.statusPagamento === filterStatus) ||
        (filterStatus === 'pendente' && !venda.statusPagamento); 

      let matchDate = true;
      if (venda.dataColheita) {
        const dataVenda = venda.dataColheita.toDate ? venda.dataColheita.toDate() : new Date(venda.dataColheita.seconds * 1000);
        const dVenda = new Date(dataVenda.setHours(0,0,0,0));
        
        if (startDate) {
           const dStart = new Date(startDate);
           dStart.setHours(0,0,0,0);
           if (dVenda < dStart) matchDate = false;
        }
        if (endDate) {
           const dEnd = new Date(endDate);
           dEnd.setHours(0,0,0,0);
           if (dVenda > dEnd) matchDate = false;
        }
      }

      return matchCliente && matchObs && matchStatus && matchDate;
    });
  }, [allVendas, filterCliente, filterObs, filterStatus, startDate, endDate]);

  // --- ESTATÍSTICAS DO RELATÓRIO ---
  const stats = useMemo(() => {
      const data = {
          totalValor: 0,
          totalItens: 0,
          porMetodo: {} as Record<string, number>
      };

      filteredVendas.forEach(v => {
          const val = v.quantidade * (v.precoUnitario || 0);
          data.totalValor += val;
          data.totalItens++;

          const metodo = v.metodoPagamento || 'Não definido';
          const metodoKey = metodo.charAt(0).toUpperCase() + metodo.slice(1);
          data.porMetodo[metodoKey] = (data.porMetodo[metodoKey] || 0) + val;
      });

      return data;
  }, [filteredVendas]);

  // --- COMPARTILHAR RELATÓRIO DE TEXTO (CORRIGIDO) ---
  const handleShareReport = async () => {
      let msg = `📊 *Relatório de Vendas SGE*\n`;
      msg += `-----------------------------\n`;
      msg += `💰 *Total Geral:* R$ ${stats.totalValor.toFixed(2)}\n`;
      msg += `📦 *Vendas:* ${stats.totalItens} registros\n`;
      msg += `-----------------------------\n\n`;
      
      msg += `*Detalhamento:* \n`;
      filteredVendas.slice(0, 15).forEach(v => {
          const cNome = v.clienteId ? clientesMap[v.clienteId] : 'Cliente Avulso';
          const total = v.quantidade * (v.precoUnitario || 0);
          msg += `• ${cNome}: R$ ${total.toFixed(2)}\n`;
      });

      if(filteredVendas.length > 15) msg += `... e mais ${filteredVendas.length - 15} vendas.\n`;

      msg += `\n*Por Forma de Pagamento:*\n`;
      Object.keys(stats.porMetodo).forEach(metodo => {
          msg += `• ${metodo}: R$ ${stats.porMetodo[metodo].toFixed(2)}\n`;
      });
      
      msg += `\n-----------------------------\n`;
      msg += `Gerado em: ${new Date().toLocaleString('pt-BR')}`;

      try {
          await Share.share({ message: msg });
      } catch (error) {
          console.error(error);
      }
  };

  // --- GERAR PDF DA VENDA INDIVIDUAL ---
  const handlePrintReceipt = async (venda: Colheita) => {
    try {
        await shareVendaReceipt({
            venda,
            nomeProdutor: user?.name || 'Produtor',
            nomeCliente: venda.clienteId ? (clientesMap[venda.clienteId] || 'Não Encontrado') : 'Cliente Avulso',
            nomeProduto: 'Produtos da Colheita', // Pode ser expandido se houver campo de Cultura na Colheita
            nomeEstufa: estufasMap[venda.estufaId] || 'Estufa Geral'
        });
    } catch (error: any) {
        Alert.alert('Erro', error.message);
    }
  };

  // --- HELPERS ---
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('pt-BR');
  };

  const clearFilters = () => {
    setFilterCliente('todos');
    setFilterObs('');
    setFilterStatus('todos');
    setStartDate(null);
    setEndDate(null);
    setShowFilterModal(false);
  };

  const renderItem = ({ item }: { item: Colheita }) => {
    const total = item.quantidade * (item.precoUnitario || 0);
    const clienteNome = item.clienteId ? (clientesMap[item.clienteId] || 'Cliente...') : 'Cliente Avulso';
    const isPendente = item.statusPagamento === 'pendente' || (!item.statusPagamento && item.metodoPagamento === 'prazo');

    return (
      <View style={styles.card}>
        <TouchableOpacity 
          style={{flex: 1}}
          onPress={() => navigation.navigate('ColheitaForm', { colheitaId: item.id, isEdit: true })}
        >
          <View style={styles.cardHeader}>
              <View style={{flex: 1}}>
                  <Text style={styles.clienteName}>{clienteNome}</Text>
                  <Text style={styles.dateText}>{formatDate(item.dataColheita)}</Text>
              </View>
              <View style={[styles.badge, isPendente ? styles.badgePending : styles.badgePaid]}>
                  <Text style={[styles.badgeText, isPendente ? styles.textPending : styles.textPaid]}>
                    {isPendente ? 'PENDENTE' : 'PAGO'}
                  </Text>
              </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
              <Text style={styles.details}>
                  {item.quantidade} {item.unidade} x R$ {item.precoUnitario?.toFixed(2)}
              </Text>
              <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
        
        {/* Botão para Gerar PDF Individual */}
        <TouchableOpacity 
            style={styles.pdfIconBtn} 
            onPress={() => handlePrintReceipt(item)}
        >
            <MaterialCommunityIcons name="file-pdf-box" size={24} color="#166534" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.summaryBar}>
         <Text style={styles.summaryText}>
           {stats.totalItens} registros filtrados
         </Text>
         <Text style={styles.summaryTotal}>
           R$ {stats.totalValor.toFixed(2)}
         </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#166534" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredVendas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="basket-off-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyText}>Nenhuma venda encontrada.</Text>
            </View>
          }
        />
      )}

      {/* --- MODAL DE FILTROS --- */}
      <Modal visible={showFilterModal} animationType="slide" transparent={true} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar Vendas</Text>
            <ScrollView>
                <Text style={styles.label}>Cliente</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={filterCliente} onValueChange={setFilterCliente} style={{color: '#1E293B'}}>
                        <Picker.Item label="Todos os Clientes" value="todos" />
                        <Picker.Item label="Vendas Avulsas" value="avulso" />
                        {clientesList.map(c => (<Picker.Item key={c.id} label={c.nome} value={c.id} />))}
                    </Picker>
                </View>
                <Text style={styles.label}>Observação</Text>
                <TextInput style={styles.input} placeholder="Ex: entrega..." value={filterObs} onChangeText={setFilterObs} />
                <Text style={styles.label}>Status</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={filterStatus} onValueChange={setFilterStatus} style={{color: '#1E293B'}}>
                        <Picker.Item label="Todos" value="todos" />
                        <Picker.Item label="Pagos" value="pago" />
                        <Picker.Item label="Pendentes / A Prazo" value="pendente" />
                    </Picker>
                </View>
                <Text style={styles.label}>Período</Text>
                <View style={styles.dateRow}>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                        <Text style={styles.dateBtnText}>{startDate ? startDate.toLocaleDateString() : 'Início'}</Text>
                        <MaterialCommunityIcons name="calendar" size={16} color="#166534" />
                    </TouchableOpacity>
                    <Text style={{marginHorizontal: 8}}>-</Text>
                    <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                        <Text style={styles.dateBtnText}>{endDate ? endDate.toLocaleDateString() : 'Fim'}</Text>
                        <MaterialCommunityIcons name="calendar" size={16} color="#166534" />
                    </TouchableOpacity>
                </View>
                {showStartPicker && <DateTimePicker value={startDate || new Date()} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); if(d) setStartDate(d); }} />}
                {showEndPicker && <DateTimePicker value={endDate || new Date()} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); if(d) setEndDate(d); }} />}
            </ScrollView>
            <View style={styles.modalActions}>
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}><Text style={styles.clearBtnText}>Limpar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}><Text style={styles.applyBtnText}>Aplicar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE RELATÓRIO --- */}
      <Modal visible={showReportModal} animationType="fade" transparent={true} onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.reportCard}>
                <View style={styles.reportHeader}>
                    <Text style={styles.reportTitle}>Relatório Gerencial</Text>
                    <TouchableOpacity onPress={() => setShowReportModal(false)}>
                        <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                </View>

                <View style={styles.reportBody}>
                    <View style={styles.bigStat}>
                        <Text style={styles.bigStatLabel}>Faturamento Filtrado</Text>
                        <Text style={styles.bigStatValue}>R$ {stats.totalValor.toFixed(2)}</Text>
                    </View>

                    <Text style={styles.subTitle}>Por Método de Pagamento:</Text>
                    {Object.keys(stats.porMetodo).map((metodo) => (
                        <View key={metodo} style={styles.statRow}>
                            <Text style={styles.statLabel}>{metodo}</Text>
                            <Text style={styles.statValue}>R$ {stats.porMetodo[metodo].toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity style={styles.shareBtn} onPress={handleShareReport}>
                    <MaterialCommunityIcons name="whatsapp" size={22} color="#FFF" />
                    <Text style={styles.shareBtnText}>Compartilhar Resumo</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  summaryBar: { backgroundColor: '#166534', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
  summaryText: { color: '#BBF7D0', fontSize: 14, fontWeight: '600' },
  summaryTotal: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  listContent: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteName: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  dateText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  badgePaid: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  badgePending: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  textPaid: { color: '#166534' },
  textPending: { color: '#991B1B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  details: { fontSize: 14, color: '#475569' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { marginTop: 10, color: '#64748B' },
  pdfIconBtn: { marginLeft: 15, padding: 5, borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  
  // MODAL FILTRO
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1E293B', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 15, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#F8FAFC' },
  pickerWrapper: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#F8FAFC' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtn: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, backgroundColor: '#F8FAFC' },
  dateBtnText: { color: '#334155' },
  modalActions: { flexDirection: 'row', marginTop: 30, gap: 10 },
  clearBtn: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center' },
  clearBtnText: { color: '#64748B', fontWeight: 'bold' },
  applyBtn: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#166534', alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontWeight: 'bold' },

  // MODAL RELATÓRIO
  reportCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 25 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reportTitle: { fontSize: 22, fontWeight: 'bold', color: '#166534' },
  reportBody: { marginBottom: 20 },
  bigStat: { alignItems: 'center', marginBottom: 20, backgroundColor: '#F0FDF4', padding: 15, borderRadius: 12 },
  bigStatLabel: { fontSize: 14, color: '#166534', textTransform: 'uppercase', fontWeight: '600' },
  bigStatValue: { fontSize: 32, fontWeight: '800', color: '#166534', marginTop: 5 },
  subTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 4 },
  statLabel: { fontSize: 15, color: '#64748B' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  shareBtn: { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, gap: 10 },
  shareBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default VendasListScreen;