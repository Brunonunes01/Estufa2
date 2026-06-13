import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { useClientesList } from '../../../hooks/useClientesList';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../constants/theme';
import { RootStackParamList } from '../../../navigation/types';
import { HydroOcupacao } from '../types';
import { registrarColheitaHidroponica } from '../services/hidroponiaColheitaService';
import { getHydroOcupacaoById } from '../services/hidroponiaOcupacaoService';
import { toNumber } from '../utils';
import { useAppSettings } from '../../../hooks/useAppSettings';

type Props = NativeStackScreenProps<RootStackParamList, 'HidroponiaColheitaForm'>;

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX', icon: 'qrcode' },
  { value: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
  { value: 'boleto', label: 'Boleto', icon: 'barcode' },
  { value: 'cartao', label: 'Cartão', icon: 'credit-card' },
  { value: 'cheque', label: 'Cheque', icon: 'card-account-details-outline' },
  { value: 'prazo', label: 'A Prazo', icon: 'calendar-clock' },
  { value: 'outro', label: 'Outro', icon: 'dots-horizontal-circle-outline' },
];

const UNIDADES = ['maços', 'un', 'kg', 'caixas'];

const HidroponiaColheitaFormScreen = ({ navigation, route }: Props) => {
  const { user, selectedTenantId } = useAuth();
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;
  const { ocupacaoId, isSeedlingResale } = route.params;

  const { clientes, loading: loadingClientes } = useClientesList();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ocupacao, setOcupacao] = useState<HydroOcupacao | null>(null);

  // Form states
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState(isSeedlingResale ? 'un' : 'maços');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('pix');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    navigation.setOptions({ 
      title: isSeedlingResale ? 'Venda de Mudas' : 'Registrar Colheita' 
    });
  }, [navigation, isSeedlingResale]);

  useEffect(() => {
    const load = async () => {
      if (!targetId) return;
      try {
        const data = (await getHydroOcupacaoById(ocupacaoId, targetId)) as HydroOcupacao | null;
        if (data) {
          setOcupacao(data);
          setQuantidade(String(data.quantidadeAlocada || ''));
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível carregar a ocupação.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ocupacaoId, targetId]);

  const handleSave = async () => {
    if (!targetId || !ocupacao) return;
    const qtd = toNumber(quantidade);
    const preco = toNumber(precoUnitario);

    if (qtd <= 0) return Alert.alert('Atenção', 'Informe a quantidade.');
    if (preco <= 0) return Alert.alert('Atenção', 'Informe o preço unitário.');

    setSaving(true);
    try {
      await registrarColheitaHidroponica({
        ocupacaoId,
        quantidadeColhida: qtd,
        unidade,
        precoUnitario: preco,
        clienteId: clienteId || null,
        metodoPagamento,
        observacoes,
      }, targetId);

      Alert.alert('Sucesso', isSeedlingResale ? 'Venda de mudas registrada!' : 'Colheita e venda registradas com sucesso!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao registrar venda.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={styles.centered} />;
  }

  const valorTotal = (toNumber(quantidade) * toNumber(precoUnitario)).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xxl) + insets.bottom },
      ]}
    >
      <View style={styles.headerCard}>
        <Text style={styles.headerLabel}>
          {isSeedlingResale ? 'Vendendo mudas da bancada ' : 'Colhendo da Bancada '} 
          {ocupacao?.estruturaId}
        </Text>
        <Text style={styles.headerTitle}>{ocupacao?.cultura}</Text>
        <Text style={styles.headerSub}>{ocupacao?.variedade || 'Variedade não informada'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{ocupacao?.quantidadeAlocada} un disponíveis</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Dados da Venda</Text>
      
      <Text style={styles.label}>
        {isSeedlingResale ? 'Quantidade de Mudas Vendidas' : 'Quantidade Colhida / Vendida'}
      </Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={quantidade}
          onChangeText={setQuantidade}
          keyboardType="numeric"
          placeholder="0"
        />
        <View style={styles.unidadeWrap}>
          {UNIDADES.map((u) => (
            <TouchableOpacity 
              key={u} 
              style={[styles.unidadeChip, unidade === u && styles.unidadeChipActive]}
              onPress={() => setUnidade(u)}
            >
              <Text style={[styles.unidadeText, unidade === u && styles.unidadeTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.label}>Preço Unitário (R$)</Text>
      <TextInput
        style={styles.input}
        value={precoUnitario}
        onChangeText={setPrecoUnitario}
        keyboardType="numeric"
        placeholder="0,00"
      />

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Valor Total da Venda</Text>
        <Text style={styles.totalValue}>{valorTotal}</Text>
      </View>

      <Text style={styles.label}>Cliente (Produtor / Comprador)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientScroll}>
        <TouchableOpacity 
          style={[styles.clientChip, !clienteId && styles.clientChipActive]}
          onPress={() => setClienteId('')}
        >
          <Text style={[styles.clientText, !clienteId && styles.clientTextActive]}>
            {isSeedlingResale ? 'Comprador Avulso' : 'Consumidor Final'}
          </Text>
        </TouchableOpacity>
        {clientes.map((c) => (
          <TouchableOpacity 
            key={c.id} 
            style={[styles.clientChip, clienteId === c.id && styles.clientChipActive]}
            onPress={() => setClienteId(c.id)}
          >
            <Text style={[styles.clientText, clienteId === c.id && styles.clientTextActive]}>{c.nome}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Forma de Recebimento</Text>
      <View style={styles.paymentGrid}>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.paymentBtn, metodoPagamento === m.value && styles.paymentBtnActive]}
            onPress={() => setMetodoPagamento(m.value)}
          >
            <MaterialCommunityIcons 
              name={m.icon as any} 
              size={24} 
              color={metodoPagamento === m.value ? COLORS.textLight : COLORS.textSecondary} 
            />
            <Text style={[styles.paymentText, metodoPagamento === m.value && styles.paymentTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Observações</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
        placeholder="Notas sobre a qualidade, entrega, etc."
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <MaterialCommunityIcons 
              name={isSeedlingResale ? "cart-check" : "check-decagram"} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.submitBtnText}>
              {isSeedlingResale ? 'Finalizar Venda de Mudas' : 'Finalizar Colheita e Venda'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  headerCard: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, ...SHADOWS.card },
  headerLabel: { color: COLORS.whiteAlpha60, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { color: COLORS.textLight, fontSize: 24, fontWeight: '900', marginTop: 4 },
  headerSub: { color: COLORS.whiteAlpha80, fontSize: 16, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, marginTop: 12 },
  badgeText: { color: COLORS.textLight, fontSize: 12, fontWeight: '800' },
  sectionTitle: { color: COLORS.primary, fontSize: 18, fontWeight: '900', marginBottom: SPACING.md, marginTop: SPACING.sm },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, color: COLORS.textPrimary, fontSize: 16 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  unidadeWrap: { flex: 3, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  unidadeChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted },
  unidadeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unidadeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },
  unidadeTextActive: { color: COLORS.textLight },
  totalCard: { backgroundColor: COLORS.successSoft, borderRadius: RADIUS.md, padding: 15, marginTop: 15, borderWidth: 1, borderColor: COLORS.success, alignItems: 'center' },
  totalLabel: { color: COLORS.success, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  totalValue: { color: COLORS.success, fontSize: 28, fontWeight: '900', marginTop: 4 },
  clientScroll: { marginBottom: 15 },
  clientChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginRight: 8 },
  clientChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  clientText: { color: COLORS.textSecondary, fontWeight: '700' },
  clientTextActive: { color: COLORS.textLight },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 },
  paymentBtn: { width: '48%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  paymentBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  paymentText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: 13 },
  paymentTextActive: { color: COLORS.textLight },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20, ...SHADOWS.card },
  submitBtnText: { color: COLORS.textLight, fontSize: 18, fontWeight: '900' },
});

export default HidroponiaColheitaFormScreen;
