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

// IMPORTS FIREBASE PARA O CADASTRO RÁPIDO DE CLIENTE
import { db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

  // --- CAMPOS DO FORMULÁRIO ---
  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(params.plantioId || '');
  const [quantidade, setQuantidade] = useState('');
  
  // MUDANÇA AQUI: Padrão alterado de 'kg' para 'caixa'
  const [unidade, setUnidade] = useState<UnidadeColheita>('caixa'); 
  
  const [preco, setPreco] = useState(''); 
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null); 
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [loading, setLoading] = useState(false);
  
  // Data
  const [dataVenda, setDataVenda] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- ESTADOS DO MODAL DE NOVO CLIENTE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);

  useEffect(() => {
    navigation.setOptions({ 
        headerStyle: { backgroundColor: '#14532d' },
        headerTintColor: '#fff',
        title: isEditMode ? 'Editar Venda' : 'Registrar Venda'
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
            console.error(e);
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

  // --- FUNÇÃO DE CADASTRO RÁPIDO DE CLIENTE ---
  const handleQuickRegisterClient = async () => {
    if (!novoClienteNome.trim()) {
        Alert.alert("Atenção", "Digite o nome do cliente");
        return;
    }
    setSalvandoNovoCliente(true);
    try {
        const targetId = selectedTenantId || user?.uid;
        if (!targetId) throw new Error("Usuário não identificado");

        // Salva direto no Firestore
        const docRef = await addDoc(collection(db, "clientes"), {
            nome: novoClienteNome.trim(),
            uid: targetId,
            createdAt: serverTimestamp(),
            tipo: 'Consumidor',
            telefone: ''
        });

        // Atualiza a lista local e seleciona o novo
        const novoClienteObj = { id: docRef.id, nome: novoClienteNome.trim() } as Cliente;
        const novaLista = [...clientesList, novoClienteObj].sort((a,b) => a.nome.localeCompare(b.nome));
        
        setClientesList(novaLista);
        setSelectedClienteId(docRef.id);
        
        setModalVisible(false);
        setNovoClienteNome('');

    } catch (error) {
        Alert.alert("Erro", "Não foi possível cadastrar");
        console.error(error);
    } finally {
        setSalvandoNovoCliente(false);
    }
  };

  const handleSave = async () => {
      const targetId = selectedTenantId || user?.uid;
      
      if (!targetId) {
          Alert.alert("Erro", "Sessão inválida. Faça login novamente.");
          return;
      }
      
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
                  await updateColheita(editingId as string, data);
                  Alert.alert("Sucesso", "Venda atualizada!");
              }
          } else {
              if (!finalEstufaId) {
                  Alert.alert("Erro", "Estufa não identificada.");
                  setLoading(false); 
                  return;
              }
              await createColheita(data, targetId, selectedPlantioId, finalEstufaId as string);
              Alert.alert("Sucesso", "Venda registrada!");
          }
          navigation.goBack();

      } catch (e) { 
          Alert.alert("Erro", "Falha ao salvar."); 
          console.error(e);
      } finally { 
          setLoading(false); 
      }
  };

  if (loadingData) return <ActivityIndicator size="large" color="#FFF" style={{flex:1, backgroundColor:'#14532d'}} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Detalhes da Venda</Text>
            
            <Text style={styles.label}>Data</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color="#166534" />
                <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
                <MaterialCommunityIcons name="pencil" size={16} color="#64748B" />
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker 
                    value={dataVenda} 
                    mode="date" 
                    display="default" 
                    onChange={handleDateChange} 
                    maximumDate={new Date()} 
                />
            )}

            {/* SELEÇÃO DE CLIENTE + BOTÃO + */}
            <Text style={[styles.label, {marginTop: 15}]}>Cliente</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.inputWrapper, {flex: 1, marginBottom: 0}]}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={{color: '#1E293B'}}>
                        <Picker.Item label="Venda Avulsa / Balcão" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity 
                    style={styles.addClientBtn} 
                    onPress={() => setModalVisible(true)}
                >
                    <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>
            <View style={{height: 15}}/>

            {(isSelectionMode || isEditMode) && (
                <>
                    <Text style={styles.label}>Produto (Plantio)</Text>
                    <View style={[styles.inputWrapper, isEditMode && {opacity: 0.7, backgroundColor: '#E2E8F0'}]}>
                        <Picker 
                            selectedValue={selectedPlantioId} 
                            onValueChange={setSelectedPlantioId} 
                            enabled={!isEditMode} 
                            style={{color: '#1E293B'}}
                        >
                            {plantiosDisponiveis.map(p => (
                                <Picker.Item 
                                    key={p.id} 
                                    label={`${p.cultura} - ${estufasMap[p.estufaId] || '?'}`} 
                                    value={p.id} 
                                />
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
                        <TextInput 
                            style={styles.input} 
                            keyboardType="numeric" 
                            value={quantidade} 
                            onChangeText={setQuantidade} 
                            placeholder="0" 
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>
                <View style={{ width: 120 }}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.inputWrapper}>
                        <Picker selectedValue={unidade} onValueChange={setUnidade} style={{color: '#1E293B'}}>
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
                <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    value={preco} 
                    onChangeText={setPreco} 
                    placeholder="0,00" 
                    placeholderTextColor="#94A3B8"
                />
            </View>
            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Forma de Pagamento</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={setMetodoPagamento} style={{color: '#1E293B'}}>
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <Text style={styles.modalSub}>Cadastro rápido</Text>

            <TextInput 
              style={styles.modalInput}
              placeholder="Nome do Cliente"
              value={novoClienteNome}
              onChangeText={setNovoClienteNome}
              autoFocus={true}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtnCancel}>
                <Text style={{color: '#64748B'}}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleQuickRegisterClient} 
                style={styles.modalBtnSave}
                disabled={salvandoNovoCliente}
              >
                {salvandoNovoCliente ? (
                    <ActivityIndicator size="small" color="#FFF"/>
                ) : (
                    <Text style={{color: '#FFF', fontWeight: 'bold'}}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#14532d' },
  scrollContent: { padding: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 4 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  inputWrapper: { backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15, height: 50, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#1E293B', height: '100%' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#166534', paddingHorizontal: 15, height: 55, marginBottom: 15 },
  dateText: { flex: 1, marginLeft: 10, fontSize: 18, color: '#166534', fontWeight: 'bold' },
  row: { flexDirection: 'row' },
  totalContainer: { backgroundColor: '#ECFDF5', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#D1FAE5' },
  totalLabel: { fontSize: 12, color: '#059669', fontWeight: '700' },
  totalValue: { fontSize: 24, color: '#059669', fontWeight: '800', marginTop: 4 },
  saveBtn: { backgroundColor: '#166534', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 30, elevation: 4 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  
  // ESTILOS BOTÃO + MODAL
  addClientBtn: {
      width: 50,
      height: 50,
      backgroundColor: '#166534',
      borderRadius: 12,
      marginLeft: 10,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    elevation: 10
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F293B' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#F1F5F9'
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  modalBtnCancel: { padding: 10, justifyContent: 'center' },
  modalBtnSave: { 
    backgroundColor: '#166534', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 8 
  }
});

export default ColheitaFormScreen;