// src/screens/Dashboard/DashboardScreen.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

const getIconName = (name: string) => {
    switch (name) {
        case 'estufa': return 'greenhouse'; 
        case 'insumo': return 'flask-outline'; 
        case 'fornecedor': return 'truck-delivery-outline'; 
        case 'finance': return 'cash-register'; 
        case 'cliente': return 'account-group';
        default: return 'arrow-right';
    }
}

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();

  const handleNavigate = (screen: string) => () => navigation.navigate(screen);

  const ActionCard = ({ title, iconName, onPress }: { title: string, iconName: string, onPress: () => void }) => (
      <TouchableOpacity style={styles.actionCard} onPress={onPress}>
          <MaterialCommunityIcons name={getIconName(iconName) as any} size={36} color="#4CAF50" style={styles.actionIcon} />
          <Text style={styles.actionText}>{title}</Text>
      </TouchableOpacity>
  );
  
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        
        {/* Cabeçalho Simples */}
        <View style={styles.headerContainer}>
            <Text style={styles.welcome}>Olá, {user?.name || 'Produtor'}!</Text>
            <Text style={styles.subWelcome}>O que vamos fazer hoje?</Text>
        </View>

        {/* Grade de Ações */}
        <View style={styles.actionsGrid}>
          <ActionCard title="Gestão de Vendas" iconName="finance" onPress={handleNavigate('VendasList')} />
          <ActionCard title="Meus Clientes" iconName="cliente" onPress={handleNavigate('ClientesList')} />
          
          <ActionCard title="Minhas Estufas" iconName="estufa" onPress={handleNavigate('EstufasList')} />
          <ActionCard title="Meus Insumos" iconName="insumo" onPress={handleNavigate('InsumosList')} />
          <ActionCard title="Fornecedores" iconName="fornecedor" onPress={handleNavigate('FornecedoresList')} />
        </View>

        {/* Botão Sair */}
        <View style={styles.footerContainer}>
          <TouchableOpacity 
              onPress={() => auth.signOut()}
              style={styles.signOutButton}
          >
              <Text style={styles.signOutText}>SAIR DO APLICATIVO</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { 
    flex: 1, 
    backgroundColor: '#FAFAFA' 
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  
  // Cabeçalho
  headerContainer: {
    width: '100%',
    marginBottom: 30,
    marginTop: 10,
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subWelcome: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  
  // Grade de Ações
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  actionCard: {
    width: '48%', // 2 colunas
    aspectRatio: 1.1, // Mantém o cartão levemente quadrado/retangular
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    // Sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3, 
  },
  actionIcon: {
      marginBottom: 10,
  },
  actionText: {
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
      color: '#444',
  },

  // Rodapé
  footerContainer: {
    width: '100%',
    marginTop: 'auto', // Empurra para o final se houver espaço
    marginBottom: 20,
  },
  signOutButton: {
      backgroundColor: '#fff', 
      borderWidth: 1,
      borderColor: '#d9534f',
      padding: 15,
      borderRadius: 10,
      width: '100%',
      alignItems: 'center',
  },
  signOutText: {
      color: '#d9534f',
      fontWeight: 'bold',
      fontSize: 14,
  }
});

export default DashboardScreen;