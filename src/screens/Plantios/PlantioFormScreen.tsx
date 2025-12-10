// src/screens/Plantios/PlantioFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { Timestamp } from 'firebase/firestore';
import { createPlantio, PlantioFormData } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';
import { Estufa } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const PlantioFormScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth(); // PEGAR ID
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
        // Define ID de busca
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
    const targetId = selectedTenantId || user?.uid; // Define ID de escrita
    if (!targetId) return;

    if (!estufaId || !cultura || !quantidade) {
        Alert.alert("Erro", "Preencha estufa, cultura e quantidade.");
        return;
    }

    const data: PlantioFormData = {
        estufaId,
        cultura,
        variedade: variety || null,
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
        await createPlantio(data, targetId); // Passa o ID correto
        Alert.alert("Sucesso", "Plantio iniciado!");
        navigation.goBack();
    } catch (e) {
        Alert.alert("Erro", "Não foi possível criar.");
    } finally {
        setLoading(false);
    }
  };

  // OBS: variety foi usado como 'variedade' no state, ajustando nome
  const variety = variedade; 

  if (loadingData) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <ScrollView style={styles.container}>
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <MaterialCommunityIcons name="sprout" size={24} color="#4CAF50" />
                <Text style={styles.title}>Novo Ciclo</Text>
            </View>

            <Text style={styles.label}>Estufa</Text>
            <View style={styles.pickerBox}>
                <Picker selectedValue={estufaId} onValueChange={setEstufaId}>
                    {estufas.map(e => <Picker.Item key={e.id} label={e.nome} value={e.id} />)}
                </Picker>
            </View>

            <Text style={styles.label}>Cultura (O que vai plantar?)</Text>
            <TextInput style={styles.input} value={cultura} onChangeText={setCultura} placeholder="Ex: Tomate" />

            <Text style={styles.label}>Variedade (Opcional)</Text>
            <TextInput style={styles.input} value={variedade} onChangeText={setVariedade} placeholder="Ex: Italiano" />

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Quantidade</Text>
                    <TextInput style={styles.input} value={quantidade} onChangeText={setQuantidade} keyboardType="numeric" placeholder="1000" />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Unidade</Text>
                    <TextInput style={styles.input} value={unidade} onChangeText={setUnidade} placeholder="Mudas/Pés" />
                </View>
            </View>

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Ciclo (Dias)</Text>
                    <TextInput style={styles.input} value={ciclo} onChangeText={setCiclo} keyboardType="numeric" placeholder="90" />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Custo Muda (R$)</Text>
                    <TextInput style={styles.input} value={precoEst} onChangeText={setPrecoEst} keyboardType="numeric" placeholder="0.50" />
                </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Iniciar Plantio</Text>}
            </TouchableOpacity>
        </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA', padding: 16 },
    centered: { flex: 1, justifyContent: 'center' },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, elevation: 3 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: '#333' },
    label: { fontWeight: 'bold', color: '#555', marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
    pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default PlantioFormScreen;