// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createColheita, ColheitaFormData } from '../../services/colheitaService';
import { listAllPlantios } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { listClientes } from '../../services/clienteService'; 
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { Plantio, Cliente } from '../../types/domain';

// --- TEMA ---
const COLORS = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#059669',
  inputBorder: '#E5E7EB',
  inputBg: '#F9FAFB',
  textDark: '#111827',
  textGray: '#6B7280',
};

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

  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('kg'); 
  const [preco, setPreco] = useState(''); 
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null); 
  const [destino, setDestino] = useState(''); 
  const [pesoCaixa, setPesoCaixa] = useState(''); 
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Garante que existe um ID para buscar (seja o do parceiro ou o próprio)
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

  const handleSave = async (reset: boolean) => {
      // CORREÇÃO: Verificação de segurança para o TypeScript
      if (!user) {
          Alert.alert("Erro", "Usuário não autenticado.");
          return;
      }

      const targetId = selectedTenantId || user.uid;
      
      if (!quantidade) {
          Alert.alert("Erro", "Informe a quantidade");
          return;
      }

      setLoading(true);
      try {
          const finalPlantio = isSelectionMode ? selectedPlantioId : paramPlantioId;
          // Busca o ID da estufa correspondente ao plantio selecionado
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
              registradoPor: user.name, // Agora seguro pois verificamos if (!user) antes
              observacoes: null
          };

          await createColheita(data, targetId, finalPlantio, finalEstufa);
          
          if (reset) {
              setQuantidade('');
              Alert.alert("Sucesso", "+1 Venda Registrada!");
          } else {
              navigation.goBack();
          }
      } catch (e) { 
          Alert.alert("Erro ao salvar", "Verifique os dados e tente novamente."); 
      } finally { 
          setLoading(false); 
      }
  };

  if (loadingData) return <ActivityIndicator size="large" color={COLORS.primary} style={{flex:1}} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Seção 1: Origem e Cliente */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Informações Gerais</Text>
            
            {isSelectionMode && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>O que foi vendido?</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId}>
                            {plantiosDisponiveis.map(p => (
                                <Picker.Item key={p.id} label={`${p.cultura} - ${estufasMap[p.estufaId] || '?'}`} value={p.id} style={styles.pickerItem}/>
                            ))}
                        </Picker>
                    </View>
                </View>
            )}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Cliente</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId}>
                        <Picker.Item label="Venda Avulsa" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
            </View>
        </View>

        {/* Seção 2: Valores */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Valores e Quantidades</Text>
            
            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 15 }]}>
                    <Text style={styles.label}>Quantidade</Text>
                    <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={quantidade} 
                        onChangeText={setQuantidade} 
                        placeholder="0"
                    />
                </View>
                <View style={[styles.inputGroup, { width: 100 }]}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={unidade} onValueChange={setUnidade}>
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="CX" value="caixa" />
                            <Picker.Item label="UN" value="unidade" />
                        </Picker>
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Preço Unitário (R$)</Text>
                <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    value={preco} 
                    onChangeText={setPreco} 
                    placeholder="0,00"
                />
            </View>

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>TOTAL ESTIMADO</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
        </View>

        {/* Seção 3: Pagamento */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>Pagamento</Text>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={setMetodoPagamento}>
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="Cartão" value="cartao" />
                    <Picker.Item label="Fiado / Prazo" value="prazo" />
                </Picker>
            </View>
        </View>

        {/* Botões de Ação */}
        <View style={styles.footerButtons}>
            <TouchableOpacity 
                style={[styles.button, styles.buttonOutline]} 
                onPress={() => handleSave(false)}
                disabled={loading}
            >
                <Text style={[styles.buttonText, {color: COLORS.textDark}]}>Salvar e Sair</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]} 
                onPress={() => handleSave(true)}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Salvar e Novo (+)</Text>}
            </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  inputGroup: { marginBottom: 15 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textDark,
  },
  pickerWrapper: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pickerItem: { fontSize: 14 },
  
  row: { flexDirection: 'row' },
  
  totalContainer: {
    backgroundColor: '#ECFDF5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  totalLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  totalValue: { fontSize: 24, color: COLORS.primary, fontWeight: '800', marginTop: 4 },

  footerButtons: { flexDirection: 'row', gap: 15, paddingBottom: 20 },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 0.3, elevation: 4 },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#D1D5DB' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});

export default ColheitaFormScreen;