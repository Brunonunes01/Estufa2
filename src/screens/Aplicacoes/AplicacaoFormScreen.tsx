// src/screens/Aplicacoes/AplicacaoFormScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, Alert, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { useAuth } from '../../hooks/useAuth';
import { listAllPlantios } from '../../services/plantioService';
import { listInsumos } from '../../services/insumoService';
import { createAplicacao, AplicacaoFormData, AplicacaoItemData } from '../../services/aplicacaoService';
import { Plantio, Insumo } from '../../types/domain';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const COLORS = {
  background: '#F3F4F6',
  surface: '#FFFFFF',
  primary: '#3B82F6', // Azul para Aplicações (Química/Água)
  secondary: '#60A5FA',
  border: '#E5E7EB',
  inputBg: '#F9FAFB',
  textDark: '#111827',
  textGray: '#6B7280',
  danger: '#EF4444'
};

const AplicacaoFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const params = route.params || {};
  
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loading, setLoading] = useState(false);

  const [plantioId, setPlantioId] = useState(params.plantioId || '');
  const [volumeTanque, setVolumeTanque] = useState('');
  const [numTanques, setNumTanques] = useState('1');
  const [observacoes, setObservacoes] = useState('');
  
  const [itens, setItens] = useState<AplicacaoItemData[]>([]);
  const [tempInsumoId, setTempInsumoId] = useState('');
  const [tempDose, setTempDose] = useState('');

  useEffect(() => {
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
      } catch (e) { Alert.alert("Erro", "Falha ao carregar."); } 
      finally { setLoadingData(false); }
    };
    load();
  }, [user, selectedTenantId]);

  const handleAddItem = () => {
      if (!tempInsumoId || !tempDose) return;
      const insumo = insumos.find(i => i.id === tempInsumoId);
      if (!insumo) return;
      const dose = parseFloat(tempDose.replace(',', '.'));
      if (isNaN(dose) || dose <= 0) return;

      setItens([...itens, {
          insumoId: tempInsumoId,
          nomeInsumo: insumo.nome,
          dosePorTanque: dose,
          unidade: insumo.unidadePadrao
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
      if (!targetId || !plantioId || itens.length === 0) return Alert.alert("Erro", "Adicione itens.");
      
      setLoading(true);
      try {
          const p = plantios.find(pl => pl.id === plantioId);
          if (!p) return;
          
          const vol = parseFloat(volumeTanque) || 0;
          const tanques = parseFloat(numTanques) || 1;
          const itensFinais = itens.map(i => ({ ...i, quantidadeAplicada: i.dosePorTanque * tanques }));

          await createAplicacao({
              plantioId,
              estufaId: p.estufaId,
              volumeTanque: vol,
              numeroTanques: tanques,
              observacoes,
              itens: itensFinais
          }, targetId);
          Alert.alert("Sucesso", "Aplicação registrada!");
          navigation.goBack();
      } catch { Alert.alert("Erro", "Falha ao salvar."); }
      finally { setLoading(false); }
  };

  if (loadingData) return <ActivityIndicator size="large" style={{flex:1}} color={COLORS.primary} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Local e Equipamento</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Plantio Alvo</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={plantioId} onValueChange={setPlantioId}>
                        {plantios.map(p => <Picker.Item key={p.id} label={`${p.cultura} (${p.variedade || 'Comum'})`} value={p.id} />)}
                    </Picker>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, {flex: 1, marginRight: 15}]}>
                    <Text style={styles.label}>Nº Tanques</Text>
                    <TextInput style={styles.input} value={numTanques} onChangeText={setNumTanques} keyboardType="numeric" />
                </View>
                <View style={[styles.inputGroup, {flex: 1}]}>
                    <Text style={styles.label}>Volume (L)</Text>
                    <TextInput style={styles.input} value={volumeTanque} onChangeText={setVolumeTanque} keyboardType="numeric" placeholder="Opcional" />
                </View>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionHeader}>Receita / Mistura</Text>
            
            <View style={styles.addBox}>
                <Text style={styles.label}>Produto</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={tempInsumoId} onValueChange={setTempInsumoId}>
                        {insumos.map(i => <Picker.Item key={i.id} label={`${i.nome} (Est: ${i.estoqueAtual})`} value={i.id} />)}
                    </Picker>
                </View>
                
                <View style={[styles.row, {marginTop: 15, alignItems: 'flex-end'}]}>
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Dose por Tanque</Text>
                        <TextInput style={styles.input} value={tempDose} onChangeText={setTempDose} keyboardType="numeric" placeholder="Ex: 0.5" />
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddItem}>
                        <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {itens.length > 0 && <View style={styles.divider} />}

            {itens.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                    <View style={styles.itemIcon}>
                        <MaterialCommunityIcons name="flask" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{flex: 1, paddingHorizontal: 10}}>
                        <Text style={styles.itemName}>{item.nomeInsumo}</Text>
                        <Text style={styles.itemDose}>{item.dosePorTanque} {item.unidade} / tanque</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)} style={{padding: 5}}>
                        <MaterialCommunityIcons name="close-circle" size={24} color={COLORS.danger} />
                    </TouchableOpacity>
                </View>
            ))}
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
  card: { backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 15, textTransform: 'uppercase' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16 },
  pickerWrapper: { backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  
  addBox: { backgroundColor: '#EFF6FF', padding: 15, borderRadius: 12 },
  addBtn: { backgroundColor: COLORS.primary, width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 15 },
  
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  itemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  itemName: { fontWeight: '700', color: COLORS.textDark },
  itemDose: { fontSize: 12, color: COLORS.textGray },

  saveBtn: { backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});

export default AplicacaoFormScreen;