// src/screens/Aplicacoes/AplicacaoFormScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { useAuth } from '../../hooks/useAuth';
import { listAllPlantios } from '../../services/plantioService';
import { listInsumos } from '../../services/insumoService';
import { createAplicacao, AplicacaoItemData } from '../../services/aplicacaoService';
import { Plantio, Insumo } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Importamos o nosso Design System Global
import { COLORS } from '../../constants/theme';

const AplicacaoFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const params = route.params || {};
  
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);

  const [plantioId, setPlantioId] = useState(params.plantioId || '');
  
  // --- NOVO: ESTADO PARA O TIPO DE APLICAÇÃO ---
  const [tipoAplicacao, setTipoAplicacao] = useState<'defensivo' | 'fertilizacao'>('defensivo');
  
  const [volumeTanque, setVolumeTanque] = useState('');
  const [numTanques, setNumTanques] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  
  const [itens, setItens] = useState<AplicacaoItemData[]>([]);
  const [tempInsumoId, setTempInsumoId] = useState('');
  const [tempDose, setTempDose] = useState('');

  useEffect(() => {
    navigation.setOptions({ 
        headerStyle: { backgroundColor: COLORS.info }, 
        headerTintColor: COLORS.textLight,
        title: 'Nova Aplicação'
    });

    const load = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) return;

      try {
        const [listaPlantios, listaInsumos] = await Promise.all([
            listAllPlantios(targetId),
            listInsumos(targetId)
        ]);
        const ativos = listaPlantios.filter(p => p.status !== 'finalizado');
        setPlantios(ativos);
        setInsumos(listaInsumos);

        if (!plantioId && ativos.length > 0) setPlantioId(ativos[0].id);
        if (listaInsumos.length > 0) setTempInsumoId(listaInsumos[0].id);
      } catch (e) { Alert.alert("Erro", "Falha ao carregar os dados."); } 
      finally { setLoadingData(false); }
    };
    load();
  }, [user, selectedTenantId]);

  const selectedInsumo = useMemo(() => {
    return insumos.find(i => i.id === tempInsumoId);
  }, [insumos, tempInsumoId]);

  const unidadeAtual = selectedInsumo ? selectedInsumo.unidadePadrao : '';

  const handleAddItem = () => {
      if (!tempInsumoId || !tempDose) return Alert.alert("Atenção", "Selecione o produto e informe a dose.");
      if (!selectedInsumo) return;
      
      const dose = parseFloat(tempDose.replace(',', '.'));
      if (isNaN(dose) || dose <= 0) return Alert.alert("Atenção", "A dose deve ser maior que zero.");

      setItens([...itens, {
          insumoId: tempInsumoId,
          nomeInsumo: selectedInsumo.nome,
          dosePorTanque: dose,
          unidade: selectedInsumo.unidadePadrao
      }]);
      setTempDose(''); 
  };

  const handleRemoveItem = (index: number) => {
      const newItens = [...itens];
      newItens.splice(index, 1);
      setItens(newItens);
  };

  const handleSave = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) return Alert.alert("Erro", "Sessão inválida.");
      if (!plantioId) return Alert.alert("Atenção", "Selecione a qual plantio esta aplicação se destina.");
      if (itens.length === 0) return Alert.alert("Atenção", "Adicione pelo menos um produto (insumo) à mistura.");
      
      setLoading(true);
      try {
          const p = plantios.find(pl => pl.id === plantioId);
          if (!p) return;
          
          const vol = parseFloat(volumeTanque.replace(',', '.')) || 0;
          const tanques = parseFloat(numTanques.replace(',', '.')) || 1;
          const itensFinais = itens.map(i => ({ ...i, quantidadeAplicada: i.dosePorTanque * tanques }));

          // Cast para 'any' para evitar erros de tipagem no seu aplicacaoService
          await createAplicacao({
              plantioId,
              estufaId: p.estufaId,
              tipoAplicacao, // <-- Enviando o tipo de aplicação
              volumeTanque: vol,
              numeroTanques: tanques,
              observacoes,
              itens: itensFinais
          } as any, targetId);
          
          Alert.alert("Sucesso", "Aplicação registada com sucesso!");
          navigation.goBack();
      } catch { Alert.alert("Erro", "Falha ao salvar a aplicação."); }
      finally { setLoading(false); }
  };

  if (loadingData) return <ActivityIndicator size="large" style={{flex:1, backgroundColor: COLORS.background}} color={COLORS.info} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- NOVO: SELETOR DE FINALIDADE --- */}
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Finalidade da Aplicação</Text>
            <View style={styles.pillContainer}>
              <TouchableOpacity 
                style={[styles.pill, tipoAplicacao === 'defensivo' && styles.pillActive]} 
                onPress={() => setTipoAplicacao('defensivo')}
              >
                  <MaterialCommunityIcons name="shield-bug" size={20} color={tipoAplicacao === 'defensivo' ? '#FFF' : COLORS.info} style={{marginBottom: 4}} />
                  <Text style={[styles.pillText, tipoAplicacao === 'defensivo' && styles.pillTextActive]}>Defensivo Fitosanitário</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.pill, tipoAplicacao === 'fertilizacao' && styles.pillActive]} 
                onPress={() => setTipoAplicacao('fertilizacao')}
              >
                  <MaterialCommunityIcons name="sprout" size={20} color={tipoAplicacao === 'fertilizacao' ? '#FFF' : COLORS.info} style={{marginBottom: 4}} />
                  <Text style={[styles.pillText, tipoAplicacao === 'fertilizacao' && styles.pillTextActive]}>Fertilização / Nutrição</Text>
              </TouchableOpacity>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Local e Equipamento</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Plantio Alvo</Text>
                <View style={styles.inputWrapper}>
                    <Picker selectedValue={plantioId} onValueChange={setPlantioId} style={{color: '#000000', fontWeight: 'bold'}}>
                        {plantios.length === 0 && <Picker.Item label="Nenhum plantio ativo" value="" />}
                        {plantios.map(p => <Picker.Item key={p.id} label={`${p.codigoLote ? `[${p.codigoLote}] ` : ''}${p.cultura} (${p.variedade || 'Comum'})`} value={p.id} />)}
                    </Picker>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 15}]}>
                    <Text style={styles.label}>Nº Tanques (Bomba)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={numTanques} onChangeText={setNumTanques} keyboardType="numeric" placeholder="Ex: 1" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.info} />
                    </View>
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Volume (Litros)</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput style={styles.input} value={volumeTanque} onChangeText={setVolumeTanque} keyboardType="numeric" placeholder="Opcional" placeholderTextColor={COLORS.textPlaceholder} selectionColor={COLORS.info} />
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Receita / Mistura</Text>
            
            <View style={styles.addBox}>
                <Text style={styles.label}>Adicionar Produto</Text>
                <View style={styles.inputWrapper}>
                    <Picker selectedValue={tempInsumoId} onValueChange={setTempInsumoId} style={{color: '#000000', fontWeight: 'bold'}}>
                        {insumos.length === 0 && <Picker.Item label="Nenhum insumo no stock" value="" />}
                        {insumos.map(i => (
                          <Picker.Item 
                            key={i.id} 
                            // Melhoria visual: Mostra a tag [ADUBO] ou [DEFENSIVO] antes do nome
                            label={`[${i.tipo.toUpperCase()}] ${i.nome} (Est: ${i.estoqueAtual} ${i.unidadePadrao})`} 
                            value={i.id} 
                          />
                        ))}
                    </Picker>
                </View>
                
                <View style={[styles.row, {marginTop: 15, alignItems: 'flex-end'}]}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Dose por Tanque</Text>
                        <View style={[styles.inputWrapper, {marginBottom: 0, flexDirection: 'row', alignItems: 'center', overflow: 'hidden'}]}>
                            <TextInput 
                                style={[styles.input, {flex: 1, borderRightWidth: 0}]} 
                                value={tempDose} 
                                onChangeText={setTempDose} 
                                keyboardType="numeric" 
                                placeholder="0.00" 
                                placeholderTextColor={COLORS.textPlaceholder} 
                                selectionColor={COLORS.info} 
                            />
                            {unidadeAtual ? (
                                <View style={styles.unitSuffix}>
                                    <Text style={styles.unitText}>{unidadeAtual.toUpperCase()}</Text>
                                </View>
                            ) : null}
                        </View>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
                        <MaterialCommunityIcons name="plus" size={32} color="#FFF" />
                    </TouchableOpacity>
                </View>
                
                {unidadeAtual === 'l' || unidadeAtual === 'kg' ? (
                    <Text style={styles.helperText}>Dica: Para 500ml/g, digite 0.5</Text>
                ) : null}
            </View>

            {itens.length > 0 && <View style={styles.divider} />}

            {itens.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                    <View style={styles.itemIcon}>
                        <MaterialCommunityIcons name={tipoAplicacao === 'fertilizacao' ? 'sprout' : 'flask'} size={20} color={COLORS.info} />
                    </View>
                    <View style={{flex: 1, paddingHorizontal: 12}}>
                        <Text style={styles.itemName}>{item.nomeInsumo}</Text>
                        <Text style={styles.itemDose}>{item.dosePorTanque} {item.unidade} / tanque</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)} style={{padding: 5}}>
                        <MaterialCommunityIcons name="close-circle" size={28} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            ))}
            
            {itens.length === 0 && (
                <Text style={{textAlign: 'center', color: COLORS.textSecondary, marginTop: 15, fontStyle: 'italic'}}>
                    Nenhum produto adicionado à mistura ainda.
                </Text>
            )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Registrar Aplicação</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 20 },
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 24, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: COLORS.info, marginBottom: 15, textTransform: 'uppercase' },
  
  // Estilos da Finalidade (Pills)
  pillContainer: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: COLORS.info, alignItems: 'center', backgroundColor: '#FFF' },
  pillActive: { backgroundColor: COLORS.info },
  pillText: { color: COLORS.info, fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  pillTextActive: { color: '#FFF' },

  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  
  inputWrapper: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.borderDark, height: 56, justifyContent: 'center' },
  input: { paddingHorizontal: 15, fontSize: 18, color: '#000000', height: '100%', fontWeight: 'bold' },
  
  unitSuffix: { backgroundColor: '#E2E8F0', height: '100%', justifyContent: 'center', paddingHorizontal: 15, borderLeftWidth: 1.5, borderLeftColor: COLORS.borderDark },
  unitText: { fontWeight: 'bold', color: '#475569', fontSize: 16 },
  helperText: { fontSize: 11, color: '#64748B', marginTop: 8, fontStyle: 'italic' },

  row: { flexDirection: 'row' },
  
  addBox: { backgroundColor: '#EFF6FF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE' },
  addBtn: { backgroundColor: COLORS.info, width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 15, elevation: 2 },
  
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.borderDark, elevation: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontWeight: '800', color: '#000000', fontSize: 15 },
  itemDose: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

  saveBtn: { backgroundColor: COLORS.info, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 40, elevation: 4 },
  saveText: { color: '#FFF', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 }
});

export default AplicacaoFormScreen;