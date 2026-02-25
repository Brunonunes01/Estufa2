// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal
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
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFF" />
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

            const ativos = plantios.filter((p: any) => p.status !== 'finalizado' || isEditMode);
            setPlantiosDisponiveis(ativos);
            
            if (!selectedPlantioId && ativos.length > 0 && !isEditMode) {
                setSelectedPlantioId(ativos[0].id);
            }

            if (isEditMode) {
                const venda = await getColheitaById(editingId);
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

  const handleDelete = () => {
    Alert.alert("Excluir Venda", "Deseja remover este registro permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
          try {
            await deleteColheita(editingId);
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
            uid: targetId,
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
      if (!targetId || !quantidade || !selectedPlantioId) return Alert.alert("Erro", "Preencha os campos obrigatórios.");
      
      setLoading(true);
      try {
          const plantioObj = plantiosDisponiveis.find(p => p.id === selectedPlantioId);
          const data: ColheitaFormData = {
              quantidade: parseFloat(quantidade.replace(',', '.')),
              unidade,
              precoUnitario: parseFloat(preco.replace(',', '.')) || 0,
              clienteId: selectedClienteId,
              destino: null,
              metodoPagamento,
              registradoPor: user?.name || 'App',
              observacoes: null,
              dataVenda,
              pesoBruto: parseFloat(pesoBruto.replace(',', '.')) || 0,
              pesoLiquido: parseFloat(pesoLiquido.replace(',', '.')) || 0
          };

          if (isEditMode) {
              await updateColheita(editingId, data);
          } else {
              await createColheita(data, targetId, selectedPlantioId, plantioObj!.estufaId);
          }
          navigation.goBack();
      } catch (e) { Alert.alert("Erro", "Falha ao salvar."); } finally { setLoading(false); }
  };

  if (loadingData) return <ActivityIndicator size="large" color={COLORS.primary} style={{flex:1}} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Informações Gerais</Text>
            
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
                <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {showDatePicker && <DateTimePicker value={dataVenda} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setDataVenda(d); }} />}

            <Text style={styles.label}>Cliente</Text>
            <View style={styles.rowAlign}>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={styles.picker}>
                        <Picker.Item label="Venda Avulsa / Balcão" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <Text style={[styles.label, {marginTop: 10}]}>Produto (Plantio)</Text>
            <View style={[styles.pickerWrapper, isEditMode && styles.disabledPicker]}>
                <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId} enabled={!isEditMode} style={styles.picker}>
                    {plantiosDisponiveis.map(p => (
                        <Picker.Item key={p.id} label={`${p.cultura} - ${estufasMap[p.estufaId] || '?'}`} value={p.id} />
                    ))}
                </Picker>
            </View>
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
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{isEditMode ? 'Salvar Alterações' : 'Confirmar Venda'}</Text>}
        </TouchableOpacity>

      </ScrollView>

      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <TextInput style={styles.input} placeholder="Nome do Cliente" value={novoClienteNome} onChangeText={setNovoClienteNome} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{color: '#64748B'}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleQuickRegisterClient} style={styles.modalBtn}>
                {salvandoNovoCliente ? <ActivityIndicator color="#FFF" /> : <Text style={{color: '#FFF', fontWeight: 'bold'}}>Salvar</Text>}
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
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 18, marginBottom: 15, elevation: 2 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, textTransform: 'uppercase' },
  label: { fontSize: 12, color: '#64748B', marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', color: '#000', fontWeight: 'bold' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  dateText: { marginLeft: 10, fontWeight: 'bold', color: '#000' },
  row: { flexDirection: 'row' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  pickerWrapper: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', height: 50, justifyContent: 'center' },
  disabledPicker: { opacity: 0.6, backgroundColor: '#E2E8F0' },
  picker: { color: '#000' },
  addBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 8, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginBottom: 15 },
  infoText: { marginLeft: 8, color: COLORS.primary, fontWeight: 'bold' },
  totalContainer: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 15 },
  totalLabel: { fontSize: 11, color: '#64748B', fontWeight: 'bold' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  saveBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  saveText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  modalBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }
});

export default ColheitaFormScreen;