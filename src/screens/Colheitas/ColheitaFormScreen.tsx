// src/screens/Colheitas/ColheitaFormScreen.tsx
import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  ScrollView, 
  Alert, 
  StyleSheet,
  TouchableOpacity // Importar
} from 'react-native';
import { createColheita, ColheitaFormData } from '../../services/colheitaService';
import { useAuth } from '../../hooks/useAuth';

// Tipos de unidade que vamos permitir
type UnidadeColheita = "kg" | "caixa" | "unidade" | "maço";

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId } = route.params;

  // Estados do formulário
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('kg'); // Padrão 'kg'
  const [preco, setPreco] = useState('');
  const [destino, setDestino] = useState('');
  
  const [loading, setLoading] = useState(false);

  // ****** MELHORIA 2: CÁLCULO DO VALOR TOTAL ******
  // usa useMemo para recalcular automaticamente
  const valorTotal = useMemo(() => {
    const qtd = parseFloat(quantidade) || 0;
    const precoUnit = parseFloat(preco) || 0;
    return (qtd * precoUnit);
  }, [quantidade, preco]); // Recalcula se 'quantidade' ou 'preco' mudar

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!quantidade || !unidade) {
      Alert.alert('Campos obrigatórios', 'Preencha Quantidade e Unidade.');
      return;
    }

    const formData: ColheitaFormData = {
      quantidade: parseFloat(quantidade) || 0,
      unidade: unidade,
      precoUnitario: parseFloat(preco) || null,
      destino: destino || null,
      observacoes: null,
    };

    setLoading(true);
    try {
      await createColheita(formData, user.uid, plantioId, estufaId);
      Alert.alert('Sucesso!', 'Colheita registrada.');
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a colheita.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Quantidade (obrigatório)</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />
      
      {/* ****** MELHORIA 1: SELETOR DE UNIDADE ****** */}
      <Text style={styles.label}>Unidade</Text>
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'kg' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('kg')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'kg' && styles.selectorButtonTextSelected]}>
            Kg
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'caixa' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('caixa')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'caixa' && styles.selectorButtonTextSelected]}>
            Caixa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'unidade' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('unidade')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'unidade' && styles.selectorButtonTextSelected]}>
            Unidade
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectorButton, unidade === 'maço' && styles.selectorButtonSelected]}
          onPress={() => setUnidade('maço')}
        >
          <Text style={[styles.selectorButtonText, unidade === 'maço' && styles.selectorButtonTextSelected]}>
            Maço
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Preço Unitário (R$) (opcional)</Text>
      <TextInput
        style={styles.input}
        value={preco}
        onChangeText={setPreco}
        keyboardType="numeric"
        placeholder={`Preço por ${unidade}`}
      />

      {/* ****** MELHORIA 2: VALOR TOTAL ****** */}
      <Text style={styles.label}>Valor Total desta Colheita</Text>
      <Text style={styles.totalText}>
        R$ {valorTotal.toFixed(2)}
      </Text>

      <Text style={styles.label}>Destino (opcional)</Text>
      <TextInput
        style={styles.input}
        value={destino}
        onChangeText={setDestino}
        placeholder="Ex: Feira, Mercado Local"
      />

      <Button title={loading ? "Salvando..." : "Salvar Colheita"} onPress={handleSave} disabled={loading} />
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
  // Estilos para o Seletor
  selectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap', // Permite que os botões quebrem a linha se não couberem
  },
  selectorButton: {
    // flex: 1, // Removemos o flex: 1 para que o tamanho seja automático
    paddingVertical: 12,
    paddingHorizontal: 16, // Adiciona padding horizontal
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 2,
    marginBottom: 8, // Adiciona margem inferior para o caso de quebra de linha
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
  // Estilo para o Total
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#005500', // Verde
  },
});

export default ColheitaFormScreen;