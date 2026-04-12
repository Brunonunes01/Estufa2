import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Estufa, Plantio } from '../../types/domain';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface EstufaHubProps {
  estufa: Estufa;
  plantiosAtivos: Plantio[];
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
  surfaceBackground: string;
  onOpenHub: (id: string) => void;
  onCycleAction: (id: string, plantioId?: string) => void;
  onQuickSale: (id: string) => void;
}

const EstufaHub = ({
  estufa,
  plantiosAtivos,
  textPrimary,
  textSecondary,
  borderColor,
  surfaceBackground,
  onOpenHub,
  onCycleAction,
  onQuickSale,
}: EstufaHubProps) => {
  const firstPlantio = plantiosAtivos[0];

  return (
    <View style={[styles.card, { backgroundColor: surfaceBackground, borderColor }]}> 
      <View style={styles.top}>
        <View>
          <Text style={[styles.name, { color: textPrimary }]}>{estufa.nome}</Text>
          <Text style={[styles.meta, { color: textSecondary }]}>Plantios ativos: {plantiosAtivos.length}</Text>
        </View>
      </View>

      <Text style={[styles.cycle, { color: textPrimary }]}> 
        {firstPlantio ? `Principal: ${firstPlantio.cultura}` : 'Sem ciclos ativos'}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.btnNeutral, { borderColor }]} onPress={() => onOpenHub(estufa.id)}>
          <Text style={[styles.btnNeutralText, { color: textPrimary }]}>Abrir Hub</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnNeutral, { borderColor }]} onPress={() => onCycleAction(estufa.id, firstPlantio?.id)}>
          <Text style={[styles.btnNeutralText, { color: textPrimary }]}>{firstPlantio ? 'Ciclo' : 'Novo Ciclo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => onQuickSale(estufa.id)}>
          <Text style={styles.btnPrimaryText}>Vender</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, ...SHADOWS.card },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '900' },
  meta: { marginTop: 4, fontSize: 12 },
  cycle: { marginTop: 12, fontSize: 13, fontWeight: '600' },
  actions: { marginTop: 16, flexDirection: 'row', gap: 8 },
  btnNeutral: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  btnNeutralText: { fontSize: 12, fontWeight: '700' },
  btnPrimary: { flex: 1, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  btnPrimaryText: { color: COLORS.textLight, fontSize: 12, fontWeight: '700' },
});

export default React.memo(EstufaHub);
