// src/screens/Estufas/EstufasListScreen.tsx
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
import { listEstufas } from '../../services/estufaService';
import { Estufa } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

// Mapeamento de cor e ícone para o status
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


const EstufasListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [estufas, setEstufas] = useState<Estufa[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused(); 

  const carregarEstufas = async () => {
    if (user) {
      setLoading(true);
      try {
        const lista = await listEstufas(user.uid);
        setEstufas(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      carregarEstufas();
    }
  }, [isFocused, user]);

  if (loading && estufas.length === 0) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <View style={styles.fullContainer}>
      
      <FlatList
        data={estufas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
            const statusVisuals = getStatusVisuals(item.status);
            
            return (
              // Estilo de Card com destaque na cor do status
              <TouchableOpacity 
                style={[
                  styles.cardItem,
                  { borderLeftColor: statusVisuals.color } // Destaque na borda
                ]}
                // Navega para o Detalhe, passando o ID e o Nome
                onPress={() => navigation.navigate('EstufaDetail', { 
                  estufaId: item.id,
                  estufaNome: item.nome 
                })}
              >
                
                <View style={styles.cardHeader}>
                    <Text style={styles.itemTitle}>{item.nome}</Text>
                    
                    {/* Status Visual com Ícone e Cor */}
                    <View style={styles.statusContainer}>
                        <MaterialCommunityIcons 
                            name={statusVisuals.icon as any} // 'as any' para evitar erro de tipagem rigorosa
                            size={16} 
                            color={statusVisuals.color}
                        />
                        <Text style={[styles.statusText, { color: statusVisuals.color }]}>
                            {statusVisuals.text}
                        </Text>
                    </View>
                </View>

                {/* Detalhes do Card */}
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="ruler-square" size={16} color="#555" />
                    <Text style={styles.detailText}>
                        Área: <Text style={styles.detailValue}>{item.areaM2.toFixed(2)} m²</Text>
                    </Text>
                </View>
                
                <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="flower-tulip-outline" size={16} color="#555" />
                    <Text style={styles.detailText}>
                        Medidas: {item.comprimentoM}m x {item.larguraM}m x {item.alturaM}m
                    </Text>
                </View>

              </TouchableOpacity>
            );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma estufa cadastrada. Comece agora!</Text>
            </View>
          ) : null
        }
        onRefresh={carregarEstufas}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
      />
      
      {/* FAB Customizado para Adicionar Nova Estufa */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('EstufaForm')}
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
    backgroundColor: '#FAFAFA', 
  },
  listContent: {
    padding: 10,
    paddingBottom: 80, 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Estilo de Card
  cardItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 12, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50', // Cor de destaque padrão (ativa)
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  itemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E8F5E9', // Fundo suave para o status
  },
  statusText: {
      fontSize: 12,
      fontWeight: 'bold',
      marginLeft: 4,
  },
  
  // Detalhes
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
  detailValue: {
    fontWeight: 'bold',
    color: '#333',
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
});

export default EstufasListScreen;