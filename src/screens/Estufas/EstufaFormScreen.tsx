// src/screens/Estufas/EstufaFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { createEstufa, updateEstufa, getEstufaById, EstufaFormData } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    navigation.setOptions({ 
        title: isEditMode ? 'Editar Estufa' : 'Nova Estufa',
        headerStyle: { backgroundColor: '#14532d' },
        headerTintColor: '#fff'
    });
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Cabeçalho Visual */}
        <View style={styles.header}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="greenhouse" size={32} color="#166534" />
            </View>
            <Text style={styles.headerTitle}>{isEditMode ? 'Editar Estufa' : 'Cadastrar Estufa'}</Text>
        </View>

        <View style={styles.card}>
            <Text style={styles.label}>Nome da Estufa</Text>
            <View style={styles.inputWrapper}>
                <TextInput 
                    style={styles.input} 
                    value={nome} 
                    onChangeText={setNome} 
                    placeholder="Ex: Estufa Principal"
                    placeholderTextColor="#94A3B8"
                />
            </View>

            <View style={{flexDirection: 'row', gap: 15, marginTop: 5}}>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Comprimento (m)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput 
                            style={styles.input} 
                            value={comprimento} 
                            onChangeText={setComprimento} 
                            keyboardType="numeric"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Largura (m)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput 
                            style={styles.input} 
                            value={largura} 
                            onChangeText={setLargura} 
                            keyboardType="numeric"
                            placeholderTextColor="#94A3B8"
                        />
                    </View>
                </View>
            </View>

            <Text style={styles.label}>Altura (m)</Text>
            <View style={styles.inputWrapper}>
                <TextInput 
                    style={styles.input} 
                    value={altura} 
                    onChangeText={setAltura} 
                    keyboardType="numeric"
                    placeholderTextColor="#94A3B8"
                />
            </View>

            <Text style={[styles.label, {marginTop: 10}]}>Status Operacional</Text>
            <View style={styles.statusRow}>
                {['ativa', 'manutencao', 'desativada'].map((s: any) => (
                    <TouchableOpacity 
                        key={s} 
                        style={[styles.statusBtn, status === s && styles.statusBtnActive]}
                        onPress={() => setStatus(s)}
                    >
                        <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s.toUpperCase()}</Text>
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
  container: { flex: 1, backgroundColor: '#14532d' }, // Fundo Verde Premium
  scrollContent: { padding: 20 },
  
  header: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },

  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 24, elevation: 4 },
  
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 },
  inputWrapper: {
    backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15, height: 50, justifyContent: 'center'
  },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#1E293B', height: '100%' },

  statusRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  statusBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  statusBtnActive: { backgroundColor: '#166534', borderColor: '#166534' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  statusTextActive: { color: '#FFF' },

  saveBtn: { backgroundColor: '#166534', marginTop: 25, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default EstufaFormScreen;