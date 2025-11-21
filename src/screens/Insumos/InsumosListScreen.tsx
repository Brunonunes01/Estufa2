// src/screens/Insumos/InsumosListScreen.tsx
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
import { listInsumos } from '../../services/insumoService';
import { Insumo } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones

// Mapeamento de tipos de insumos para ícones
const INSUMO_ICONS = {
  adubo: 'fertilizer',
  defensivo: 'spray-bottle',
  semente: 'seed-outline',
  outro: 'flask-empty-outline',
} as const;

// Função auxiliar para mapear o tipo de insumo a um ícone
const getInsumoIcon = (tipo: string) => {
  if (tipo in INSUMO_ICONS) {
    return INSUMO_ICONS[tipo as keyof typeof INSUMO_ICONS];
  }
  return INSUMO_ICONS.outro;
};


const InsumosListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused(); 

  const carregarInsumos = async () => {
    if (user) {
      setLoading(true);
      try {
        const lista = await listInsumos(user.uid);
        setInsumos(lista);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isFocused && user) {
      carregarInsumos();
    }
  }, [isFocused, user]);

  const estaEmAlerta = (item: Insumo) => {
    if (item.estoqueMinimo === null) return false;
    return item.estoqueAtual < item.estoqueMinimo;
  };

  if (loading && insumos.length === 0) {
    return <ActivityIndicator size="large" style={styles.centered} />;
  }

  return (
    <View style={styles.fullContainer}>
      
      <FlatList
        data={insumos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // Card com estilo condicional para alerta
          <TouchableOpacity 
            style={[
              styles.cardItem, 
              estaEmAlerta(item) ? styles.itemAlerta : styles.itemNormal
            ]}
            onPress={() => navigation.navigate('InsumoForm', { insumoId: item.id })}
          >
            <View style={styles.cardHeader}>
                {/* CORREÇÃO FINAL APLICADA: Uso de 'as any' para resolver o erro TS2322 */}
                <MaterialCommunityIcons 
                    name={getInsumoIcon(item.tipo) as any} 
                    size={24} 
                    color={estaEmAlerta(item) ? '#d9534f' : '#4CAF50'} // Cor do ícone baseada no status
                />
                <Text style={styles.itemTitle}>{item.nome}</Text>
            </View>

            <View style={styles.detailRow}>
                <Text style={styles.detailText}>
                    Tipo: <Text style={styles.detailValue}>{item.tipo.toUpperCase()}</Text>
                </Text>
            </View>
            
            <View style={styles.stockRow}>
                <Text style={styles.stockLabel}>Estoque Atual:</Text>
                <Text style={[
                    styles.stockValue, 
                    estaEmAlerta(item) && styles.alertaText
                ]}>
                    {item.estoqueAtual.toFixed(2)} {item.unidadePadrao}
                </Text>
            </View>

            {estaEmAlerta(item) && (
              <Text style={styles.minimoText}>
                {item.estoqueMinimo && `⚠️ Mínimo: ${item.estoqueMinimo} ${item.unidadePadrao}`}
              </Text>
            )}
            
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhum insumo cadastrado.</Text>
            </View>
          ) : null
        }
        onRefresh={carregarInsumos}
        refreshing={loading}
        contentContainerStyle={styles.listContent}
      />
      
      {/* FAB Customizado para Adicionar Insumo */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('InsumoForm', { insumoId: null })}
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
  
  // Estilos de Card
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
  },
  itemNormal: {
    borderLeftWidth: 5,
    borderLeftColor: '#4CAF50', // Verde para status normal
  },
  itemAlerta: {
    borderWidth: 2,
    borderColor: '#d9534f', // Borda vermelha para alerta
    backgroundColor: '#fdebeb', // Fundo suave para alerta
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  
  // Detalhes
  detailRow: {
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
  },
  detailValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Linha de Estoque
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  stockLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  stockValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#006400', // Verde escuro para estoque
  },
  
  // Estilos de Alerta
  alertaText: {
    color: '#d9534f',
  },
  minimoText: {
    color: '#d9534f',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 5,
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

export default InsumosListScreen;