// src/screens/Dashboard/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useIsFocused } from '@react-navigation/native';
import { Insumo } from '../../types/domain';
import { listInsumosEmAlerta } from '../../services/insumoService';

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  
  const [alertas, setAlertas] = useState<Insumo[]>([]);
  // O 'loading' começa como true
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const carregarAlertas = async () => {
      // *** AQUI ESTÁ A CORREÇÃO ***
      if (!user) {
        // Se o 'user' ainda é 'null' (carregando do AuthContext),
        // apenas paramos o 'loading' do Dashboard e esperamos.
        // O useEffect vai rodar de novo quando o 'user' chegar.
        setLoading(false);
        return;
      }

      // Se chegamos aqui, temos um usuário.
      // Então, ativamos o 'loading' para a busca no banco.
      setLoading(true);
      const listaAlertas = await listInsumosEmAlerta(user.uid);
      setAlertas(listaAlertas);
      setLoading(false); // Terminamos a busca
    };

    // Só roda se a tela estiver em foco
    if (isFocused) {
      carregarAlertas();
    }
  }, [isFocused, user]); // Depende do foco E do usuário

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bem-vindo, {user?.name || 'Usuário'}!</Text>
      
      {/* Seção de Ações Rápidas */}
      <View style={styles.box}>
        <Text style={styles.boxTitle}>Ações Rápidas</Text>
        
        <View style={styles.buttonWrapper}>
          <Button 
            title="Minhas Estufas" 
            onPress={() => navigation.navigate('EstufasList')} 
          />
        </View>

        <View style={styles.buttonWrapper}>
          <Button 
            title="Meus Insumos" 
            onPress={() => navigation.navigate('InsumosList')} 
          />
        </View>

        <View style={styles.buttonWrapper}>
          <Button 
            title="Meus Fornecedores" 
            onPress={() => navigation.navigate('FornecedoresList')} 
          />
        </View>
      </View>

      {/* Seção de Alertas de Insumos */}
      <View style={[styles.box, styles.alertBox]}>
        <Text style={[styles.boxTitle, styles.alertTitle]}>Alertas de Estoque</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={alertas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.alertaItem}>
                <Text style={styles.alertaNome}>{item.nome}</Text>
                <Text style={styles.alertaDetalhe}>
                  Estoque: {item.estoqueAtual} {item.unidadePadrao} (Mínimo: {item.estoqueMinimo})
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center' }}>Nenhum alerta de estoque.</Text>}
          />
        )}
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title="Sair" onPress={() => auth.signOut()} color="#d9534f" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  box: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  boxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  buttonWrapper: {
    marginVertical: 5,
  },
  // Estilos para a caixa de Alertas
  alertBox: {
    flex: 1, // Faz a caixa ocupar o espaço restante
    minHeight: 150,
  },
  alertTitle: {
    color: '#d9534f', // Vermelho
  },
  alertaItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  alertaNome: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertaDetalhe: {
    color: '#555',
  }
});

export default DashboardScreen;