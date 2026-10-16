import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import MapView, {
  LatLng,
  Marker,
  Polygon,
  Region,
} from '../../components/MapViewCompat';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useTalhoesListData } from '../../hooks/queries/useTalhoesListData';
import { queryKeys } from '../../lib/queryClient';
import { createTalhao, updateTalhao } from '../../services/talhaoService';
import { Talhao } from '../../types/domain';
import { sanitizeDecimalInput } from '../../utils/numericFields';

const EARTH_RADIUS = 6378137;

const polygonAreaHectares = (points: LatLng[]) => {
  if (points.length < 3) return 0;
  const lat0 =
    (points.reduce((acc, point) => acc + point.latitude, 0) / points.length) *
    (Math.PI / 180);
  const projected = points.map((point) => ({
    x: EARTH_RADIUS * (point.longitude * (Math.PI / 180)) * Math.cos(lat0),
    y: EARTH_RADIUS * (point.latitude * (Math.PI / 180)),
  }));

  let area = 0;
  for (let index = 0; index < projected.length; index += 1) {
    const nextIndex = (index + 1) % projected.length;
    area +=
      projected[index].x * projected[nextIndex].y -
      projected[nextIndex].x * projected[index].y;
  }
  return Math.abs(area / 2) / 10000;
};

const STATUS_OPTIONS: Array<{
  value: Talhao['status'];
  label: string;
  icon: string;
}> = [
  { value: 'ativo', label: 'Ativo', icon: 'check-circle-outline' },
  { value: 'preparo', label: 'Em preparo', icon: 'shovel' },
  { value: 'pousio', label: 'Pousio', icon: 'weather-sunset' },
];

