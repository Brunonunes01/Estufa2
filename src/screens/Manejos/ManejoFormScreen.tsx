import React, { useState, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { createManejo } from '../../services/manejoService';
import { COLORS } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore'; 

const tiposManejo = [
  { id: 'clima', label: 'Clima/Ambiente' },
  { id: 'praga_doenca', label: 'Praga/Doença' },
  { id: 'outro', label: 'Outro' }
];

const ManejoFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  
  const plantioId = route.params?.plantioId;
  const estufaId = route.params?.estufaId;

  // Por padrão começa em 'clima'
  const [tipoManejo, setTipoManejo] = useState<any>('clima');
  const [descricao, setDescricao] = useState('');
  const [responsavel, setResponsavel] = useState(user?.name || '');
  
  // Campos Dinâmicos Restantes
  const [temperatura, setTemperatura] = useState('');
  const [umidade, setUmidade] = useState('');
  const [severidade, setSeveridade] = useState<"baixa" | "media" | "alta" | null>(null);

  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Novo Registro no Diário' });
  }, [navigation]);

  const handleSave = async () => {
    const targetId = (selectedTenantId || user?.uid) as string;
    
    if (!plantioId || !estufaId) {
      return Alert.alert("Erro", "Falta a referência do Lote ou Estufa.");
    }
    if (!descricao) {
      return Alert.alert("Erro", "A descrição do evento é obrigatória.");
    }
    
    setLoading(true);

    const manejoData = {
      plantioId,
      estufaId,
      tipoManejo,
      descricao,
      responsavel,
      dataRegistro: Timestamp.now(),
      // Salva apenas os campos relevantes para o tipo selecionado
      ...(tipoManejo === 'clima' ? { 
          temperatura: parseFloat(temperatura) || null, 
          umidade: parseFloat(umidade) || null 
      } : {}),
      ...(tipoManejo === 'praga_doenca' ? { severidade } : {}),
    };

    try {
      await createManejo(manejoData as any, targetId);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar o registro de manejo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        
        <Text style={styles.sectionTitle}>Tipo de Ocorrência</Text>
        <View style={styles.pillContainer}>
          {tiposManejo.map((tipo) => (
            <TouchableOpacity 
              key={tipo.id} 
              style={[styles.pill, tipoManejo === tipo.id && styles.pillActive]}
              onPress={() => setTipoManejo(tipo.id)}
            >
              <Text style={[styles.pillText, tipoManejo === tipo.id && styles.pillTextActive]}>
                {tipo.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Detalhes do Evento</Text>

        <Text style={styles.label}>Descrição / Observação *</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={descricao} 
          onChangeText={setDescricao} 
          placeholder="Descreva o que foi observado..." 
          placeholderTextColor="#94A3B8" 
          multiline
        />

        <Text style={styles.label}>Registado por</Text>
        <TextInput 
          style={styles.input} 
          value={responsavel} 
          onChangeText={setResponsavel} 
          placeholderTextColor="#94A3B8" 
        />

        {/* --- CAMPOS CONDICIONAIS --- */}

        {tipoManejo === 'clima' && (
          <View style={styles.dynamicBox}>
            <Text style={styles.dynamicTitle}>Dados Ambientais</Text>
            <View style={styles.row}>
              <View style={{flex: 1, marginRight: 5}}>
                <Text style={styles.label}>Temp. (°C)</Text>
                <TextInput style={styles.input} value={temperatura} onChangeText={setTemperatura} placeholder="Ex: 28.5" keyboardType="numeric" />
              </View>
              <View style={{flex: 1, marginLeft: 5}}>
                <Text style={styles.label}>Umidade (%)</Text>
                <TextInput style={styles.input} value={umidade} onChangeText={setUmidade} placeholder="Ex: 65" keyboardType="numeric" />
              </View>
            </View>
          </View>
        )}

        {tipoManejo === 'praga_doenca' && (
          <View style={styles.dynamicBox}>
            <Text style={styles.dynamicTitle}>Nível de Severidade</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity style={[styles.sevBtn, severidade === 'baixa' && {backgroundColor: '#FDE047'}]} onPress={() => setSeveridade('baixa')}>
                <Text style={styles.sevText}>Baixa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sevBtn, severidade === 'media' && {backgroundColor: '#FB923C'}]} onPress={() => setSeveridade('media')}>
                <Text style={styles.sevText}>Média</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sevBtn, severidade === 'alta' && {backgroundColor: '#EF4444'}]} onPress={() => setSeveridade('alta')}>
                <Text style={[styles.sevText, severidade === 'alta' && {color: '#FFF'}]}>Alta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Adicionar ao Diário</Text>
          )}
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  padding: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginTop: 10, marginBottom: 15 },
  label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textSecondary, fontSize: 13 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, color: '#000' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  pill: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#FFF' },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  pillTextActive: { color: '#FFF' },

  dynamicBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  dynamicTitle: { fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 10 },
  
  sevBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginHorizontal: 4, alignItems: 'center', backgroundColor: '#FFF' },
  sevText: { fontWeight: 'bold', color: COLORS.textSecondary },

  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default ManejoFormScreen;