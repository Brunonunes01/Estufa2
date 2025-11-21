// src/screens/Estufas/EstufaDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  Alert,
  TouchableOpacity,
  Platform, 
  ScrollView 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Estufa, Plantio } from '../../types/domain';
import { getEstufaById, deleteEstufa } from '../../services/estufaService'; 
import { listPlantiosByEstufa } from '../../services/plantioService';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

const EstufaDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { estufaId, estufaNome } = route.params;
  
  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFocused = useIsFocused(); 
  
  // SENHA DE SEGURANÇA FIXA
  const DELETE_PASSWORD = "8899";

  const getStatusVisuals = (status: 'ativa' | 'manutencao' | 'desativada') => {
      switch (status) {
          case 'ativa':
              return { color: '#4CAF50', icon: 'check-circle-outline', text: 'Ativa' };
          case 'manutencao':
              return { color: '#FF9800', icon: 'tools', text: 'Manutenção' };
          case 'desativada':
              return { color: '#D32F2F', icon: 'close-circle-outline', text: 'Desativada' };
          default:
              return { color: '#888', icon: 'information-outline', text: 'Desconhecido' };
      }
  };


  useEffect(() => {
    navigation.setOptions({ title: estufaNome || 'Detalhes da Estufa' });

    const carregarDados = async () => {
      if (!user || !estufaId) return;
      setLoading(true);
      try {
        const dadosEstufa = await getEstufaById(estufaId);
        setEstufa(dadosEstufa);
        const listaPlantios = await listPlantiosByEstufa(user.uid, estufaId);
        setPlantios(listaPlantios);
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    };
    
    if (isFocused) {
      carregarDados();
    }
  }, [estufaId, user, isFocused, estufaNome, navigation]); 

  // FUNÇÃO DE EXCLUSÃO
  const handleDeleteEstufa = () => {
    if (!estufa) return;

    if (plantios.length > 0) {
      Alert.alert(
        "Atenção",
        "Existem plantios associados a esta estufa. Deletar a estufa não deletará os plantios associados. Confirma a exclusão?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Continuar Exclusão", onPress: promptForPassword, style: "destructive" },
        ]
      );
    } else {
      promptForPassword();
    }
  };

  // Pede a senha usando o Alert.prompt
  const promptForPassword = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Alert.prompt(
        "Confirmação de Exclusão",
        `Digite a senha de exclusão (${DELETE_PASSWORD}) para confirmar:`,
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Excluir", 
            style: "destructive", 
            onPress: (password: string | undefined) => { 
              executeDelete(password);
            } 
          },
        ],
        'secure-text'
      );
    } else {
      const password = prompt(`Digite a senha de exclusão (${DELETE_PASSWORD}) para confirmar:`);
      executeDelete(password);
    }
  };

  const executeDelete = async (password: string | null | undefined) => {
    if (!estufaId) return;

    if (!password || password.trim() !== DELETE_PASSWORD) {
      Alert.alert("Erro", "Senha incorreta. A exclusão foi cancelada.");
      return;
    }

    setLoading(true);
    try {
      await deleteEstufa(estufaId);
      Alert.alert("Sucesso", "Estufa excluída com sucesso!");
      navigation.navigate('EstufasList'); 
    } catch (error) {
      Alert.alert("Erro", "Não foi possível excluir a estufa. Verifique o console para detalhes.");
      setLoading(false);
    }
  };
  
  if (loading) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  if (!estufa) {
    return <View style={styles.centered}><Text>Estufa não encontrada.</Text></View>;
  }
  
  const statusVisuals = getStatusVisuals(estufa.status);
  
  // Renderiza a tela
  return (
    <View style={styles.fullContainer}>
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}> 
      
      {/* Seção 1: Detalhes da Estufa (Card) */}
      <View style={[styles.card, { borderLeftColor: statusVisuals.color }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{estufa.nome}</Text>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('EstufaForm', { estufaId: estufa.id })}
            style={styles.editButton}
          >
            <MaterialCommunityIcons name="pencil-outline" size={20} color="#007bff" />
            <Text style={styles.editButtonText}>Editar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusBox}>
            <MaterialCommunityIcons 
                name={statusVisuals.icon as any} 
                size={20} 
                color={statusVisuals.color} 
            />
            <Text style={[styles.statusText, { color: statusVisuals.color }]}>
                Status: {statusVisuals.text}
            </Text>
        </View>
        
        <View style={styles.detailRow}>
            <MaterialCommunityIcons name="ruler-square" size={16} color="#555" />
            <Text style={styles.detailText}>Área Total: {estufa.areaM2.toFixed(2)} m²</Text>
        </View>
        
        <View style={styles.detailRow}>
            <MaterialCommunityIcons name="tape-measure" size={16} color="#555" />
            <Text style={styles.detailText}>Medidas: {estufa.comprimentoM}m x {estufa.larguraM}m x {estufa.alturaM}m</Text>
        </View>

      </View>

      {/* Seção 2: Ações - Adicionar Plantio */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
            style={styles.addPlantioButton}
            onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}
        >
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
            <Text style={styles.addPlantioButtonText}>Adicionar Novo Plantio</Text>
        </TouchableOpacity>
      </View>

      {/* Seção 3: Lista de Plantios (Card) */}
      <View style={styles.plantioListCard}>
        <Text style={styles.sectionTitle}>Plantios nesta Estufa ({plantios.length})</Text>
        <FlatList
          data={plantios}
          keyExtractor={(item) => item.id}
          // Desativa a rolagem da lista para evitar erro de aninhamento
          scrollEnabled={false} 
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.plantioItem}
              onPress={() => navigation.navigate('PlantioDetail', { plantioId: item.id })}
            >
                <View style={styles.plantioItemHeader}>
                    <Text style={styles.plantioTitle}>{item.cultura} ({item.variedade || 'N/A'})</Text>
                    <MaterialCommunityIcons 
                        name={item.status === 'finalizado' ? 'lock' : 'arrow-right-circle'} 
                        size={20} 
                        color={item.status === 'finalizado' ? '#888' : '#4CAF50'}
                    />
                </View>
                
                <Text style={styles.plantioDetailText}>
                    Qtd: {item.quantidadePlantada} {item.unidadeQuantidade}
                </Text>
                <Text style={styles.plantioDetailText}>
                    Início: {item.dataPlantio.toDate().toLocaleDateString()}
                </Text>

            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyPlantioText}>Nenhum plantio cadastrado nesta estufa.</Text>}
        />
      </View>

      {/* BOTÃO CRÍTICO: Deletar Estufa */}
      <View style={styles.deleteButtonContainer}>
        <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteEstufa}
            disabled={loading}
        >
             {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.deleteButtonText}>
                    DELETAR ESTUFA
                </Text>
            )}
        </TouchableOpacity>
      </View>
      
    </ScrollView>
    </View>
  );
};

