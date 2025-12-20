// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './src/contexts/AuthContext'; 

// --- TELAS QUE TEMOS CERTEZA QUE EXISTEM ---
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';

// Se essas telas existirem, descomente. Se não, deixe assim por enquanto.
import ColheitaFormScreen from './src/screens/Colheitas/ColheitaFormScreen';
import VendasListScreen from './src/screens/Colheitas/VendasListScreen'; 
import ContasReceberScreen from './src/screens/Financeiro/ContasReceberScreen';

// IMPORTANTE: Comentei estas linhas para o app não quebrar se os arquivos não existirem
// import EstufaFormScreen from './src/screens/Estufas/EstufaFormScreen';
// import EstufasListScreen from './src/screens/Estufas/EstufasListScreen';
// import PlantioFormScreen from './src/screens/Plantios/PlantioFormScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AuthProvider>
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                
                {/* 1. AUTENTICAÇÃO */}
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />

                {/* 2. DASHBOARD */}
                <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />

                {/* 3. VENDAS E FINANCEIRO (Verifique se os arquivos existem!) */}
                <Stack.Screen name="ColheitaForm" component={ColheitaFormScreen} options={{ title: 'Registrar Venda' }} />
                <Stack.Screen name="VendasList" component={VendasListScreen} options={{ title: 'Relatório' }} />
                <Stack.Screen 
                    name="ContasReceber" 
                    component={ContasReceberScreen}
                    options={{ title: 'Contas a Receber', headerStyle: { backgroundColor: '#B45309' }, headerTintColor: '#FFF' }} 
                />

                {/* 4. TELAS EXTRAS (Descomente APENAS se tiver criado os arquivos) */}
                {/* <Stack.Screen name="EstufaForm" component={EstufaFormScreen} />
                <Stack.Screen name="EstufasList" component={EstufasListScreen} />
                <Stack.Screen name="PlantioForm" component={PlantioFormScreen} /> 
                */}

            </Stack.Navigator>
        </NavigationContainer>
    </AuthProvider>
  );
}