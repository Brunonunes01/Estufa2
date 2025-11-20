// src/screens/Aplicacoes/AplicacoesHistoryScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity,
  ScrollView,
  Button
} from 'react-native';
import { useAuth } from '../../hooks/useAuth'; 
import { Aplicacao, Insumo } from '../../types/domain'; 
import { listAplicacoesByPlantio } from '../../services/aplicacaoService'; 
import { listInsumos } from '../../services/insumoService'; 
import { useIsFocused } from '@react-navigation/native';

const AplicacoesHistoryScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId, estufaId } = route.params; 
  
  const [aplicacoes, setAplicacoes] = useState<Aplicacao[]>([]);
  const [insumosList, setInsumosList] = useState<Insumo[]>([]);
  
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    if (!user || !plantioId) return;
    setLoading(true);
    try {
      const [listaAplicacoes, listaInsumos] = await Promise.all([
        listAplicacoesByPlantio(user.uid, plantioId),
        listInsumos(user.uid)
      ]);

      setAplicacoes(listaAplicacoes);
      setInsumosList(listaInsumos);

    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar o histórico de aplicações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Histórico de Aplicações' });
    if (isFocused) carregarDados();
  }, [plantioId, user, isFocused]); 

  const handleClonarAplicacao = (aplicacao: Aplicacao) => {
    navigation.navigate('AplicacaoForm', { 
      plantioId: plantioId,
      estufaId: estufaId,
      clonarAplicacao: aplicacao 
    });
  };

  if (loading) return <ActivityIndicator size="large" style={styles.centered} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <Button 
        title="Nova Aplicação" 
        color="#ff8c00" 
        onPress={() => navigation.navigate('AplicacaoForm', { plantioId: plantioId, estufaId: estufaId })} 
      />

      <Text style={styles.sectionHeader}>Aplicações Registradas ({aplicacoes.length})</Text>

      {aplicacoes.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma aplicação encontrada para este plantio.</Text>
        </View>
      ) : (
        // Usamos (item as Aplicacao) para garantir que o TypeScript reconheça os novos campos
        aplicacoes.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemDate}>
                    {item.dataAplicacao.toDate().toLocaleDateString()}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => handleClonarAplicacao(item)}
                  style={styles.cloneButton}
                >
                    <Text style={styles.cloneText}>CLONAR</Text>
                </TouchableOpacity>
            </View>
            
            <Text style={styles.itemTitle}>{item.observacoes || "Aplicação Padrão"}</Text>
            
            {/* Lista os itens da aplicação */}
            {item.itens && item.itens.map((subItem, idx) => (
              <Text key={idx} style={styles.subItemText}>
                • {subItem.nomeInsumo}: {subItem.quantidadeAplicada.toFixed(2)} {subItem.unidade}
              </Text>
            ))}
            
            {/* Detalhe do Volume (CORRIGIDO AQUI) */}
            {item.volumeTanque !== null && (item as Aplicacao).numeroTanques !== null ? (
                <Text style={styles.defensivoDetail}>
                    Volume Tanque: {item.volumeTanque}L 
                    (Total Calda: {(item.volumeTanque * ((item as Aplicacao).numeroTanques || 0)).toFixed(0)}L em {(item as Aplicacao).numeroTanques} Tanques)
                </Text>
            ) : item.volumeTanque !== null ? (
                <Text style={styles.defensivoDetail}>
                    Volume Tanque: {item.volumeTanque}L 
                </Text>
            ) : null}

          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f2f2f2' },
  scrollContent: { paddingBottom: 50 }, 
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#333', textAlign: 'center' },
  
  // Estilos de Itens (Aplicação)
  item: { backgroundColor: '#fff', padding: 12, marginVertical: 8, borderRadius: 5, borderWidth: 1, borderColor: '#ddd', elevation: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  itemDate: { color: '#666', fontSize: 12 },
  itemTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  subItemText: { marginLeft: 10, color: '#444', fontSize: 14 },
  defensivoDetail: { fontSize: 12, color: '#856404', marginTop: 4, marginLeft: 10, fontStyle: 'italic' },
  
  // Botão Clonar
  cloneButton: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  cloneText: { color: '#007bff', fontWeight: 'bold', fontSize: 10 },
  
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  }
});

export default AplicacoesHistoryScreen;