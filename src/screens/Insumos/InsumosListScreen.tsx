// src/screens/Insumos/InsumosListScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Button, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator,
  TouchableOpacity // Importar
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { listInsumos } from '../../services/insumoService';
import { Insumo } from '../../types/domain';
import { useIsFocused } from '@react-navigation/native';

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

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={styles.container}>
      <Button
        title="Adicionar Novo Insumo"
        onPress={() => navigation.navigate('InsumoForm', { insumoId: null })} // Navega sem ID
      />
      
      <FlatList
        data={insumos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          // ****** ITEM AGORA É CLICÁVEL ******
          <TouchableOpacity 
            style={[styles.item, estaEmAlerta(item) && styles.itemAlerta]}
            onPress={() => navigation.navigate('InsumoForm', { insumoId: item.id })} // Navega com ID para Editar
          >
            <Text style={styles.itemTitle}>{item.nome}</Text>
            <Text>Tipo: {item.tipo}</Text>
            <Text>Estoque: {item.estoqueAtual} {item.unidadePadrao}</Text>
            {estaEmAlerta(item) && (
              <Text style={styles.alertaText}>Estoque baixo! (Mínimo: {item.estoqueMinimo})</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhum insumo cadastrado.</Text>}
        onRefresh={carregarInsumos}
        refreshing={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemAlerta: {
    borderColor: '#d9534f',
    borderWidth: 2,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertaText: {
    color: '#d9534f',
    fontWeight: 'bold',
    marginTop: 5,
  }
});

export default InsumosListScreen;