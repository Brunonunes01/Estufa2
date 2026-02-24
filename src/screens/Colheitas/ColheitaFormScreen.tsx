// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker'; 
import { createColheita, updateColheita, getColheitaById, ColheitaFormData } from '../../services/colheitaService';
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

  const [isSelectionMode, setIsSelectionMode] = useState(!params.plantioId && !isEditMode);
  
  const [plantiosDisponiveis, setPlantiosDisponiveis] = useState<Plantio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]); 
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(params.plantioId || '');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('caixa'); 
  const [preco, setPreco] = useState(''); 
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null); 
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [loading, setLoading] = useState(false);
  
  const [dataVenda, setDataVenda] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);

  useEffect(() => {
    navigation.setOptions({ 
        title: isEditMode ? 'Editar Venda' : 'Registrar Venda',
        headerStyle: { backgroundColor: COLORS.primary },
    });
    
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

            if (isEditMode && editingId) {
                const venda = await getColheitaById(editingId);
                if (venda) {
                    setQuantidade(String(venda.quantidade));
                    setUnidade(venda.unidade as UnidadeColheita);
                    setPreco(venda.precoUnitario ? String(venda.precoUnitario) : '');
                    setSelectedClienteId(venda.clienteId || null);
                    setMetodoPagamento((venda.metodoPagamento as MetodoPagamento) || 'pix');
                    setSelectedPlantioId(venda.plantioId);
                    
                    setIsSelectionMode(false); 
                    
                    if (venda.dataColheita) {
                        const d = (venda.dataColheita as any).toDate 
                            ? (venda.dataColheita as any).toDate() 
                            : new Date((venda.dataColheita as any).seconds * 1000);
                        setDataVenda(d);
                    }
                }
            }
        } catch (e) {
            Alert.alert("Erro", "Falha ao carregar dados.");
        } finally {
            setLoadingData(false);
        }
    };
    carregarTudo();
  }, [selectedTenantId, user, editingId]);

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(quantidade.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return qtd * prc;
  }, [quantidade, preco]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDataVenda(selectedDate);
  };

  const handleQuickRegisterClient = async () => {
    if (!novoClienteNome.trim()) return Alert.alert("Atenção", "Digite o nome do cliente");
    setSalvandoNovoCliente(true);
    try {
        const targetId = selectedTenantId || user?.uid;
        if (!targetId) throw new Error("Usuário não identificado");

        const docRef = await addDoc(collection(db, "clientes"), {
            nome: novoClienteNome.trim(),
            uid: targetId,
            createdAt: serverTimestamp(),
            tipo: 'Consumidor',
            telefone: ''
        });

        const novoClienteObj = { id: docRef.id, nome: novoClienteNome.trim() } as Cliente;
        const novaLista = [...clientesList, novoClienteObj].sort((a,b) => a.nome.localeCompare(b.nome));
        
        setClientesList(novaLista);
        setSelectedClienteId(docRef.id);
        
        setModalVisible(false);
        setNovoClienteNome('');
    } catch (error) {
        Alert.alert("Erro", "Não foi possível cadastrar");
    } finally {
        setSalvandoNovoCliente(false);
    }
  };

  const handleSave = async () => {
      const targetId = selectedTenantId || user?.uid;
      
      if (!targetId) return Alert.alert("Erro", "Sessão inválida.");
      if (!quantidade) return Alert.alert("Erro", "Informe a quantidade");

      setLoading(true);
      try {
          const plantioObj = plantiosDisponiveis.find(p => p.id === selectedPlantioId);
          const finalEstufaId = plantioObj?.estufaId || params.estufaId;
          
          if (!selectedPlantioId && !isEditMode) {
             Alert.alert("Erro", "Selecione o produto/plantio.");
             setLoading(false);
             return;
          }

          const data: ColheitaFormData = {
              quantidade: parseFloat(quantidade.replace(',', '.')),
              unidade,
              precoUnitario: parseFloat(preco.replace(',', '.')) || 0,
              clienteId: selectedClienteId,
              destino: null,
              metodoPagamento,
              registradoPor: user?.name || 'App',
              observacoes: null,
              dataVenda: dataVenda 
          };

          if (isEditMode) {
              if (editingId) {
                  // CORREÇÃO DO TYPESCRIPT AQUI ("as string")
                  await updateColheita(editingId as string, data);
                  Alert.alert("Sucesso", "Venda atualizada!");
              }
          } else {
              if (!finalEstufaId) {
                  Alert.alert("Erro", "Estufa não identificada.");
                  setLoading(false); 
                  return;
              }
              // CORREÇÃO DO TYPESCRIPT AQUI ("as string")
              await createColheita(data, targetId as string, selectedPlantioId as string, finalEstufaId as string);
              Alert.alert("Sucesso", "Venda registrada!");
          }
          navigation.goBack();

      } catch (e) { 
          Alert.alert("Erro", "Falha ao salvar."); 
      } finally { 
          setLoading(false); 
      }
  };

  if (loadingData) return <ActivityIndicator size="large" color={COLORS.primary} style={{flex:1, backgroundColor: COLORS.background}} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Detalhes da Venda</Text>
            
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
                <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker value={dataVenda} mode="date" display="default" onChange={handleDateChange} maximumDate={new Date()} />
            )}

            <Text style={[styles.label, {marginTop: 15}]}>Cliente</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.inputWrapper, {flex: 1, marginBottom: 0}]}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={{color: '#000', fontWeight: 'bold'}}>
                        <Picker.Item label="Venda Avulsa / Balcão" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity style={styles.addClientBtn} onPress={() => setModalVisible(true)}>
                    <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>
            <View style={{height: 15}}/>

            {(isSelectionMode || isEditMode) && (
                <>
                    <Text style={styles.label}>Produto (Plantio)</Text>
                    <View style={[styles.inputWrapper, isEditMode && {opacity: 0.7, backgroundColor: '#E2E8F0'}]}>
                        <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId} enabled={!isEditMode} style={{color: '#000', fontWeight: 'bold'}}>
                            {plantiosDisponiveis.map(p => (
                                <Picker.Item key={p.id} label={`${p.cultura} - ${estufasMap[p.estufaId] || '?'}`} value={p.id} />
                            ))}
                        </Picker>
                    </View>
                </>
            )}
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Valores</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 15 }}>
                    <Text style={styles.label}>Quantidade</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} keyboardType="numeric" value={quantidade} onChangeText={setQuantidade} placeholder="0" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.primary} />
                    </View>
                </View>
                <View style={{ width: 130 }}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.inputWrapper}>
                        <Picker selectedValue={unidade} onValueChange={setUnidade} style={{color: '#000', fontWeight: 'bold'}}>
                            <Picker.Item label="CX" value="caixa" /> 
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="UN" value="unidade" />
                            <Picker.Item label="MC" value="maço" />
                        </Picker>
                    </View>
                </View>
            </View>
            <Text style={styles.label}>Preço Unitário (R$)</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={setPreco} placeholder="0,00" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.primary} />
            </View>
            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Forma de Pagamento</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={setMetodoPagamento} style={{color: '#000', fontWeight: 'bold'}}>
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="Cartão" value="cartao" />
                    <Picker.Item label="Fiado / Prazo" value="prazo" />
                    <Picker.Item label="Boleto" value="boleto" />
                    <Picker.Item label="Outro" value="outro" />
                </Picker>
            </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{isEditMode ? 'Salvar Alterações' : 'Confirmar Venda'}</Text>}
        </TouchableOpacity>

      </ScrollView>

      {/* --- MODAL PARA CADASTRAR CLIENTE --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <Text style={styles.modalSub}>Cadastro rápido</Text>

            <View style={styles.inputWrapperModal}>
                <TextInput style={styles.inputModal} placeholder="Nome do Cliente" placeholderTextColor={COLORS.textPlaceholder} value={novoClienteNome} onChangeText={setNovoClienteNome} autoFocus={true} selectionColor={COLORS.primary} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}>
                <Text style={{color: COLORS.textSecondary, fontWeight: '600'}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleQuickRegisterClient} style={styles.modalBtnSave} disabled={salvandoNovoCliente}>
                {salvandoNovoCliente ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={{color: '#FFF', fontWeight: 'bold'}}>Salvar</Text>}
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
  card: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  
  // INPUTS BLINDADOS CONTRA MODO ESCURO
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 56, justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  input: { paddingHorizontal: 15, fontSize: 18, color: '#000000', height: '100%', fontWeight: 'bold' },
  
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, paddingHorizontal: 15, height: 56, marginBottom: 15 },
  dateText: { flex: 1, marginLeft: 10, fontSize: 18, color: '#000000', fontWeight: 'bold' },
  row: { flexDirection: 'row' },
  totalContainer: { backgroundColor: COLORS.primaryLight, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  totalLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  totalValue: { fontSize: 24, color: COLORS.primary, fontWeight: '800', marginTop: 4 },
  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 30, elevation: 4 },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: 18 },
  
  addClientBtn: { width: 56, height: 56, backgroundColor: COLORS.primary, borderRadius: 12, marginLeft: 10, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  
  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1F293B' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  inputWrapperModal: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 20, height: 56, justifyContent: 'center' },
  inputModal: { paddingHorizontal: 15, fontSize: 18, color: '#000000', height: '100%', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
  modalBtnCancel: { padding: 10, justifyContent: 'center' },
  modalBtnSave: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }
});

export default ColheitaFormScreen;