import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useAuth } from '../../hooks/useAuth';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { createTalhao, deleteTalhao, updateTalhao } from '../../services/talhaoService';
import { queryKeys } from '../../lib/queryClient';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import EmptyState from '../../components/ui/EmptyState';
import MapView, { Marker, Polygon, Region, LatLng } from '../../components/MapViewCompat';

const EARTH_RADIUS = 6378137;

const polygonAreaHectares = (points: LatLng[]) => {
  if (points.length < 3) return 0;
  const lat0 = (points.reduce((acc, p) => acc + p.latitude, 0) / points.length) * (Math.PI / 180);
  const xy = points.map((p) => {
    const x = EARTH_RADIUS * (p.longitude * (Math.PI / 180)) * Math.cos(lat0);
    const y = EARTH_RADIUS * (p.latitude * (Math.PI / 180));
    return { x, y };
  });
  let area = 0;
  for (let i = 0; i < xy.length; i += 1) {
    const j = (i + 1) % xy.length;
    area += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
  }
  return Math.abs(area / 2) / 10000;
};

const TalhoesListScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const queryClient = useQueryClient();
  const { data, isLoading } = useTalhoesListData(targetId);
  const talhoes = data || [];
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cultura, setCultura] = useState('');
  const [area, setArea] = useState('');
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [boundaryPoints, setBoundaryPoints] = useState<LatLng[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: -15.7801,
    longitude: -47.9292,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [locating, setLocating] = useState(false);

  const centerOnCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permissao negada', 'Ative a localizacao para centralizar o mapa na sua posicao.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nextRegion = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(nextRegion);
    } catch (_error) {
      Alert.alert('Localizacao indisponivel', 'Nao foi possivel obter sua localizacao agora.');
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (!mapModalOpen) return;
    void centerOnCurrentLocation();
  }, [mapModalOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nome: nome.trim(),
        culturaPrincipal: cultura.trim() || undefined,
        areaHectares: area.trim() ? Number(area.replace(',', '.')) : undefined,
        areaCalculadaHectares: boundaryPoints.length >= 3 ? Number(polygonAreaHectares(boundaryPoints).toFixed(4)) : undefined,
        boundaryPoints: boundaryPoints.length >= 3 ? boundaryPoints : undefined,
        status: 'ativo' as const,
      };
      if (editingId) {
        await updateTalhao(editingId, payload, targetId as string);
        return editingId;
      }
      return createTalhao(payload, targetId as string);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.talhoesList(targetId || 'none') });
      setModalOpen(false);
      setEditingId(null);
      setNome('');
      setCultura('');
      setArea('');
      setBoundaryPoints([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (talhaoId: string) => deleteTalhao(talhaoId, targetId as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.talhoesList(targetId || 'none') });
    },
  });

  const openCreateModal = () => {
    setEditingId(null);
    setNome('');
    setCultura('');
    setArea('');
    setBoundaryPoints([]);
    setModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id);
    setNome(item.nome || '');
    setCultura(item.culturaPrincipal || '');
    setArea(item.areaHectares != null ? String(item.areaHectares) : '');
    setBoundaryPoints(Array.isArray(item.boundaryPoints) ? item.boundaryPoints : []);
    setModalOpen(true);
  };

  const confirmDelete = (talhaoId: string, talhaoNome: string) => {
    Alert.alert('Excluir talhao', `Deseja excluir o talhao ${talhaoNome}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(talhaoId),
      },
    ]);
  };

  const subtitle = useMemo(() => `${talhoes.length} talhao(oes) cadastrados`, [talhoes.length]);
  const measuredArea = useMemo(() => polygonAreaHectares(boundaryPoints), [boundaryPoints]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Talhoes</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Text style={styles.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      {!isLoading && talhoes.length === 0 ? (
        <EmptyState title="Sem talhoes" description="Cadastre o primeiro talhao para iniciar operacoes de campo." icon="map-marker-outline" />
      ) : (
        <FlatList
          data={talhoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardMeta}>Cultura: {item.culturaPrincipal || '-'}</Text>
              <Text style={styles.cardMeta}>Area (ha): {item.areaHectares ?? '-'}</Text>
              <Text style={styles.cardMeta}>Area mapa (ha): {item.areaCalculadaHectares ?? '-'}</Text>
              <Text style={styles.badge}>{item.status}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.cardBtn} onPress={() => navigation.navigate('PlantioForm', { talhaoId: item.id })}>
                  <Text style={styles.cardBtnText}>Novo Plantio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardBtn} onPress={() => openEditModal(item)}>
                  <Text style={styles.cardBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.cardBtn, styles.cardBtnDanger]} onPress={() => confirmDelete(item.id, item.nome)}>
                  <Text style={[styles.cardBtnText, styles.cardBtnDangerText]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Editar Talhao' : 'Novo Talhao'}</Text>
            <TextInput style={styles.input} placeholder="Nome" value={nome} onChangeText={setNome} />
            <TextInput style={styles.input} placeholder="Cultura principal" value={cultura} onChangeText={setCultura} />
            <TextInput
              style={styles.input}
              placeholder="Area em hectares"
              keyboardType="decimal-pad"
              value={area}
              onChangeText={setArea}
            />
            <TouchableOpacity style={styles.mapBtn} onPress={() => setMapModalOpen(true)}>
              <Text style={styles.mapBtnText}>Desenhar poligono no mapa</Text>
            </TouchableOpacity>
            <Text style={styles.mapInfo}>Pontos: {boundaryPoints.length} {measuredArea > 0 ? `• Area calculada: ${measuredArea.toFixed(4)} ha` : ''}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
                <Text style={styles.saveBtnText}>{mutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={mapModalOpen} transparent animationType="slide" onRequestClose={() => setMapModalOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, styles.mapModalCard]}>
            <Text style={styles.modalTitle}>Desenhar area do talhao</Text>
            <Text style={styles.mapInfo}>Toque no mapa para criar os vertices do poligono.</Text>
            <TouchableOpacity style={styles.mapBtn} onPress={() => void centerOnCurrentLocation()} disabled={locating}>
              <Text style={styles.mapBtnText}>{locating ? 'Localizando...' : 'Usar minha localizacao'}</Text>
            </TouchableOpacity>
            <MapView
              style={styles.map}
              initialRegion={region}
              onRegionChangeComplete={(next) => setRegion(next)}
              onPress={(event: any) => {
                if (Platform.OS === 'web') return;
                const coordinate = event?.nativeEvent?.coordinate;
                if (!coordinate) return;
                setBoundaryPoints((prev) => [...prev, coordinate]);
              }}
            >
              {boundaryPoints.map((p, index) => (
                <Marker key={`${p.latitude}-${p.longitude}-${index}`} coordinate={p as any} />
              ))}
              {boundaryPoints.length >= 3 ? (
                <Polygon coordinates={boundaryPoints as any} strokeColor={COLORS.primary} fillColor="rgba(13,148,136,0.20)" />
              ) : null}
            </MapView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBoundaryPoints([])}>
                <Text style={styles.cancelBtnText}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBoundaryPoints((prev) => prev.slice(0, -1))}>
                <Text style={styles.cancelBtnText}>Desfazer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={() => setMapModalOpen(false)}>
                <Text style={styles.saveBtnText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.textDark },
  subtitle: { marginTop: 4, color: COLORS.textSecondary, fontWeight: '600' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: COLORS.textLight, fontWeight: '800' },
  listContent: { paddingVertical: SPACING.md, gap: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  cardMeta: { marginTop: 4, color: COLORS.textSecondary, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.sm },
  cardBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 7 },
  cardBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
  cardBtnDanger: { borderColor: COLORS.dangerSoft },
  cardBtnDangerText: { color: COLORS.danger },
  badge: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: COLORS.primaryLight, color: COLORS.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill, overflow: 'hidden', fontWeight: '800', fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: SPACING.md },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: SPACING.sm },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: SPACING.sm, color: COLORS.textDark },
  mapBtn: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', marginBottom: SPACING.xs },
  mapBtnText: { color: COLORS.primary, fontWeight: '800' },
  mapInfo: { color: COLORS.textSecondary, fontSize: 12, marginBottom: SPACING.sm },
  mapModalCard: { maxHeight: '88%' },
  map: { height: 320, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xs },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  saveBtnText: { color: COLORS.textLight, fontWeight: '800' },
});

export default TalhoesListScreen;
