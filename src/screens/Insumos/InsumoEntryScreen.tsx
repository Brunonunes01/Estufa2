// src/screens/Insumos/InsumoEntryScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { addEstoqueToInsumo, listInsumos, InsumoEntryData } from '../../services/insumoService'; 
import { Fornecedor, Insumo } from '../../types/domain';
import { listFornecedores as listFornecedoresService } from '../../services/fornecedorService'; 

const InsumoEntryScreen = ({ navigation }: any) => {
    const { user } = useAuth();

    const [insumosList, setInsumosList] = useState<Insumo[]>([]);
    const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>([]);

    const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
    const [quantidadeComprada, setQuantidadeComprada] = useState('');
    const [custoUnitarioCompra, setCustoUnitarioCompra] = useState('');
    const [selectedFornecedorId, setSelectedFornecedorId] = useState<string | null>(null);
    const [observacoes, setObservacoes] = useState('');

    const [loadingData, setLoadingData] = useState(true);
    const [loadingForm, setLoadingForm] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;
            setLoadingData(true);
            try {
                const [insumos, fornecedores] = await Promise.all([
                    listInsumos(user.uid),
                    listFornecedoresService(user.uid) 
                ]);

                setInsumosList(insumos);
                setFornecedoresList(fornecedores);

                if (insumos.length > 0) {
                    setSelectedInsumoId(insumos[0].id);
                }
            } catch (error) {
                Alert.alert("Erro", "Não foi possível carregar os dados iniciais.");
            } finally {
                setLoadingData(false);
            }
        };
        loadInitialData();
    }, [user]);

    const insumoSelecionado = useMemo(() => {
        return insumosList.find(i => i.id === selectedInsumoId);
    }, [selectedInsumoId, insumosList]);

    const valorTotalCompra = useMemo(() => {
        const qtd = parseFloat(quantidadeComprada.replace(',', '.')) || 0;
        const custo = parseFloat(custoUnitarioCompra.replace(',', '.')) || 0;
        return (qtd * custo);
    }, [quantidadeComprada, custoUnitarioCompra]);

    const handleSaveEntry = async () => {
        if (!user || !selectedInsumoId || !insumoSelecionado) {
            Alert.alert('Erro', 'Selecione um insumo válido.');
            return;
        }

        const qtd = parseFloat(quantidadeComprada.replace(',', '.')) || 0;
        const custo = parseFloat(custoUnitarioCompra.replace(',', '.')) || 0;

        if (qtd <= 0 || isNaN(qtd)) {
            Alert.alert('Erro', 'Quantidade comprada deve ser maior que zero.');
            return;
        }
        if (custo <= 0 || isNaN(custo)) {
            Alert.alert('Erro', 'Custo unitário deve ser maior que zero.');
            return;
        }

        const entryData: InsumoEntryData = {
            quantidadeComprada: qtd,
            custoUnitarioCompra: custo,
            fornecedorId: selectedFornecedorId,
            observacoes: observacoes || null,
        };

        setLoadingForm(true);
        try {
            await addEstoqueToInsumo(selectedInsumoId, entryData);
            Alert.alert('Sucesso!', `Entrada de ${qtd} ${insumoSelecionado.unidadePadrao} registrada. O Custo Médio Ponderado foi atualizado.`);
            navigation.goBack(); 
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Não foi possível registrar a entrada de estoque.');
        } finally {
            setLoadingForm(false);
        }
    };

    if (loadingData) {
        return <ActivityIndicator size="large" style={styles.centered} />;
    }

    if (insumosList.length === 0) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>Você precisa cadastrar insumos antes de dar entrada no estoque.</Text>
            </View>
        );
    }
    
    return (
        <KeyboardAvoidingView style={styles.fullContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.card}>
                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="select-group" size={20} color="#333" />
                        <Text style={styles.cardTitleText}>Seleção de Insumo</Text>
                    </View>

                    <Text style={styles.label}>Insumo</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={selectedInsumoId} onValueChange={(itemValue: string) => setSelectedInsumoId(itemValue)}>
                            {insumosList.map(insumo => (
                                <Picker.Item key={insumo.id} label={`${insumo.nome} (Estoque atual: ${insumo.estoqueAtual} ${insumo.unidadePadrao})`} value={insumo.id} />
                            ))}
                        </Picker>
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="cash-plus" size={20} color="#333" />
                        <Text style={styles.cardTitleText}>Detalhes da Compra</Text>
                    </View>

                    <Text style={styles.label}>Quantidade Comprada ({insumoSelecionado?.unidadePadrao || '?'})</Text>
                    <TextInput style={styles.input} value={quantidadeComprada} onChangeText={setQuantidadeComprada} keyboardType="numeric" placeholder={`Ex: 50 ${insumoSelecionado?.unidadePadrao || ''}`} />

                    <Text style={styles.label}>Custo Unitário da Compra (R$)</Text>
                    <TextInput style={styles.input} value={custoUnitarioCompra} onChangeText={setCustoUnitarioCompra} keyboardType="numeric" placeholder={`Custo por ${insumoSelecionado?.unidadePadrao || '?'}`} />

                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Valor Total da Nota:</Text>
                        <Text style={styles.totalValue}>R$ {valorTotalCompra.toFixed(2)}</Text>
                    </View>

                    <Text style={styles.label}>Fornecedor (Opcional)</Text>
                    <View style={styles.pickerContainer}>
                        <Picker selectedValue={selectedFornecedorId} onValueChange={(itemValue: string | null) => setSelectedFornecedorId(itemValue)}>
                            <Picker.Item label="Nenhum Fornecedor Selecionado" value={null} />
                            {fornecedoresList.map(f => (
                                <Picker.Item key={f.id} label={f.nome} value={f.id} />
                            ))}
                        </Picker>
                    </View>
                    
                    <Text style={styles.label}>Observações (Nota Fiscal, etc.)</Text>
                    <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={observacoes} onChangeText={setObservacoes} multiline placeholder="Número da nota fiscal, data de validade, etc." />
                </View>

                {/* BOTÃO SALVAR (Limpado de espaços em branco) */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEntry} disabled={loadingForm}>
                    {loadingForm ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Registrar Entrada de Estoque</Text>}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    fullContainer: { flex: 1, backgroundColor: '#FAFAFA' },
    scrollContainer: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 60, alignItems: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { width: '100%', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#eee' },
    titleRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 20 },
    cardTitleText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginLeft: 8 },
    label: { fontSize: 14, marginBottom: 4, fontWeight: 'bold', color: '#555' },
    input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 8, marginBottom: 16, backgroundColor: '#fff', fontSize: 16, color: '#333' },
    pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 16, backgroundColor: '#fff' },
    totalBox: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 8, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9' },
    totalLabel: { fontSize: 16, color: '#006400', fontWeight: 'bold' },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#006400', marginTop: 5 },
    saveButton: { width: '100%', backgroundColor: '#4CAF50', padding: 18, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 55 },
    saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    emptyText: { textAlign: 'center', color: '#666', fontSize: 16 }
});

export default InsumoEntryScreen;