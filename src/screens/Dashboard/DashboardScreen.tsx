// src/screens/Dashboard/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, ViewStyle } from 'react-native'; // NOVO IMPORT: ViewStyle
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useIsFocused } from '@react-navigation/native';
import { Insumo } from '../../types/domain';
import { listInsumosEmAlerta } from '../../services/insumoService';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Ícones Vetoriais

// Mapeia nomes das ações para os ícones MaterialCommunityIcons
const getIconName = (name: string) => {
    switch (name) {
        case 'estufa': return 'greenhouse'; // Estufas
        case 'insumo': return 'flask-outline'; // Insumos
        case 'fornecedor': return 'truck-delivery-outline'; // Fornecedores
        case 'alerta': return 'alert-octagon-outline'; // Alertas
        default: return 'arrow-right';
    }
}

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  
  const [alertas, setAlertas] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const carregarAlertas = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const listaAlertas = await listInsumosEmAlerta(user.uid);
      setAlertas(listaAlertas);
      setLoading(false);
    };

    if (isFocused) {
      carregarAlertas();
    }
  }, [isFocused, user]);

  const handleNavigate = (screen: string) => () => navigation.navigate(screen);

  // Componente reutilizável para Ações Rápidas (Card)
  const ActionCard = ({ title, iconName, onPress }: { title: string, iconName: string, onPress: () => void }) => (
      <TouchableOpacity style={styles.actionCard} onPress={onPress}>
          <MaterialCommunityIcons name={getIconName(iconName) as any} size={30} color="#4CAF50" style={styles.actionIcon} />
          <Text style={styles.actionText}>{title}</Text>
      </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.scrollView}>
    <View style={styles.container}>
      <Text style={styles.welcome}>Bem-vindo, {user?.name || 'Usuário'}!</Text>
      
      {/* Seção de Ações Rápidas - Layout de Grid */}
      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.actionsGrid}>
        <ActionCard title="Minhas Estufas" iconName="estufa" onPress={handleNavigate('EstufasList')} />
        <ActionCard title="Meus Insumos" iconName="insumo" onPress={handleNavigate('InsumosList')} />
        <ActionCard title="Fornecedores" iconName="fornecedor" onPress={handleNavigate('FornecedoresList')} />
      </View>

      {/* Seção de Alertas de Insumos */}
      <View style={styles.alertCard}>
        <Text style={[styles.boxTitle, styles.alertTitle]}>
            <MaterialCommunityIcons name={getIconName('alerta') as any} size={20} color="#D32F2F" /> Alertas de Estoque ({alertas.length})
        </Text>
        {loading ? (
          <ActivityIndicator color="#D32F2F" />
        ) : (
          alertas.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum alerta de estoque. Tudo certo!</Text>
          ) : (
            alertas.map((item) => (
              <View key={item.id} style={styles.alertaItem}>
                <Text style={styles.alertaNome}>{item.nome}</Text>
                <Text style={styles.alertaDetalhe}>
                  Estoque: {item.estoqueAtual} {item.unidadePadrao} (Mínimo: {item.estoqueMinimo})
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('InsumoForm', { insumoId: item.id })}>
                    <Text style={styles.actionLink}>Ajustar</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </View>

      <View style={{ marginTop: 20 }}>
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

// OBJETO BASE PARA REUTILIZAÇÃO DE ESTILOS (CASTING CORRIGIDO)
const BaseCardStyle: ViewStyle = {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
    marginBottom: 20,
};

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#FAFAFA' },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 10,
    color: '#333',
  },
  
  // CARD BASE - USANDO SPREAD
  card: { 
    ...BaseCardStyle, 
  },
  boxTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  
  // Ações
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  actionCard: {
    width: '30%', 
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, 
  },
  actionIcon: {
      marginBottom: 5,
  },
  actionText: {
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#555',
  },

  // Estilos para a caixa de Alertas (REPLICA PROPRIEDADES DO CARD BASE)
  alertCard: {
    width: '100%',
    backgroundColor: '#FFFBE5', 
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, 
    marginBottom: 20,
    
    // Estilos Específicos do Alerta
    borderColor: '#FF9800', 
    borderWidth: 2,
    flex: 1, 
    minHeight: 150,
  },
  alertTitle: {
    color: '#D32F2F', 
    borderBottomWidth: 1,
    borderBottomColor: '#FF9800',
    paddingBottom: 10,
  },
  alertaItem: {
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2', 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  alertaNome: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 2,
  },
  alertaDetalhe: {
    color: '#856404',
    flex: 3,
    fontSize: 13,
  },
  actionLink: {
      color: '#4CAF50',
      fontWeight: 'bold',
      fontSize: 14,
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#666',
    padding: 10
  },

  signOutButton: {
      backgroundColor: '#d9534f', 
      padding: 12,
      borderRadius: 8,
      width: '100%',
  },
  signOutText: {
      color: '#fff',
      fontWeight: 'bold',
      textAlign: 'center',
      fontSize: 16,
  }
});

export default DashboardScreen;