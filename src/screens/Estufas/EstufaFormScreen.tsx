import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator, Modal, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { useAuth } from '../../hooks/useAuth';
import { createEstufa, updateEstufa, getEstufaById, deleteEstufa } from '../../services/estufaService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore'; 
import { verifyCurrentUserPassword } from '../../services/securityService';

type MapCoordinate = { latitude: number; longitude: number };

const DEFAULT_MAP_REGION: Region = {
  latitude: -14.235,
  longitude: -51.9253,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

const EstufaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId, canDeleteEstufa } = useAuth();
  const editingId = route.params?.estufaId;
  const isEditMode = !!editingId;

  // Estados base e rastreabilidade
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [propriedade, setPropriedade] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Dimensões
  const [comprimento, setComprimento] = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura] = useState('');
  const [tipoCobertura, setTipoCobertura] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataConstrucao, setDataConstrucao] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- NOVO ESTADO: STATUS ---
  const [status, setStatus] = useState<"ativa" | "manutencao" | "desativada">('ativa');
  
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapSaving, setMapSaving] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_MAP_REGION);
  const [selectedPoint, setSelectedPoint] = useState<MapCoordinate | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Estufa' : 'Nova Estufa',
      headerRight: () => isEditMode && canDeleteEstufa ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode, canDeleteEstufa]);

  useEffect(() => {
    if (isEditMode) loadEstufa();
  }, [editingId]);

  const loadEstufa = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!targetId) return;

    try {
      const data = await getEstufaById(editingId, targetId);
      if (data) {
        setNome(data.nome || '');
        setCidade(data.cidade || '');
        setPropriedade(data.propriedade || '');
        setResponsavel(data.responsavel || '');
        setLatitude(data.latitude || '');
        setLongitude(data.longitude || '');
        setComprimento(data.comprimentoM?.toString() || '');
        setLargura(data.larguraM?.toString() || '');
        setAltura(data.alturaM?.toString() || '');
        setTipoCobertura(data.tipoCobertura || '');
        setObservacoes(data.observacoes || '');
        if (data.dataInicioOperacao && typeof (data.dataInicioOperacao as any).toDate === 'function') {
          setDataConstrucao((data.dataInicioOperacao as any).toDate());
        }
        // Carrega o status (se não existir, cai no padrão 'ativa')
        setStatus(data.status || 'ativa');
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar os dados da estufa.");
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
      const currentLatitude = location.coords.latitude.toString();
      const currentLongitude = location.coords.longitude.toString();
      setLatitude(currentLatitude);
      setLongitude(currentLongitude);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode.length > 0) {
        const first = geocode[0];
        const cityBase =
          first.city ||
          first.subregion ||
          first.district ||
          first.name ||
          first.street ||
          '';
        const state = first.region || '';
        const cityLabel =
          cityBase && state && cityBase.toLowerCase() !== state.toLowerCase()
            ? `${cityBase} - ${state}`
            : cityBase || state;

        if (cityLabel) {
          setCidade(cityLabel);
        } else {
          Alert.alert('Atenção', 'Localização capturada, mas não foi possível identificar automaticamente a cidade.');
        }
      } else {
        Alert.alert('Atenção', 'Localização capturada, mas o serviço de geocodificação não retornou a cidade.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível obter a localização atual.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleDelete = () => {
    if (!canDeleteEstufa) {
      Alert.alert('Permissão negada', 'Apenas administradores da conta principal podem excluir estufas.');
      return;
    }
    setAdminPassword('');
    setDeleteModalVisible(true);
  };

  const parseCoordinate = (value: string) => {
    const n = parseFloat((value || '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const handleOpenMapPicker = async () => {
    const lat = parseCoordinate(latitude);
    const lng = parseCoordinate(longitude);
    let centerRegion: Region = DEFAULT_MAP_REGION;
    let marker: MapCoordinate | null = null;

    if (lat !== null && lng !== null) {
      marker = { latitude: lat, longitude: lng };
      centerRegion = { ...marker, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    } else {
      try {
        const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus === 'granted') {
          const current = await Location.getCurrentPositionAsync({});
          marker = {
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          };
          centerRegion = { ...marker, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        }
      } catch {
        // Se falhar GPS/permissão, mantém região padrão.
      }
    }

    setSelectedPoint(marker);
    setMapRegion(centerRegion);
    setMapVisible(true);
  };

  const handleConfirmMapPoint = async () => {
    if (!selectedPoint) {
      Alert.alert('Atenção', 'Toque no mapa para marcar um ponto.');
      return;
    }

    setMapSaving(true);
    const lat = selectedPoint.latitude;
    const lng = selectedPoint.longitude;
    setLatitude(lat.toFixed(6));
    setLongitude(lng.toFixed(6));

    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode.length > 0) {
        const first = geocode[0];
        const cityBase =
          first.city ||
          first.subregion ||
          first.district ||
          first.name ||
          first.street ||
          '';
        const state = first.region || '';
        const cityLabel =
          cityBase && state && cityBase.toLowerCase() !== state.toLowerCase()
            ? `${cityBase} - ${state}`
            : cityBase || state;
        if (cityLabel) setCidade(cityLabel);
      }
    } catch {
      // Lat/lng já foram preenchidos; geocodificação é best-effort.
    } finally {
      setMapSaving(false);
      setMapVisible(false);
    }
  };

  const handleConfirmDelete = async () => {
    const targetId = selectedTenantId || user?.uid;
    if (!adminPassword.trim()) {
      Alert.alert('Atenção', 'Informe a senha de administrador.');
      return;
    }
    if (!targetId) return;

    setDeleting(true);
    try {
      const valid = await verifyCurrentUserPassword(adminPassword.trim());
      if (!valid) {
        Alert.alert('Senha inválida', 'A senha de administrador está incorreta.');
        return;
      }
      await deleteEstufa(editingId, targetId);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao excluir a estufa.');
    } finally {
      setDeleting(false);
    }
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
      responsavel,
      latitude,
      longitude,
      comprimentoM: compNum,
      larguraM: largNum,
      alturaM: altNum,
      areaM2: areaCalc,
      tipoCobertura,
      observacoes,
      dataInicioOperacao: Timestamp.fromDate(dataConstrucao),
      status, // <-- SALVANDO O STATUS AQUI
    };

    try {
      if (isEditMode) {
        await updateEstufa(editingId, estufaData as any, targetId);
      } else {
        await createEstufa(estufaData as any, targetId);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao salvar.");
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
          placeholderTextColor={COLORS.textPlaceholder} 
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

        <Text style={styles.label}>Data de Construção</Text>
        <TouchableOpacity style={styles.dateInputButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateInputText}>{dataConstrucao.toLocaleDateString('pt-BR')}</Text>
          <MaterialCommunityIcons name="calendar-month-outline" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dataConstrucao}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  setDataConstrucao(selectedDate);
                }
                return;
              }
              if (selectedDate) setDataConstrucao(selectedDate);
            }}
            maximumDate={new Date()}
          />
        )}
        {showDatePicker && Platform.OS === 'ios' && (
          <TouchableOpacity style={styles.dateDoneButton} onPress={() => setShowDatePicker(false)}>
            <Text style={styles.dateDoneButtonText}>Confirmar data</Text>
          </TouchableOpacity>
        )}

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Comp. (m)</Text>
            <TextInput 
              style={styles.input} 
              value={comprimento} 
              onChangeText={setComprimento} 
              placeholder="Ex: 50" 
              placeholderTextColor={COLORS.textPlaceholder} 
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
              placeholderTextColor={COLORS.textPlaceholder} 
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
              placeholderTextColor={COLORS.textPlaceholder} 
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
          placeholderTextColor={COLORS.textPlaceholder} 
        />

        <Text style={styles.sectionTitle}>Localização e Responsabilidade</Text>

        <Text style={styles.label}>Propriedade</Text>
        <TextInput 
          style={styles.input} 
          value={propriedade} 
          onChangeText={setPropriedade} 
          placeholder="Ex: Sítio São João" 
          placeholderTextColor={COLORS.textPlaceholder} 
        />

        <Text style={styles.label}>Cidade</Text>
        <TextInput 
          style={styles.input} 
          value={cidade} 
          onChangeText={setCidade} 
          placeholder="Ex: Jales - SP" 
          placeholderTextColor={COLORS.textPlaceholder} 
        />

        <View style={styles.row}>
          <View style={{flex: 1, marginRight: 5}}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput 
              style={styles.input} 
              value={latitude} 
              onChangeText={setLatitude} 
              placeholder="-20.26" 
              placeholderTextColor={COLORS.textPlaceholder} 
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
              placeholderTextColor={COLORS.textPlaceholder} 
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

        <TouchableOpacity style={styles.mapBtn} onPress={handleOpenMapPicker}>
          <MaterialCommunityIcons name="map-marker-plus-outline" size={20} color={COLORS.info} style={{ marginRight: 8 }} />
          <Text style={styles.mapBtnText}>Selecionar ponto no mapa</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Responsável Técnico</Text>
        <TextInput 
          style={styles.input} 
          value={responsavel} 
          onChangeText={setResponsavel} 
          placeholder="Nome do responsável" 
          placeholderTextColor={COLORS.textPlaceholder} 
        />

        <Text style={styles.sectionTitle}>Outros</Text>

        <Text style={styles.label}>Observações</Text>
        <TextInput 
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
          value={observacoes} 
          onChangeText={setObservacoes} 
          placeholder="Detalhes adicionais sobre a estufa..." 
          placeholderTextColor={COLORS.textPlaceholder} 
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <Text style={styles.btnText}>Guardar Cadastro</Text>
          )}
        </TouchableOpacity>
        
      </ScrollView>

      <Modal
        visible={mapVisible}
        animationType="slide"
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <Text style={styles.mapTitle}>Marque a localização da estufa</Text>
            <TouchableOpacity onPress={() => setMapVisible(false)} disabled={mapSaving}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <Text style={styles.mapHint}>Toque no mapa para posicionar o marcador.</Text>

          <MapView
            style={styles.map}
            initialRegion={mapRegion}
            mapType="satellite"
            onPress={(event) => setSelectedPoint(event.nativeEvent.coordinate)}
            onRegionChangeComplete={setMapRegion}
          >
            {selectedPoint ? <Marker coordinate={selectedPoint} /> : null}
          </MapView>

          <TouchableOpacity
            style={[styles.mapConfirmBtn, (!selectedPoint || mapSaving) && styles.mapConfirmBtnDisabled]}
            onPress={handleConfirmMapPoint}
            disabled={!selectedPoint || mapSaving}
          >
            {mapSaving ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <Text style={styles.mapConfirmBtnText}>Confirmar localização</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Excluir Estufa</Text>
            <Text style={styles.modalText}>
              Esta ação é crítica. Digite a senha de administrador para confirmar a exclusão.
            </Text>
            <TextInput
              style={styles.modalInput}
              value={adminPassword}
              onChangeText={setAdminPassword}
              placeholder="Senha de administrador"
              placeholderTextColor={COLORS.textPlaceholder}
              secureTextEntry
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDeleteModalVisible(false)} disabled={deleting}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnDelete} onPress={handleConfirmDelete} disabled={deleting}>
                {deleting ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.modalBtnDeleteText}>Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  padding: { padding: SPACING.xl },
  sectionTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.secondary, marginTop: 10, marginBottom: 15 },
  label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textSecondary, fontSize: 13 },
  input: { backgroundColor: COLORS.surfaceMuted, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, color: COLORS.textDark },
  dateInputButton: { backgroundColor: COLORS.surfaceMuted, padding: 15, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateInputText: { color: COLORS.textDark, fontSize: TYPOGRAPHY.body },
  dateDoneButton: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 15, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.primary },
  dateDoneButtonText: { color: COLORS.textLight, fontWeight: '700', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // Estilos do seletor de status
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statusBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 5, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginHorizontal: 4, backgroundColor: COLORS.surface },
  statusBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusBtnWarning: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  statusBtnDanger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  statusText: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 13 },
  statusTextActive: { color: COLORS.textLight },

  locationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.primary, marginBottom: 15, backgroundColor: COLORS.primaryLight },
  locationBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.info, marginBottom: 15, backgroundColor: COLORS.infoSoft },
  mapBtnText: { color: COLORS.info, fontWeight: 'bold', fontSize: 14 },
  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 10, marginBottom: 30, ...SHADOWS.card },
  btnText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.body }
  ,
  mapModalContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: 48, paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  mapTitle: { color: COLORS.textDark, fontWeight: '800', fontSize: TYPOGRAPHY.h3 },
  mapHint: { color: COLORS.textSecondary, marginBottom: 10, fontSize: 12 },
  map: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  mapConfirmBtn: { marginTop: 12, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  mapConfirmBtnDisabled: { opacity: 0.5 },
  mapConfirmBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: TYPOGRAPHY.body },
  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00006, justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, ...SHADOWS.card },
  modalTitle: { fontSize: TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  modalText: { color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.md },
  modalInput: { height: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.surfaceMuted, marginBottom: SPACING.md },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtnCancel: { flex: 1, height: 44, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.borderDark, justifyContent: 'center', alignItems: 'center' },
  modalBtnCancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  modalBtnDelete: { flex: 1, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center' },
  modalBtnDeleteText: { color: COLORS.textLight, fontWeight: '800' }
});

export default EstufaFormScreen;
