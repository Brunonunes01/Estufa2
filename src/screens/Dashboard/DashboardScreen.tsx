import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, RefreshControl, Dimensions, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; 
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { useIsFocused } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { getGlobalStats, GlobalStatsResult } from '../../services/globalStatsService';

const THEME = {
  headerBg: '#14532d', 
  headerText: '#F0FDF4',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  textMain: '#1F293B',
  textSub: '#64748B',
};

const DashboardScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  const isFocused = useIsFocused();
  
  const [stats, setStats] = useState<GlobalStatsResult | null>(null); 
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, selectedTenantId]);

  const navigateTo = (screen: string) => navigation.navigate(screen);

  // --- NOVA LÓGICA DE FORMATAÇÃO DE NOME ---
  const getFormattedLabel = (tenant: any) => {
    // Verifica se o ID do tenant é igual ao ID do usuário logado
    const isMe = tenant.uid === user?.uid;
    
    // Lista de nomes comuns que causam confusão
    const nomesGenericos = ['Minha Estufa', 'Meu Grow', 'Estufa', 'Grow', 'Principal'];
    const nomeAtual = tenant.name ? tenant.name.trim() : 'Estufa';

    if (isMe) {
      // Se for a SUA conta, indicamos que é a Principal
      return `${nomeAtual} (Principal)`;
    } else {
      // Se NÃO for a sua conta (é compartilhada)
      
      // Se o nome for genérico, mudamos para "Estufa Compartilhada" para não confundir
      if (nomesGenericos.includes(nomeAtual)) {
        return 'Estufa Compartilhada'; 
      }
      
      // Se tiver um nome específico (ex: "Laboratório 2"), mantemos o nome
      return `Estufa: ${nomeAtual}`;
    }
  };

  const GridItem = ({ title, sub, icon, color, route }: any) => (
    <TouchableOpacity 
      style={styles.gridItem} 
      onPress={() => navigateTo(route)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} style={styles.iconFix} />
      </View>
      <View style={styles.gridTexts}>
        <Text style={styles.gridTitle}>{title}</Text>
        <Text style={styles.gridSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.headerBg} translucent />
      
      <SafeAreaView style={styles.container}>
        
        {/* --- CABEÇALHO --- */}
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.welcomeSmall}>Olá, {user?.name?.split(' ')[0]}</Text>
              <Text style={styles.welcomeBig}>Visão Geral</Text>
            </View>
            <TouchableOpacity onPress={() => auth.signOut()} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* SELETOR DE CONTA */}
          {availableTenants.length > 1 && (
            <View style={styles.tenantWrapper}>
               <MaterialCommunityIcons name="store-cog" size={20} color="#A7F3D0" style={styles.tenantIcon} />
               <View style={styles.pickerContainer}>
                 <Picker
                    selectedValue={selectedTenantId}
                    onValueChange={changeTenant}
                    style={styles.picker}
                    dropdownIconColor="#FFF"
                    mode="dropdown"
                >
                    {availableTenants.map(t => (
                        <Picker.Item 
                            key={t.uid} 
                            // AQUI APLICAMOS A CORREÇÃO
                            label={getFormattedLabel(t)} 
                            value={t.uid} 
                            style={{fontSize: 14, color: '#000'}}
                        />
                    ))}
                </Picker>
               </View>
            </View>
          )}

          {/* Card de Saldo */}
          <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>LUCRO LÍQUIDO</Text>
              <Text style={styles.balanceValue}>
                  R$ {stats ? stats.lucroTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '...'}
              </Text>
              
              <View style={styles.miniStatsRow}>
                  <View style={styles.miniStatItem}>
                      <MaterialCommunityIcons name="arrow-up" size={16} color="#4ADE80" />
                      <Text style={styles.miniStatText}>Rec: R$ {stats?.totalReceita.toFixed(0) || '0'}</Text>
                  </View>
                  <View style={[styles.miniStatItem, {marginLeft: 15}]}>
                      <MaterialCommunityIcons name="arrow-down" size={16} color="#FDA4AF" />
                      <Text style={styles.miniStatText}>Desp: R$ {stats ? (stats.totalCustoProd + stats.totalDespesas).toFixed(0) : '0'}</Text>
                  </View>
              </View>
          </View>
        </View>

        {/* --- CONTEÚDO --- */}
        <View style={styles.body}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[THEME.headerBg]}/>}
          >
            
            {/* Botões Grandes */}
            <Text style={styles.sectionLabel}>Acesso Rápido</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                  style={[styles.quickBtn, {backgroundColor: '#DCFCE7'}]}
                  onPress={() => navigateTo('ColheitaForm')}
              >
                  <MaterialCommunityIcons name="basket-plus" size={32} color="#166534" />
                  <Text style={[styles.quickBtnText, {color: '#166534'}]}>Vender</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                  style={[styles.quickBtn, {backgroundColor: '#FEE2E2'}]}
                  onPress={() => navigateTo('DespesaForm')}
              >
                  <MaterialCommunityIcons name="cash-minus" size={32} color="#991B1B" />
                  <Text style={[styles.quickBtnText, {color: '#991B1B'}]}>Pagar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                  style={[styles.quickBtn, {backgroundColor: '#E0F2FE'}]}
                  onPress={() => navigateTo('InsumosList')} 
              >
                  <MaterialCommunityIcons name="package-variant-closed" size={32} color="#075985" />
                  <Text style={[styles.quickBtnText, {color: '#075985'}]}>Estoque</Text>
              </TouchableOpacity>
            </View>

            {/* Grid Principal */}
            <Text style={styles.sectionLabel}>Gerenciamento</Text>
            <View style={styles.gridWrapper}>
              <GridItem title="Estufas" sub="Ciclos e Plantios" icon="greenhouse" color="#16A34A" route="EstufasList" />
              <GridItem title="Relatórios" sub="Vendas Detalhadas" icon="chart-box-outline" color="#0284C7" route="VendasList" />
              <GridItem title="A Receber" sub="Controle de Fiados" icon="hand-coin" color="#D97706" route="ContasReceber" />
              <GridItem title="A Pagar" sub="Despesas Gerais" icon="wallet-outline" color="#BE123C" route="DespesasList" />
              <GridItem title="Insumos" sub="Produtos e Venenos" icon="flask-outline" color="#7C3AED" route="InsumosList" />
              <GridItem title="Parceiros" sub="Clientes/Forn." icon="account-group" color="#EA580C" route="ClientesList" />
              <GridItem title="Acesso" sub="Compartilhar" icon="share-variant" color="#4B5563" route="ShareAccount" />
            </View>

            <View style={{height: 40}} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1, 
    backgroundColor: THEME.headerBg 
  },
  container: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 30,
    marginTop: 10, 
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  welcomeSmall: { color: '#86EFAC', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  welcomeBig: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  
  tenantWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    height: 50,
    paddingHorizontal: 12,
  },
  tenantIcon: { marginRight: 5 },
  pickerContainer: { flex: 1, justifyContent: 'center' },
  picker: { color: '#FFF' },

  balanceContainer: { marginTop: 5 },
  balanceLabel: { color: '#A7F3D0', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  balanceValue: { color: '#FFF', fontSize: 32, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  miniStatsRow: { flexDirection: 'row' },
  miniStatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniStatText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', marginLeft: 4 },

  body: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 30,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 16,
    marginLeft: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  quickBtn: {
    width: '31%',
    aspectRatio: 1, 
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickBtnText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconFix: { textAlign: 'center' },
  gridTexts: { flex: 1 },
  gridTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  gridSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});

export default DashboardScreen;