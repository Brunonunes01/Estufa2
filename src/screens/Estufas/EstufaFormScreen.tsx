// src/screens/Estufas/EstufaFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createEstufa, updateEstufa, getEstufaById, EstufaFormData } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

const EstufaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); // PEGAR O ID SELECIONADO
  
  const estufaId = route.params?.estufaId;
  const isEditMode = !!estufaId;

  const [nome, setNome] = useState('');
  const [anoFabricacao, setAnoFabricacao] = useState(''); 
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [status, setStatus] = useState<'ativa' | 'manutencao' | 'desativada'>('ativa');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); 

  useEffect(() => {
    const carregarDadosEstufa = async () => {
      if (isEditMode && estufaId) {
        setLoadingData(true);
        try {
          const estufa = await getEstufaById(estufaId);
          if (estufa) {
            setNome(estufa.nome);
            setComprimento(String(estufa.comprimentoM));
            setLargura(String(estufa.larguraM));
            setAltura(String(estufa.alturaM));
            setStatus(estufa.status);
            if (estufa.dataFabricacao) {
              setAnoFabricacao(estufa.dataFabricacao.toDate().getFullYear().toString());
            }
          }
        } catch (error) {
          Alert.alert('Erro', 'Não foi possível carregar os dados.');
          navigation.goBack();
        } finally {
          setLoadingData(false);
        }
      }
    };
    carregarDadosEstufa();
  }, [estufaId, isEditMode, navigation]);

  useEffect(() => {
    navigation.setOptions({ title: isEditMode ? 'Editar Estufa' : 'Nova Estufa' });
  }, [isEditMode, navigation]);

  const handleSave = async () => {
    // Define onde salvar
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;
    
    if (!nome || !comprimento || !largura || !altura) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos principais.');
      return;
    }

    let dataFabricacaoTimestamp: Timestamp | null = null;
    const ano = parseInt(anoFabricacao);
    if (ano >= 1900 && ano <= 2100) { 
      dataFabricacaoTimestamp = Timestamp.fromDate(new Date(ano, 0, 1));
    }

    const formData: EstufaFormData = {
      nome: nome,
      comprimentoM: parseFloat(comprimento.replace(',', '.')) || 0,
      larguraM: parseFloat(largura.replace(',', '.')) || 0,
      alturaM: parseFloat(altura.replace(',', '.')) || 0,
      status: status,
      dataFabricacao: dataFabricacaoTimestamp, 
      tipoCobertura: null,
      responsavel: null,
      observacoes: null,
    };

    setLoading(true);
    try {
      if (isEditMode) {
        await updateEstufa(estufaId, formData);
        Alert.alert('Sucesso!', 'Estufa atualizada.');
      } else {
        // CORREÇÃO: Usando targetId
        await createEstufa(formData, targetId);
        Alert.alert('Sucesso!', 'Estufa criada na conta ativa.');
      }
      navigation.goBack(); 
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setLoading(false);
    }
  };

  const c = parseFloat(comprimento.replace(',', '.')) || 0;
  const l = parseFloat(largura.replace(',', '.')) || 0;
  const area = (c * l).toFixed(2); 

  if (loadingData) return <ActivityIndicator size="large" style={styles.centered} />;

  const getStatusButtonStyles = (s: typeof status) => {
    switch (s) {
      case 'ativa': return { base: styles.statusButton, selected: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }, text: { color: status === s ? '#fff' : '#4CAF50' } };
      case 'manutencao': return { base: styles.statusButton, selected: { backgroundColor: '#FF9800', borderColor: '#FF9800' }, text: { color: status === s ? '#fff' : '#FF9800' } };
      case 'desativada': return { base: styles.statusButton, selected: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' }, text: { color: status === s ? '#fff' : '#D32F2F' } };
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="home-analytics" size={20} color="#333" /> 
            <Text style={styles.sectionTitle}>Detalhes da Estufa</Text>
        </View>

        <Text style={styles.label}>Nome da Estufa (obrigatório)</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Estufa 1 - Tomates" />

        <Text style={styles.label}>Ano de Construção</Text>
        <TextInput style={styles.input} value={anoFabricacao} onChangeText={setAnoFabricacao} keyboardType="numeric" maxLength={4} />
        
        <Text style={styles.subTitle}>Medidas (m)</Text>
        <View style={styles.row}>
            <View style={styles.col}>
                <Text style={styles.label}>Comprimento</Text>
                <TextInput style={styles.input} value={comprimento} onChangeText={setComprimento} keyboardType="numeric" />
            </View>
            <View style={styles.col}>
                <Text style={styles.label}>Largura</Text>
                <TextInput style={styles.input} value={largura} onChangeText={setLargura} keyboardType="numeric" />
            </View>
        </View>

        <Text style={styles.label}>Altura</Text>
        <TextInput style={styles.input} value={altura} onChangeText={setAltura} keyboardType="numeric" />

        <View style={styles.areaBox}>
          <Text style={styles.areaLabel}>Área Total:</Text>
          <Text style={styles.areaValue}>{area} m²</Text>
        </View>
        
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusContainer}>
          {(['ativa', 'manutencao', 'desativada'] as const).map((s) => {
            const stylesMap = getStatusButtonStyles(s);
            return (
              <TouchableOpacity key={s} style={[stylesMap.base, status === s && stylesMap.selected]} onPress={() => setStatus(s)}>
                <Text style={[stylesMap.text, status === s && { color: '#fff' }]}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{isEditMode ? "Atualizar" : "Salvar"}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#eee' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  subTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginTop: 5, marginBottom: 10 },
  label: { fontSize: 14, marginBottom: 4, fontWeight: 'bold', color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 16, backgroundColor: '#fff', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  areaBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#B3E5FC' },
  areaLabel: { fontSize: 16, color: '#007bff', fontWeight: 'bold' },
  areaValue: { fontSize: 18, fontWeight: 'bold', color: '#007bff' },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statusButton: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  saveButton: { width: '100%', backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 50 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default EstufaFormScreen;