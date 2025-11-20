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
  // MODIFICADO: Valores default para evitar NaN
  const [tamanhoEmbalagem, setTamanhoEmbalagem] = useState('0'); 
  const [qtdEmbalagens, setQtdEmbalagens] = useState('0'); 
  const [descricao, setDescricao] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');
  // NOVO: Estado para armazenar o estoque atual carregado do Firebase
  const [estoqueAtualOriginal, setEstoqueAtualOriginal] = useState(0); 

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // CORRIGIDO: O estoque total retorna o valor do banco em edição (segurança de dados)
  const estoqueTotalCalculado = useMemo(() => {
    if (isEditMode) {
      return estoqueAtualOriginal; 
    }
    const tam = parseFloat(tamanhoEmbalagem) || 0;
    const qtd = parseFloat(qtdEmbalagens) || 0;
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
            
            // NOVO: Armazena o estoque atual original
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

    // Lógica de SEGURANÇA: Usa o estoque original no modo edição
    let estoqueParaSalvar = isEditMode ? estoqueAtualOriginal : estoqueTotalCalculado;
    let tamanhoEmbalagemParaSalvar = parseFloat(tamanhoEmbalagem) || null;

    if (!isEditMode && parseFloat(tamanhoEmbalagem) === 0 && parseFloat(qtdEmbalagens) > 0) {
      estoqueParaSalvar = parseFloat(qtdEmbalagens);
      tamanhoEmbalagemParaSalvar = 1; 
    }
    if (isEditMode) {
      estoqueParaSalvar = estoqueAtualOriginal; 
    }
    // FIM DA LÓGICA DE SEGURANÇA

    const formData: InsumoFormData = {
      nome: nome,
      tipo: tipo,
      unidadePadrao: unidade,
      estoqueAtual: estoqueParaSalvar, 
      estoqueMinimo: parseFloat(estoqueMinimo) || null,
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
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.label}>Nome do Insumo</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: NPK 10-10-10"
        />

        <Text style={styles.label}>Descrição (O que ele faz?)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex: Adubo para crescimento foliar..."
          multiline={true}
        />
        
        <Text style={styles.label}>Tipo</Text>
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

        <Text style={styles.sectionTitle}>Controle de Estoque</Text>

        <Text style={styles.label}>Unidade da Embalagem</Text>
        <View style={styles.selectorContainer}>
          {(['kg', 'g', 'L', 'mL', 'unidade'] as UnidadePadrao[]).map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.selectorButton, unidade === u && styles.selectorButtonSelected]}
              onPress={() => setUnidade(u)}
              // Desabilita em modo de edição
              disabled={isEditMode} 
            >
              <Text style={[styles.selectorButtonText, unidade === u && styles.selectorButtonTextSelected, isEditMode && styles.disabledText]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Tamanho Embalagem</Text>
            <TextInput
              style={[styles.input, isEditMode && styles.inputDisabled]}
              value={tamanhoEmbalagem}
              onChangeText={setTamanhoEmbalagem}
              keyboardType="numeric"
              placeholder="Ex: 50"
              // Desabilita em modo de edição
              editable={!isEditMode} 
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Qtd. Embalagens</Text>
            <TextInput
              style={[styles.input, isEditMode && styles.inputDisabled]}
              value={qtdEmbalagens}
              onChangeText={setQtdEmbalagens}
              keyboardType="numeric"
              placeholder="Ex: 2"
              // Desabilita em modo de edição
              editable={!isEditMode}
            />
          </View>
        </View>
        
        {/* Aviso para ajustes de estoque em edição */}
        {isEditMode && (
          <Text style={styles.warningText}>
            * Em modo de edição, o Estoque Total e a Unidade não podem ser alterados diretamente. 
            Para movimentação, use uma tela de entrada/saída.
          </Text>
        )}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Estoque Total Disponível:</Text>
          <Text style={styles.totalValue}>
            {estoqueTotalCalculado.toFixed(2)} {unidade}
          </Text>
          <Text style={styles.totalSubtext}>
            (O sistema usará este total para as baixas automáticas)
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

        <View style={styles.buttonWrapper}>
          <Button title={loading ? "Salvando..." : "Salvar Insumo"} onPress={handleSave} disabled={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', 
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, 
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  // ESTILOS NOVOS PARA UX/UI
  inputDisabled: { 
    backgroundColor: '#f0f0f0',
    color: '#888',
  },
  disabledText: { 
    color: '#aaa',
  },
  warningText: { 
    color: '#d9534f',
    marginBottom: 10,
    fontSize: 12,
  },
  selectorContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap', 
  },
  selectorButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  selectorButtonSelected: {
    backgroundColor: '#007bff',
  },
  selectorButtonText: {
    color: '#007bff',
    fontWeight: 'bold',
  },
  selectorButtonTextSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    width: '48%',
  },
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
  totalSubtext: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  },
  buttonWrapper: {
    marginTop: 10,
  }
});

export default InsumoFormScreen;