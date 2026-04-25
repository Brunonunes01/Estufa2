// src/screens/Insumos/InsumoFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { createInsumo, updateInsumo, getInsumoById, InsumoFormData } from '../../services/insumoService';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

const InsumoFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const insumoId = route.params?.insumoId;
  const isEditMode = !!insumoId;

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('adubo');
  const [unidade, setUnidade] = useState('kg');
  const [estoque, setEstoque] = useState('');
  const [minimo, setMinimo] = useState('');
  const [custo, setCusto] = useState('');
  const [loading, setLoading] = useState(false);

  const parseDecimal = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseNullableDecimal = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  useEffect(() => {
    const targetId = selectedTenantId || user?.uid;
    if (isEditMode && insumoId && targetId) {
        getInsumoById(insumoId, targetId).then(i => {
            if (i) {
                setNome(i.nome); setTipo(i.tipo); setUnidade(i.unidadePadrao);
                setEstoque(String(i.estoqueAtual)); setMinimo(String(i.estoqueMinimo || '')); setCusto(String(i.custoUnitario || ''));
            }
        });
    }
  }, [insumoId, selectedTenantId, user?.uid, isEditMode]);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !nome) return Alert.alert("Erro", "Nome é obrigatório.");

    setLoading(true);
    try {
        const estoqueAtual = parseDecimal(estoque);
        const estoqueMinimo = parseNullableDecimal(minimo);
        const custoUnitario = parseNullableDecimal(custo);

        if (estoqueAtual < 0) {
          throw new Error('Estoque inicial não pode ser negativo.');
        }
        if (estoqueMinimo !== null && estoqueMinimo < 0) {
          throw new Error('Estoque mínimo não pode ser negativo.');
        }
        if (custoUnitario !== null && custoUnitario < 0) {
          throw new Error('Custo não pode ser negativo.');
        }

        const data: InsumoFormData = {
            nome: nome.trim(),
            tipo: tipo as any,
            unidadePadrao: unidade,
            estoqueAtual,
            estoqueMinimo,
            custoUnitario,
            fornecedorId: null, tamanhoEmbalagem: null, observacoes: null
        };
        if (isEditMode) await updateInsumo(insumoId, data, targetId); else await createInsumo(data, targetId);
        navigation.goBack();
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Falha ao salvar.");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Informações do Produto</Text>
            
            <Text style={styles.label}>Nome do Produto</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Ureia" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.inputWrapper}>
                <Picker selectedValue={tipo} onValueChange={setTipo} style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>
                    <Picker.Item label="Adubo / Fertilizante" value="adubo" />
                    <Picker.Item label="Defensivo / Veneno" value="defensivo" />
                    <Picker.Item label="Semente / Muda" value="semente" />
                    <Picker.Item label="Outro Material" value="outro" />
                </Picker>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Controle de Estoque</Text>
            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>{isEditMode ? 'Estoque Atual' : 'Estoque Inicial'}</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          value={estoque}
                          onChangeText={setEstoque}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor={COLORS.textPlaceholder}
                          editable={!isEditMode}
                        />
                    </View>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.inputWrapper}>
                        <Picker selectedValue={unidade} onValueChange={setUnidade} style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="Litros" value="lt" />
                            <Picker.Item label="Unidade" value="un" />
                            <Picker.Item label="Sacos" value="sc" />
                        </Picker>
                    </View>
                </View>
            </View>

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Aviso Mínimo</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          value={minimo}
                          onChangeText={setMinimo}
                          keyboardType="decimal-pad"
                          placeholder="Opcional"
                          placeholderTextColor={COLORS.textPlaceholder}
                        />
                    </View>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>{isEditMode ? 'Custo Médio Atual (R$)' : 'Custo Inicial (R$)'}</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          value={custo}
                          onChangeText={setCusto}
                          keyboardType="decimal-pad"
                          placeholder="Opcional"
                          placeholderTextColor={COLORS.textPlaceholder}
                          editable={!isEditMode}
                        />
                    </View>
                </View>
            </View>

            {isEditMode ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Para movimentar estoque ou atualizar custo médio, use "Entrada de Estoque".
                </Text>
                <TouchableOpacity
                  style={styles.infoAction}
                  onPress={() => navigation.navigate('InsumoEntry', { preselectedInsumoId: insumoId })}
                >
                  <Text style={styles.infoActionText}>Ir para Entrada de Estoque</Text>
                </TouchableOpacity>
              </View>
            ) : null}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>Salvar Item</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.surface, padding: SPACING.xl, borderRadius: RADIUS.xl, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  sectionHeader: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.md, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: TYPOGRAPHY.body, color: COLORS.textDark, height: '100%', fontWeight: '700' },
  row: { flexDirection: 'row' },
  infoBox: { marginTop: 4, backgroundColor: COLORS.infoSoft, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.cBFDBFE, padding: 12 },
  infoText: { color: COLORS.info, fontSize: 12, fontWeight: '700' },
  infoAction: { marginTop: 10, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.info, justifyContent: 'center', alignItems: 'center' },
  infoActionText: { color: COLORS.textLight, fontSize: 12, fontWeight: '800' },
  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 30, ...SHADOWS.card },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.title }
});

export default InsumoFormScreen;
