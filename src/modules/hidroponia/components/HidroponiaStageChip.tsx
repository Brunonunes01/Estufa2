import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getHydroStageColor, getHydroStageLabel } from '../constants';
import { HydroLoteStage } from '../types';

interface Props {
  stage?: HydroLoteStage | null;
}

const HidroponiaStageChip = ({ stage }: Props) => {
  const color = getHydroStageColor(stage);
  return (
    <View style={[styles.chip, { backgroundColor: `${color}1A`, borderColor: `${color}55` }]}>
      <Text style={[styles.text, { color }]}>{getHydroStageLabel(stage)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: { fontSize: 11, fontWeight: '800' },
});

export default React.memo(HidroponiaStageChip);
