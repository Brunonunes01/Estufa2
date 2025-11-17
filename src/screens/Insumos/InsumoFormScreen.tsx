// src/screens/Insumos/InsumoFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ScrollView, 
  Alert, 
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { 
  createInsumo, 
  updateInsumo, // Importar
  getInsumoById, // Importar
  InsumoFormData 
} from '../../services/insumoService';
import { useAuth } from '../../hooks/useAuth';
import { Insumo } from '../../types/domain'; // Importar tipo

// Nossos tipos
type TipoInsumo = "adubo" | "defensivo" | "semente" | "outro";
type UnidadePadrao = "kg" | "g" | "L" | "mL" | "unidade";

const InsumoFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  
  // Lógica de Edição
  const insumoId = route.params?.insumoId;
  const isEditMode = !!insumoId;

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoInsumo>('adubo');
  const [unidade, setUnidade] = useState<UnidadePadrao>('kg');
  const [tamanhoEmbalagem, setTamanhoEmbalagem] = useState(''); // <-- NOVO
  const [descricao, setDescricao] = useState(''); // <-- NOVO
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // Loading para buscar dados

  // Hook para buscar os dados em modo "Editar"
  useEffect(() => {
    const carregarInsumo = async () => {
      if (isEditMode && insumoId) {
        setLoadingData(true);
        try {
          const insumo = await getInsumoById(insumoId);
          if (insumo) {
            // Preenche o formulário
            setNome(insumo.nome);
            setTipo(insumo.tipo);
            setUnidade(insumo.unidadePadrao as UnidadePadrao);
            setTamanhoEmbalagem(insumo.tamanhoEmbalagem || '');
            setDescricao(insumo.observacoes || '');
            setEstoqueAtual(insumo.estoqueAtual.toString());
            setEstoqueMinimo(insumo.estoqueMinimo?.toString() || '');
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

  // Hook para definir o título da tela
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
      Alert.alert('Campos obrigatórios', 'Preencha Nome e Unidade Padrão.');
      return;
    }

    const formData: InsumoFormData = {
      nome: nome,
      tipo: tipo,
      unidadePadrao: unidade,
      estoqueAtual: parseFloat(estoqueAtual) || 0,
      estoqueMinimo: parseFloat(estoqueMinimo) || null,
      tamanhoEmbalagem: tamanhoEmbalagem || null,
      observacoes: descricao || null,
      custoUnitario: null, // Simplificado
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
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nome do Insumo (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: NPK 10-10-10"
      />
      
      {/* ****** MELHORIA 1: SELETOR DE TIPO ****** */}
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.selectorContainer}>
        {(['adubo', 'defensivo', 'semente', 'outro'] as TipoInsumo[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.selectorButton, tipo === t && styles.selectorButtonSelected]}
            onPress={() => setTipo(t)}
          >
            <Text style={[styles.selectorButtonText, tipo === t && styles.selectorButtonTextSelected]}>
              {/* Capitaliza a primeira letra */}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ****** MELHORIA 2: SELETOR DE UNIDADE ****** */}
      <Text style={styles.label}>Unidade Padrão (para Aplicação/Estoque)</Text>
      <View style={styles.selectorContainer}>
        {(['kg', 'g', 'L', 'mL', 'unidade'] as UnidadePadrao[]).map(u => (
          <TouchableOpacity
            key={u}
            style={[styles.selectorButton, unidade === u && styles.selectorButtonSelected]}
            onPress={() => setUnidade(u)}
          >
            <Text style={[styles.selectorButtonText, unidade === u && styles.selectorButtonTextSelected]}>
              {u}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ****** CAMPO NOVO: TAMANHO EMBALAGEM ****** */}
      <Text style={styles.label}>Tamanho Padrão Embalagem (Opcional)</Text>
      <TextInput
        style={styles.input}
        value={tamanhoEmbalagem}
        onChangeText={setTamanhoEmbalagem}
        placeholder={`Ex: Saco 50kg, Frasco 1L`}
      />

      {/* ****** CAMPO NOVO: DESCRIÇÃO ****** */}
      <Text style={styles.label}>Descrição / Observações (Opcional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]} // Input maior
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Para que serve este insumo..."
        multiline={true}
      />
      
      <Text style={styles.label}>Estoque Atual (em {unidade})</Text>
      <TextInput
        style={styles.input}
        value={estoqueAtual}
        onChangeText={setEstoqueAtual}
        keyboardType="numeric"
        placeholder="Ex: 50"
      />
      
      <Text style={styles.label}>Estoque Mínimo (em {unidade}) (Opcional)</Text>
      <TextInput
        style={styles.input}
        value={estoqueMinimo}
        onChangeText={setEstoqueMinimo}
        keyboardType="numeric"
        placeholder="Avisar quando chegar em..."
      />

      <Button title={loading ? "Salvando..." : "Salvar Insumo"} onPress={handleSave} disabled={loading} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  selectorContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap', 
  },
  selectorButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
});

export default InsumoFormScreen;