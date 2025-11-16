// src/screens/Dashboard/DashboardScreen.tsx
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bem-vindo, {user?.name || 'Usuário'}!</Text>
      
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

        {/* <View style={styles.buttonWrapper}>
          <Button title="Novo Plantio" onPress={() => {}} />
        </View>
        <View style={styles.buttonWrapper}>
          <Button title="Nova Colheita" onPress={() => {}} />
        </View>
        */}
      </View>

      <View style={{ marginTop: 50 }}>
        <Button title="Sair" onPress={() => auth.signOut()} color="#d9534f" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  box: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  boxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonWrapper: {
    marginVertical: 5,
  }
});

export default DashboardScreen;