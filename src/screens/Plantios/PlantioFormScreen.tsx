// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { createPlantio, updatePlantio, getPlantioById } from '../../services/plantioService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore'; 

type UnidadeQuantidadePlantio = 'Mudas' | 'Sementes' | 'Bandejas' | 'Gramas' | 'Kg';

const UNIDADE_QUANTIDADE_OPTIONS: UnidadeQuantidadePlantio[] = ['Mudas', 'Sementes', 'Bandejas', 'Gramas', 'Kg'];

const normalizeUnidadeQuantidade = (value?: string | null): UnidadeQuantidadePlantio => {
  const raw = (value || '').trim().toLowerCase();
  if (raw === 'sementes') return 'Sementes';
  if (raw === 'bandejas') return 'Bandejas';
  if (raw === 'gramas') return 'Gramas';
  if (raw === 'kg' || raw === 'quilo' || raw === 'quilos') return 'Kg';
  return 'Mudas';
};

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
  const [unidadeQuantidade, setUnidadeQuantidade] = useState<UnidadeQuantidadePlantio>('Mudas');
  
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
  }, [editingId, selectedTenantId]);

  const gerarCodigoLote = () => {
    const dataAtual = new Date();
    const ano = dataAtual.getFullYear();
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); 
    setCodigoLote(`LT-${ano}${mes}-${randomSuffix}`);
  };

  const loadPlantio = async (id: string) => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    try {
      const data = await getPlantioById(id, targetId);
      if (data) {
        setCodigoLote(data.codigoLote || '');
        setCultura(data.cultura || '');
        setVariedade(data.variedade || '');
        setOrigemSemente(data.origemSemente || '');
        setQuantidadePlantada(data.quantidadePlantada?.toString() || '');
        setUnidadeQuantidade(normalizeUnidadeQuantidade(data.unidadeQuantidade));
        setCicloDias(data.cicloDias?.toString() || '');
        setObservacoes(data.observacoes || '');
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os dados do plantio.");
    }
  };

  const handleDelete = () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    Alert.alert(
      "Cancelar Lote",
      "Tem certeza? O lote será cancelado e mantido no histórico financeiro.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Cancelar Lote", 
          style: "destructive", 
          onPress: async () => {
            try {
              await updatePlantio(editingId as string, { status: 'cancelado' }, targetId);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erro", "Falha ao cancelar o lote.");
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
      custoAcumulado: 0,
      cicloDias: cicloNum > 0 ? cicloNum : null,
      observacoes,
      ...(!isEditMode && { 
        dataPlantio: dataPlantioTimestamp,
        dataInicio: dataPlantioTimestamp,
        status: 'em_desenvolvimento',
        previsaoColheita: previsaoData,
        dataPrevisaoColheita: previsaoData,
      })
    };

    try {
      if (isEditMode && editingId) {
        await updatePlantio(editingId as string, plantioData as any, targetId);
      } else {
        await createPlantio(plantioData as any, targetId);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao salvar o lote.");
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
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={unidadeQuantidade} onValueChange={(value) => setUnidadeQuantidade(value as UnidadeQuantidadePlantio)} style={styles.picker}>
                {UNIDADE_QUANTIDADE_OPTIONS.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{flex: 1}}>
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
        <Text style={styles.hint}>Custos financeiros do ciclo são lançados por aplicações e despesas vinculadas.</Text>

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
  pickerWrapper: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, height: 54, justifyContent: 'center' },
  picker: { color: COLORS.textDark },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  hint: { fontSize: 12, color: COLORS.textPrimary, marginTop: -10, marginBottom: 15, fontStyle: 'italic' },
  
  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 10, marginBottom: 30, ...SHADOWS.card },
  btnText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.body }
});

export default PlantioFormScreen;
