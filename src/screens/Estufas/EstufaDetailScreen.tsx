// src/screens/Estufas/EstufaDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Estufa, Plantio } from '../../types/domain';
import { getEstufaById } from '../../services/estufaService';
import { listPlantiosByEstufa } from '../../services/plantioService';
import { useIsFocused } from '@react-navigation/native';

const EstufaDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { estufaId, estufaNome } = route.params;
  
  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFocused = useIsFocused(); // Para recarregar a lista

  // Hook para carregar dados da estufa e seus plantios
  useEffect(() => {
    // Seta o título da tela
    navigation.setOptions({ title: estufaNome || 'Detalhes da Estufa' });

    const carregarDados = async () => {
      if (!user || !estufaId) return;
      
      setLoading(true);
      try {
        // Puxa os dados da Estufa
        const dadosEstufa = await getEstufaById(estufaId);
        setEstufa(dadosEstufa);

        // Puxa os plantios dessa estufa
        const listaPlantios = await listPlantiosByEstufa(user.uid, estufaId);
        setPlantios(listaPlantios);

      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    };
    
    // Recarrega sempre que a tela entrar em foco
    if (isFocused) {
      carregarDados();
    }
  }, [estufaId, user, isFocused]); // Dependências do hook

  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!estufa) {
    return <View style={styles.centered}><Text>Estufa não encontrada.</Text></View>;
  }

  // Renderiza a tela
  return (
    <View style={styles.container}>
      {/* Seção 1: Detalhes da Estufa */}
      <View style={styles.detailBox}>
        <Text style={styles.title}>Dados da Estufa</Text>
        <Text>Área: {estufa.areaM2} m²</Text>

        {/* AQUI ESTÁ A CORREÇÃO (comp -> comprimentoM) */}
        <Text>Medidas (CxLxA): {estufa.comprimentoM}m x {estufa.larguraM}m x {estufa.alturaM}m</Text>
        
        <Text>Status: {estufa.status}</Text>
      </View>

      {/* Seção 2: Ações */}
      <Button 
        title="Adicionar Novo Plantio"
        onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}
      />

      {/* Seção 3: Lista de Plantios */}
      <Text style={styles.title}>Plantios nesta Estufa</Text>
      <FlatList
        data={plantios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.plantioItem}>
            {/* AQUI ESTÁ A CORREÇÃO (variade -> variedade) */}
            <Text style={styles.plantioTitle}>{item.cultura} ({item.variedade || 'N/A'})</Text>
            
            <Text>Data: {item.dataPlantio.toDate().toLocaleDateString()}</Text>
            <Text>Qtd: {item.quantidadePlantada} {item.unidadeQuantidade}</Text>
            <Text>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 10 }}>Nenhum plantio cadastrado.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 5,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  plantioItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  plantioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default EstufaDetailScreen;