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
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const InsumoEntryScreen = ({ route, navigation }: any) => {
    const { user, selectedTenantId } = useAuth();
    const preselectedInsumoId = route.params?.preselectedInsumoId;

    const [insumosList, setInsumosList] = useState<Insumo[]>([]);
    const [fornecedoresList, setFornecedoresList] = useState<Fornecedor[]>([]);

    const [selectedInsumoId, setSelectedInsumoId] = useState<string | undefined>(undefined);
    const [quantidadeComprada, setQuantidadeComprada] = useState('');
    const [custoUnitarioCompra, setCustoUnitarioCompra] = useState('');
    const [selectedFornecedorId, setSelectedFornecedorId] = useState<string | null>(null);
    const [observacoes, setObservacoes] = useState('');

    const [loadingData, setLoadingData] = useState(true);
    const [loadingForm, setLoadingForm] = useState(false);

    const parseDecimal = (value: string) => {
        const normalized = value.replace(',', '.').trim();
        if (!normalized) return 0;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    useEffect(() => {
        const loadInitialData = async () => {
            const targetId = selectedTenantId || user?.uid;
            if (!targetId) return;
            setLoadingData(true);
            try {
                const [insumos, fornecedores] = await Promise.all([
                    listInsumos(targetId),
                    listFornecedoresService(targetId) 
                ]);

                setInsumosList(insumos);
                setFornecedoresList(fornecedores);

                if (insumos.length > 0) {
                    const validPreselected = preselectedInsumoId && insumos.some((item) => item.id === preselectedInsumoId);
                    setSelectedInsumoId(validPreselected ? preselectedInsumoId : insumos[0].id);
                }
            } catch (error) {
                Alert.alert("Erro", "Não foi possível carregar os dados iniciais.");
            } finally {
                setLoadingData(false);
            }
        };
        loadInitialData();
    }, [selectedTenantId, user?.uid, preselectedInsumoId]);

    const insumoSelecionado = useMemo(() => {
        return insumosList.find(i => i.id === selectedInsumoId);
    }, [selectedInsumoId, insumosList]);

    const valorTotalCompra = useMemo(() => {
        const qtd = parseDecimal(quantidadeComprada);
        const custo = parseDecimal(custoUnitarioCompra);
        return (qtd * custo);
    }, [quantidadeComprada, custoUnitarioCompra]);

    const preview = useMemo(() => {
        const qtd = parseDecimal(quantidadeComprada);
        const custoCompra = parseDecimal(custoUnitarioCompra);
        const estoqueAtual = Number(insumoSelecionado?.estoqueAtual || 0);
        const custoAtual = Number(insumoSelecionado?.custoUnitario || 0);
        const estoqueApos = estoqueAtual + qtd;
        const custoMedioApos =
            estoqueApos > 0
                ? ((estoqueAtual * custoAtual) + (qtd * custoCompra)) / estoqueApos
                : 0;

        return {
            estoqueAtual,
            estoqueApos,
            custoAtual,
            custoMedioApos,
        };
    }, [insumoSelecionado, quantidadeComprada, custoUnitarioCompra]);

    const handleSaveEntry = async () => {
        const targetId = selectedTenantId || user?.uid;
        if (!targetId || !selectedInsumoId || !insumoSelecionado) {
            Alert.alert('Erro', 'Selecione um insumo válido.');
            return;
        }

        const qtd = parseDecimal(quantidadeComprada);
        const custo = parseDecimal(custoUnitarioCompra);

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
            await addEstoqueToInsumo(selectedInsumoId, entryData, targetId);
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
                        <MaterialCommunityIcons name="select-group" size={20} color={COLORS.textPrimary} />
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
                        <MaterialCommunityIcons name="cash-plus" size={20} color={COLORS.textPrimary} />
                        <Text style={styles.cardTitleText}>Detalhes da Compra</Text>
                    </View>

                    <Text style={styles.label}>Quantidade Comprada ({insumoSelecionado?.unidadePadrao || '?'})</Text>
                    <TextInput style={styles.input} value={quantidadeComprada} onChangeText={setQuantidadeComprada} keyboardType="decimal-pad" placeholder={`Ex: 50 ${insumoSelecionado?.unidadePadrao || ''}`} />

                    <Text style={styles.label}>Custo Unitário da Compra (R$)</Text>
                    <TextInput style={styles.input} value={custoUnitarioCompra} onChangeText={setCustoUnitarioCompra} keyboardType="decimal-pad" placeholder={`Custo por ${insumoSelecionado?.unidadePadrao || '?'}`} />

                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Valor Total da Nota:</Text>
                        <Text style={styles.totalValue}>R$ {valorTotalCompra.toFixed(2)}</Text>
                    </View>

                    <View style={styles.previewBox}>
                        <Text style={styles.previewTitle}>Prévia após lançamento</Text>
                        <Text style={styles.previewRow}>
                          Estoque: {preview.estoqueAtual.toFixed(2)} {insumoSelecionado?.unidadePadrao || ''}
                          {'  '}→{'  '}
                          {preview.estoqueApos.toFixed(2)} {insumoSelecionado?.unidadePadrao || ''}
                        </Text>
                        <Text style={styles.previewRow}>
                          Custo médio: R$ {preview.custoAtual.toFixed(2)} → R$ {preview.custoMedioApos.toFixed(2)}
                        </Text>
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
                    {loadingForm ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveButtonText}>Registrar Entrada de Estoque</Text>}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    fullContainer: { flex: 1, backgroundColor: COLORS.background },
    scrollContainer: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: 60, alignItems: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { width: '100%', backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: RADIUS.lg, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
    titleRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 10, marginBottom: SPACING.lg },
    cardTitleText: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginLeft: 8 },
    label: { fontSize: 14, marginBottom: 4, fontWeight: '700', color: COLORS.textSecondary },
    input: { borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: RADIUS.sm, marginBottom: SPACING.md, backgroundColor: COLORS.surfaceMuted, fontSize: TYPOGRAPHY.body, color: COLORS.textPrimary },
    pickerContainer: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, marginBottom: SPACING.md, backgroundColor: COLORS.surfaceMuted },
    totalBox: { backgroundColor: COLORS.successSoft, padding: 15, borderRadius: RADIUS.sm, marginBottom: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cBBF7D0 },
    totalLabel: { fontSize: TYPOGRAPHY.body, color: COLORS.success, fontWeight: '700' },
    totalValue: { fontSize: TYPOGRAPHY.h2, fontWeight: '800', color: COLORS.success, marginTop: 5 },
    previewBox: { backgroundColor: COLORS.infoSoft, borderWidth: 1, borderColor: COLORS.cBFDBFE, borderRadius: RADIUS.sm, padding: 12, marginBottom: SPACING.lg },
    previewTitle: { color: COLORS.info, fontSize: 13, fontWeight: '800', marginBottom: 6 },
    previewRow: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 2 },
    saveButton: { width: '100%', backgroundColor: COLORS.primary, padding: 18, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 55, ...SHADOWS.card },
    saveButtonText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.title },
    emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: TYPOGRAPHY.body }
});

export default InsumoEntryScreen;
