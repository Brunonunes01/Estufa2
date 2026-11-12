import type { ServiceError, ServiceErrorCategory } from './serviceError.ts';
import { classifyServiceError } from './serviceErrorClassifier.ts';

export type ErrorOperation = 'load' | 'save' | 'delete' | 'sync' | string;
export type ServiceErrorPresentation = { message: string; nextStep: string; retryLabel?: string };

const actionByOperation: Record<string, string> = {
  load: 'carregar os dados', save: 'salvar', delete: 'excluir', sync: 'sincronizar',
};

const catalog: Record<ServiceErrorCategory, Omit<ServiceErrorPresentation, 'message'>> = {
  validation: { nextStep: 'Corrija os campos indicados e tente novamente.' },
  authentication: { nextStep: 'Entre novamente para continuar.' },
  authorization: { nextStep: 'Solicite acesso ou use uma conta permitida.' },
  conflict: { nextStep: 'Recarregue e revise o registro antes de repetir.', retryLabel: 'Recarregar' },
  connectivity: { nextStep: 'Verifique sua conexao e tente novamente com seguranca.', retryLabel: 'Tentar novamente' },
  availability: { nextStep: 'Aguarde alguns instantes e tente novamente.', retryLabel: 'Tentar novamente' },
  'data-contract': { nextStep: 'Atualize o aplicativo ou procure suporte.' },
  unexpected: { nextStep: 'Tente novamente uma vez ou procure suporte.' },
};

export const presentServiceError = (error: ServiceError, operation: ErrorOperation = error.operation): ServiceErrorPresentation => {
  const action = actionByOperation[operation] ?? 'concluir a operacao';
  const entry = catalog[error.category];
  return { message: `Nao foi possivel ${action}. ${error.safeMessage}`.trim(), nextStep: error.nextStep || entry.nextStep, ...(entry.retryLabel && error.retryability !== 'never' ? { retryLabel: entry.retryLabel } : {}) };
};

export const actionableErrorMessage = (error: unknown, operation: ErrorOperation) => {
  const presentation = presentServiceError(classifyServiceError(error, { operation }), operation);
  return `${presentation.message}\n${presentation.nextStep}`;
};
