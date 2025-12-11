// src/screens/Dashboard/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { getGlobalStats, GlobalStatsResult } from '../../services/globalStatsService';

// --- TEMA ---
const COLORS = {
  primary: '#059669',
  background: '#F3F4F6',
  card: '#FFFFFF',
  textDark: '#1F2937',
  danger: '#EF4444',
};

const getIconName = (name: string) => {
    switch (name) {
        case 'estufa': return 'greenhouse'; 
        case 'insumo': return 'flask-outline'; 
        case 'fornecedor': return 'truck-delivery-outline'; 
        case 'finance': return 'cash-multiple'; 
        case 'cliente': return 'account-group';
        case 'share': return 'share-variant'; 
        case 'despesa': return 'cash-minus'; // NOVO
        default: return 'arrow-right';
    }
}

const DashboardScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const isFocused = useIsFocused();
  
  const [stats, setStats] = useState<GlobalStatsResult | null>(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const targetId = selectedTenantId || user?.uid;
      if (!targetId) { 
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const globalStats = await getGlobalStats(targetId);
        setStats(globalStats); 
      } catch (e) { 
          console.error(e);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) loadData();
  }, [isFocused, selectedTenantId]);

  const handleNavigate = (screen: string) => navigation.navigate(screen);

  const ActionCard = ({ title, iconName, onPress, color = COLORS.primary }: any) => (
      <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
            <MaterialCommunityIcons name={getIconName(iconName) as any} size={28} color={color} />
          </View>
          <Text style={styles.actionText}>{title}</Text>
          <View style={styles.arrowContainer}>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#D1D5DB" />
          </View>
      </TouchableOpacity>
  );
  
  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
            <View>
                <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0] || 'Produtor'}!</Text>
                <Text style={styles.subGreeting}>Gestão Financeira & Produção</Text>
            </View>
            <TouchableOpacity onPress={() => auth.signOut()} style={styles.logoutBtn}>
                <MaterialCommunityIcons name="logout" size={20} color="#FFF" />
            </TouchableOpacity>
        </View>

        {availableTenants.length > 1 && (
            <View style={styles.tenantContainer}>
                <MaterialCommunityIcons name="account-sync" size={20} color="#FFF" style={{marginRight: 8}}/>
                <View style={styles.pickerWrapper}>
                    <Picker
                        selectedValue={selectedTenantId}
                        onValueChange={(itemValue) => changeTenant(itemValue)}
                        style={styles.picker}
                        dropdownIconColor="#FFF"
                        mode="dropdown"
                    >
                        {availableTenants.map(tenant => (
                            <Picker.Item key={tenant.uid} label={tenant.name} value={tenant.uid} style={{color: '#333'}} />
                        ))}
                    </Picker>
                </View>
            </View>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CARD FINANCEIRO (LUCRO REAL) */}
        {stats && (
            <View style={styles.financeCard}>
                <View style={styles.financeHeader}>
                    <MaterialCommunityIcons name="scale-balance" size={24} color="#FFF" />
                    <Text style={styles.financeTitle}>Lucro Líquido Real</Text>
                </View>
                
                <Text style={styles.financeMainValue}>
                    R$ {stats.lucroTotal.toFixed(2)}
                </Text>

                <View style={styles.financeDivider} />

                <View style={styles.financeRow}>
                    <Text style={styles.financeLabel}>Receita Vendas:</Text>
                    <Text style={[styles.financeValue, {color: '#A7F3D0'}]}>+ R$ {stats.totalReceita.toFixed(2)}</Text>
                </View>
                <View style={styles.financeRow}>
                    <Text style={styles.financeLabel}>Custos Produção:</Text>
                    <Text style={[styles.financeValue, {color: '#FECACA'}]}>- R$ {stats.totalCustoProd.toFixed(2)}</Text>
                </View>
                <View style={styles.financeRow}>
                    <Text style={styles.financeLabel}>Despesas Gerais:</Text>
                    <Text style={[styles.financeValue, {color: '#FCA5A5'}]}>- R$ {stats.totalDespesas.toFixed(2)}</Text>
                </View>
            </View>
        )}

        <Text style={styles.sectionTitle}>Gestão Principal</Text>
        <View style={styles.grid}>
          <ActionCard title="Gestão de Vendas" iconName="finance" color="#10B981" onPress={() => handleNavigate('VendasList')} />
          <ActionCard title="Minhas Estufas" iconName="estufa" color="#3B82F6" onPress={() => handleNavigate('EstufasList')} />
        </View>

        <Text style={styles.sectionTitle}>Financeiro & Operacional</Text>
        <View style={styles.grid}>
          {/* NOVO BOTÃO DE DESPESAS */}
          <ActionCard title="Contas a Pagar" iconName="despesa" color="#EF4444" onPress={() => handleNavigate('DespesasList')} />
          
          <ActionCard title="Meus Insumos" iconName="insumo" color="#8B5CF6" onPress={() => handleNavigate('InsumosList')} />
          <ActionCard title="Meus Clientes" iconName="cliente" color="#F59E0B" onPress={() => handleNavigate('ClientesList')} />
          <ActionCard title="Fornecedores" iconName="fornecedor" color="#EF4444" onPress={() => handleNavigate('FornecedoresList')} />
          <ActionCard title="Compartilhar Acesso" iconName="share" color="#6B7280" onPress={() => handleNavigate('ShareAccount')} />
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#059669", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  subGreeting: { fontSize: 14, color: '#D1FAE5', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  tenantContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, marginTop: 10 },
  pickerWrapper: { flex: 1 },
  picker: { color: '#FFF', height: 50, width: '100%' },
  
  scrollView: { flex: 1, marginTop: 15 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  // Estilos do Card Financeiro (Escuro/Elegante)
  financeCard: {
      backgroundColor: '#1F2937', // Cinza escuro
      borderRadius: 20,
      padding: 20,
      marginBottom: 10,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5
  },
  financeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  financeTitle: { color: '#F3F4F6', fontSize: 16, fontWeight: '600', marginLeft: 10 },
  financeMainValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginBottom: 15 },
  financeDivider: { height: 1, backgroundColor: '#374151', marginBottom: 15 },
  financeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  financeLabel: { color: '#9CA3AF', fontSize: 14 },
  financeValue: { fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginTop: 20, marginBottom: 15, marginLeft: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionCard: { width: '48%', backgroundColor: COLORS.card, borderRadius: 20, padding: 16, marginBottom: 16, alignItems: 'flex-start', justifyContent: 'space-between', minHeight: 110, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionText: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, marginTop: 'auto' },
  arrowContainer: { position: 'absolute', top: 16, right: 16 },
  footerSpacing: { height: 40 }
});

export default DashboardScreen;