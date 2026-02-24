// src/screens/Dashboard/DashboardScreen.tsx
import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker'; 
import { auth } from '../../services/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons'; 
import { COLORS } from '../../constants/theme';

const DashboardScreen = ({ navigation }: any) => {
  const { user, selectedTenantId, changeTenant, availableTenants } = useAuth();
  
  // Pegamos a medida exata do rodapé do sistema (botões voltar/home do telemóvel)
  const insets = useSafeAreaInsets(); 

  const navigateTo = (screen: string) => navigation.navigate(screen);

  const getFormattedLabel = (tenant: any) => {
    const isMe = tenant.uid === user?.uid;
    const nomesGenericos = ['Minha Estufa', 'Meu Grow', 'Estufa', 'Grow', 'Principal'];
    const nomeAtual = tenant.name ? tenant.name.trim() : 'Estufa';

    if (isMe) return `${nomeAtual} (Principal)`;
    if (nomesGenericos.includes(nomeAtual)) return 'Estufa Partilhada'; 
    return `Estufa: ${nomeAtual}`;
  };

  const GridItem = ({ title, sub, icon, color, route }: any) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => navigateTo(route)} activeOpacity={0.8}>
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} translucent />
      
      {/* O SEGREDO: edges={['top']} faz a "área segura" atuar apenas lá em cima */}
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.welcomeSmall}>Olá, {user?.name?.split(' ')[0]}</Text>
              <Text style={styles.welcomeBig}>Visão Geral</Text>
            </View>
            <TouchableOpacity onPress={() => auth.signOut()} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {availableTenants.length > 1 && (
            <View style={styles.tenantWrapper}>
               <MaterialCommunityIcons name="store-cog" size={20} color="#A7F3D0" style={styles.tenantIcon} />
               <View style={styles.pickerContainer}>
                 <Picker
                    selectedValue={selectedTenantId}
                    onValueChange={changeTenant}
                    style={styles.picker}
                    dropdownIconColor={COLORS.textLight}
                    mode="dropdown"
                >
                    {availableTenants.map(t => (
                        <Picker.Item key={t.uid} label={getFormattedLabel(t)} value={t.uid} style={{fontSize: 14, color: COLORS.textDark}} />
                    ))}
                </Picker>
               </View>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <ScrollView 
              /* Adicionamos a medida do rodapé (insets.bottom) ao fundo para não cortar os botões */
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]} 
              showsVerticalScrollIndicator={false}
          >
            
            <Text style={styles.sectionLabel}>Acesso Rápido</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={[styles.quickBtn, {backgroundColor: '#DCFCE7'}]} onPress={() => navigateTo('ColheitaForm')}>
                  <MaterialCommunityIcons name="basket-plus" size={32} color="#166534" />
                  <Text style={[styles.quickBtnText, {color: '#166534'}]}>Vender</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, {backgroundColor: '#FEE2E2'}]} onPress={() => navigateTo('DespesaForm')}>
                  <MaterialCommunityIcons name="cash-minus" size={32} color="#991B1B" />
                  <Text style={[styles.quickBtnText, {color: '#991B1B'}]}>Pagar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, {backgroundColor: '#E0F2FE'}]} onPress={() => navigateTo('InsumosList')}>
                  <MaterialCommunityIcons name="package-variant-closed" size={32} color="#075985" />
                  <Text style={[styles.quickBtnText, {color: '#075985'}]}>Stock</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Gestão</Text>
            <View style={styles.gridWrapper}>
              <GridItem title="Estufas" sub="Ciclos e Plantios" icon="greenhouse" color="#16A34A" route="EstufasList" />
              <GridItem title="Propriedade" sub="Perfil e GPS" icon="map-marker-radius" color={COLORS.primary} route="Perfil" />
              <GridItem title="Relatórios" sub="Vendas Detalhadas" icon="chart-box-outline" color="#0284C7" route="VendasList" />
              <GridItem title="A Receber" sub="Controlo de Fiados" icon="hand-coin" color="#D97706" route="ContasReceber" />
              <GridItem title="A Pagar" sub="Despesas Gerais" icon="wallet-outline" color="#BE123C" route="DespesasList" />
              <GridItem title="Insumos" sub="Produtos e Venenos" icon="flask-outline" color="#7C3AED" route="InsumosList" />
              <GridItem title="Parceiros" sub="Clientes/Forn." icon="account-group" color="#EA580C" route="ClientesList" />
              <GridItem title="Acesso" sub="Partilhar" icon="share-variant" color="#4B5563" route="ShareAccount" />
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: COLORS.primaryDark },
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 20, marginTop: 10 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  welcomeSmall: { color: '#86EFAC', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  welcomeBig: { color: COLORS.textLight, fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 12 },
  tenantWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, marginTop: 15, marginBottom: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', height: 50, paddingHorizontal: 12 },
  tenantIcon: { marginRight: 5 },
  pickerContainer: { flex: 1, justifyContent: 'center' },
  picker: { color: COLORS.textLight },
  body: { flex: 1, backgroundColor: COLORS.background, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  scrollContent: { padding: 24, paddingTop: 30 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16, marginLeft: 4 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  quickBtn: { width: '31%', aspectRatio: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  quickBtnText: { marginTop: 8, fontSize: 12, fontWeight: '700' },
  gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: { width: '48%', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
  iconBox: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconFix: { textAlign: 'center' },
  gridTexts: { flex: 1 },
  gridTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  gridSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default DashboardScreen;