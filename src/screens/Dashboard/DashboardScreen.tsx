// src/screens/Dashboard/DashboardScreen.tsx
import React from 'react';
import { View, Text, Button } from 'react-native';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';

// Importe o 'navigation' para podermos navegar
const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Bem-vindo, {user?.name || 'Usuário'}!</Text>
      <Text>Dashboard (Em breve)</Text>
      
      <View style={{ marginVertical: 20, width: '80%' }}>
        
        {/* BOTÃO ATUALIZADO */}
        <Button 
          title="Minhas Estufas" 
          onPress={() => navigation.navigate('EstufasList')} 
        />

        {/* <Button title="Novo Plantio" onPress={() => {}} /> */}
        {/* <Button title="Nova Colheita" onPress={() => {}} /> */}
      
      </View>

      <Button title="Sair" onPress={() => auth.signOut()} />
    </View>
  );
};

export default DashboardScreen;