// src/screens/Dashboard/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, ViewStyle } from 'react-native';
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useIsFocused } from '@react-navigation/native';
import { Insumo } from '../../types/domain';
import { listInsumosEmAlerta } from '../../services/insumoService';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { getGlobalStats, GlobalStatsResult } from '../../services/globalStatsService';
import Card from '../../components/Card'; 

// Mapeia nomes das ações para os ícones MaterialCommunityIcons
const getIconName = (name: string) => {
    switch (name) {
        case 'estufa': return 'greenhouse'; 
        case 'insumo': return 'flask-outline'; 
        case 'fornecedor': return 'truck-delivery-outline'; 
        case 'alerta': return 'alert-octagon-outline'; 
        default: return 'arrow-right';
    }
}

const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  
  const [alertas, setAlertas] = useState<Insumo[]>([]);
  const [stats, setStats] = useState<GlobalStatsResult | null>(null); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [listaAlertas, globalStats] = await Promise.all([
            listInsumosEmAlerta(user.uid),
            getGlobalStats(user.uid), 
        ]);
        
        setAlertas(listaAlertas);
        setStats(globalStats); 
      } catch (e: any) { 
          // CORREÇÃO FINAL E ROBUSTA: Garante que o log seja sempre uma string.
          const message = e ? (e.message || String(e)) : "Erro no Promise.all (verifique serviços internos).";
          console.error(`Erro ao carregar Dashboard: ${message}`);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      loadData();
    }
  }, [isFocused, user]);

  const handleNavigate = (screen: string) => () => navigation.navigate(screen);

  // Componente reutilizável para Ações Rápidas (Grid Item)
  const ActionCard = ({ title, iconName, onPress }: { title: string, iconName: string, onPress: () => void }) => (
      <TouchableOpacity style={styles.actionCard} onPress={onPress}>
          <MaterialCommunityIcons name={getIconName(iconName) as any} size={30} color="#4CAF50" style={styles.actionIcon} />
          <Text style={styles.actionText}>{title}</Text>
      </TouchableOpacity>
  );
  
  const isLucroPositivo = stats?.lucroTotal ? stats.lucroTotal >= 0 : true;

  return (
    <ScrollView style={styles.scrollView}>
    <View style={styles.container}>
      <Text style={styles.welcome}>Bem-vindo, {user?.name || 'Usuário'}!</Text>
      
      {/* CARD: MÉTRICAS GLOBAIS - Usando Card Componente */}
      {loading ? (
        <ActivityIndicator size="small" color="#4CAF50" style={{ marginBottom: 20 }}/>
      ) : (
        stats && (
            <Card style={[styles.statsCard, isLucroPositivo ? styles.lucroPositivo : styles.lucroNegativo]}>
                <Text style={styles.statsTitle}>
                    <MaterialCommunityIcons name="finance" size={20} color="#333" /> Lucro Bruto Global
                </Text>
                
                <Text style={styles.lucroTotalValue}>
                    R$ {stats.lucroTotal.toFixed(2)}
                </Text>
                
                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Receita: </Text>
                    <Text style={[styles.statsValue, styles.statsReceita]}>+ R$ {stats.totalReceita.toFixed(2)}</Text>
                </View>
                <View style={styles.statsRow}>
                    <Text style={styles.statsLabel}>Custo Total: </Text>
                    <Text style={[styles.statsValue, styles.statsCusto]}>- R$ {stats.totalCusto.toFixed(2)}</Text>
                </View>
                <Text style={styles.statsCount}>{stats.totalPlantios} Plantios Calculados</Text>
            </Card>
        )
      )}


      {/* Seção de Ações Rápidas */}
      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.actionsGrid}>
        <ActionCard title="Minhas Estufas" iconName="estufa" onPress={handleNavigate('EstufasList')} />
        <ActionCard title="Meus Insumos" iconName="insumo" onPress={handleNavigate('InsumosList')} />
        <ActionCard title="Fornecedores" iconName="fornecedor" onPress={handleNavigate('FornecedoresList')} />
      </View>

      {/* CARD: ALERTAS DE INSUMOS - Usando Card Componente */}
      <Card style={styles.alertCard}>
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
      </Card>

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

// REMOVIDO: BaseCardStyle, pois o Card Componente faz o trabalho

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
  
  // Estilo Base de Títulos (reutilizado)
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
  
  // CARD: ALERTAS (Apenas overrides de cor e borda)
  alertCard: {
    borderColor: '#FF9800', 
    borderWidth: 2,
    backgroundColor: '#FFFBE5', 
    flex: 1, 
    minHeight: 150,
  },
  alertTitle: {
    color: '#D32F2F', 
    borderBottomWidth: 1,
    borderBottomColor: '#FF9800',
    paddingBottom: 10,
  },
  
  // CARD: ESTATÍSTICAS GLOBAIS (Apenas overrides de cor e layout)
  statsCard: {
      borderLeftWidth: 5,
      paddingVertical: 15,
      alignItems: 'center',
  },
  statsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 10,
  },
  lucroTotalValue: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 15,
  },
  lucroPositivo: {
      backgroundColor: '#E8F5E9',
      borderColor: '#C8E6C9',
      color: '#006400',
  },
  lucroNegativo: {
      backgroundColor: '#FFEBEE',
      borderColor: '#FFCDD2',
      color: '#D32F2F',
  },
  statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '80%',
  },
  statsLabel: {
      fontSize: 14,
      color: '#555',
  },
  statsValue: {
      fontSize: 14,
      fontWeight: 'bold',
  },
  statsReceita: {
      color: '#006400',
  },
  statsCusto: {
      color: '#D32F2F',
  },
  statsCount: {
      fontSize: 12,
      color: '#888',
      marginTop: 10,
  },
  
  // Ações (Grid)
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

  // Estilos de Alerta Internos
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