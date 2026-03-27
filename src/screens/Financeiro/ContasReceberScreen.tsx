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
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

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
                    <MaterialCommunityIcons name="credit-card-clock-outline" size={14} color={COLORS.modFinanceiro} />
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
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={COLORS.textLight} />
            <Text style={styles.btnText}>Receber Agora</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contas a Receber</Text>
        <Text style={styles.headerSub}>Acompanhe as vendas pendentes e dê baixa no recebimento.</Text>
        <View style={styles.kpisRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total pendente</Text>
            <Text style={styles.kpiValue}>R$ {totalPendente.toFixed(2)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Contas abertas</Text>
            <Text style={styles.kpiValue}>{contas.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={contas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregarDados} tintColor={COLORS.textLight} />}
        ListEmptyComponent={
            !loading ? (
                <View style={styles.emptyContainer}>
                    <MaterialCommunityIcons name="hand-coin" size={60} color={COLORS.textMuted} />
                    <Text style={styles.emptyTitle}>Tudo recebido!</Text>
                    <Text style={styles.emptySub}>Não há cobranças pendentes no momento.</Text>
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
                        <Text style={[styles.resumoValue, {color: COLORS.modFinanceiro, fontSize: 20}]}>
                            R$ {(selectedConta.quantidade * (selectedConta.precoUnitario || 0)).toFixed(2)}
                        </Text>
                    </View>
                )}

                <Text style={styles.labelPicker}>Forma de Pagamento:</Text>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={metodoRecebimento}
                        onValueChange={setMetodoRecebimento}
                        style={{color: COLORS.textPrimary}}
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
  container: { flex: 1, backgroundColor: COLORS.background }, 
  header: { padding: SPACING.xl, backgroundColor: COLORS.secondary, borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  headerTitle: { fontSize: TYPOGRAPHY.h2, fontWeight: '800', color: COLORS.textLight },
  headerSub: { fontSize: TYPOGRAPHY.body, color: COLORS.whiteAlpha80, marginTop: 5, marginBottom: SPACING.md, fontWeight: '600' },
  kpisRow: { flexDirection: 'row', gap: 10 },
  kpiBox: { flex: 1, backgroundColor: COLORS.whiteAlpha10, borderWidth: 1, borderColor: COLORS.whiteAlpha20, borderRadius: RADIUS.md, padding: 10 },
  kpiLabel: { color: COLORS.cD1FAE5, fontSize: 12, fontWeight: '600' },
  kpiValue: { color: COLORS.textLight, fontSize: TYPOGRAPHY.title, fontWeight: '800', marginTop: 4 },
  listContent: { padding: SPACING.xl },
  
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clienteName: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary },
  
  metodoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 2 },
  metodoText: { fontSize: 13, color: COLORS.modFinanceiro, fontWeight: '700', marginLeft: 4 },
  
  dateText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { backgroundColor: COLORS.dangerBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.cFECACA },
  badgeText: { color: COLORS.danger, fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  details: { fontSize: 14, color: COLORS.textSecondary },
  totalValue: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.modFinanceiro },
  receiveBtn: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: RADIUS.md, gap: 8 },
  btnText: { color: COLORS.textLight, fontWeight: '700', fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10 },
  emptySub: { color: COLORS.textSecondary },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00006, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, ...SHADOWS.card },
  modalTitle: { fontSize: TYPOGRAPHY.h2, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  resumoConta: { backgroundColor: COLORS.warningSoft, padding: 15, borderRadius: RADIUS.sm, marginBottom: 20, borderWidth: 1, borderColor: COLORS.cFED7AA },
  resumoLabel: { fontSize: 14, color: COLORS.c9A3412, fontWeight: '600' },
  resumoValue: { fontSize: 16, color: COLORS.textPrimary, fontWeight: 'bold' },
  
  labelPicker: { fontSize: TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  pickerWrapper: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceMuted, marginBottom: 25 },
  
  modalActions: { flexDirection: 'row', gap: 15 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderDark, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: TYPOGRAPHY.body },
  confirmBtn: { flex: 1, padding: 15, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary, alignItems: 'center' },
  confirmText: { color: COLORS.textLight, fontWeight: '700', fontSize: TYPOGRAPHY.body },
});

export default ContasReceberScreen;
