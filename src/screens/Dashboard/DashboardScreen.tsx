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
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/theme';

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
    if (nomesGenericos.includes(nomeAtual)) return 'Estufa Compartilhada';
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
              <Text style={styles.welcomeBig}>Painel Geral</Text>
            </View>
            <TouchableOpacity onPress={() => auth.signOut()} style={styles.logoutBtn}>
              <MaterialCommunityIcons name="logout" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          {availableTenants.length > 1 && (
            <View style={styles.tenantWrapper}>
               <MaterialCommunityIcons name="store-cog" size={20} color={COLORS.onPrimary} style={styles.tenantIcon} />
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
            
            <Text style={styles.sectionLabel}>Ações Rápidas do Dia</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnSell]} onPress={() => navigateTo('ColheitaForm')}>
                  <MaterialCommunityIcons name="basket-plus" size={32} color={COLORS.success} />
                  <Text style={[styles.quickBtnText, {color: COLORS.success}]}>Registrar Venda</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnPay]} onPress={() => navigateTo('DespesaForm')}>
                  <MaterialCommunityIcons name="cash-minus" size={32} color={COLORS.danger} />
                  <Text style={[styles.quickBtnText, {color: COLORS.danger}]}>Lançar Despesa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnStock]} onPress={() => navigateTo('InsumosList')}>
                  <MaterialCommunityIcons name="package-variant-closed" size={32} color={COLORS.info} />
                  <Text style={[styles.quickBtnText, {color: COLORS.info}]}>Conferir Estoque</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Módulos do Sistema</Text>
            <View style={styles.gridWrapper}>
              <GridItem title="Estufas" sub="Ciclos e plantios" icon="greenhouse" color={COLORS.success} route="EstufasList" />
              <GridItem title="Propriedade" sub="Perfil e localização" icon="map-marker-radius" color={COLORS.primary} route="Perfil" />
              <GridItem title="Relatórios" sub="Vendas e resultados" icon="chart-box-outline" color={COLORS.info} route="VendasList" />
              <GridItem title="Contas a Receber" sub="Vendas pendentes" icon="hand-coin" color={COLORS.warning} route="ContasReceber" />
              <GridItem title="Despesas" sub="Contas e pagamentos" icon="wallet-outline" color={COLORS.modDespesas} route="DespesasList" />
              <GridItem title="Insumos" sub="Estoque e consumo" icon="flask-outline" color={COLORS.primaryDark} route="InsumosList" />
              <GridItem title="Clientes" sub="Cadastro e histórico" icon="account-group" color={COLORS.modClientes} route="ClientesList" />
              <GridItem title="Fornecedores" sub="Compras e contatos" icon="truck-delivery-outline" color={COLORS.orange} route="FornecedoresList" />
              <GridItem title="Compartilhar" sub="Permissões de acesso" icon="share-variant" color={COLORS.textSecondary} route="ShareAccount" />
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: COLORS.secondary },
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg, marginTop: SPACING.sm },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  welcomeSmall: { color: COLORS.onPrimary, fontSize: TYPOGRAPHY.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  welcomeBig: { color: COLORS.textLight, fontSize: TYPOGRAPHY.h2, fontWeight: '800' },
  logoutBtn: { backgroundColor: COLORS.whiteAlpha12, padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.whiteAlpha15 },
  tenantWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.whiteAlpha10, borderRadius: RADIUS.md, marginTop: SPACING.md, marginBottom: 5, borderWidth: 1, borderColor: COLORS.whiteAlpha15, height: 52, paddingHorizontal: 12 },
  tenantIcon: { marginRight: 5 },
  pickerContainer: { flex: 1, justifyContent: 'center' },
  picker: { color: COLORS.textLight },
  body: { flex: 1, backgroundColor: COLORS.background, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  scrollContent: { padding: SPACING.xl, paddingTop: SPACING.xl },
  sectionLabel: { fontSize: TYPOGRAPHY.title, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.md, marginLeft: 4 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xl },
  quickBtn: { width: '31%', aspectRatio: 1, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  quickBtnSell: { backgroundColor: COLORS.successSoft },
  quickBtnPay: { backgroundColor: COLORS.dangerBg },
  quickBtnStock: { backgroundColor: COLORS.infoSoft },
  quickBtnText: { marginTop: 8, fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 6 },
  gridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: { width: '48%', backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: RADIUS.lg, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  iconBox: { width: 50, height: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  iconFix: { textAlign: 'center' },
  gridTexts: { flex: 1 },
  gridTitle: { fontSize: TYPOGRAPHY.body, fontWeight: '800', color: COLORS.textPrimary },
  gridSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});

export default DashboardScreen;
