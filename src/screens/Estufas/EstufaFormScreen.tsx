// src/screens/Estufas/EstufaFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { createEstufa, updateEstufa, getEstufaById, EstufaFormData } from '../../services/estufaService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
import { COLORS } from '../../constants/theme';

const EstufaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const estufaId = route.params?.estufaId;
  const isEditMode = !!estufaId;

  const [nome, setNome] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [status, setStatus] = useState<'ativa' | 'manutencao' | 'desativada'>('ativa');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  const [loadingGps, setLoadingGps] = useState(false);
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
          setLatitude(estufa.latitude || '');
          setLongitude(estufa.longitude || '');
        }
      });
    }
  }, [estufaId]);

  const handleGetLocation = async () => {
    setLoadingGps(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permissão Negada', 'Precisamos do GPS.');
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setLatitude(String(location.coords.latitude));
      setLongitude(String(location.coords.longitude));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter a localização.');
    } finally {
      setLoadingGps(false);
    }
  };

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId || !nome) return Alert.alert("Erro", "Preencha o nome.");
    setLoading(true);
    const data: EstufaFormData = {
      nome, comprimentoM: parseFloat(comprimento) || 0, larguraM: parseFloat(largura) || 0,
      alturaM: parseFloat(altura) || 0, status, dataFabricacao: null, tipoCobertura: null,
      responsavel: null, observacoes: null, latitude, longitude
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
            <Text style={styles.label}>Nome da Estufa</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Ex: Estufa 01" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <View style={{flexDirection: 'row', gap: 15, marginTop: 5}}>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Comprimento (m)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={comprimento} onChangeText={setComprimento} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textPlaceholder} />
                    </View>
                </View>
                <View style={{flex:1}}>
                    <Text style={styles.label}>Largura (m)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={largura} onChangeText={setLargura} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textPlaceholder} />
                    </View>
                </View>
            </View>

            <Text style={styles.label}>Altura (m)</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={altura} onChangeText={setAltura} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textPlaceholder} />
            </View>

            <Text style={[styles.label, {marginTop: 10}]}>Status Operacional</Text>
            <View style={styles.statusRow}>
                {['ativa', 'manutencao', 'desativada'].map((s: any) => (
                    <TouchableOpacity key={s} style={[styles.statusBtn, status === s && styles.statusBtnActive]} onPress={() => setStatus(s)}>
                        <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        <View style={styles.card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={{fontSize: 16, fontWeight: '800', color: COLORS.primary}}>Localização GPS</Text>
                <MaterialCommunityIcons name="map-marker-radius" size={24} color={COLORS.primary} />
            </View>

            <TouchableOpacity style={styles.gpsBtn} onPress={handleGetLocation} disabled={loadingGps}>
                {loadingGps ? <ActivityIndicator color={COLORS.primary} /> : (
                    <>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.primary} style={{marginRight: 8}} />
                        <Text style={styles.gpsBtnText}>{latitude ? 'Atualizar Coordenadas' : 'Marcar GPS da Estufa'}</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Guardar</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background }, // FUNDO CLARO
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  
  // INPUTS BLINDADOS CONTRA MODO ESCURO
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 50, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: '#000000', height: '100%', fontWeight: 'bold' },
  
  statusRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  statusBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', backgroundColor: '#F8FAFC' },
  statusBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  statusTextActive: { color: COLORS.textLight },
  gpsBtn: { flexDirection: 'row', backgroundColor: COLORS.primaryLight, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  gpsBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  saveBtn: { backgroundColor: COLORS.primary, marginBottom: 40, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: 18 }
});

export default EstufaFormScreen;