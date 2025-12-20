// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import DateTimePicker from '@react-native-community/datetimepicker'; // <--- IMPORTANTE
import { createColheita, ColheitaFormData } from '../../services/colheitaService';
import { listAllPlantios } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { listClientes } from '../../services/clienteService'; 
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { Plantio, Cliente } from '../../types/domain';

type UnidadeColheita = "kg" | "caixa" | "unidade" | "maço";
type MetodoPagamento = "pix" | "dinheiro" | "boleto" | "prazo" | "cartao" | "outro";

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const params = route.params || {};
  const { plantioId: paramPlantioId, estufaId: paramEstufaId } = params;

  const [isSelectionMode, setIsSelectionMode] = useState(!paramPlantioId);
  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(paramPlantioId || '');
  
  const [plantiosDisponiveis, setPlantiosDisponiveis] = useState<Plantio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]); 
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  // Form States
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('kg'); 
  const [preco, setPreco] = useState(''); 
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null); 
  const [destino, setDestino] = useState(''); 
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [loading, setLoading] = useState(false);
  
  // DATE PICKER STATE
  const [dataVenda, setDataVenda] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    navigation.setOptions({ 
        headerStyle: { backgroundColor: '#14532d' },
        headerTintColor: '#fff'
    });
    
    const targetId = selectedTenantId || user?.uid;
    if (targetId) {
      setLoadingData(true);
      Promise.all([
          listClientes(targetId), 
          isSelectionMode ? listAllPlantios(targetId) : Promise.resolve([]),
          isSelectionMode ? listEstufas(targetId) : Promise.resolve([])
      ]).then(([clientes, plantios, estufas]) => {
        setClientesList(clientes);
        if (isSelectionMode) {
            const mapE: any = {};
            estufas.forEach((e: any) => mapE[e.id] = e.nome);
            setEstufasMap(mapE);
            const ativos = plantios.filter((p: any) => p.status !== 'finalizado');
            setPlantiosDisponiveis(ativos);
            if (ativos.length > 0) setSelectedPlantioId(ativos[0].id);
        }
      }).finally(() => setLoadingData(false));
    }
  }, [isSelectionMode, selectedTenantId, user]);

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(quantidade.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return qtd * prc;
  }, [quantidade, preco]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
        setDataVenda(selectedDate);
    }
  };

  const handleSave = async (reset: boolean) => {
      if (!user) return Alert.alert("Erro", "Usuário não autenticado.");
      const targetId = selectedTenantId || user.uid;
      
      if (!quantidade) return Alert.alert("Erro", "Informe a quantidade");

      setLoading(true);
      try {
          const finalPlantio = isSelectionMode ? selectedPlantioId : paramPlantioId;
          const finalEstufa = isSelectionMode 
            ? plantiosDisponiveis.find(p => p.id === selectedPlantioId)?.estufaId 
            : paramEstufaId;
          
          if (!finalPlantio || !finalEstufa) {
              Alert.alert("Erro", "Selecione um plantio válido.");
              setLoading(false);
              return;
          }

          const data: ColheitaFormData = {
              quantidade: parseFloat(quantidade.replace(',', '.')),
              unidade,
              precoUnitario: parseFloat(preco.replace(',', '.')) || 0,
              clienteId: selectedClienteId,
              destino: destino || null,
              metodoPagamento,
              registradoPor: user.name,
              observacoes: null,
              dataVenda: dataVenda // <--- ENVIA A DATA SELECIONADA
          };

          await createColheita(data, targetId, finalPlantio, finalEstufa);
          
          if (reset) {
              setQuantidade('');
              Alert.alert("Sucesso", "Venda Registrada!");
          } else {
              navigation.goBack();
          }
      } catch (e) { 
          Alert.alert("Erro ao salvar", "Verifique os dados."); 
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
            
            {/* SELETOR DE DATA */}
            <Text style={styles.label}>Data da Venda</Text>
            <TouchableOpacity 
                style={styles.dateButton} 
                onPress={() => setShowDatePicker(true)}
            >
                <MaterialCommunityIcons name="calendar" size={20} color="#166534" />
                <Text style={styles.dateText}>
                    {dataVenda.toLocaleDateString('pt-BR')}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={dataVenda}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()} // Não permite data futura
                />
            )}

            {/* SELETORES ORIGINAIS */}
            {isSelectionMode && (
                <>
                    <Text style={[styles.label, {marginTop: 15}]}>Produto / Plantio</Text>
                    <View style={styles.inputWrapper}>
                        <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId} style={{color: '#1E293B'}}>
                            {plantiosDisponiveis.map(p => (
                                <Picker.Item key={p.id} label={`${p.cultura} - ${estufasMap[p.estufaId] || '?'}`} value={p.id} style={{fontSize: 14}}/>
                            ))}
                        </Picker>
                    </View>
                </>
            )}

            <Text style={styles.label}>Cliente</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={{color: '#1E293B'}}>
                    <Picker.Item label="Venda Avulsa / Balcão" value={null} />
                    {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                </Picker>
            </View>
        </View>

        {/* VALORES E QUANTIDADES (Mantido igual, mas dentro do novo layout) */}
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
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="CX" value="caixa" />
                            <Picker.Item label="UN" value="unidade" />
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
                <Text style={styles.totalLabel}>TOTAL RECEBIDO</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Pagamento</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={setMetodoPagamento} style={{color: '#1E293B'}}>
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="Cartão" value="cartao" />
                    <Picker.Item label="Fiado / Prazo" value="prazo" />
                </Picker>
            </View>
        </View>

        <View style={styles.footerButtons}>
            <TouchableOpacity 
                style={[styles.button, styles.buttonOutline]} 
                onPress={() => handleSave(false)}
                disabled={loading}
            >
                <Text style={[styles.buttonText, {color: '#FFF'}]}>Salvar e Sair</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]} 
                onPress={() => handleSave(true)}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#166534" /> : <Text style={[styles.buttonText, {color: '#166534'}]}>Salvar e Novo (+)</Text>}
            </TouchableOpacity>
        </View>

      </ScrollView>
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
  
  // Novo estilo do botão de data
  dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F1F5F9',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      paddingHorizontal: 15,
      height: 50,
  },
  dateText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 16,
      color: '#1E293B',
      fontWeight: '500',
  },

  row: { flexDirection: 'row' },
  
  totalContainer: { backgroundColor: '#ECFDF5', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#D1FAE5' },
  totalLabel: { fontSize: 12, color: '#059669', fontWeight: '700' },
  totalValue: { fontSize: 24, color: '#059669', fontWeight: '800', marginTop: 4 },

  footerButtons: { flexDirection: 'row', gap: 15, paddingBottom: 20 },
  button: { flex: 1, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: '#FFF', elevation: 4 },
  buttonOutline: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: '#FFF' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});

export default ColheitaFormScreen;