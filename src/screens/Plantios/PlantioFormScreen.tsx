import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { createPlantio, updatePlantio, getPlantioById, deletePlantio } from '../../services/plantioService';
import { COLORS } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore'; 

const PlantioFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  
  const estufaId = route.params?.estufaId; 
  const editingId = route.params?.plantioId;
  const isEditMode = !!editingId;

  const [codigoLote, setCodigoLote] = useState('');
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [origemSemente, setOrigemSemente] = useState('');
  
  const [quantidadePlantada, setQuantidadePlantada] = useState('');
  const [unidadeQuantidade, setUnidadeQuantidade] = useState('mudas');
  const [cicloDias, setCicloDias] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Lote (Plantio)' : 'Novo Lote',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode]);

  useEffect(() => {
    if (isEditMode && editingId) {
      loadPlantio(editingId as string);
    } else {
      gerarCodigoLote();
    }
  }, [editingId]);

  const gerarCodigoLote = () => {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); 
    setCodigoLote(`LT-${ano}${mes}-${randomSuffix}`);
  };

  // Correção 1: Recebe o ID como string estrita
  const loadPlantio = async (id: string) => {
    const data = await getPlantioById(id);
    if (data) {
      setCodigoLote(data.codigoLote || '');
      setCultura(data.cultura || '');
      setVariedade(data.variedade || '');
      setOrigemSemente(data.origemSemente || '');
      setQuantidadePlantada(data.quantidadePlantada?.toString() || '');
      setUnidadeQuantidade(data.unidadeQuantidade || 'mudas');
      setCicloDias(data.cicloDias?.toString() || '');
      setObservacoes(data.observacoes || '');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Lote",
      "Tem a certeza? Isso apagará este registro de plantio.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              // Correção 1: as string
              await deletePlantio(editingId as string);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erro", "Falha ao eliminar.");
            }
          } 
        }
      ]
    );
  };

  const handleSave = async () => {
    // Correção 1: as string para garantir que não será undefined na criação
    const targetId = (selectedTenantId || user?.uid) as string;
    
    if (!estufaId && !isEditMode) {
      return Alert.alert("Erro", "Nenhuma estufa vinculada a este lote.");
    }
    if (!cultura || !quantidadePlantada) {
      return Alert.alert("Erro", "Preencha a Cultura e a Quantidade Plantada.");
    }
    
    setLoading(true);

    const qtdNum = parseFloat(quantidadePlantada.replace(',', '.')) || 0;
    const cicloNum = parseInt(cicloDias) || 0;
    
    let previsaoData = null;
    const dataPlantioTimestamp = Timestamp.now();
    
    if (cicloNum > 0 && !isEditMode) {
      const dataPrevista = new Date();
      dataPrevista.setDate(dataPrevista.getDate() + cicloNum);
      previsaoData = Timestamp.fromDate(dataPrevista);
    }

    const plantioData = {
      estufaId,
      codigoLote,
      cultura,
      variedade,
      origemSemente,
      quantidadePlantada: qtdNum,
      unidadeQuantidade,
      cicloDias: cicloNum > 0 ? cicloNum : null,
      observacoes,
      ...(!isEditMode && { 
        dataPlantio: dataPlantioTimestamp, 
        status: 'em_desenvolvimento',
        previsaoColheita: previsaoData
      })
    };

    try {
      if (isEditMode && editingId) {
        // Correção 1: as string
        await updatePlantio(editingId as string, plantioData as any);
      } else {
        await createPlantio(plantioData as any, targetId);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar o lote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        
        <View style={styles.loteContainer}>
          <Text style={styles.loteLabel}>CÓDIGO DO LOTE (GERADO AUTOMATICAMENTE)</Text>
          <TextInput 
            style={styles.loteInput} 
            value={codigoLote} 
            editable={false} 
            selectTextOnFocus={false}
          />
        </View>

        <Text style={styles.sectionTitle}>Identificação da Cultura</Text>

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Cultura *</Text>
            <TextInput 
              style={styles.input} 
              value={cultura} 
              onChangeText={setCultura} 
              placeholder="Ex: Tomate" 
              placeholderTextColor="#94A3B8" 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Variedade</Text>
            <TextInput 
              style={styles.input} 
              value={variedade} 
              onChangeText={setVariedade} 
              placeholder="Ex: Italiano" 
              placeholderTextColor="#94A3B8" 
            />
          </View>
        </View>

        <Text style={styles.label}>Origem da Semente / Muda</Text>
        <TextInput 
          style={styles.input} 
          value={origemSemente} 
          onChangeText={setOrigemSemente} 
          placeholder="Ex: Viveiro X, Lote Fornecedor Y" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.sectionTitle}>Dados de Plantio</Text>

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Quantidade *</Text>
            <TextInput 
              style={styles.input} 
              value={quantidadePlantada} 
              onChangeText={setQuantidadePlantada} 
              placeholder="Ex: 500" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Unidade</Text>
            <TextInput 
              style={styles.input} 
              value={unidadeQuantidade} 
              onChangeText={setUnidadeQuantidade} 
              placeholder="Ex: mudas, kg" 
              placeholderTextColor="#94A3B8" 
            />
          </View>
        </View>

        <Text style={styles.label}>Ciclo Estimado (Dias até a colheita)</Text>
        <TextInput 
          style={styles.input} 
          value={cicloDias} 
          onChangeText={setCicloDias} 
          placeholder="Ex: 90" 
          placeholderTextColor="#94A3B8" 
          keyboardType="numeric" 
        />
        <Text style={styles.hint}>O sistema calculará a previsão de colheita baseado nisso.</Text>

        <Text style={styles.sectionTitle}>Outros</Text>

        <Text style={styles.label}>Observações do Lote</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={observacoes} 
          onChangeText={setObservacoes} 
          placeholder="Condições climáticas no dia, tipo de adubação de base..." 
          placeholderTextColor="#94A3B8" 
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Guardar Lote de Plantio</Text>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  padding: { padding: 20 },
  
  loteContainer: { backgroundColor: '#E0F2FE', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 20 },
  loteLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5, textAlign: 'center' },
  
  // Correção 2: Substituído COLORS.text por COLORS.textPrimary
  loteInput: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: 1 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 10, marginBottom: 15 },
  label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textSecondary, fontSize: 13 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, color: '#000' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: -10, marginBottom: 15, fontStyle: 'italic' },
  
  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default PlantioFormScreen;