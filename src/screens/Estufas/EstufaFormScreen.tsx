import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, ScrollView, StyleSheet, 
  TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { createEstufa, updateEstufa, getEstufaById, deleteEstufa } from '../../services/estufaService';
import { COLORS } from '../../constants/theme';

const EstufaFormScreen = ({ route, navigation }: any) => {
  const { user, selectedTenantId } = useAuth();
  const editingId = route.params?.estufaId;
  const isEditMode = !!editingId;

  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (data) setNome(data.nome);
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
    if (!nome || !targetId) return Alert.alert("Erro", "Preencha o nome.");
    setLoading(true);
    try {
      if (isEditMode) {
        await updateEstufa(editingId, { nome } as any);
      } else {
        await createEstufa({ nome } as any, targetId);
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
        <Text style={styles.label}>Nome da Estufa</Text>
        <TextInput 
          style={styles.input} 
          value={nome} 
          onChangeText={setNome} 
          placeholder="Ex: Estufa 01" 
          placeholderTextColor="#94A3B8"
        />
        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Guardar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  padding: { padding: 20 },
  label: { fontWeight: 'bold', marginBottom: 5, color: COLORS.textSecondary },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, color: '#000' },
  btn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default EstufaFormScreen;