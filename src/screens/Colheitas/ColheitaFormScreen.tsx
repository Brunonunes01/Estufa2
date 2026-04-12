// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { createColheita, updateColheita, getColheitaById, deleteColheita, ColheitaFormData } from '../../services/colheitaService';
import { listAllPlantios } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { listClientes } from '../../services/clienteService'; 
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { Plantio, Cliente } from '../../types/domain';
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { COLORS } from '../../constants/theme';

type UnidadeColheita = "kg" | "caixa" | "unidade" | "maço";
type MetodoPagamento = "pix" | "dinheiro" | "boleto" | "prazo" | "cartao" | "outro";

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const params = route.params || {};
  const editingId = params.colheitaId; 
  const isEditMode = !!editingId;

  const [plantiosDisponiveis, setPlantiosDisponiveis] = useState<Plantio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]); 
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(params.plantioId || '');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('caixa'); 
  const [preco, setPreco] = useState(''); 
  const [pesoBruto, setPesoBruto] = useState(''); 
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null); 
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [dataVenda, setDataVenda] = useState(new Date());
  const [isFinalHarvest, setIsFinalHarvest] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Venda' : 'Registrar Venda',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode]);

  useEffect(() => {
    const carregarTudo = async () => {
        const targetId = selectedTenantId || user?.uid;
        if (!targetId) return;

        setLoadingData(true);
        try {
            const [clientes, plantios, estufas] = await Promise.all([
                listClientes(targetId), 
                listAllPlantios(targetId),
                listEstufas(targetId)
            ]);

            setClientesList(clientes);
            const mapE: any = {};
            estufas.forEach((e: any) => mapE[e.id] = e.nome);
            setEstufasMap(mapE);

            const ativos = plantios.filter((p: any) => isEditMode || (p.status !== 'finalizado' && p.status !== 'cancelado'));
            setPlantiosDisponiveis(ativos);
            
            if (!selectedPlantioId && ativos.length > 0 && !isEditMode) {
                setSelectedPlantioId(ativos[0].id);
            }

            if (isEditMode) {
                const venda = await getColheitaById(editingId, targetId);
                if (venda) {
                    setQuantidade(String(venda.quantidade));
                    setUnidade(venda.unidade as UnidadeColheita);
                    setPreco(venda.precoUnitario ? String(venda.precoUnitario) : '');
                    setSelectedClienteId(venda.clienteId || null);
                    setMetodoPagamento((venda.metodoPagamento as MetodoPagamento) || 'pix');
                    setSelectedPlantioId(venda.plantioId);
                    setPesoBruto(venda.pesoBruto ? String(venda.pesoBruto) : '');
                    setPesoLiquido(venda.pesoLiquido ? String(venda.pesoLiquido) : '');
                    if (venda.dataColheita) setDataVenda(venda.dataColheita.toDate());
                }
            }
        } catch (e) {
            Alert.alert("Erro", "Falha ao carregar dados.");
        } finally {
            setLoadingData(false);
        }
    };
    carregarTudo();
  }, [selectedTenantId, editingId]);

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(quantidade.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return qtd * prc;
  }, [quantidade, preco]);

  const precoPorKg = useMemo(() => {
    const pLiq = parseFloat(pesoLiquido.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return (unidade === 'caixa' && pLiq > 0) ? prc / pLiq : 0;
  }, [unidade, pesoLiquido, preco]);

  // Encontra o plantio selecionado para exibir o selo de rastreabilidade
  const loteSelecionado = useMemo(() => {
    return plantiosDisponiveis.find(p => p.id === selectedPlantioId);
  }, [selectedPlantioId, plantiosDisponiveis]);

  const handleDelete = () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    Alert.alert("Excluir Venda", "Deseja remover este registro permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
          try {
            await deleteColheita(editingId, targetId);
            navigation.goBack();
          } catch (e) { Alert.alert("Erro", "Falha ao excluir."); }
      }}
    ]);
  };

  const handleQuickRegisterClient = async () => {
    if (!novoClienteNome.trim()) return Alert.alert("Atenção", "Digite o nome");
    setSalvandoNovoCliente(true);
    try {
        const targetId = selectedTenantId || user?.uid;
        const docRef = await addDoc(collection(db, "clientes"), {
            nome: novoClienteNome.trim(),
            userId: targetId, // CORRIGIDO: de 'uid' para 'userId' para manter padrão
            createdAt: serverTimestamp(),
            tipo: 'Consumidor'
        });
        const novoCliente = { id: docRef.id, nome: novoClienteNome.trim() } as Cliente;
        setClientesList(prev => [...prev, novoCliente].sort((a,b) => a.nome.localeCompare(b.nome)));
        setSelectedClienteId(docRef.id);
        setModalVisible(false);
        setNovoClienteNome('');
    } catch (error) { Alert.alert("Erro", "Falha ao cadastrar."); } finally { setSalvandoNovoCliente(false); }
  };

  const handleSave = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId || !quantidade || !selectedPlantioId) return Alert.alert("Erro", "Preencha os campos obrigatórios (Quantidade e Lote/Produto).");
      
      setLoading(true);
      try {
          const plantioObj = plantiosDisponiveis.find(p => p.id === selectedPlantioId);
          const data: ColheitaFormData = {
              quantidade: parseFloat(quantidade.replace(',', '.')),
              unidade,
              precoUnitario: parseFloat(preco.replace(',', '.')) || 0,
              clienteId: selectedClienteId,
              destino: null, // Pode ser adicionado um campo visual depois se quiser
              metodoPagamento,
              registradoPor: user?.name || 'App',
              observacoes: `Produto rastreado referente ao Lote: ${plantioObj?.codigoLote || 'N/A'}`,
              dataVenda,
              pesoBruto: parseFloat(pesoBruto.replace(',', '.')) || 0,
              pesoLiquido: parseFloat(pesoLiquido.replace(',', '.')) || 0,
              isFinalHarvest,
          };

          if (isEditMode) {
              await updateColheita(editingId, data, targetId);
          } else {
              await createColheita(data, targetId, selectedPlantioId, plantioObj!.estufaId);
          }
          navigation.goBack();
      } catch (e: any) { Alert.alert("Erro", e.message || "Falha ao salvar."); } finally { setLoading(false); }
  };

  if (loadingData) return <ActivityIndicator size="large" color={COLORS.primary} style={{flex:1}} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Origem e Destino</Text>
            
            <Text style={styles.label}>Produto (Lote de Plantio)</Text>
            <View style={[styles.pickerWrapper, isEditMode && styles.disabledPicker]}>
                <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId} enabled={!isEditMode} style={styles.picker}>
                    {plantiosDisponiveis.map(p => (
                        <Picker.Item 
                          key={p.id} 
                          // Exibe o Lote primeiro para focar na rastreabilidade
                          label={`[${p.codigoLote || 'S/ LOTE'}] ${p.cultura} - Estufa: ${estufasMap[p.estufaId] || '?'}`} 
                          value={p.id} 
                        />
                    ))}
                </Picker>
            </View>

            {/* --- SELO DE RASTREABILIDADE VISUAL --- */}
            {loteSelecionado && (
              <View style={styles.rastreioBox}>
                <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.textLight} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.rastreioTitle}>Lote de Origem Rastreado</Text>
                  <Text style={styles.rastreioText}>Código: {loteSelecionado.codigoLote || 'Não informado'}</Text>
                  <Text style={styles.rastreioText}>Variedade: {loteSelecionado.variedade || 'Padrão'}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.label, {marginTop: 15}]}>Cliente / Destino</Text>
            <View style={styles.rowAlign}>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={styles.picker}>
                        <Picker.Item label="Venda Avulsa / Consumidor Final" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.label, {marginTop: 15}]}>Data da Colheita/Venda</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
                <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker value={dataVenda} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setDataVenda(d); }} />}
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Quantidade e Pesagem</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Quantidade</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={quantidade} onChangeText={setQuantidade} placeholder="0" />
                </View>
                <View style={{ width: 110 }}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={unidade} onValueChange={(val: any) => setUnidade(val)} style={styles.picker}>
                            <Picker.Item label="CX" value="caixa" /> 
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="UN" value="unidade" />
                        </Picker>
                    </View>
                </View>
            </View>

            {unidade === 'caixa' && (
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>P. Bruto (kg)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={pesoBruto} onChangeText={setPesoBruto} placeholder="0.00" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>P. Líquido (kg)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={pesoLiquido} onChangeText={setPesoLiquido} placeholder="0.00" />
                    </View>
                </View>
            )}

            <Text style={styles.label}>Preço Unitário (R$)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={setPreco} placeholder="0.00" />

            {unidade === 'caixa' && precoPorKg > 0 && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="scale" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>Preço p/ Kg: R$ {precoPorKg.toFixed(2)}</Text>
                </View>
            )}

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>TOTAL DA VENDA</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Pagamento</Text>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={(val: any) => setMetodoPagamento(val)} style={styles.picker}>
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="A Prazo" value="prazo" />
                    <Picker.Item label="Cartão" value="cartao" />
                </Picker>
            </View>

            {!isEditMode && (
              <View style={styles.finalHarvestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Esta é a colheita final (encerrar ciclo)?</Text>
                  <Text style={styles.finalHarvestHint}>
                    Se desligado, o plantio permanece em colheita para novos lançamentos.
                  </Text>
                </View>
                <Switch
                  value={isFinalHarvest}
                  onValueChange={setIsFinalHarvest}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.textLight}
                />
              </View>
            )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>{isEditMode ? 'Salvar Alterações' : 'Confirmar Venda'}</Text>}
        </TouchableOpacity>

      </ScrollView>

      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <TextInput style={styles.input} placeholder="Nome do Cliente (Destino)" value={novoClienteNome} onChangeText={setNovoClienteNome} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{color: COLORS.textSecondary}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleQuickRegisterClient} style={styles.modalBtn}>
                {salvandoNovoCliente ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 18, marginBottom: 15, elevation: 2 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, textTransform: 'uppercase' },
  label: { fontSize: 12, color: COLORS.textPrimary, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontWeight: 'bold' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  dateText: { marginLeft: 10, fontWeight: 'bold', color: COLORS.textPrimary },
  row: { flexDirection: 'row' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  pickerWrapper: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, height: 50, justifyContent: 'center' },
  disabledPicker: { opacity: 0.6, backgroundColor: COLORS.disabledBg },
  picker: { color: COLORS.textPrimary },
  addBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 8, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  
  // Estilos do Selo de Rastreabilidade
  rastreioBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: COLORS.c86EFAC },
  rastreioTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  rastreioText: { fontSize: 11, color: COLORS.c15803D },

  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cF0FDF4, padding: 12, borderRadius: 8, marginBottom: 15 },
  infoText: { marginLeft: 8, color: COLORS.primary, fontWeight: 'bold' },
  totalContainer: { alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 15 },
  totalLabel: { fontSize: 11, color: COLORS.textPrimary, fontWeight: 'bold' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  finalHarvestRow: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  finalHarvestHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  saveText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00005, justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  modalBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }
});

export default ColheitaFormScreen;
