export type VendaPaymentStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

export const CHEQUE_EM_MAOS_PAYMENT_MARKER = 'cheque_em_maos';

export const isChequeEmMaosPayment = (...values: Array<string | null | undefined>) =>
  values.some(
    (value) =>
      String(value || '')
        .trim()
        .toLowerCase() === CHEQUE_EM_MAOS_PAYMENT_MARKER
  );

export const deriveVendaPaymentStatus = (
  metodoPagamento?: string | null
): VendaPaymentStatus =>
  metodoPagamento === 'prazo' ||
  metodoPagamento === 'cheque' ||
  isChequeEmMaosPayment(metodoPagamento)
    ? 'pendente'
    : 'pago';

export const resolveVendaPaymentStatusForWrite = (
  metodoPagamento?: string | null,
  existingStatus?: VendaPaymentStatus | null
): VendaPaymentStatus =>
  existingStatus || deriveVendaPaymentStatus(metodoPagamento);

export const canConfirmVendaReceipt = (status?: VendaPaymentStatus | null) =>
  status === 'pendente' || status === 'atrasado';
