// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Plantio, Colheita } from '../../types/domain';
import { getPlantioById } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { useIsFocused } from '@react-navigation/native';

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId } = route.params;
  
  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFocused = useIsFocused(); // Para recarregar a lista

  // Hook para carregar dados
  useEffect(() => {
    const carregarDados = async () => {
      if (!user || !plantioId) return;
      
      setLoading(true);
      try {
        // Puxa os dados do Plantio
        const dadosPlantio = await getPlantioById(plantioId);
        setPlantio(dadosPlantio);
        if (dadosPlantio) {
          // Seta o título da tela
          navigation.setOptions({ title: dadosPlantio.cultura });
          // Puxa as colheitas desse plantio
          const listaColheitas = await listColheitasByPlantio(user.uid, plantioId);
          setColheitas(listaColheitas);
        }
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
  }, [plantioId, user, isFocused]); // Dependências do hook

  // Cálculo do total colhido [cite: 171]
  const totalColhido = useMemo(() => {
    // Agrupa por unidade (ex: 100 kg, 50 caixas)
    const totais = colheitas.reduce((acc, colheita) => {
      const { unidade, quantidade } = colheita;
      if (!acc[unidade]) {
        acc[unidade] = 0;
      }
      acc[unidade] += quantidade;
      return acc;
    }, {} as { [key: string]: number });

    // Converte para uma string
    return Object.keys(totais).map(unidade => `${totais[unidade]} ${unidade}`).join(' / ');
  }, [colheitas]);


  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!plantio) {
    return <View style={styles.centered}><Text>Plantio não encontrado.</Text></View>;
  }

  // Renderiza a tela
  return (
    <View style={styles.container}>
      {/* Seção 1: Detalhes do Plantio */}
      <View style={styles.detailBox}>
        <Text style={styles.title}>{plantio.cultura} {plantio.variedade ? `(${plantio.variedade})` : ''}</Text>
        <Text>Status: {plantio.status}</Text>
        <Text>Data do Plantio: {plantio.dataPlantio.toDate().toLocaleDateString()}</Text>
        {plantio.previsaoColheita && (
          <Text>Previsão Colheita: {plantio.previsaoColheita.toDate().toLocaleDateString()}</Text>
        )}
        
        {/* Total Colhido */}
        <Text style={styles.totalColhido}>Total Colhido: {totalColhido || 'Nenhuma colheita'} </Text>
      </View>

      {/* Seção 2: Ações */}
      <Button 
        title="Adicionar Colheita"
        onPress={() => navigation.navigate('ColheitaForm', { 
          plantioId: plantio.id,
          estufaId: plantio.estufaId // Passa o ID da estufa para o form
        })}
      />

      {/* Seção 3: Lista de Colheitas */}
      <Text style={styles.title}>Histórico de Colheitas</Text>
      <FlatList
        data={colheitas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.colheitaItem}>
            <Text style={styles.colheitaTitle}>
              {item.dataColheita.toDate().toLocaleDateString()}
            </Text>
            <Text>Qtd: {item.quantidade} {item.unidade}</Text>
            {item.precoUnitario && <Text>Preço: R$ {item.precoUnitario.toFixed(2)} / {item.unidade}</Text>}
            {item.destino && <Text>Destino: {item.destino}</Text>}
          </View>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 10 }}>Nenhuma colheita registrada.</Text>}
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
  totalColhido: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#005500',
  },
  colheitaItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  colheitaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default PlantioDetailScreen;