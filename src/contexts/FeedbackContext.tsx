import React, { createContext, ReactNode, useCallback, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { COLORS } from '../constants/theme';

type FeedbackType = 'success' | 'error' | 'warning';

interface FeedbackContextData {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
}

interface SnackbarState {
  visible: boolean;
  message: string;
  type: FeedbackType;
}

const initialState: SnackbarState = {
  visible: false,
  message: '',
  type: 'success',
};

export const FeedbackContext = createContext<FeedbackContextData>({} as FeedbackContextData);

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SnackbarState>(initialState);

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback((type: FeedbackType, message: string) => {
    setState({
      visible: true,
      message,
      type,
    });
  }, []);

  const value = useMemo(
    () => ({
      showSuccess: (message: string) => show('success', message),
      showError: (message: string) => show('error', message),
      showWarning: (message: string) => show('warning', message),
    }),
    [show]
  );

  const backgroundByType = {
    success: COLORS.success,
    error: COLORS.danger,
    warning: COLORS.warning,
  } as const;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        visible={state.visible}
        onDismiss={hide}
        duration={3000}
        style={{ backgroundColor: backgroundByType[state.type], marginBottom: 16 }}
      >
        {state.message}
      </Snackbar>
    </FeedbackContext.Provider>
  );
};