const TalhaoFormScreen = ({ route, navigation }: any) => {
  const talhaoId = route.params?.talhaoId as string | undefined;
  const isEditMode = !!talhaoId;
  const { user, selectedTenantId } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const queryClient = useQueryClient();
  const { data: talhoes = [] } = useTalhoesListData(targetId);
  const editingTalhao = talhoes.find((item) => item.id === talhaoId);

  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [culturaPrincipal, setCulturaPrincipal] = useState('');
  const [areaHectares, setAreaHectares] = useState('');
  const [cidade, setCidade] = useState('');
  const [tipoSolo, setTipoSolo] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<Talhao['status']>('ativo');
  const [boundaryPoints, setBoundaryPoints] = useState<LatLng[]>([]);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: -15.7801,
    longitude: -47.9292,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar talhão' : 'Novo talhão',
    });
  }, [isEditMode, navigation]);

  useEffect(() => {
    if (!editingTalhao || hydratedId === editingTalhao.id) return;
    setHydratedId(editingTalhao.id);
    setNome(editingTalhao.nome || '');
    setCodigo(editingTalhao.codigo || '');
    setCulturaPrincipal(editingTalhao.culturaPrincipal || '');
    setAreaHectares(
      editingTalhao.areaHectares != null
        ? String(editingTalhao.areaHectares).replace('.', ',')
        : ''
    );
    setCidade(editingTalhao.cidade || '');
    setTipoSolo(editingTalhao.tipoSolo || '');
    setObservacoes(editingTalhao.observacoes || '');
    setStatus(
      editingTalhao.status === 'inativo' ? 'ativo' : editingTalhao.status
    );
    const points = Array.isArray(editingTalhao.boundaryPoints)
      ? editingTalhao.boundaryPoints
      : [];
    setBoundaryPoints(points);
    if (points.length > 0) {
      setRegion({
        latitude:
          points.reduce((total, point) => total + point.latitude, 0) /
          points.length,
        longitude:
          points.reduce((total, point) => total + point.longitude, 0) /
          points.length,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [editingTalhao, hydratedId]);

  const measuredArea = useMemo(
    () => polygonAreaHectares(boundaryPoints),
    [boundaryPoints]
  );

  const centerOnCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Localização desativada',
          'Permita o acesso à localização para centralizar o mapa na sua área.'
        );
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setRegion({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch {
      Alert.alert(
        'Localização indisponível',
        'Não foi possível obter sua localização agora.'
      );
    } finally {
      setLocating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!targetId) throw new Error('Sua sessão expirou. Entre novamente.');
      if (!nome.trim()) throw new Error('Informe o nome do talhão.');

      const manualArea = Number(areaHectares.replace(',', '.')) || undefined;
      const payload: Partial<Talhao> = {
        nome: nome.trim(),
        codigo: codigo.trim() || undefined,
        culturaPrincipal: culturaPrincipal.trim() || undefined,
        areaHectares: manualArea,
        areaCalculadaHectares:
          boundaryPoints.length >= 3
            ? Number(measuredArea.toFixed(4))
            : undefined,
        boundaryPoints: boundaryPoints.length >= 3 ? boundaryPoints : undefined,
        cidade: cidade.trim() || undefined,
        tipoSolo: tipoSolo.trim() || undefined,
        observacoes: observacoes.trim() || undefined,
        status,
      };

      if (talhaoId) {
        await updateTalhao(talhaoId, payload, targetId);
        return talhaoId;
      }
      return createTalhao(payload, targetId);
    },
    onSuccess: async (savedTalhaoId) => {
      if (!targetId) return;
      await queryClient.invalidateQueries({
        queryKey: queryKeys.talhoesList(targetId),
      });

      if (isEditMode) {
        Alert.alert('Talhão atualizado', 'As informações foram salvas.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      Alert.alert(
        'Talhão pronto',
        'A área foi criada. Deseja iniciar o primeiro ciclo agora?',
        [
          { text: 'Agora não', onPress: () => navigation.goBack() },
          {
            text: 'Criar ciclo',
            onPress: () =>
              navigation.replace('PlantioForm', {
                talhaoId: savedTalhaoId,
              }),
          },
        ]
      );
    },
    onError: (error: unknown) => {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error
          ? error.message
          : 'Revise os dados e tente novamente.'
      );
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.secondary} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="map-marker-radius-outline"
              size={27}
              color={COLORS.textLight}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>
              {isEditMode ? 'CONFIGURAÇÃO DA ÁREA' : 'ETAPA 1 DE 2'}
            </Text>
            <Text style={styles.heroTitle}>
              {isEditMode ? 'Editar talhão' : 'Primeiro, crie o talhão'}
            </Text>
            <Text style={styles.heroSubtitle}>
              O ciclo produtivo sempre ficará organizado dentro desta área.
            </Text>
          </View>
        </View>

        {!isEditMode ? (
          <View style={styles.flowCard}>
            <View style={styles.flowItem}>
              <View style={[styles.flowNumber, styles.flowNumberActive]}>
                <Text style={styles.flowNumberActiveText}>1</Text>
              </View>
              <View>
                <Text style={styles.flowLabelActive}>Talhão</Text>
                <Text style={styles.flowMeta}>Definir a área</Text>
              </View>
            </View>
            <View style={styles.flowLine} />
            <View style={styles.flowItem}>
              <View style={styles.flowNumber}>
                <Text style={styles.flowNumberText}>2</Text>
              </View>
              <View>
                <Text style={styles.flowLabel}>Ciclo</Text>
                <Text style={styles.flowMeta}>Iniciar plantio</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons
                name="identifier"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Identificação</Text>
              <Text style={styles.sectionSubtitle}>
                Use um nome fácil de reconhecer durante o trabalho.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Nome do talhão *</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex: Talhão Norte"
            placeholderTextColor={COLORS.textPlaceholder}
            autoCapitalize="words"
          />

          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Text style={styles.label}>Código</Text>
              <TextInput
                style={styles.input}
                value={codigo}
                onChangeText={setCodigo}
                placeholder="Ex: TL-01"
                placeholderTextColor={COLORS.textPlaceholder}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Área manual (ha)</Text>
              <TextInput
                style={styles.input}
                value={areaHectares}
                onChangeText={(value) =>
                  setAreaHectares(sanitizeDecimalInput(value))
                }
                placeholder="Ex: 1,5"
                placeholderTextColor={COLORS.textPlaceholder}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Situação da área</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((option) => {
              const selected = status === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusChip,
                    selected && styles.statusChipActive,
                  ]}
                  onPress={() => setStatus(option.value)}
                >
                  <MaterialCommunityIcons
                    name={option.icon as any}
                    size={16}
                    color={selected ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.statusChipText,
                      selected && styles.statusChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialCommunityIcons
                name="sprout-outline"
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Informações da área</Text>
              <Text style={styles.sectionSubtitle}>
                Estes dados ajudam no planejamento dos próximos ciclos.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Cultura principal</Text>
          <TextInput
            style={styles.input}
            value={culturaPrincipal}
            onChangeText={setCulturaPrincipal}
            placeholder="Ex: Tomate, alface, milho"
            placeholderTextColor={COLORS.textPlaceholder}
          />

          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <Text style={styles.label}>Cidade / localidade</Text>
              <TextInput
                style={styles.input}
                value={cidade}
                onChangeText={setCidade}
                placeholder="Ex: Holambra"
                placeholderTextColor={COLORS.textPlaceholder}
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Tipo de solo</Text>
              <TextInput
                style={styles.input}
                value={tipoSolo}
                onChangeText={setTipoSolo}
                placeholder="Ex: Argiloso"
                placeholderTextColor={COLORS.textPlaceholder}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.mapHeader}
            onPress={() => setMapExpanded((current) => !current)}
          >
            <View style={styles.sectionHeaderCompact}>
              <View style={styles.sectionIcon}>
                <MaterialCommunityIcons
                  name="map-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Desenho no mapa</Text>
                <Text style={styles.sectionSubtitle}>
                  Opcional • calcula a área automaticamente
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name={mapExpanded ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {boundaryPoints.length >= 3 ? (
            <View style={styles.mapSummary}>
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={COLORS.success}
              />
              <Text style={styles.mapSummaryText}>
                Área calculada: {measuredArea.toFixed(4)} ha •{' '}
                {boundaryPoints.length} pontos
              </Text>
            </View>
          ) : null}

          {mapExpanded ? (
            <View style={styles.mapContent}>
              <View style={styles.mapToolbar}>
                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() => void centerOnCurrentLocation()}
                  disabled={locating}
                >
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={17}
                    color={COLORS.primary}
                  />
                  <Text style={styles.toolButtonText}>
                    {locating ? 'Localizando...' : 'Minha localização'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() =>
                    setBoundaryPoints((current) => current.slice(0, -1))
                  }
                  disabled={boundaryPoints.length === 0}
                >
                  <MaterialCommunityIcons
                    name="undo"
                    size={17}
                    color={COLORS.primary}
                  />
                  <Text style={styles.toolButtonText}>Desfazer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolButton}
                  onPress={() => setBoundaryPoints([])}
                  disabled={boundaryPoints.length === 0}
                >
                  <MaterialCommunityIcons
                    name="delete-sweep-outline"
                    size={17}
                    color={COLORS.danger}
                  />
                  <Text
                    style={[styles.toolButtonText, { color: COLORS.danger }]}
                  >
                    Limpar
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.mapHelp}>
                Toque no mapa para marcar os limites. Use pelo menos três
                pontos.
              </Text>
              <MapView
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion}
                onPress={(event: any) => {
                  if (Platform.OS === 'web') return;
                  const coordinate = event?.nativeEvent?.coordinate;
                  if (!coordinate) return;
                  setBoundaryPoints((current) => [...current, coordinate]);
                }}
              >
                {boundaryPoints.map((point, index) => (
                  <Marker
                    key={`${point.latitude}-${point.longitude}-${index}`}
                    coordinate={point as any}
                  />
                ))}
                {boundaryPoints.length >= 3 ? (
                  <Polygon
                    coordinates={boundaryPoints as any}
                    strokeColor={COLORS.primary}
                    fillColor="rgba(13,148,136,0.18)"
                  />
                ) : null}
              </MapView>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Observações</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={observacoes}
            onChangeText={setObservacoes}
            placeholder="Acesso, irrigação, particularidades da área..."
            placeholderTextColor={COLORS.textPlaceholder}
            multiline
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color={COLORS.textLight} />
          ) : (
            <>
              <MaterialCommunityIcons
                name={
                  isEditMode ? 'content-save-outline' : 'arrow-right-circle'
                }
                size={21}
                color={COLORS.textLight}
              />
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Salvar alterações' : 'Salvar e continuar'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.md,
  },
  hero: {
    minHeight: 150,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.secondary,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    ...SHADOWS.floating,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.whiteAlpha20,
  },
  heroCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  heroTitle: {
    color: COLORS.textLight,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 5,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: COLORS.whiteAlpha80,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    fontWeight: '600',
  },
  flowCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  flowItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  flowNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowNumberActive: { backgroundColor: COLORS.primary },
  flowNumberText: { color: COLORS.textMuted, fontWeight: '900' },
  flowNumberActiveText: { color: COLORS.textLight, fontWeight: '900' },
  flowLabel: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 12 },
  flowLabelActive: { color: COLORS.primary, fontWeight: '900', fontSize: 12 },
  flowMeta: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  flowLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.sm,
  },
  card: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionHeaderCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: { color: COLORS.textDark, fontSize: 16, fontWeight: '900' },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.surfaceMuted,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  notesInput: {
    minHeight: 94,
    textAlignVertical: 'top',
    paddingTop: 14,
    marginBottom: 0,
  },
  twoColumns: { flexDirection: 'row', gap: SPACING.sm },
  column: { flex: 1 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    minHeight: 38,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  statusChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  statusChipTextActive: { color: COLORS.primary },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapSummary: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.successSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  mapSummaryText: { color: COLORS.success, fontSize: 11, fontWeight: '800' },
  mapContent: { marginTop: SPACING.md },
  mapToolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  toolButton: {
    minHeight: 36,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolButtonText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  mapHelp: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginVertical: SPACING.sm,
  },
  map: { height: 300, borderRadius: RADIUS.md, overflow: 'hidden' },
  saveButton: {
    minHeight: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    ...SHADOWS.floating,
  },
  saveButtonText: { color: COLORS.textLight, fontSize: 15, fontWeight: '900' },
});

export default TalhaoFormScreen;
