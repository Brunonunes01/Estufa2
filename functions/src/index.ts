import { initializeApp } from 'firebase-admin/app';
import { 
  onVendaWrite, 
  onDespesaWrite, 
  onColheitaWrite, 
  onTarefaWrite, 
  onPlantioWrite 
} from './dashboardSummary';

initializeApp();

export { 
  onVendaWrite, 
  onDespesaWrite, 
  onColheitaWrite, 
  onTarefaWrite, 
  onPlantioWrite,
};
