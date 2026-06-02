import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';

type NavigationLike = {
  canGoBack?: () => boolean;
  goBack: () => void;
  navigate?: (screen: string, params?: unknown) => void;
};

export const useWriteGuard = (navigation: NavigationLike, featureName: string) => {
  const { canWrite } = useAuth();

  useEffect(() => {
    if (canWrite) return;

    Alert.alert(
      'Acesso restrito',
      `Seu perfil possui acesso somente leitura. ${featureName} nao pode alterar dados.`,
      [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack?.()) {
              navigation.goBack();
              return;
            }
            navigation.navigate?.('VendasList');
          },
        },
      ]
    );
  }, [canWrite, featureName, navigation]);

  return canWrite;
};
