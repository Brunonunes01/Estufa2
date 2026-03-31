// src/screens/Perfil/PerfilScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Share
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location'; 
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/theme';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';

export default function PerfilScreen({ navigation }: any) {
  const { user } = useAuth();
  
  const [nomeProdutor, setNomeProdutor] = useState(user?.name || '');
  const [nomePropriedade, setNomePropriedade] = useState('');
  const [tamanhoHectares, setTamanhoHectares] = useState('');
  const [cidadeEstado, setCidadeEstado] = useState('');
  
  // Coordenadas GPS
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  const [loadingGps, setLoadingGps] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const loadProfile = async () => {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setNomePropriedade(data.nomePropriedade || '');
                setTamanhoHectares(data.tamanhoHectares || '');
                setCidadeEstado(data.cidadeEstado || '');
                setLatitude(data.latitude || '');
                setLongitude(data.longitude || '');
            }
        } catch (e) {
            console.error("Erro ao carregar perfil", e);
        }
    };
    loadProfile();
  }, [user]);

  const handleGetLocation = async () => {
    setLoadingGps(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos do GPS para marcar a sua propriedade.');
        setLoadingGps(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest 
      });
      
      setLatitude(String(location.coords.latitude));
      setLongitude(String(location.coords.longitude));
      
      Alert.alert('Sucesso', 'Localização capturada via Satélite! 🛰️');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter a localização. Verifique se o GPS está ligado.');
    } finally {
      setLoadingGps(false);
    }
  };

  // --- NOVA FUNÇÃO DE PARTILHA ---
  const handleShareLocation = async () => {
    if (!latitude || !longitude) {
      Alert.alert('Atenção', 'Primeiro capture a localização da propriedade.');
      return;
    }
    
    // Cria um link do Google Maps com a latitude e longitude exatas
    const googleMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const mensagem = `📍 Localização de: ${nomePropriedade || 'Minha Propriedade'}\nResponsável: ${nomeProdutor}\n\nVeja no mapa: ${googleMapsUrl}`;

    try {
      await Share.share({
        message: mensagem,
      });
    } catch (error) {
      console.error('Erro ao partilhar', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name: nomeProdutor,
        nomePropriedade,
        tamanhoHectares,
        cidadeEstado,
        latitude,
        longitude
      });
      Alert.alert('Sucesso', 'Dados da propriedade atualizados com sucesso!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao guardar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerInfo}>
            <View style={styles.avatar}>
                <MaterialCommunityIcons name="home-account" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Dados da Propriedade</Text>
            <Text style={styles.subtitle}>Configure os detalhes do seu local de cultivo</Text>
            <TouchableOpacity style={styles.settingsLink} onPress={() => navigation.navigate('Settings')}>
                <MaterialCommunityIcons name="cog-outline" size={16} color={COLORS.primary} />
                <Text style={styles.settingsLinkText}>Abrir Configurações</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.card}>
            <Text style={styles.label}>Responsável</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={nomeProdutor} onChangeText={setNomeProdutor} placeholder="O seu nome" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.primary} />
            </View>

            <Text style={styles.label}>Nome da Propriedade / Sítio</Text>
            <View style={styles.inputWrapper}>
                <TextInput style={styles.input} value={nomePropriedade} onChangeText={setNomePropriedade} placeholder="Ex: Sítio São João" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.primary} />
            </View>

            <View style={styles.row}>
                <View style={{flex: 2, marginRight: 10}}>
                    <Text style={styles.label}>Cidade - Estado</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={cidadeEstado} onChangeText={setCidadeEstado} placeholder="Ex: Jales - SP" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.primary} />
                    </View>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Área (ha)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={tamanhoHectares} onChangeText={setTamanhoHectares} keyboardType="numeric" placeholder="Ex: 12" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.primary} />
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.card}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                <Text style={[styles.sectionHeader, {marginBottom: 0}]}>Geolocalização</Text>
                <MaterialCommunityIcons name="satellite-variant" size={24} color={COLORS.primary} />
            </View>

            <TouchableOpacity style={styles.gpsBtn} onPress={handleGetLocation} disabled={loadingGps}>
                {loadingGps ? (
                    <ActivityIndicator color={COLORS.primary} />
                ) : (
                    <>
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color={COLORS.primary} style={{marginRight: 8}} />
                        <Text style={styles.gpsBtnText}>Capturar Localização Exata</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={styles.row}>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.label}>Latitude</Text>
                    <View style={[styles.inputWrapper, {backgroundColor: COLORS.background}]}>
                        <TextInput style={[styles.input, {color: COLORS.textSecondary}]} value={latitude} editable={false} placeholder="A aguardar..." />
                    </View>
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.label}>Longitude</Text>
                    <View style={[styles.inputWrapper, {backgroundColor: COLORS.background}]}>
                        <TextInput style={[styles.input, {color: COLORS.textSecondary}]} value={longitude} editable={false} placeholder="A aguardar..." />
                    </View>
                </View>
            </View>

            {/* BOTÃO DE PARTILHA - SÓ APARECE SE TIVER COORDENADAS */}
            {latitude && longitude ? (
                <TouchableOpacity style={styles.shareBtn} onPress={handleShareLocation}>
                    <MaterialCommunityIcons name="share-variant" size={20} color={COLORS.textLight} style={{marginRight: 8}} />
                    <Text style={styles.shareText}>Enviar Localização (WhatsApp / SMS)</Text>
                </TouchableOpacity>
            ) : null}

            <Text style={styles.gpsHelpText}>A localização é usada para dados climáticos e relatórios avançados de safra.</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>Guardar Perfil</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  headerInfo: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: COLORS.border, elevation: 2 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  settingsLink: { marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  settingsLinkText: { color: COLORS.primary, fontWeight: '700', marginLeft: 6, fontSize: 12 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrapper: { backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, marginBottom: 15, height: 50, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 16, color: COLORS.textDark, height: '100%', fontWeight: '600' },
  row: { flexDirection: 'row' },
  gpsBtn: { flexDirection: 'row', backgroundColor: COLORS.primaryLight, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.cA7F3D0 },
  gpsBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  gpsHelpText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 15 },
  
  // Estilo do Botão de Partilha
  shareBtn: { flexDirection: 'row', backgroundColor: COLORS.info, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5, elevation: 2 },
  shareText: { color: COLORS.textPrimary, fontWeight: 'bold', fontSize: 14 },

  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 40, elevation: 4 },
  saveText: { color: COLORS.textLight, fontWeight: '800', fontSize: 18 },
});
