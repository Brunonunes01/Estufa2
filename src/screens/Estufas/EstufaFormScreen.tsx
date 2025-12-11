// src/screens/Estufas/EstufaFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { createEstufa, updateEstufa, getEstufaById, EstufaFormData } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';

const COLORS = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#059669',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  textDark: '#111827'
};

const EstufaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const estufaId = route.params?.estufaId;
  const isEditMode = !!estufaId;

  const [nome, setNome] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [status, setStatus] = useState<'ativa' | 'manutencao' | 'desativada'>('ativa');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditMode && estufaId) {
      getEstufaById(estufaId).then(estufa => {
        if (estufa) {
          setNome(estufa.nome);
          setComprimento(String(estufa.comprimentoM));
          setLargura(String(estufa.larguraM));
          setAltura(String(estufa.alturaM));
          setStatus(estufa.status);
        }
      });
    }
    navigation.setOptions({ title: isEditMode ? 'Editar Estufa' : 'Nova Estufa' });
  }, [estufaId]);

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !nome) return Alert.alert("Erro", "Preencha o nome.");

    setLoading(true);
    const data: EstufaFormData = {
      nome,
      comprimentoM: parseFloat(comprimento) || 0,
      larguraM: parseFloat(largura) || 0,
      alturaM: parseFloat(altura) || 0,
      status,
      dataFabricacao: null,
      tipoCobertura: null,
      responsavel: null,
      observacoes: null
    };

    try {
      if (isEditMode) await updateEstufa(estufaId, data);
      else await createEstufa(data, targetId);
      navigation.goBack(); 
    } catch {
      Alert.alert("Erro", "Falha ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{flex:1, backgroundColor: COLORS.background}} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={styles.card}>
            <Text style={styles.label}>Nome da Estufa</Text>
            <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Estufa Principal" />

            <View style={{flexDirection: 'row', gap: 15, marginTop: 15}}>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Comprimento (m)</Text>
                    <TextInput style={styles.input} value={comprimento} onChangeText={setComprimento} keyboardType="numeric" />
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Largura (m)</Text>
                    <TextInput style={styles.input} value={largura} onChangeText={setLargura} keyboardType="numeric" />
                </View>
            </View>

            <View style={{marginTop: 15}}>
                <Text style={styles.label}>Altura (m)</Text>
                <TextInput style={styles.input} value={altura} onChangeText={setAltura} keyboardType="numeric" />
            </View>

            <Text style={[styles.label, {marginTop: 20}]}>Status Operacional</Text>
            <View style={styles.statusRow}>
                {['ativa', 'manutencao', 'desativada'].map((s: any) => (
                    <TouchableOpacity 
                        key={s} 
                        style={[styles.statusBtn, status === s && {backgroundColor: COLORS.primary, borderColor: COLORS.primary}]}
                        onPress={() => setStatus(s)}
                    >
                        <Text style={[styles.statusText, status === s && {color: '#FFF'}]}>{s.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Salvar Dados</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16 },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  statusText: { fontSize: 10, fontWeight: '700', color: COLORS.textDark },
  saveBtn: { backgroundColor: COLORS.primary, marginTop: 25, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default EstufaFormScreen;