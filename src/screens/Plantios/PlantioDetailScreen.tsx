// src/screens/Plantios/PlantioDetailScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Plantio, Colheita, Fornecedor } from '../../types/domain'; // Importar Fornecedor
import { getPlantioById, updatePlantioStatus } from '../../services/plantioService';
import { listColheitasByPlantio } from '../../services/colheitaService';
import { listFornecedores } from '../../services/fornecedorService'; // Importar
import { useIsFocused } from '@react-navigation/native';

const PlantioDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { plantioId } = route.params;
  
  const [plantio, setPlantio] = useState<Plantio | null>(null);
  const [colheitas, setColheitas] = useState<Colheita[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]); // <-- NOVO ESTADO
  const [loading, setLoading] = useState(true);
  
  const isFocused = useIsFocused();

  const carregarDados = async () => {
    if (!user || !plantioId) return;
    
    setLoading(true);
    try {
      // Puxa o plantio
      const dadosPlantio = await getPlantioById(plantioId);
      setPlantio(dadosPlantio);
      
      // Puxa as colheitas
      const listaColheitas = await listColheitasByPlantio(user.uid, plantioId);
      setColheitas(listaColheitas);

      // Puxa os fornecedores (para encontrar o nome)
      const listaFornecedores = await listFornecedores(user.uid);
      setFornecedores(listaFornecedores);

      if (dadosPlantio) {
        navigation.setOptions({ title: dadosPlantio.cultura });
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      carregarDados();
    }
  }, [plantioId, user, isFocused]); 

  const handleFinalizarPlantio = () => {
    // ... (função de finalizar, sem mudanças)
    if (!plantio) return;
    Alert.alert(
      "Finalizar Plantio?",
      "Deseja marcar este plantio como 'finalizado'? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Finalizar", 
          onPress: async () => {
            try {
              setLoading(true);
              await updatePlantioStatus(plantio.id, "finalizado");
              await carregarDados(); 
            } catch (error) {
              Alert.alert("Erro", "Não foi possível finalizar o plantio.");
              setLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Cálculo do total colhido
  const totalColhido = useMemo(() => {
    // ... (lógica sem mudanças)
    const totais = colheitas.reduce((acc, colheita) => {
      const { unidade, quantidade } = colheita;
      if (!acc[unidade]) {
        acc[unidade] = 0;
      }
      acc[unidade] += quantidade;
      return acc;
    }, {} as { [key: string]: number });
    return Object.keys(totais).map(unidade => `${totais[unidade]} ${unidade}`).join(' / ');
  }, [colheitas]);

  // Cálculo do Custo Estimado
  const custoEstimadoPlantio = useMemo(() => {
    // ... (lógica sem mudanças)
    if (!plantio || !plantio.precoEstimadoUnidade) {
      return 0;
    }
    return plantio.quantidadePlantada * plantio.precoEstimadoUnidade;
  }, [plantio]);

  // ****** LÓGICA NOVA: Encontrar o nome do Fornecedor ******
  const nomeFornecedor = useMemo(() => {
    if (!plantio || !plantio.fornecedorId) {
      return null;
    }
    const fornecedor = fornecedores.find(f => f.id === plantio.fornecedorId);
    return fornecedor ? fornecedor.nome : 'Fornecedor não encontrado';
  }, [plantio, fornecedores]);


  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!plantio) {
    return <View style={styles.centered}><Text>Plantio não encontrado.</Text></View>;
  }

  const statusCor = plantio.status === 'finalizado' ? styles.statusFinalizado : styles.statusAtivo;

  return (
    <View style={styles.container}>
      {/* Seção 1: Detalhes do Plantio */}
      <View style={styles.detailBox}>
        <Text style={styles.title}>{plantio.cultura} {plantio.variedade ? `(${plantio.variedade})` : ''}</Text>
        <Text>Status: <Text style={statusCor}>{plantio.status}</Text></Text>
        <Text>Data do Plantio: {plantio.dataPlantio.toDate().toLocaleDateString()}</Text>
        
        {/* ****** CAMPO NOVO ADICIONADO ****** */}
        {nomeFornecedor && (
          <Text>Fornecedor: {nomeFornecedor}</Text>
        )}

        {plantio.previsaoColheita && (
          <Text>Previsão Colheita: {plantio.previsaoColheita.toDate().toLocaleDateString()}</Text>
        )}
        {custoEstimadoPlantio > 0 && (
          <Text style={styles.costText}>
            Custo Estimado: R$ {custoEstimadoPlantio.toFixed(2)}
          </Text>
        )}
        <Text style={styles.totalColhido}>
          Total Colhido: {totalColhido || 'Nenhuma colheita'} 
        </Text>
      </View>

      {/* Seção 2: Ações */}
      {plantio.status !== 'finalizado' && (
        <>
          <View style={styles.buttonWrapper}>
            <Button 
              title="Adicionar Colheita"
              onPress={() => navigation.navigate('ColheitaForm', { 
                plantioId: plantio.id,
                estufaId: plantio.estufaId 
              })}
            />
          </View>
          <View style={styles.buttonWrapper}>
            <Button 
              title="Finalizar Plantio"
              onPress={handleFinalizarPlantio}
              color="#d9534f" 
            />
          </View>
        </>
      )}

      {/* Seção 3: Lista de Colheitas */}
      <Text style={styles.title}>Histórico de Colheitas</Text>
      <FlatList
        data={colheitas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const valorTotalItem = (item.quantidade || 0) * (item.precoUnitario || 0);
          return (
            <View style={styles.colheitaItem}>
              <Text style={styles.colheitaTitle}>
                {item.dataColheita.toDate().toLocaleDateString()}
              </Text>
              <Text>Qtd: {item.quantidade} {item.unidade}</Text>
              {item.precoUnitario && <Text>Preço: R$ {item.precoUnitario.toFixed(2)} / {item.unidade}</Text>}
              {valorTotalItem > 0 && (
                <Text style={styles.totalItemText}>
                  Total: R$ {valorTotalItem.toFixed(2)}
                </Text>
              )}
              {item.destino && <Text>Destino: {item.destino}</Text>}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 10 }}>Nenhum colheita registrada.</Text>}
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
  costText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    color: '#8c1515', 
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
  },
  totalItemText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#005500',
  },
  statusAtivo: {
    color: '#005500',
    fontWeight: 'bold',
  },
  statusFinalizado: {
    color: '#888',
    fontWeight: 'bold',
  },
  buttonWrapper: {
    marginBottom: 10,
  }
});

export default PlantioDetailScreen;