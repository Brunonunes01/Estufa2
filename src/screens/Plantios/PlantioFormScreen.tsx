// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { createPlantio, updatePlantio, getPlantioById, deletePlantio } from '../../services/plantioService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
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
  
  // --- NOVO: ESTADO PARA O CUSTO DA MUDA/SEMENTE ---
  const [precoEstimadoUnidade, setPrecoEstimadoUnidade] = useState('');
  
  const [cicloDias, setCicloDias] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Lote (Plantio)' : 'Novo Lote',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textLight} />
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

  const loadPlantio = async (id: string) => {
    const data = await getPlantioById(id);
    if (data) {
      setCodigoLote(data.codigoLote || '');
      setCultura(data.cultura || '');
      setVariedade(data.variedade || '');
      setOrigemSemente(data.origemSemente || '');
      setQuantidadePlantada(data.quantidadePlantada?.toString() || '');
      setUnidadeQuantidade(data.unidadeQuantidade || 'mudas');
      // Carrega o preço se existir
      setPrecoEstimadoUnidade(data.precoEstimadoUnidade?.toString() || '');
      setCicloDias(data.cicloDias?.toString() || '');
      setObservacoes(data.observacoes || '');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Lote",
      "Tem a certeza? Isso apagará este registro de plantio e afetará o histórico financeiro.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
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
    const targetId = (selectedTenantId || user?.uid) as string;
    
    if (!estufaId && !isEditMode) {
      return Alert.alert("Erro", "Nenhuma estufa vinculada a este lote.");
    }
    if (!cultura || !quantidadePlantada) {
      return Alert.alert("Erro", "Preencha a Cultura e a Quantidade Plantada.");
    }
    
    setLoading(true);

    const qtdNum = parseFloat(quantidadePlantada.replace(',', '.')) || 0;
    // --- NOVO: CONVERTE O CUSTO PARA NÚMERO ---
    const precoNum = parseFloat(precoEstimadoUnidade.replace(',', '.')) || 0;
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
      precoEstimadoUnidade: precoNum > 0 ? precoNum : null, // Salva no banco de dados
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
              placeholderTextColor={COLORS.textPlaceholder} 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Variedade</Text>
            <TextInput 
              style={styles.input} 
              value={variedade} 
              onChangeText={setVariedade} 
              placeholder="Ex: Italiano" 
              placeholderTextColor={COLORS.textPlaceholder} 
            />
          </View>
        </View>

        <Text style={styles.label}>Origem da Semente / Muda</Text>
        <TextInput 
          style={styles.input} 
          value={origemSemente} 
          onChangeText={setOrigemSemente} 
          placeholder="Ex: Viveiro X, Lote Fornecedor Y" 
          placeholderTextColor={COLORS.textPlaceholder} 
        />

        <Text style={styles.sectionTitle}>Dados de Plantio e Custos</Text>

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Quantidade *</Text>
            <TextInput 
              style={styles.input} 
              value={quantidadePlantada} 
              onChangeText={setQuantidadePlantada} 
              placeholder="Ex: 500" 
              placeholderTextColor={COLORS.textPlaceholder} 
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
              placeholderTextColor={COLORS.textPlaceholder} 
            />
          </View>
        </View>

        {/* --- NOVO: CAMPO DE CUSTO E CICLO LADO A LADO --- */}
        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Custo Un. da Muda (R$)</Text>
            <TextInput 
              style={styles.input} 
              value={precoEstimadoUnidade} 
              onChangeText={setPrecoEstimadoUnidade} 
              placeholder="Ex: 1.50" 
              placeholderTextColor={COLORS.textPlaceholder} 
              keyboardType="numeric" 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Ciclo Est. (Dias)</Text>
            <TextInput 
              style={styles.input} 
              value={cicloDias} 
              onChangeText={setCicloDias} 
              placeholder="Ex: 90" 
              placeholderTextColor={COLORS.textPlaceholder} 
              keyboardType="numeric" 
            />
          </View>
        </View>
        <Text style={styles.hint}>O custo unitário compõe a "Despesa Inicial" na rentabilidade.</Text>

        <Text style={styles.sectionTitle}>Outros</Text>

        <Text style={styles.label}>Observações do Lote</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={observacoes} 
          onChangeText={setObservacoes} 
          placeholder="Condições climáticas no dia, tipo de adubação de base..." 
          placeholderTextColor={COLORS.textPlaceholder} 
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.textLight} />
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
  padding: { padding: SPACING.xl },
  
  loteContainer: { backgroundColor: COLORS.infoSoft, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.info, marginBottom: 20 },
  loteLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, marginBottom: 5, textAlign: 'center' },
  loteInput: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: 1 },

  sectionTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.secondary, marginTop: 10, marginBottom: 15 },
  label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textSecondary, fontSize: 13 },
  input: { backgroundColor: COLORS.surfaceMuted, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, color: COLORS.textDark },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: 12, color: COLORS.textPrimary, marginTop: -10, marginBottom: 15, fontStyle: 'italic' },
  
  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 10, marginBottom: 30, ...SHADOWS.card },
  btnText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.body }
});

export default PlantioFormScreen;
