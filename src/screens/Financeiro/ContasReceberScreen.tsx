// src/screens/Financeiro/ContasReceberScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, RefreshControl, StatusBar, Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../hooks/useAuth';
import { listContasAReceber, receberConta } from '../../services/colheitaService';
import { listClientes } from '../../services/clienteService';
import { Colheita } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

const ContasReceberScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const isFocused = useIsFocused();
  
  // --- Estados de Dados ---
  const [contas, setContas] = useState<Colheita[]>([]);
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [totalPendente, setTotalPendente] = useState(0);

  // --- Estados do Modal de Recebimento ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedConta, setSelectedConta] = useState<Colheita | null>(null);
  const [metodoRecebimento, setMetodoRecebimento] = useState('pix');
  const [loadingAction, setLoadingAction] = useState(false);

  // Carrega os dados
  const carregarDados = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    
    setLoading(true);
    try {
      const [listaContas, listaClientes] = await Promise.all([
          listContasAReceber(targetId),
          listClientes(targetId)
      ]);
      
      const map: Record<string, string> = {};
      listaClientes.forEach(c => map[c.id] = c.nome);
      setClientesMap(map);
      
      setContas(listaContas);

      const total = listaContas.reduce((acc, curr) => acc + (curr.quantidade * (curr.precoUnitario || 0)), 0);
      setTotalPendente(total);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) carregarDados();
  }, [isFocused, selectedTenantId]);

  // Abre o modal
  const handleOpenReceber = (item: Colheita) => {
      setSelectedConta(item);
      setMetodoRecebimento('pix'); // Padrão inicial
      setModalVisible(true);
  };

  // Confirma o recebimento
  const confirmRecebimento = async () => {
      if (!selectedConta) return;
      
      setLoadingAction(true);
      try {
          // Passamos o novo método selecionado
          await receberConta(selectedConta.id, metodoRecebimento);
          setModalVisible(false);
          Alert.alert("Sucesso", "Pagamento registrado e baixa efetuada!");
          carregarDados(); // Recarrega a lista
      } catch (error) {
          Alert.alert("Erro", "Não foi possível registrar o recebimento.");
      } finally {
          setLoadingAction(false);
          setSelectedConta(null);
      }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return d.toLocaleDateString('pt-BR');
  };

  const formatMetodo = (metodo: string | null) => {
      if (!metodo) return 'Indefinido';
      switch(metodo) {
          case 'prazo': return 'Fiado / Prazo';
          case 'boleto': return 'Boleto';
          default: return metodo.charAt(0).toUpperCase() + metodo.slice(1);
      }
  };

  const renderItem = ({ item }: { item: Colheita }) => {
    const total = item.quantidade * (item.precoUnitario || 0);
    const clienteNome = item.clienteId ? clientesMap[item.clienteId] : 'Não identificado';
    const metodoLabel = formatMetodo(item.metodoPagamento);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={{flex: 1}}>
                <Text style={styles.clienteName}>{clienteNome}</Text>
                <View style={styles.metodoRow}>
                    <MaterialCommunityIcons name="credit-card-clock-outline" size={14} color="#B45309" />
                    <Text style={styles.metodoText}>{metodoLabel}</Text>
                </View>
                <Text style={styles.dateText}>Venda em: {formatDate(item.dataColheita)}</Text>
            </View>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>PENDENTE</Text>
            </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
            <Text style={styles.details}>
                {item.quantidade} {item.unidade} x R$ {item.precoUnitario?.toFixed(2)}
            </Text>
            <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={styles.receiveBtn} onPress={() => handleOpenReceber(item)}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFF" />
            <Text style={styles.btnText}>Dar Baixa (Receber)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B45309" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contas a Receber</Text>
        <Text style={styles.headerSub}>Total para receber: R$ {totalPendente.toFixed(2)}</Text>
      </View>

      <FlatList
        data={contas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarDados} tintColor="#fff" />}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="hand-coin" size={60} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyTitle}>Tudo recebido!</Text>
                    <Text style={styles.emptySub}>Nenhuma conta pendente.</Text>
                </View>
            ) : null
        }
        renderItem={renderItem}
      />

      {/* --- MODAL DE SELEÇÃO DE PAGAMENTO --- */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Receber Pagamento</Text>
                
                {selectedConta && (
                    <View style={styles.resumoConta}>
                        <Text style={styles.resumoLabel}>Cliente:</Text>
                        <Text style={styles.resumoValue}>
                            {selectedConta.clienteId ? clientesMap[selectedConta.clienteId] : 'Avulso'}
                        </Text>
                        
                        <Text style={[styles.resumoLabel, {marginTop: 10}]}>Valor Total:</Text>
                        <Text style={[styles.resumoValue, {color: '#B45309', fontSize: 20}]}>
                            R$ {(selectedConta.quantidade * (selectedConta.precoUnitario || 0)).toFixed(2)}
                        </Text>
                    </View>
                )}

                <Text style={styles.labelPicker}>Forma de Pagamento:</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={metodoRecebimento}
                        onValueChange={setMetodoRecebimento}
                        style={{color: '#1E293B'}}
                    >
                        <Picker.Item label="Pix" value="pix" />
                        <Picker.Item label="Dinheiro" value="dinheiro" />
                        <Picker.Item label="Cartão" value="cartao" />
                        <Picker.Item label="Boleto" value="boleto" />
                        <Picker.Item label="Cheque" value="cheque" />
                        <Picker.Item label="Outro" value="outro" />
                    </Picker>
                </View>

                <View style={styles.modalActions}>
                    <TouchableOpacity 
                        style={styles.cancelBtn} 
                        onPress={() => setModalVisible(false)}
                        disabled={loadingAction}
                    >
                        <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.confirmBtn} 
                        onPress={confirmRecebimento}
                        disabled={loadingAction}
                    >
                        {loadingAction ? (
                            <Text style={styles.confirmText}>Salvando...</Text>
                        ) : (
                            <Text style={styles.confirmText}>Confirmar</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#B45309' }, 
  header: { padding: 20, backgroundColor: '#B45309' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  headerSub: { fontSize: 16, color: '#FEF3C7', marginTop: 5, fontWeight: 'bold' },
  listContent: { padding: 20 },
  
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  
  metodoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 },
  metodoText: { fontSize: 13, color: '#B45309', fontWeight: '600', marginLeft: 4 },
  
  dateText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' },
  badgeText: { color: '#DC2626', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  details: { fontSize: 14, color: '#475569' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#B45309' },
  receiveBtn: { backgroundColor: '#166534', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF', marginTop: 10 },
  emptySub: { color: '#FEF3C7' },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  resumoConta: { backgroundColor: '#FFF7ED', padding: 15, borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#FED7AA' },
  resumoLabel: { fontSize: 14, color: '#9A3412', fontWeight: '600' },
  resumoValue: { fontSize: 16, color: '#1E293B', fontWeight: 'bold' },
  
  labelPicker: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 8 },
  pickerWrapper: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#F8FAFC', marginBottom: 25 },
  
  modalActions: { flexDirection: 'row', gap: 15 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#94A3B8', alignItems: 'center' },
  cancelText: { color: '#64748B', fontWeight: 'bold', fontSize: 16 },
  confirmBtn: { flex: 1, padding: 15, borderRadius: 8, backgroundColor: '#166534', alignItems: 'center' },
  confirmText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default ContasReceberScreen;