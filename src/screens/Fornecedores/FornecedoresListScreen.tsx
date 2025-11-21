// src/screens/Fornecedores/FornecedoresListScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity 
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listFornecedores } from '../../services/fornecedorService';
import { Fornecedor } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

const FornecedoresListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused(); 

  const carregarFornecedores = async () => {
    if (user) {
      setLoading(true);
      try {
        const lista = await listFornecedores(user.uid);
        setFornecedores(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      carregarFornecedores();
    }
  }, [isFocused, user]);

  if (loading && fornecedores.length === 0) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <View style={styles.fullContainer}>
      
      <FlatList
        data={fornecedores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // Estilo de Card com ícones para detalhes
          <TouchableOpacity 
            style={styles.cardItem}
            onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: item.id })}
          >
            <View style={styles.cardHeader}>
                <Text style={styles.itemTitle}>{item.nome}</Text>
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#007bff" />
            </View>

            {item.contato && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="account-box-outline" size={16} color="#555" />
                <Text style={styles.detailText}>{item.contato}</Text>
              </View>
            )}
            
            {item.telefone && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="phone-outline" size={16} color="#555" />
                <Text style={styles.detailText}>{item.telefone}</Text>
              </View>
            )}
            
            {item.email && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="email-outline" size={16} color="#555" />
                <Text style={styles.detailText}>{item.email}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum fornecedor cadastrado.</Text>
            </View>
          ) : null
        }
        onRefresh={carregarFornecedores}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
      />
      
      {/* FAB Customizado para Adicionar Fornecedor */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('FornecedorForm', { fornecedorId: null })}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      
    </View>
  );
};

// ESTILOS PARA DESIGN PROFISSIONAL
const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Fundo claro
  },
  listContent: {
    padding: 10,
    paddingBottom: 80, // Espaço extra para o FAB
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estilo de Card para o item da lista
  cardItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12, // Mais arredondado
    // Sombra para efeito flutuante (Material Design)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800', // Cor de destaque lateral
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Detalhes com ícones
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  
  // Lista Vazia
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },

  // Floating Action Button (FAB) Customizado
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#4CAF50', // Verde Primário
    borderRadius: 30,
    // Sombra mais forte para destaque
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default FornecedoresListScreen;