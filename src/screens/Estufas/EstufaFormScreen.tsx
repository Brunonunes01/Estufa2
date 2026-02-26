import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { createEstufa, updateEstufa, getEstufaById, deleteEstufa } from '../../services/estufaService';
import { COLORS } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore'; 

const EstufaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const editingId = route.params?.estufaId;
  const isEditMode = !!editingId;

  // Estados base e rastreabilidade
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [propriedade, setPropriedade] = useState('');
  const [tipoCultivo, setTipoCultivo] = useState('');
  const [sistemaCultivo, setSistemaCultivo] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Dimensões
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [tipoCobertura, setTipoCobertura] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // --- NOVO ESTADO: STATUS ---
  const [status, setStatus] = useState<"ativa" | "manutencao" | "desativada">('ativa');
  
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Estufa' : 'Nova Estufa',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFF" />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode]);

  useEffect(() => {
    if (isEditMode) loadEstufa();
  }, [editingId]);

  const loadEstufa = async () => {
    const data = await getEstufaById(editingId);
    if (data) {
      setNome(data.nome || '');
      setCidade(data.cidade || '');
      setPropriedade(data.propriedade || '');
      setTipoCultivo(data.tipoCultivo || '');
      setSistemaCultivo(data.sistemaCultivo || '');
      setResponsavel(data.responsavel || '');
      setLatitude(data.latitude || '');
      setLongitude(data.longitude || '');
      setComprimento(data.comprimentoM?.toString() || '');
      setLargura(data.larguraM?.toString() || '');
      setAltura(data.alturaM?.toString() || '');
      setTipoCobertura(data.tipoCobertura || '');
      setObservacoes(data.observacoes || '');
      // Carrega o status (se não existir, cai no padrão 'ativa')
      setStatus(data.status || 'ativa');
    }
  };

  const handleGetLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'O aplicativo precisa de permissão para acessar a localização.');
        setLocationLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível obter a localização atual.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Eliminar Estufa",
      "Tem a certeza? Isso não apagará os plantios vinculados, mas eles ficarão sem referência.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteEstufa(editingId);
              navigation.goBack();
            } catch (e) {
              Alert.alert("Erro", "Falha ao eliminar.");
            }
          } 
        }
      ]
    );
  };

  const handleSave = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!nome || !targetId) return Alert.alert("Erro", "Preencha pelo menos o nome da estufa.");
    
    setLoading(true);

    const compNum = parseFloat(comprimento.replace(',', '.')) || 0;
    const largNum = parseFloat(largura.replace(',', '.')) || 0;
    const altNum = parseFloat(altura.replace(',', '.')) || 0;
    const areaCalc = compNum * largNum;
    
    const estufaData = {
      nome,
      cidade,
      propriedade,
      tipoCultivo,
      sistemaCultivo,
      responsavel,
      latitude,
      longitude,
      comprimentoM: compNum,
      larguraM: largNum,
      alturaM: altNum,
      areaM2: areaCalc,
      tipoCobertura,
      observacoes,
      status, // <-- SALVANDO O STATUS AQUI
      ...(!isEditMode && { dataInicioOperacao: Timestamp.now() }) 
    };

    try {
      if (isEditMode) {
        await updateEstufa(editingId, estufaData as any);
      } else {
        await createEstufa(estufaData as any, targetId);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        
        <Text style={styles.label}>Nome da Estufa *</Text>
        <TextInput 
          style={styles.input} 
          value={nome} 
          onChangeText={setNome} 
          placeholder="Ex: Estufa 01" 
          placeholderTextColor="#94A3B8" 
        />

        {/* --- SELEÇÃO DE STATUS --- */}
        <Text style={styles.sectionTitle}>Status da Estufa</Text>
        <View style={styles.statusContainer}>
          <TouchableOpacity 
            style={[styles.statusBtn, status === 'ativa' && styles.statusBtnActive]} 
            onPress={() => setStatus('ativa')}
          >
            <Text style={[styles.statusText, status === 'ativa' && styles.statusTextActive]}>Ativa</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statusBtn, status === 'manutencao' && styles.statusBtnWarning]} 
            onPress={() => setStatus('manutencao')}
          >
            <Text style={[styles.statusText, status === 'manutencao' && styles.statusTextActive]}>Manutenção</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statusBtn, status === 'desativada' && styles.statusBtnDanger]} 
            onPress={() => setStatus('desativada')}
          >
            <Text style={[styles.statusText, status === 'desativada' && styles.statusTextActive]}>Desativada</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Dimensões e Estrutura</Text>

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Comp. (m)</Text>
            <TextInput 
              style={styles.input} 
              value={comprimento} 
              onChangeText={setComprimento} 
              placeholder="Ex: 50" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
            />
          </View>
          <View style={{flex: 1, marginHorizontal: 5}}>
            <Text style={styles.label}>Largura (m)</Text>
            <TextInput 
              style={styles.input} 
              value={largura} 
              onChangeText={setLargura} 
              placeholder="Ex: 8" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Altura (m)</Text>
            <TextInput 
              style={styles.input} 
              value={altura} 
              onChangeText={setAltura} 
              placeholder="Ex: 3" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
            />
          </View>
        </View>

        <Text style={styles.label}>Tipo de Cobertura</Text>
        <TextInput 
          style={styles.input} 
          value={tipoCobertura} 
          onChangeText={setTipoCobertura} 
          placeholder="Ex: Filme difusor, Sombrite" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.sectionTitle}>Localização e Responsabilidade</Text>

        <Text style={styles.label}>Propriedade</Text>
        <TextInput 
          style={styles.input} 
          value={propriedade} 
          onChangeText={setPropriedade} 
          placeholder="Ex: Sítio São João" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.label}>Cidade</Text>
        <TextInput 
          style={styles.input} 
          value={cidade} 
          onChangeText={setCidade} 
          placeholder="Ex: Jales - SP" 
          placeholderTextColor="#94A3B8" 
        />

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput 
              style={styles.input} 
              value={latitude} 
              onChangeText={setLatitude} 
              placeholder="-20.26" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
            />
          </View>
          <View style={{flex: 1, marginLeft: 5}}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput 
              style={styles.input} 
              value={longitude} 
              onChangeText={setLongitude} 
              placeholder="-50.54" 
              placeholderTextColor="#94A3B8" 
              keyboardType="numeric" 
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.locationBtn} 
          onPress={handleGetLocation} 
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <MaterialCommunityIcons name="map-marker-radius" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.locationBtnText}>Obter Localização Atual</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Responsável Técnico</Text>
        <TextInput 
          style={styles.input} 
          value={responsavel} 
          onChangeText={setResponsavel} 
          placeholder="Nome do responsável" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.sectionTitle}>Dados de Cultivo</Text>

        <Text style={styles.label}>Tipo de Cultivo</Text>
        <TextInput 
          style={styles.input} 
          value={tipoCultivo} 
          onChangeText={setTipoCultivo} 
          placeholder="Ex: Tomate Italiano" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.label}>Sistema de Cultivo</Text>
        <TextInput 
          style={styles.input} 
          value={sistemaCultivo} 
          onChangeText={setSistemaCultivo} 
          placeholder="Ex: Solo, Hidroponia" 
          placeholderTextColor="#94A3B8" 
        />

        <Text style={styles.sectionTitle}>Outros</Text>

        <Text style={styles.label}>Observações</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={observacoes} 
          onChangeText={setObservacoes} 
          placeholder="Detalhes adicionais sobre a estufa..." 
          placeholderTextColor="#94A3B8" 
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Guardar Cadastro</Text>
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
  
  // Estilos do seletor de status
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statusBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 5, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#FFF' },
  statusBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusBtnWarning: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }, // Laranja para manutenção
  statusBtnDanger: { backgroundColor: '#EF4444', borderColor: '#EF4444' }, // Vermelho para desativada
  statusText: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 13 },
  statusTextActive: { color: '#FFF' },

  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 15, backgroundColor: '#E0F2FE' },
  locationBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default EstufaFormScreen;