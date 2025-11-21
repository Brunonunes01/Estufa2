// src/screens/Insumos/InsumoFormScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ScrollView, 
  Alert, 
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView, 
  Platform
} from 'react-native';
import { 
  createInsumo, 
  updateInsumo, 
  getInsumoById, 
  InsumoFormData 
} from '../../services/insumoService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

type TipoInsumo = "adubo" | "defensivo" | "semente" | "outro";
type UnidadePadrao = "kg" | "g" | "L" | "mL" | "unidade";

const InsumoFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  const insumoId = route.params?.insumoId;
  const isEditMode = !!insumoId;

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoInsumo>('adubo');
  const [unidade, setUnidade] = useState<UnidadePadrao>('kg');
  const [tamanhoEmbalagem, setTamanhoEmbalagem] = useState('0'); 
  const [qtdEmbalagens, setQtdEmbalagens] = useState('0'); 
  const [descricao, setDescricao] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  const [estoqueAtualOriginal, setEstoqueAtualOriginal] = useState(0); 

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const estoqueTotalCalculado = useMemo(() => {
    if (isEditMode) {
      return estoqueAtualOriginal; 
    }
    const tam = parseFloat(tamanhoEmbalagem.replace(',', '.')) || 0;
    const qtd = parseFloat(qtdEmbalagens.replace(',', '.')) || 0;
    return tam * qtd;
  }, [tamanhoEmbalagem, qtdEmbalagens, isEditMode, estoqueAtualOriginal]);

  useEffect(() => {
    const carregarInsumo = async () => {
      if (isEditMode && insumoId) {
        setLoadingData(true);
        try {
          const insumo = await getInsumoById(insumoId);
          if (insumo) {
            setNome(insumo.nome);
            setTipo(insumo.tipo);
            setUnidade(insumo.unidadePadrao as UnidadePadrao);
            setDescricao(insumo.observacoes || '');
            setEstoqueMinimo(insumo.estoqueMinimo?.toString() || '');
            
            setEstoqueAtualOriginal(insumo.estoqueAtual);

            // Preenche os campos de embalagem para visualização
            setTamanhoEmbalagem(insumo.tamanhoEmbalagem?.toString() || '0');
            if (insumo.tamanhoEmbalagem && insumo.tamanhoEmbalagem > 0) {
              const qtdAprox = insumo.estoqueAtual / insumo.tamanhoEmbalagem;
              setQtdEmbalagens(qtdAprox.toFixed(2)); 
            } else {
              setQtdEmbalagens(insumo.estoqueAtual.toFixed(2));
            }
          }
        } catch (error) {
          Alert.alert('Erro', 'Não foi possível carregar o insumo.');
        } finally {
          setLoadingData(false);
        }
      }
    };
    carregarInsumo();
  }, [insumoId, isEditMode]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Insumo' : 'Novo Insumo'
    });
  }, [isEditMode, navigation]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!nome || !unidade) {
      Alert.alert('Campos obrigatórios', 'Preencha Nome e Unidade.');
      return;
    }

    let estoqueParaSalvar = isEditMode ? estoqueAtualOriginal : estoqueTotalCalculado;
    let tamanhoEmbalagemParaSalvar = parseFloat(tamanhoEmbalagem.replace(',', '.')) || null;

    if (!isEditMode && parseFloat(tamanhoEmbalagem.replace(',', '.')) === 0 && parseFloat(qtdEmbalagens.replace(',', '.')) > 0) {
      estoqueParaSalvar = parseFloat(qtdEmbalagens.replace(',', '.'));
      tamanhoEmbalagemParaSalvar = 1; 
    }
    if (isEditMode) {
      estoqueParaSalvar = estoqueAtualOriginal; 
    }

    const formData: InsumoFormData = {
      nome: nome,
      tipo: tipo,
      unidadePadrao: unidade,
      estoqueAtual: estoqueParaSalvar, 
      estoqueMinimo: parseFloat(estoqueMinimo.replace(',', '.')) || null,
      tamanhoEmbalagem: tamanhoEmbalagemParaSalvar, 
      observacoes: descricao || null,
      custoUnitario: null, 
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await updateInsumo(insumoId, formData);
        Alert.alert('Sucesso!', 'Insumo atualizado.');
      } else {
        await createInsumo(formData, user.uid);
        Alert.alert('Sucesso!', 'Insumo cadastrado.');
      }
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Erro', `Não foi possível ${isEditMode ? 'atualizar' : 'salvar'} o insumo.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loadingData) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.fullContainer} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
      >
        
        {/* CARD 1: DADOS GERAIS */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                <MaterialCommunityIcons name="tag-text-outline" size={20} color="#333" /> Dados Básicos
            </Text>

            <Text style={styles.label}>Nome do Insumo</Text>
            <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex: NPK 10-10-10"
            />

            <Text style={styles.label}>Descrição / Uso</Text>
            <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: Adubo para crescimento foliar..."
            multiline={true}
            />
            
            <Text style={styles.label}>Tipo de Insumo</Text>
            <View style={styles.selectorContainer}>
            {(['adubo', 'defensivo', 'semente', 'outro'] as TipoInsumo[]).map(t => (
                <TouchableOpacity
                key={t}
                style={[styles.selectorButton, tipo === t && styles.selectorButtonSelected]}
                onPress={() => setTipo(t)}
                >
                <Text style={[styles.selectorButtonText, tipo === t && styles.selectorButtonTextSelected]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
                </TouchableOpacity>
            ))}
            </View>
        </View>


        {/* CARD 2: CONTROLE DE ESTOQUE */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                <MaterialCommunityIcons name="archive-marker-outline" size={20} color="#333" /> Controle de Estoque
            </Text>
            
            <Text style={styles.label}>Unidade Padrão</Text>
            <View style={styles.selectorContainer}>
            {(['kg', 'g', 'L', 'mL', 'unidade'] as UnidadePadrao[]).map(u => (
                <TouchableOpacity
                key={u}
                style={[
                    styles.selectorButton, 
                    unidade === u && styles.selectorButtonSelected,
                    isEditMode && styles.selectorButtonDisabled // Desabilita visualmente
                ]}
                onPress={() => setUnidade(u)}
                disabled={isEditMode} 
                >
                <Text style={[
                    styles.selectorButtonText, 
                    unidade === u && styles.selectorButtonTextSelected, 
                    isEditMode && styles.disabledText
                ]}>
                    {u}
                </Text>
                </TouchableOpacity>
            ))}
            </View>
            
            {/* Campos de Embalagem - Visíveis apenas no modo de Criação */}
            {!isEditMode && (
                <>
                <View style={styles.row}>
                    <View style={styles.col}>
                        <Text style={styles.label}>Tamanho Embalagem ({unidade})</Text>
                        <TextInput
                        style={styles.input}
                        value={tamanhoEmbalagem}
                        onChangeText={setTamanhoEmbalagem}
                        keyboardType="numeric"
                        placeholder="Ex: 50"
                        />
                    </View>
                    <View style={styles.col}>
                        <Text style={styles.label}>Qtd. Embalagens (Início)</Text>
                        <TextInput
                        style={styles.input}
                        value={qtdEmbalagens}
                        onChangeText={setQtdEmbalagens}
                        keyboardType="numeric"
                        placeholder="Ex: 2"
                        />
                    </View>
                </View>
                </>
            )}

            {/* Aviso para ajustes de estoque em edição */}
            {isEditMode && (
                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-outline" size={20} color="#856404" />
                    <Text style={styles.warningText}>
                        Em edição, o Estoque Total e a Unidade não podem ser alterados diretamente. Use a tela de Aplicações para movimentação.
                    </Text>
                </View>
            )}

            <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Estoque Total Disponível:</Text>
            <Text style={styles.totalValue}>
                {estoqueTotalCalculado.toFixed(2)} {unidade}
            </Text>
            </View>
            
            <Text style={styles.label}>Alerta de Estoque Mínimo (em {unidade})</Text>
            <TextInput
            style={styles.input}
            value={estoqueMinimo}
            onChangeText={setEstoqueMinimo}
            keyboardType="numeric"
            placeholder="Ex: 20"
            />
        </View>

        {/* BOTÃO SALVAR CUSTOMIZADO */}
        <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave} 
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.saveButtonText}>
                {isEditMode ? "Atualizar Insumo" : "Salvar Insumo"}
                </Text>
            )}
        </TouchableOpacity>
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ESTILOS PARA DESIGN PROFISSIONAL (Material Look)
const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Fundo claro
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 60, 
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Estilo de Card (Container principal)
    card: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, 
        borderWidth: 1,
        borderColor: '#eee',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    label: {
        fontSize: 14,
        marginBottom: 4,
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 16,
        backgroundColor: '#fff',
        fontSize: 16,
    },
    
    // Seletores Segmentados (Botões de Categoria/Unidade)
    selectorContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        flexWrap: 'wrap', 
        justifyContent: 'space-between',
    },
    selectorButton: {
        flexGrow: 1, // Permite que os botões ocupem o espaço
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: '#4CAF50', // Verde Primário
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
        marginBottom: 8,
    },
    selectorButtonSelected: {
        backgroundColor: '#4CAF50',
    },
    selectorButtonDisabled: {
        backgroundColor: '#E0E0E0',
        borderColor: '#B0B0B0',
    },
    selectorButtonText: {
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    selectorButtonTextSelected: {
        color: '#fff',
    },
    disabledText: { 
        color: '#888',
    },

    // Layout de Colunas
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    col: {
        width: '48%',
    },
    
    // Total de Estoque
    totalBox: {
        backgroundColor: '#e8f4f8',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#b6e1f2',
    },
    totalLabel: {
        fontSize: 16,
        color: '#555',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007bff',
        marginVertical: 5,
    },

    // Aviso de Edição
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff3cd',
        borderColor: '#ffeeba',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 15,
    },
    warningText: { 
        color: '#856404',
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },

    // Botão customizado para Salvar
    saveButton: {
        width: '100%',
        backgroundColor: '#4CAF50', // Verde Primário
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        minHeight: 50,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default InsumoFormScreen;