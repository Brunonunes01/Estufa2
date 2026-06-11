import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createDespesa } from '../../services/despesaService';
import { useAuth } from '../../hooks/useAuth';
import { sanitizeDecimalInput } from '../../utils/numericFields';
import { useWriteGuard } from '../../hooks/useWriteGuard';
import { useAppSettings } from '../../hooks/useAppSettings';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { invalidateDespesasQueries } from '../../lib/queryInvalidation';
import { CaixaPessoa, listCaixaPessoas } from '../../services/caixaPessoaService';
import {
  ComprovanteUpload,
  pickComprovante,
  uploadComprovanteToCloudinary,
} from '../../services/comprovanteUploadService';

const DespesaFormScreen = ({ navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const canWrite = useWriteGuard(navigation, 'Lancamento de despesa');
  const { settings } = useAppSettings();
  const insets = useSafeAreaInsets();
  const targetId = selectedTenantId || user?.uid;

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState<'energia' | 'agua' | 'manutencao' | 'mao_de_obra' | 'outro'>('outro');
  const [status, setStatus] = useState<'pago' | 'pendente'>('pago');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [caixaPessoas, setCaixaPessoas] = useState<CaixaPessoa[]>([]);
  const [pagamentoPara, setPagamentoPara] = useState('');
  const [comprovante, setComprovante] = useState<ComprovanteUpload | null>(null);

  const [dataDespesa, setDataDespesa] = useState(new Date());
  const [dataVencimento, setDataVencimento] = useState(new Date());
  const [showPicker, setShowPicker] = useState<'despesa' | 'vencimento' | null>(null);

  React.useEffect(() => {
    const load = async () => {
      if (!targetId) return;
      try {
        const pessoas = await listCaixaPessoas(targetId);
        setCaixaPessoas(pessoas);
      } catch (_error) {
        setCaixaPessoas([]);
      }
    };
    void load();
  }, [targetId]);

  const handleSelecionarComprovante = async () => {
    if (!canWrite) return;
    if (!targetId) return Alert.alert('Atenção', 'Sua sessão expirou. Entre novamente.');

    setUploadingComprovante(true);
    try {
      const file = await pickComprovante();
      if (!file) return;
      const uploaded = await uploadComprovanteToCloudinary(file, targetId);
      setComprovante(uploaded);
      Alert.alert('Comprovante anexado', uploaded.comprovanteNome);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível anexar o comprovante.');
    } finally {
      setUploadingComprovante(false);
    }
  };

  const handleSave = async () => {
    if (!canWrite) return;
    if (!targetId) return Alert.alert('Atenção', 'Sua sessão expirou. Entre novamente.');
    if (!descricao.trim()) return Alert.alert('Atenção', 'Digite a descrição da despesa.');
    const valorNum = parseFloat(valor.replace(',', '.')) || 0;
    if (valorNum <= 0) return Alert.alert('Atenção', 'Digite um valor maior que zero.');
    if (status === 'pago' && !pagamentoPara) {
      return Alert.alert('Atenção', 'Selecione quem recebeu o valor do caixa.');
    }

    setLoading(true);
    try {
      await createDespesa(
        {
          descricao: descricao.trim(),
          valor: valorNum,
            categoria,
          statusPagamento: status,
          dataDespesa,
          dataVencimento: status === 'pendente' ? dataVencimento : null,
          observacoes: observacoes || null,
          pagamentoPara: status === 'pago' ? pagamentoPara : null,
          comprovanteUrl: comprovante?.comprovanteUrl || null,
          comprovantePublicId: comprovante?.comprovantePublicId || null,
          comprovanteNome: comprovante?.comprovanteNome || null,
          comprovanteMime: comprovante?.comprovanteMime || null,
          comprovanteBytes: comprovante?.comprovanteBytes || null,
        },
        targetId
      );

      if (targetId) {
        await invalidateDespesasQueries(targetId);
      }

      Alert.alert(
        'Despesa registrada',
        `${descricao.trim()}\nValor: R$ ${valorNum.toFixed(2)}\nStatus: ${status === 'pago' ? 'Pago' : 'Pendente'}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não consegui salvar a despesa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (settings.uiV2Enabled ? 138 : SPACING.xl) + insets.bottom },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Dados do Pagamento</Text>

          <Text style={styles.label}>Descrição</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Conta de Luz"
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <Text style={styles.label}>Valor (R$)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={valor}
              onChangeText={(value) => setValor(sanitizeDecimalInput(value))}
              keyboardType="numeric"
              placeholder="0,00"
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.inputWrapper}>
            <Picker selectedValue={categoria} onValueChange={setCategoria} style={styles.picker}>
              <Picker.Item label="Energia Eletrica" value="energia" />
              <Picker.Item label="Mao de Obra / Diaria" value="mao_de_obra" />
              <Picker.Item label="Manutencao" value="manutencao" />
              <Picker.Item label="Combustivel / Frete" value="outro" />
              <Picker.Item label="Agua" value="agua" />
              <Picker.Item label="Impostos" value="outro" />
              <Picker.Item label="Outros" value="outro" />
            </Picker>
          </View>

          <Text style={styles.label}>Situacao</Text>
          <View style={styles.inputWrapper}>
            <Picker selectedValue={status} onValueChange={(v: any) => setStatus(v)} style={styles.picker}>
              <Picker.Item label="Ja Paguei" value="pago" />
              <Picker.Item label="Pendente (Conta a Pagar)" value="pendente" />
            </Picker>
          </View>

          <Text style={styles.label}>Data da Despesa</Text>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('despesa')}>
            <MaterialCommunityIcons name="calendar" size={24} color={COLORS.modDespesas} />
            <Text style={styles.dateText}>{dataDespesa.toLocaleDateString('pt-BR')}</Text>
          </TouchableOpacity>

          {status === 'pendente' ? (
            <>
              <Text style={styles.label}>Data de Vencimento</Text>
              <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('vencimento')}>
                <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.textLight} />
                <Text style={styles.dateText}>{dataVencimento.toLocaleDateString('pt-BR')}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={styles.label}>Saida de Caixa (quem recebeu)</Text>
          <View style={styles.inputWrapper}>
            <Picker selectedValue={pagamentoPara} onValueChange={(v: any) => setPagamentoPara(v)} style={styles.picker}>
              <Picker.Item label="Selecione a pessoa do caixa" value="" />
              {caixaPessoas.map((p) => (
                <Picker.Item key={p.id} label={p.nome} value={p.id} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Observacoes (Opcional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Detalhes..."
              placeholderTextColor={COLORS.textPlaceholder}
            />
          </View>

          <Text style={styles.label}>Comprovante (Opcional)</Text>
          <TouchableOpacity
            style={styles.fileBtn}
            onPress={handleSelecionarComprovante}
            disabled={uploadingComprovante || loading}
          >
            {uploadingComprovante ? (
              <ActivityIndicator color={COLORS.textLight} />
            ) : (
              <>
                <MaterialCommunityIcons name="paperclip" size={18} color={COLORS.textLight} />
                <Text style={styles.fileBtnText}>{comprovante ? 'Trocar comprovante' : 'Anexar comprovante'}</Text>
              </>
            )}
          </TouchableOpacity>
          {comprovante ? (
            <View style={styles.fileInfoRow}>
              <Text style={styles.fileInfoText} numberOfLines={1}>
                {comprovante.comprovanteNome}
              </Text>
              <TouchableOpacity onPress={() => setComprovante(null)}>
                <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : null}
          {comprovante?.comprovanteUrl && comprovante.comprovanteMime?.startsWith('image/') ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: comprovante.comprovanteUrl }} style={styles.previewImage} resizeMode="cover" />
              <Text style={styles.previewLabel}>Pre-visualizacao do comprovante</Text>
            </View>
          ) : null}
          {comprovante?.comprovanteUrl && comprovante.comprovanteMime === 'application/pdf' ? (
            <View style={styles.previewPdfWrap}>
              <MaterialCommunityIcons name="file-pdf-box" size={18} color={COLORS.danger} />
              <Text style={styles.previewPdfText}>PDF anexado (sem miniatura)</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading || uploadingComprovante}>
          {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>Registrar Despesa</Text>}
        </TouchableOpacity>

        {showPicker ? (
          <DateTimePicker
            value={showPicker === 'despesa' ? dataDespesa : dataVencimento}
            mode="date"
            display="default"
            onChange={(_e, d) => {
              setShowPicker(null);
              if (d) showPicker === 'despesa' ? setDataDespesa(d) : setDataVencimento(d);
            }}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.xl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  sectionHeader: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.modDespesas,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  picker: { color: COLORS.textPrimary, fontWeight: '700' },
  inputWrapper: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: 15,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textDark,
    height: '100%',
    fontWeight: '700',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: 15,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 56,
    marginBottom: SPACING.md,
  },
  dateText: { marginLeft: 10, fontSize: TYPOGRAPHY.body, fontWeight: '700', color: COLORS.textDark },
  fileBtn: {
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  fileBtnText: { color: COLORS.textLight, fontWeight: '800' },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  fileInfoText: { flex: 1, marginRight: 8, color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  previewWrap: {
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
  },
  previewLabel: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  previewPdfWrap: {
    marginTop: 4,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewPdfText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.modDespesas,
    height: 60,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    ...SHADOWS.card,
  },
  saveText: { fontSize: 19, fontWeight: '800', color: COLORS.textLight },
});

export default DespesaFormScreen;
