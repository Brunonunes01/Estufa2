// src/screens/Dashboard/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Necessário para trocar de conta
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useIsFocused } from '@react-navigation/native';
import { Insumo } from '../../types/domain';
import { listInsumosEmAlerta } from '../../services/insumoService';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { getGlobalStats, GlobalStatsResult } from '../../services/globalStatsService';
import Card from '../../components/Card'; 

const getIconName = (name: string) => {
    switch (name) {
        case 'estufa': return 'greenhouse'; 
        case 'insumo': return 'flask-outline'; 
        case 'fornecedor': return 'truck-delivery-outline'; 
        case 'finance': return 'cash-register'; 
        case 'cliente': return 'account-group';
        case 'share': return 'share-variant'; // NOVO
        default: return 'arrow-right';
    }
}

const DashboardScreen = ({ navigation }: any) => {
  // Pegamos o selectedTenantId e changeTenant do contexto
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const isFocused = useIsFocused();
  
  const [alertas, setAlertas] = useState<Insumo[]>([]);
  const [stats, setStats] = useState<GlobalStatsResult | null>(null); 
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const loadData = async () => {
      // IMPORTANTE: Agora usamos selectedTenantId em vez de user.uid
      if (!selectedTenantId) { 
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [listaAlertas, globalStats] = await Promise.all([
            listInsumosEmAlerta(selectedTenantId), // <-- USA O ID SELECIONADO
            getGlobalStats(selectedTenantId),      // <-- USA O ID SELECIONADO
        ]);
        
        setAlertas(listaAlertas);
        setStats(globalStats); 
      } catch (e: any) { 
          console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      loadData();
    }
  }, [isFocused, selectedTenantId]); // Recarrega se trocar de conta

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
        
        <View style={styles.headerContainer}>
            <Text style={styles.welcome}>Olá, {user?.name || 'Produtor'}!</Text>
            
            {/* SELETOR DE CONTA (Só aparece se tiver mais de uma conta disponível) */}
            {availableTenants.length > 1 && (
                <View style={styles.tenantSelector}>
                    <Text style={styles.tenantLabel}>Visualizando dados de:</Text>
                    <View style={styles.pickerWrapper}>
                        <Picker
                            selectedValue={selectedTenantId}
                            onValueChange={(itemValue) => changeTenant(itemValue)}
                            style={styles.picker}
                        >
                            {availableTenants.map(tenant => (
                                <Picker.Item key={tenant.uid} label={tenant.name} value={tenant.uid} />
                            ))}
                        </Picker>
                    </View>
                </View>
            )}
        </View>

        <View style={styles.actionsGrid}>
          <ActionCard title="Gestão de Vendas" iconName="finance" onPress={handleNavigate('VendasList')} />
          <ActionCard title="Meus Clientes" iconName="cliente" onPress={handleNavigate('ClientesList')} />
          
          <ActionCard title="Minhas Estufas" iconName="estufa" onPress={handleNavigate('EstufasList')} />
          <ActionCard title="Meus Insumos" iconName="insumo" onPress={handleNavigate('InsumosList')} />
          <ActionCard title="Fornecedores" iconName="fornecedor" onPress={handleNavigate('FornecedoresList')} />
          
          {/* Botão para ir para a tela de Compartilhar */}
          <ActionCard title="Compartilhar Conta" iconName="share" onPress={handleNavigate('ShareAccount')} />
        </View>

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
  scrollView: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, padding: 20, alignItems: 'center' },
  
  headerContainer: { width: '100%', marginBottom: 20, marginTop: 10 },
  welcome: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  
  // Estilos do Seletor de Conta
  tenantSelector: { marginTop: 15, backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#2196F3' },
  tenantLabel: { fontSize: 12, color: '#2196F3', fontWeight: 'bold', marginBottom: 5 },
  pickerWrapper: { backgroundColor: '#fff', borderRadius: 5, height: 40, justifyContent: 'center' },
  picker: { height: 40, width: '100%' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  actionCard: { width: '48%', aspectRatio: 1.1, backgroundColor: '#fff', padding: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#eee', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  actionIcon: { marginBottom: 10 },
  actionText: { fontSize: 14, fontWeight: '600', textAlign: 'center', color: '#444' },

  footerContainer: { width: '100%', marginTop: 'auto', marginBottom: 20 },
  signOutButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9534f', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  signOutText: { color: '#d9534f', fontWeight: 'bold', fontSize: 14 }
});

export default DashboardScreen;