// OBJETO BASE DO CARD (para reuso fora de StyleSheet.create)
const BaseCardStyle = {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
};

// ESTILOS PARA DESIGN PROFISSIONAL
const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
    padding: 10,
  },
  scrollContent: { 
    paddingBottom: 40
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // CARD PRINCIPAL (Detalhes da Estufa)
  card: {
    ...BaseCardStyle, // CORREÇÃO: Usa o spread do objeto base
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50', // Será sobreescrito pela cor do status
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },

  // Status Visual
  statusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      padding: 5,
      backgroundColor: '#f9f9f9',
      borderRadius: 4,
  },
  statusText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 5,
  },
  
  // Edição
  editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 6,
      backgroundColor: '#E3F2FD',
  },
  editButtonText: {
      color: '#007bff',
      fontWeight: 'bold',
      marginLeft: 5,
  },

  // Detalhes
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  detailText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 8,
  },

  // Ação Adicionar Plantio
  actionContainer: {
    marginBottom: 20,
  },
  addPlantioButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addPlantioButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },

  // LISTA DE PLANTIOS (Card)
  plantioListCard: {
    ...BaseCardStyle, // CORREÇÃO: Usa o spread do objeto base
    padding: 0, // Zera padding para que a lista o controle
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  plantioItem: {
    backgroundColor: '#fefefe',
    padding: 16,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  plantioItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  plantioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  plantioDetailText: {
    fontSize: 14,
    color: '#555',
  },
  emptyPlantioText: {
    textAlign: 'center',
    margin: 16,
    color: '#666',
    fontStyle: 'italic',
  },

  // BOTÃO DELETAR
  deleteButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  deleteButton: {
    backgroundColor: '#D32F2F', // Vermelho Crítico
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});

export default EstufaDetailScreen;