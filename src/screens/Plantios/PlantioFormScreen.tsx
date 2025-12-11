// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { Timestamp } from 'firebase/firestore';
import { createPlantio, PlantioFormData } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';
import { Estufa } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// --- TEMA ---
const COLORS = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#059669',
  secondary: '#10B981',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  textDark: '#111827',
  textGray: '#6B7280',
};

const PlantioFormScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  
  const [estufaId, setEstufaId] = useState('');
  const [cultura, setCultura] = useState('');
  const [variedade, setVariedade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('unidades');
  const [ciclo, setCiclo] = useState('');
  const [precoEst, setPrecoEst] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const carregar = async () => {
        const targetId = selectedTenantId || user?.uid;
        if (!targetId) return;

        try {
            const lista = await listEstufas(targetId);
            setEstufas(lista);
            if (lista.length > 0) setEstufaId(lista[0].id);
        } catch (e) {
            Alert.alert("Erro", "Falha ao buscar estufas.");
        } finally {
            setLoadingData(false);
        }
    }
    carregar();
  }, [selectedTenantId]);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    if (!estufaId || !cultura || !quantidade) {
        Alert.alert("Erro", "Preencha estufa, cultura e quantidade.");
        return;
    }

    const data: PlantioFormData = {
        estufaId,
        cultura,
        variedade: variedade || null,
        quantidadePlantada: parseFloat(quantidade) || 0,
        unidadeQuantidade: unidade,
        dataPlantio: Timestamp.now(),
        cicloDias: parseInt(ciclo) || 0,
        status: 'em_desenvolvimento',
        precoEstimadoUnidade: parseFloat(precoEst.replace(',', '.')) || 0,
        fornecedorId: null,
    };

    setLoading(true);
    try {
        await createPlantio(data, targetId);
        Alert.alert("Sucesso", "Novo ciclo iniciado! 🌱");
        navigation.goBack();
    } catch (e) {
        Alert.alert("Erro", "Não foi possível criar.");
    } finally {
        setLoading(false);
    }
  };

  if (loadingData) return <ActivityIndicator size="large" style={styles.centered} color={COLORS.primary} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="sprout" size={32} color={COLORS.primary} />
            </View>
            <View>
                <Text style={styles.headerTitle}>Iniciar Novo Ciclo</Text>
                <Text style={styles.headerSub}>Cadastre o plantio para controle.</Text>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Localização e Cultura</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Estufa</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={estufaId} onValueChange={setEstufaId}>
                        {estufas.map(e => <Picker.Item key={e.id} label={e.nome} value={e.id} style={styles.pickerItem}/>)}
                    </Picker>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Cultura (O que vai plantar?)</Text>
                <TextInput style={styles.input} value={cultura} onChangeText={setCultura} placeholder="Ex: Tomate, Pimentão" />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Variedade (Opcional)</Text>
                <TextInput style={styles.input} value={variedade} onChangeText={setVariedade} placeholder="Ex: Italiano, Carmen" />
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Produção e Custos</Text>
            
            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 15}]}>
                    <Text style={styles.label}>Qtd. Plantada</Text>
                    <TextInput style={styles.input} value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" placeholder="1000" />
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Unidade</Text>
                    <TextInput style={styles.input} value={unidade} onChangeText={setUnidade} placeholder="Mudas" />
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 15}]}>
                    <Text style={styles.label}>Ciclo (Dias)</Text>
                    <TextInput style={styles.input} value={ciclo} onChangeText={setCiclo} keyboardType="numeric" placeholder="90" />
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Custo Muda (R$)</Text>
                    <TextInput style={styles.input} value={precoEst} onChangeText={setPrecoEst} keyboardType="numeric" placeholder="0.50" />
                </View>
            </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveText}>Iniciar Plantio</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: 20 },
    centered: { flex: 1, justifyContent: 'center' },
    
    headerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textDark },
    headerSub: { fontSize: 14, color: COLORS.textGray },

    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
    
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
    input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, color: COLORS.textDark },
    pickerWrapper: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
    pickerItem: { fontSize: 14 },
    
    row: { flexDirection: 'row' },
    
    saveBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, elevation: 4, marginBottom: 30 },
    saveText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});

export default PlantioFormScreen;