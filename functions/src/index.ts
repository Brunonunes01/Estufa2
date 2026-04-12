import { initializeApp } from 'firebase-admin/app';
import { onVendaWrite, onDespesaWrite, onColheitaWrite } from './dashboardSummary';

initializeApp();

export { onVendaWrite, onDespesaWrite, onColheitaWrite };
