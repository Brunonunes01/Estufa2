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
  Platform, // Para melhor compatibilidade com Alert.prompt
  ScrollView // Para permitir rolagem e acessar o botão Deletar
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Estufa, Plantio } from '../../types/domain';
import { getEstufaById, deleteEstufa } from '../../services/estufaService'; 
import { listPlantiosByEstufa } from '../../services/plantioService';
import { useIsFocused } from '@react-navigation/native';

const EstufaDetailScreen = ({ route, navigation }: any) => {
  const { user } = useAuth();
  const { estufaId, estufaNome } = route.params;
  
  const [estufa, setEstufa] = useState<Estufa | null>(null);
  const [plantios, setPlantios] = useState<Plantio[]>([]);
  const [loading, setLoading] = useState(true);
  
  const isFocused = useIsFocused(); 
  
  // SENHA DE SEGURANÇA FIXA
  const DELETE_PASSWORD = "8899";

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
  }, [estufaId, user, isFocused]); 

  // FUNÇÃO DE EXCLUSÃO
  const handleDeleteEstufa = () => {
    if (!estufa) return;

    // 1. Confirmação inicial (se houver plantios)
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

  // Pede a senha usando o Alert.prompt (Tipagem CORRIGIDA)
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
            onPress: (password: string | undefined) => { // TIPO EXPLÍCITO AQUI
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
      console.log('Iniciando exclusão da estufa:', estufaId);
      await deleteEstufa(estufaId);
      console.log('Exclusão concluída. Navegando para lista.');

      Alert.alert("Sucesso", "Estufa excluída com sucesso!");
      // Volta para a lista de estufas
      navigation.navigate('EstufasList'); 
    } catch (error) {
      console.error('ERRO CRÍTICO NA EXCLUSÃO:', error); 
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

  // Renderiza a tela
  return (
    // CORRIGIDO: Container principal agora é ScrollView
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}> 
      
      {/* Seção 1: Detalhes da Estufa */}
      <View style={styles.detailBox}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>Dados da Estufa</Text>
          
          <Button 
            title="Editar" 
            onPress={() => navigation.navigate('EstufaForm', { estufaId: estufa.id })}
          />
        </View>

        <Text>Área: {estufa.areaM2} m²</Text>
        <Text>Medidas (CxLxA): {estufa.comprimentoM}m x {estufa.larguraM}m x {estufa.alturaM}m</Text>
        <Text>Status: {estufa.status}</Text>
      </View>

      {/* Seção 2: Ações */}
      <View style={{ marginBottom: 15 }}>
        <Button 
          title="Adicionar Novo Plantio"
          onPress={() => navigation.navigate('PlantioForm', { estufaId: estufa.id })}
        />
      </View>

      {/* Seção 3: Lista de Plantios */}
      <Text style={styles.title}>Plantios nesta Estufa</Text>
      <FlatList
        data={plantios}
        keyExtractor={(item) => item.id}
        // CORREÇÃO ESSENCIAL: Desativa a rolagem da lista para evitar erro de aninhamento
        scrollEnabled={false} 
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.plantioItem}
            onPress={() => navigation.navigate('PlantioDetail', { plantioId: item.id })}
          >
            <Text style={styles.plantioTitle}>{item.cultura} ({item.variedade || 'N/A'})</Text>
            <Text>Data: {item.dataPlantio.toDate().toLocaleDateString()}</Text>
            <Text>Qtd: {item.quantidadePlantada} {item.unidadeQuantidade}</Text>
            <Text>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', margin: 10 }}>Nenhum plantio cadastrado.</Text>}
        // Removemos o ListFooterComponent
      />

      {/* NOVO BOTÃO: Deletar Estufa */}
      <View style={styles.deleteButtonContainer}>
        <Button
          title="DELETAR ESTUFA"
          onPress={handleDeleteEstufa} 
          color="#d9534f"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  scrollContent: { 
    paddingBottom: 20
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
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
  },
  deleteButtonContainer: {
    marginTop: 20,
    marginBottom: 20,
  }
});

export default EstufaDetailScreen;