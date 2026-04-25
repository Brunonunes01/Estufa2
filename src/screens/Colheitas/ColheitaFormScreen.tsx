import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createColheita, updateColheita, getColheitaById, deleteColheita, ColheitaFormData } from '../../services/colheitaService';
import { listAllPlantios, unlockPlantioCycleForEarlySale } from '../../services/plantioService';
import { listEstufas } from '../../services/estufaService';
import { listClientes, createCliente } from '../../services/clienteService';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Plantio, Cliente } from '../../types/domain';
import { COLORS } from '../../constants/theme';
import { queryClient, queryKeys } from '../../lib/queryClient';
import { verifyCurrentUserPassword } from '../../services/securityService';

type UnidadeColheita = "kg" | "caixa" | "unidade" | "maço";
type MetodoPagamento = "pix" | "dinheiro" | "boleto" | "prazo" | "cartao" | "outro";

const ColheitaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId, canDeleteEstufa } = useAuth();
  const targetId = selectedTenantId || user?.uid;
  const params = route.params || {};
  const editingId = params.colheitaId || params.vendaId;
  const isEditMode = !!editingId;

  const [plantiosDisponiveis, setPlantiosDisponiveis] = useState<Plantio[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [estufasMap, setEstufasMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  const [selectedPlantioId, setSelectedPlantioId] = useState<string>(params.plantioId || '');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<UnidadeColheita>('caixa');
  const [preco, setPreco] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>('pix');
  const [dataVenda, setDataVenda] = useState(new Date());
  const [isFinalHarvest, setIsFinalHarvest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [salvandoNovoCliente, setSalvandoNovoCliente] = useState(false);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [saleUnlockedByAdmin, setSaleUnlockedByAdmin] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Venda' : 'Registrar Venda',
      headerRight: () => isEditMode ? (
        <TouchableOpacity onPress={handleDelete} style={{marginRight: 15}}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      ) : null,
    });
  }, [navigation, isEditMode]);

  useEffect(() => {
    const carregarTudo = async () => {
        if (!targetId) return;

        setLoadingData(true);
        try {
            const [clientes, plantios, estufas] = await Promise.all([
                listClientes(targetId),
                listAllPlantios(targetId),
                listEstufas(targetId)
            ]);

            setClientesList(clientes);
            const mapE: any = {};
            estufas.forEach((e: any) => mapE[e.id] = e.nome);
            setEstufasMap(mapE);

            const ativos = plantios.filter((p: any) => isEditMode || (p.status !== 'finalizado' && p.status !== 'cancelado'));
            setPlantiosDisponiveis(ativos);

            if (!selectedPlantioId && ativos.length > 0 && !isEditMode) {
                setSelectedPlantioId(ativos[0].id);
            }

            if (isEditMode) {
                const venda = await getColheitaById(editingId, targetId);
                if (venda) {
                    setQuantidade(String(venda.quantidade));
                    setUnidade(venda.unidade as UnidadeColheita);
                    setPreco(venda.precoUnitario ? String(venda.precoUnitario) : '');
                    setSelectedClienteId(venda.clienteId || null);
                    setMetodoPagamento((venda.metodoPagamento as MetodoPagamento) || 'pix');
                    setSelectedPlantioId(venda.plantioId);
                    setPesoBruto(venda.pesoBruto ? String(venda.pesoBruto) : '');
                    setPesoLiquido(venda.pesoLiquido ? String(venda.pesoLiquido) : '');
                    if (venda.dataColheita) {
                        const dc = venda.dataColheita;
                        setDataVenda(dc.toDate ? dc.toDate() : new Date(dc.seconds * 1000));
                    }
                }
            }
        } catch (e) {
            Alert.alert("Erro", "Falha ao carregar dados.");
        } finally {
            setLoadingData(false);
        }
    };
    carregarTudo();
  }, [targetId, editingId]);

  const valorTotal = useMemo(() => {
    const qtd = parseFloat(quantidade.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return qtd * prc;
  }, [quantidade, preco]);

  const precoPorKg = useMemo(() => {
    const pLiq = parseFloat(pesoLiquido.replace(',','.')) || 0;
    const prc = parseFloat(preco.replace(',','.')) || 0;
    return (unidade === 'caixa' && pLiq > 0) ? prc / pLiq : 0;
  }, [unidade, pesoLiquido, preco]);

  const loteSelecionado = useMemo(() => {
    return plantiosDisponiveis.find(p => p.id === selectedPlantioId);
  }, [selectedPlantioId, plantiosDisponiveis]);

  const minSaleDate = useMemo(() => {
    if (!loteSelecionado?.cicloDias || loteSelecionado.cicloDias <= 0) return null;
    const base = loteSelecionado.dataPlantio || loteSelecionado.dataInicio;
    if (!base || typeof (base as any).toDate !== 'function') return null;
    const min = (base as any).toDate() as Date;
    min.setDate(min.getDate() + Number(loteSelecionado.cicloDias));
    return min;
  }, [loteSelecionado]);

  const isBeforeMinimumSaleDate = useMemo(() => {
    if (!minSaleDate) return false;
    const saleDate = new Date(dataVenda);
    saleDate.setHours(0, 0, 0, 0);
    const minDate = new Date(minSaleDate);
    minDate.setHours(0, 0, 0, 0);
    return saleDate.getTime() < minDate.getTime();
  }, [dataVenda, minSaleDate]);
  const hasPermanentCycleUnlock = !!loteSelecionado?.cicloDesbloqueadoPorAdmin;
  const isCycleUnlockedForSale = saleUnlockedByAdmin || hasPermanentCycleUnlock;
  const isCycleLockedForSale = isBeforeMinimumSaleDate && !isCycleUnlockedForSale;
  const cycleUnlockReason = saleUnlockedByAdmin ? unlockReason : loteSelecionado?.desbloqueioAdminReason || '';

  useEffect(() => {
    setSaleUnlockedByAdmin(false);
    setAdminPassword('');
    setUnlockReason('');
  }, [selectedPlantioId, dataVenda.getTime()]);

  const invalidateQueries = () => {
    if (targetId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(targetId) });
      queryClient.invalidateQueries({ queryKey: ['vendas-list', targetId] });
    }
  };

  const handleDelete = () => {
    if (!targetId) return;

    Alert.alert("Excluir Venda", "Deseja remover este registro permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
          try {
            await deleteColheita(editingId, targetId);
            invalidateQueries();
            navigation.goBack();
          } catch (e) { Alert.alert("Erro", "Falha ao excluir."); }
      }}
    ]);
  };

  const handleQuickRegisterClient = async () => {
    if (!novoClienteNome.trim()) return Alert.alert("Atenção", "Digite o nome");
    if (!targetId) return;

    setSalvandoNovoCliente(true);
    try {
        const novoId = await createCliente({
            nome: novoClienteNome.trim(),
            tipo: 'Consumidor'
        }, targetId);

        const novoCliente = { id: novoId, nome: novoClienteNome.trim() } as Cliente;
        setClientesList(prev => [...prev, novoCliente].sort((a,b) => a.nome.localeCompare(b.nome)));
        setSelectedClienteId(novoId);
        setModalVisible(false);
        setNovoClienteNome('');
        queryClient.invalidateQueries({ queryKey: queryKeys.clientesList(targetId) });
    } catch (error) { Alert.alert("Erro", "Falha ao cadastrar."); } finally { setSalvandoNovoCliente(false); }
  };

  const persistColheita = async (allowBeforeCycleDays = false, reason?: string) => {
      if (!targetId) return Alert.alert("Atenção", "Sua sessão expirou. Entre novamente.");
      if (!selectedPlantioId) return Alert.alert("Atenção", "Escolha o ciclo para registrar a venda.");
      if (!quantidade) return Alert.alert("Atenção", "Digite a quantidade da venda.");

      setLoading(true);
      try {
          const plantioObj = plantiosDisponiveis.find(p => p.id === selectedPlantioId);
          const qtdNum = parseFloat(quantidade.replace(',', '.'));
          const precoNum = parseFloat(preco.replace(',', '.')) || 0;
          if (!qtdNum || qtdNum <= 0) {
            Alert.alert("Atenção", "A quantidade precisa ser maior que zero.");
            return;
          }

          const data: ColheitaFormData = {
              quantidade: qtdNum,
              unidade,
              precoUnitario: precoNum,
              clienteId: selectedClienteId,
              destino: 'venda_direta',
              metodoPagamento,
              registradoPor: user?.name || 'App',
              observacoes: `Lote: ${plantioObj?.codigoLote || 'N/A'}`,
              dataVenda,
              pesoBruto: parseFloat(pesoBruto.replace(',', '.')) || 0,
              pesoLiquido: parseFloat(pesoLiquido.replace(',', '.')) || 0,
              isFinalHarvest,
          };
          const shouldSaveWithCycleUnlock = isBeforeMinimumSaleDate && isCycleUnlockedForSale;

          if (isEditMode) {
              await updateColheita(editingId, data, targetId, {
                allowBeforeCycleDays: allowBeforeCycleDays || shouldSaveWithCycleUnlock,
                overrideAudit: allowBeforeCycleDays
                  ? {
                      byUid: user?.uid || targetId,
                      byName: user?.name || user?.displayName || null,
                      reason: reason || null,
                    }
                  : null,
              });
          } else {
              await createColheita(data, targetId, selectedPlantioId, plantioObj!.estufaId, {
                allowBeforeCycleDays: allowBeforeCycleDays || shouldSaveWithCycleUnlock,
                overrideAudit: allowBeforeCycleDays
                  ? {
                      byUid: user?.uid || targetId,
                      byName: user?.name || user?.displayName || null,
                      reason: reason || null,
                    }
                  : null,
              });
          }

          invalidateQueries();
          const totalVenda = (qtdNum || 0) * (precoNum || 0);
          Alert.alert(
            isEditMode ? "Venda atualizada" : "Venda registrada",
            `${qtdNum} ${unidade} • R$ ${totalVenda.toFixed(2)}${plantioObj?.codigoLote ? `\nLote: ${plantioObj.codigoLote}` : ''}`,
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
      } catch (e: any) { Alert.alert("Erro", e.message || "Não consegui salvar a venda. Tente novamente."); } finally { setLoading(false); }
  };

  const handleUnlockWithAdmin = async () => {
    if (!adminPassword.trim()) {
      Alert.alert('Atenção', 'Digite a senha de administrador.');
      return;
    }
    if (!unlockReason.trim()) {
      Alert.alert('Atenção', 'Informe o motivo do desbloqueio.');
      return;
    }
    if (!targetId || !selectedPlantioId) {
      Alert.alert('Atenção', 'Escolha o ciclo para desbloquear.');
      return;
    }

    setUnlocking(true);
    try {
      const valid = await verifyCurrentUserPassword(adminPassword.trim());
      if (!valid) {
        Alert.alert('Senha inválida', 'A senha de administrador está incorreta.');
        return;
      }
      const reason = unlockReason.trim();
      const unlockPayload = await unlockPlantioCycleForEarlySale(selectedPlantioId, targetId, {
        byUid: user?.uid || targetId,
        byName: user?.name || user?.displayName || null,
        reason,
      });
      setPlantiosDisponiveis(prev =>
        prev.map(plantio =>
          plantio.id === selectedPlantioId
            ? { ...plantio, ...unlockPayload }
            : plantio
        )
      );
      setSaleUnlockedByAdmin(true);
      setUnlockModalVisible(false);
      setAdminPassword('');
      setUnlockReason(reason);
      Alert.alert('Desbloqueado', 'Ciclo liberado permanentemente para venda antecipada.');
    } catch {
      Alert.alert('Erro', 'Não foi possível desbloquear o ciclo.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async () => {
    if (isCycleLockedForSale) {
      if (!canDeleteEstufa) {
        Alert.alert(
          'Venda bloqueada',
          `Este ciclo só permite venda a partir de ${minSaleDate?.toLocaleDateString('pt-BR')}.`
        );
        return;
      }
      setAdminPassword('');
      setUnlockModalVisible(true);
      return;
    }

    await persistColheita(isBeforeMinimumSaleDate && saleUnlockedByAdmin, unlockReason);
  };

  if (loadingData) return <ActivityIndicator size="large" color={COLORS.primary} style={{flex:1}} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Origem e Destino</Text>

            <Text style={styles.label}>Produto (Lote de Plantio)</Text>
            <View style={[styles.pickerWrapper, isEditMode && styles.disabledPicker]}>
                <Picker selectedValue={selectedPlantioId} onValueChange={setSelectedPlantioId} enabled={!isEditMode} style={styles.picker}>
                    {plantiosDisponiveis.map(p => (
                        <Picker.Item
                          key={p.id}
                          label={`[${p.codigoLote || 'S/ LOTE'}] ${p.cultura} - Estufa: ${estufasMap[p.estufaId] || '?'}`}
                          value={p.id}
                        />
                    ))}
                </Picker>
            </View>

            {loteSelecionado && (
              <View style={styles.rastreioBox}>
                <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.textLight} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.rastreioTitle}>Lote de Origem Rastreado</Text>
                  <Text style={styles.rastreioText}>Código: {loteSelecionado.codigoLote || 'Não informado'}</Text>
                  <Text style={styles.rastreioText}>Variedade: {loteSelecionado.variedade || 'Padrão'}</Text>
                </View>
              </View>
            )}

            <Text style={[styles.label, {marginTop: 15}]}>Cliente / Destino</Text>
            <View style={styles.rowAlign}>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={selectedClienteId} onValueChange={setSelectedClienteId} style={styles.picker}>
                        <Picker.Item label="Venda Avulsa / Consumidor Final" value={null} />
                        {clientesList.map(c => <Picker.Item key={c.id} label={c.nome} value={c.id} />)}
                    </Picker>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                    <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.label, {marginTop: 15}]}>Data da Colheita/Venda</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
                <Text style={styles.dateText}>{dataVenda.toLocaleDateString('pt-BR')}</Text>
            </TouchableOpacity>
            {minSaleDate ? (
              <Text style={styles.infoText}>
                Data mínima para venda deste ciclo: {minSaleDate.toLocaleDateString('pt-BR')}
              </Text>
            ) : null}
            {showDatePicker && (
              <DateTimePicker
                value={dataVenda}
                mode="date"
                display="default"
                minimumDate={!canDeleteEstufa ? minSaleDate || undefined : undefined}
                onChange={(e, d) => { setShowDatePicker(false); if(d) setDataVenda(d); }}
              />
            )}
            {isCycleLockedForSale ? (
              <View style={styles.lockBox}>
                <Text style={styles.lockTitle}>Venda bloqueada por ciclo mínimo</Text>
                <Text style={styles.lockText}>
                  Defina uma data igual ou superior a {minSaleDate?.toLocaleDateString('pt-BR')} ou solicite desbloqueio.
                </Text>
                {canDeleteEstufa ? (
                  <TouchableOpacity
                    style={styles.unlockBtn}
                    onPress={() => {
                      setAdminPassword('');
                      setUnlockReason('');
                      setUnlockModalVisible(true);
                    }}
                  >
                    <Text style={styles.unlockBtnText}>Desbloquear ciclo permanente</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.lockText}>Somente administrador pode desbloquear.</Text>
                )}
              </View>
            ) : null}
            {isBeforeMinimumSaleDate && isCycleUnlockedForSale ? (
              <View style={styles.unlockOkBox}>
                <Text style={styles.unlockOkText}>
                  Ciclo desbloqueado permanentemente para venda antecipada.
                  {cycleUnlockReason ? ` Motivo: ${cycleUnlockReason}` : ''}
                </Text>
              </View>
            ) : null}
        </View>

        <View style={[styles.card, isCycleLockedForSale && styles.lockedCard]}>
            <Text style={styles.sectionHeader}>Quantidade e Pesagem</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.label}>Quantidade</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={quantidade} onChangeText={setQuantidade} placeholder="0" editable={!isCycleLockedForSale} />
                </View>
                <View style={{ width: 110 }}>
                    <Text style={styles.label}>Unidade</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker selectedValue={unidade} onValueChange={(val: any) => setUnidade(val)} style={styles.picker} enabled={!isCycleLockedForSale}>
                            <Picker.Item label="CX" value="caixa" />
                            <Picker.Item label="KG" value="kg" />
                            <Picker.Item label="UN" value="unidade" />
                        </Picker>
                    </View>
                </View>
            </View>

            {unidade === 'caixa' && (
                <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>P. Bruto (kg)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={pesoBruto} onChangeText={setPesoBruto} placeholder="0.00" editable={!isCycleLockedForSale} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.label}>P. Líquido (kg)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={pesoLiquido} onChangeText={setPesoLiquido} placeholder="0.00" editable={!isCycleLockedForSale} />
                    </View>
                </View>
            )}

            <Text style={styles.label}>Preço Unitário (R$)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={setPreco} placeholder="0.00" editable={!isCycleLockedForSale} />

            {unidade === 'caixa' && precoPorKg > 0 && (
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="scale" size={20} color={COLORS.primary} />
                    <Text style={styles.infoText}>Preço p/ Kg: R$ {precoPorKg.toFixed(2)}</Text>
                </View>
            )}

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>TOTAL DA VENDA</Text>
                <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
        </View>

        <View style={[styles.card, isCycleLockedForSale && styles.lockedCard]}>
            <Text style={styles.sectionHeader}>Pagamento</Text>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={metodoPagamento} onValueChange={(val: any) => setMetodoPagamento(val)} style={styles.picker} enabled={!isCycleLockedForSale}>
                    <Picker.Item label="Pix" value="pix" />
                    <Picker.Item label="Dinheiro" value="dinheiro" />
                    <Picker.Item label="A Prazo" value="prazo" />
                    <Picker.Item label="Cartão" value="cartao" />
                </Picker>
            </View>

            {!isEditMode && (
              <View style={styles.finalHarvestRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Esta é a colheita final (encerrar ciclo)?</Text>
                  <Text style={styles.finalHarvestHint}>
                    Se desligado, o plantio permanece em colheita para novos lançamentos.
                  </Text>
                </View>
                <Switch
                  value={isFinalHarvest}
                  onValueChange={setIsFinalHarvest}
                  disabled={isCycleLockedForSale}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.textLight}
                />
              </View>
            )}
        </View>

        <TouchableOpacity style={[styles.saveBtn, isCycleLockedForSale && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading || isCycleLockedForSale}>
            {loading ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={styles.saveText}>{isCycleLockedForSale ? 'Desbloqueie para continuar' : isEditMode ? 'Salvar Alterações' : 'Confirmar Venda'}</Text>}
        </TouchableOpacity>

      </ScrollView>

      <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Cliente</Text>
            <TextInput style={styles.input} placeholder="Nome do Cliente (Destino)" value={novoClienteNome} onChangeText={setNovoClienteNome} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={{color: COLORS.textSecondary}}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleQuickRegisterClient} style={styles.modalBtn}>
                {salvandoNovoCliente ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={unlockModalVisible} onRequestClose={() => setUnlockModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Desbloquear Ciclo Permanentemente</Text>
            <Text style={styles.unlockText}>
              A data escolhida é anterior ao ciclo mínimo. Confirme com senha de administrador para liberar vendas antecipadas neste ciclo.
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
              placeholder="Motivo do desbloqueio (obrigatório)"
              value={unlockReason}
              onChangeText={setUnlockReason}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Senha de administrador"
              value={adminPassword}
              onChangeText={setAdminPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setUnlockModalVisible(false);
                  setAdminPassword('');
                  setUnlockReason('');
                }}
                disabled={unlocking}
              >
                <Text style={{color: COLORS.textSecondary}}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUnlockWithAdmin} style={styles.modalBtn} disabled={unlocking}>
                {unlocking ? <ActivityIndicator color={COLORS.textLight} /> : <Text style={{color: COLORS.textLight, fontWeight: 'bold'}}>Desbloquear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 18, marginBottom: 15, elevation: 2 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, textTransform: 'uppercase' },
  label: { fontSize: 12, color: COLORS.textPrimary, marginBottom: 5, fontWeight: '600' },
  input: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontWeight: 'bold' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  dateText: { marginLeft: 10, fontWeight: 'bold', color: COLORS.textPrimary },
  row: { flexDirection: 'row' },
  rowAlign: { flexDirection: 'row', alignItems: 'center' },
  pickerWrapper: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, height: 50, justifyContent: 'center' },
  disabledPicker: { opacity: 0.6, backgroundColor: COLORS.disabledBg },
  picker: { color: COLORS.textPrimary },
  addBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderRadius: 8, marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  rastreioBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: COLORS.c86EFAC },
  rastreioTitle: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  rastreioText: { fontSize: 11, color: COLORS.c15803D },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cF0FDF4, padding: 12, borderRadius: 8, marginBottom: 15 },
  infoText: { marginLeft: 8, color: COLORS.primary, fontWeight: 'bold' },
  lockBox: { backgroundColor: COLORS.alertSoft, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.warning, marginBottom: 12 },
  lockTitle: { color: COLORS.alertText, fontWeight: '800', marginBottom: 4 },
  lockText: { color: COLORS.alertText, fontSize: 12, marginBottom: 6 },
  unlockBtn: { alignSelf: 'flex-start', backgroundColor: COLORS.warning, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  unlockBtnText: { color: COLORS.textLight, fontWeight: '800', fontSize: 12 },
  unlockOkBox: { backgroundColor: COLORS.successSoft, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.success, marginBottom: 12 },
  unlockOkText: { color: COLORS.success, fontWeight: '700', fontSize: 12 },
  lockedCard: { opacity: 0.55 },
  totalContainer: { alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 15 },
  totalLabel: { fontSize: 11, color: COLORS.textPrimary, fontWeight: 'bold' },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  finalHarvestRow: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  finalHarvestHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  saveBtnDisabled: { backgroundColor: COLORS.disabledBg },
  saveText: { color: COLORS.textLight, fontWeight: 'bold', fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.rgba00005, justifyContent: 'center', padding: 30 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  unlockText: { color: COLORS.textSecondary, marginBottom: 12, lineHeight: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
  modalBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }
});

export default ColheitaFormScreen;
