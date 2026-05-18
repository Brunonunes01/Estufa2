import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDNGftBmPuHi2wSbIGyE3qu20i0AsQ3HQk',
  authDomain: 'sge-app-9ffb8.firebaseapp.com',
  projectId: 'sge-app-9ffb8',
  storageBucket: 'sge-app-9ffb8.firebasestorage.app',
  messagingSenderId: '878004575186',
  appId: '1:878004575186:web:58cbe34633e63232d3c60b',
};

const FIXED_SUPPORT_UID = 'fsCWNyTtuOOeYAmVokbhfU0xA2e2';
const PAGE_SIZE = 20;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const el = {
  sidebar: document.getElementById('sidebar'),
  mainContent: document.getElementById('mainContent'),
  statusBar: document.getElementById('statusBar'),
  viewTitle: document.getElementById('viewTitle'),
  userBadge: document.getElementById('userBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  recordModal: document.getElementById('recordModal'),
  recordModalTitle: document.getElementById('recordModalTitle'),
  recordModalForm: document.getElementById('recordModalForm'),
  recordModalClose: document.getElementById('recordModalClose'),
  auditModal: document.getElementById('auditModal'),
  auditModalTitle: document.getElementById('auditModalTitle'),
  auditModalForm: document.getElementById('auditModalForm'),
  auditModalClose: document.getElementById('auditModalClose'),
  auditCancelBtn: document.getElementById('auditCancelBtn'),
  auditNote: document.getElementById('auditNote'),
};

const state = {
  user: null,
  profile: null,
  allowed: false,
  tenants: [],
  selectedTenantId: '',
  currentView: 'overview',
  message: '',
  error: false,
  cachedRows: {},
  tableState: {},
  pendingAuditAction: null,
  pendingEditContext: null,
};

const appRoot = document.getElementById('portalApp');

const MENU = [
  {
    section: 'Visão Geral',
    items: [{ id: 'overview', label: 'Dashboard & Alertas' }],
  },
  {
    section: 'Operacional',
    items: [
      { id: 'estufas', label: 'Estufas' },
      { id: 'plantios', label: 'Plantios' },
      { id: 'tarefas', label: 'Tarefas' },
      { id: 'colheitas', label: 'Colheitas' },
      { id: 'manejos', label: 'Manejos' },
    ],
  },
  {
    section: 'Hidroponia',
    items: [
      { id: 'hidroponia_lotes', label: 'Lotes' },
      { id: 'hidroponia_leituras', label: 'Leituras' },
      { id: 'hidroponia_movimentacoes', label: 'Movimentações' },
      { id: 'hidroponia_motores', label: 'Motores' },
    ],
  },
  {
    section: 'Estoque',
    items: [
      { id: 'insumos', label: 'Insumos' },
      { id: 'aplicacoes', label: 'Aplicações' },
    ],
  },
  {
    section: 'Financeiro',
    items: [
      { id: 'vendas', label: 'Vendas' },
      { id: 'despesas', label: 'Despesas' },
      { id: 'contas_receber', label: 'Contas a Receber' },
    ],
  },
  {
    section: 'CRM',
    items: [
      { id: 'clientes', label: 'Clientes' },
      { id: 'fornecedores', label: 'Fornecedores' },
    ],
  },
  {
    section: 'Administração',
    items: [{ id: 'support_audit', label: 'Trilha de Auditoria' }],
  },
];

const MODULE_CONFIG = {
  estufas: {
    title: 'Estufas',
    collection: 'estufas',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'tipo', label: 'Tipo', editable: true },
      { key: 'area', label: 'Área', editable: true, type: 'number' },
      { key: 'updatedAt', label: 'Atualizado', format: formatDate },
    ],
    actions: { edit: true, delete: true },
  },
  plantios: {
    title: 'Plantios',
    collection: 'plantios',
    columns: [
      { key: 'cultura', label: 'Cultura', editable: true },
      { key: 'rastreabilidade', label: 'Rastreabilidade', editable: true },
      { key: 'dataPlantio', label: 'Data de Plantio', format: formatDate, editable: true, type: 'date' },
      { key: 'status', label: 'Status', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  tarefas: {
    title: 'Tarefas',
    collection: 'tarefas',
    columns: [
      { key: 'titulo', label: 'Tarefa', editable: true },
      { key: 'estufaNome', label: 'Estufa', editable: true },
      { key: 'status', label: 'Status', format: formatStatus },
      { key: 'dataPrevista', label: 'Data Prevista', format: formatDate, editable: true, type: 'date' },
    ],
    actions: {
      edit: true,
      delete: true,
      forceStatus: {
        field: 'status',
        label: 'Forçar Status',
        options: ['pendente', 'concluida'],
      },
    },
  },
  colheitas: {
    title: 'Colheitas',
    collection: 'colheitas',
    columns: [
      { key: 'cultura', label: 'Cultura', editable: true },
      { key: 'quantidade', label: 'Quantidade', editable: true, type: 'number' },
      { key: 'unidade', label: 'Unidade', editable: true },
      { key: 'dataColheita', label: 'Data', format: formatDate, editable: true, type: 'date' },
    ],
    actions: { edit: true, delete: true },
  },
  manejos: {
    title: 'Manejos',
    collection: 'manejos',
    columns: [
      { key: 'tipo', label: 'Tipo', editable: true },
      { key: 'estufaNome', label: 'Estufa', editable: true },
      { key: 'plantioId', label: 'Plantio', editable: true },
      { key: 'data', label: 'Data', format: formatDate, editable: true, type: 'date' },
    ],
    actions: { edit: true, delete: true },
  },
  hidroponia_lotes: {
    title: 'Hidroponia | Lotes',
    collection: 'hidroponia_lotes',
    columns: [
      { key: 'cultura', label: 'Cultura', editable: true },
      { key: 'fase', label: 'Fase', editable: true },
      { key: 'quantidadePlantas', label: 'Qtd Plantas', editable: true, type: 'number' },
      { key: 'dataTransplante', label: 'Transplante', format: formatDate, editable: true, type: 'date' },
      { key: 'status', label: 'Status', format: formatStatus, editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  hidroponia_leituras: {
    title: 'Hidroponia | Leituras',
    collection: 'hidroponia_leituras',
    columns: [
      { key: 'ph', label: 'pH', editable: true, type: 'number' },
      { key: 'ec', label: 'EC', editable: true, type: 'number' },
      { key: 'temperatura', label: 'Temperatura', editable: true, type: 'number' },
      { key: 'dataLeitura', label: 'Data', format: formatDate, editable: true, type: 'date' },
    ],
    actions: { edit: true, delete: true },
  },
  hidroponia_movimentacoes: {
    title: 'Hidroponia | Movimentações',
    collection: 'hidroponia_movimentacoes',
    columns: [
      { key: 'loteId', label: 'Lote', editable: true },
      { key: 'origem', label: 'Origem', editable: true },
      { key: 'destino', label: 'Destino', editable: true },
      { key: 'quantidade', label: 'Quantidade', editable: true, type: 'number' },
      { key: 'createdAt', label: 'Data', format: formatDate },
    ],
    actions: { edit: true, delete: true },
  },
  hidroponia_motores: {
    title: 'Hidroponia | Motores',
    collection: 'hidroponia_motores',
    columns: [
      { key: 'nome', label: 'Motor', editable: true },
      { key: 'status', label: 'Estado', format: formatStatus, editable: true },
      { key: 'temporizador', label: 'Temporizador', editable: true },
      { key: 'updatedAt', label: 'Atualizado', format: formatDate },
    ],
    actions: {
      edit: true,
      delete: true,
      forceStatus: {
        field: 'status',
        label: 'Forçar Estado',
        options: ['ligado', 'desligado'],
      },
    },
  },
  insumos: {
    title: 'Insumos',
    collection: 'insumos',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'categoria', label: 'Categoria', editable: true },
      { key: 'quantidadeAtual', label: 'Quantidade', editable: true, type: 'number' },
      { key: 'unidadeMedida', label: 'Unidade', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  aplicacoes: {
    title: 'Aplicações',
    collection: 'aplicacoes',
    columns: [
      { key: 'insumoNome', label: 'Insumo', editable: true },
      { key: 'dosagem', label: 'Dosagem', editable: true },
      { key: 'alvo', label: 'Lote/Plantio', editable: true },
      { key: 'dataAplicacao', label: 'Data', format: formatDate, editable: true, type: 'date' },
    ],
    actions: { edit: true, delete: true },
  },
  vendas: {
    title: 'Vendas',
    collection: 'vendas',
    columns: [
      { key: 'dataVenda', label: 'Data', format: formatDate, editable: true, type: 'date' },
      { key: 'clienteId', label: 'Cliente', editable: true },
      { key: 'valorTotal', label: 'Valor Total', format: formatCurrency, editable: true, type: 'number' },
      { key: 'statusPagamento', label: 'Pagamento', format: formatStatus, editable: true },
    ],
    actions: {
      edit: true,
      delete: true,
      forceStatus: {
        field: 'statusPagamento',
        label: 'Forçar Pagamento',
        options: ['pago', 'pendente', 'cancelado'],
      },
    },
  },
  despesas: {
    title: 'Despesas',
    collection: 'despesas',
    columns: [
      { key: 'categoria', label: 'Categoria', editable: true },
      { key: 'valor', label: 'Valor', format: formatCurrency, editable: true, type: 'number' },
      { key: 'vencimento', label: 'Vencimento', format: formatDate, editable: true, type: 'date' },
      { key: 'status', label: 'Status', format: formatStatus, editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  contas_receber: {
    title: 'Contas a Receber',
    collection: 'contas_receber',
    columns: [
      { key: 'descricao', label: 'Descrição', editable: true },
      { key: 'valor', label: 'Valor', format: formatCurrency, editable: true, type: 'number' },
      { key: 'vencimento', label: 'Vencimento', format: formatDate, editable: true, type: 'date' },
      { key: 'status', label: 'Status', format: formatStatus, editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  clientes: {
    title: 'Clientes',
    collection: 'clientes',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'telefone', label: 'Telefone', editable: true },
      { key: 'morada', label: 'Morada', editable: true },
      { key: 'nifCpf', label: 'NIF/CPF', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  fornecedores: {
    title: 'Fornecedores',
    collection: 'fornecedores',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'telefone', label: 'Telefone', editable: true },
      { key: 'morada', label: 'Morada', editable: true },
      { key: 'nifCpf', label: 'NIF/CPF', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  support_audit: {
    title: 'Support Audit (Somente Leitura)',
    collection: 'support_audit',
    columns: [
      { key: 'createdAt', label: 'Data', format: formatDateTime },
      { key: 'action', label: 'Ação' },
      { key: 'createdBy', label: 'Técnico' },
      { key: 'note', label: 'Justificação' },
    ],
    actions: { edit: false, delete: false },
    readOnly: true,
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('pt-PT') : '-';
}

function formatDateTime(value) {
  const d = toDate(value);
  return d ? d.toLocaleString('pt-PT') : '-';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

function formatStatus(value) {
  const v = String(value || 'n/a').toLowerCase();
  const cls = v === 'pago' || v === 'concluida' || v === 'ligado' ? 'success' : v === 'pendente' ? 'warn' : 'muted';
  return `<span class="tag ${cls}">${escapeHtml(v)}</span>`;
}

function getCellValue(row, column) {
  const raw = row[column.key];
  if (column.format) return column.format(raw, row);
  return escapeHtml(raw ?? '-');
}

function setStatus(message, isError = false) {
  state.message = message;
  state.error = isError;
  el.statusBar.classList.remove('hidden', 'ok', 'error');
  el.statusBar.classList.add(isError ? 'error' : 'ok');
  el.statusBar.textContent = message;
}

function clearStatus() {
  state.message = '';
  el.statusBar.textContent = '';
  el.statusBar.classList.add('hidden');
}

function ensureTableState(collectionName) {
  if (!state.tableState[collectionName]) {
    state.tableState[collectionName] = { page: 1, search: '' };
  }
  return state.tableState[collectionName];
}

function mergeDocs(a, b) {
  const map = new Map();
  [...a, ...b].forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

async function queryTenantCollection(collectionName) {
  if (!state.selectedTenantId) return [];
  const tenantId = state.selectedTenantId;
  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(query(collection(db, collectionName), where('tenantId', '==', tenantId))),
    getDocs(query(collection(db, collectionName), where('userId', '==', tenantId))),
  ]);
  const tenantRows = tenantSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const legacyRows = legacySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return mergeDocs(tenantRows, legacyRows);
}

async function logSupportAction({ action, note, metadata }) {
  await addDoc(collection(db, 'support_audit'), {
    tenantId: state.selectedTenantId,
    userId: state.selectedTenantId,
    createdBy: state.user.uid,
    action,
    note,
    metadata,
    createdAt: serverTimestamp(),
  });
}

function openAuditModal(title, callback) {
  state.pendingAuditAction = callback;
  el.auditModalTitle.textContent = title;
  el.auditNote.value = '';
  el.auditModal.classList.remove('hidden');
}

function closeAuditModal() {
  state.pendingAuditAction = null;
  el.auditModal.classList.add('hidden');
}

function openRecordModal(title, contentHtml, onSubmit) {
  el.recordModalTitle.textContent = title;
  el.recordModalForm.innerHTML = contentHtml;
  el.recordModal.classList.remove('hidden');
  state.pendingEditContext = { onSubmit };
}

function closeRecordModal() {
  state.pendingEditContext = null;
  el.recordModal.classList.add('hidden');
  el.recordModalForm.innerHTML = '';
}

function getEditableFields(config) {
  return config.columns.filter((c) => c.editable);
}

function parseValueByType(type, raw) {
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'boolean') return raw === 'true';
  return raw;
}

async function auditedUpdate({ collectionName, docId, before, patch, action, note }) {
  await logSupportAction({
    action,
    note,
    metadata: { collectionName, docId, before, after: patch },
  });
  await updateDoc(doc(db, collectionName, docId), {
    ...patch,
    updatedAt: serverTimestamp(),
    supportUpdatedBy: state.user.uid,
  });
}

async function auditedDelete({ collectionName, docId, before, action, note }) {
  await logSupportAction({
    action,
    note,
    metadata: { collectionName, docId, before, after: null },
  });
  await deleteDoc(doc(db, collectionName, docId));
}

async function loadRows(collectionName) {
  const rows = await queryTenantCollection(collectionName);
  rows.sort((a, b) => (toDate(b.updatedAt || b.createdAt)?.getTime() || 0) - (toDate(a.updatedAt || a.createdAt)?.getTime() || 0));
  state.cachedRows[collectionName] = rows;
  return rows;
}

function buildRowActions(config, row) {
  if (config.readOnly) return '';
  const actions = [];

  if (config.actions.edit) {
    actions.push(`<button class="btn btn-soft" data-action="edit" data-id="${row.id}">Editar</button>`);
  }
  if (config.actions.delete) {
    actions.push(`<button class="btn btn-danger" data-action="delete" data-id="${row.id}">Apagar</button>`);
  }
  if (config.actions.forceStatus) {
    actions.push(`<button class="btn btn-outline" data-action="force-status" data-id="${row.id}">` + `${escapeHtml(config.actions.forceStatus.label)}</button>`);
  }

  return `<div class="table-actions">${actions.join('')}</div>`;
}

function buildTableHtml(config, rows, collectionName) {
  const table = ensureTableState(collectionName);
  const term = table.search.toLowerCase().trim();

  const filtered = rows.filter((row) => {
    if (!term) return true;
    return config.columns.some((c) => String(row[c.key] ?? '').toLowerCase().includes(term));
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  table.page = Math.min(table.page, totalPages);
  const start = (table.page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  const head = config.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = pageRows
    .map((row) => {
      const cols = config.columns.map((c) => `<td>${getCellValue(row, c)}</td>`).join('');
      const actions = `<td>${buildRowActions(config, row)}</td>`;
      return `<tr data-row-id="${row.id}">${cols}${actions}</tr>`;
    })
    .join('');

  return `
    <div class="card">
      <h2>${escapeHtml(config.title)}</h2>
      <div class="row">
        <input class="input" id="search-${collectionName}" placeholder="Pesquisar na coleção..." value="${escapeHtml(table.search)}" />
      </div>
      <div class="table-wrap" style="margin-top:10px;">
        <table>
          <thead><tr>${head}<th>Ações</th></tr></thead>
          <tbody>${body || `<tr><td colspan="${config.columns.length + 1}">Sem registos.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="row" style="margin-top:10px;justify-content:space-between;align-items:center;">
        <small>${filtered.length} registo(s)</small>
        <div class="row">
          <button class="btn btn-outline" data-action="prev-page" data-collection="${collectionName}">Anterior</button>
          <span>Página ${table.page}/${totalPages}</span>
          <button class="btn btn-outline" data-action="next-page" data-collection="${collectionName}">Seguinte</button>
        </div>
      </div>
    </div>
  `;
}

function buildSidebar() {
  if (!state.allowed) {
    el.sidebar.innerHTML = `
      <div class="sidebar-brand">
        <h2>SGE Support</h2>
        <p>Acesso restrito</p>
      </div>
    `;
    return;
  }

  const sections = MENU.map(
    (group) => `
      <div class="sidebar-group">
        <h3>${escapeHtml(group.section)}</h3>
        ${group.items
          .map(
            (item) =>
              `<button class="nav-btn ${state.currentView === item.id ? 'active' : ''}" data-nav="${item.id}">${escapeHtml(item.label)}</button>`
          )
          .join('')}
      </div>
    `
  ).join('');

  el.sidebar.innerHTML = `
    <div class="sidebar-brand">
      <h2>SGE Support</h2>
      <p>Painel Nível 3</p>
    </div>
    ${sections}
  `;
}

async function renderOverview() {
  if (!state.selectedTenantId) {
    return '<div class="card">Selecione um tenant para iniciar.</div>';
  }

  const [estufas, contasReceber, despesas, lotes] = await Promise.all([
    queryTenantCollection('estufas'),
    queryTenantCollection('contas_receber'),
    queryTenantCollection('despesas'),
    queryTenantCollection('hidroponia_lotes'),
  ]);

  const totalReceber = contasReceber.reduce((acc, x) => acc + Number(x.valor || 0), 0);
  const totalPagar = despesas.reduce((acc, x) => acc + Number(x.valor || 0), 0);
  const lotesAtivos = lotes.filter((l) => String(l.status || '').toLowerCase() !== 'encerrado').length;

  const settingsRef = doc(db, 'tenant_settings', state.selectedTenantId);
  const settingsSnap = await getDoc(settingsRef);
  const settings = settingsSnap.exists() ? settingsSnap.data() : {};

  return `
    <div class="card">
      <h2>KPIs Globais</h2>
      <div class="grid cols-4">
        <div class="kpi"><span class="label">Nº de Estufas</span><span class="value">${estufas.length}</span></div>
        <div class="kpi"><span class="label">Total a Receber</span><span class="value">${formatCurrency(totalReceber)}</span></div>
        <div class="kpi"><span class="label">Total a Pagar</span><span class="value">${formatCurrency(totalPagar)}</span></div>
        <div class="kpi"><span class="label">Lotes Hidroponia Ativos</span><span class="value">${lotesAtivos}</span></div>
      </div>
    </div>

    <div class="card">
      <h2>Tenant Settings</h2>
      <div class="form-grid">
        <div>
          <label for="maintenanceEnabled">Modo manutenção global</label>
          <select id="maintenanceEnabled">
            <option value="false" ${settings.maintenanceMode ? '' : 'selected'}>Desativado</option>
            <option value="true" ${settings.maintenanceMode ? 'selected' : ''}>Ativado</option>
          </select>
        </div>
        <div>
          <label for="maintenanceMessage">Mensagem de manutenção</label>
          <input id="maintenanceMessage" class="input" value="${escapeHtml(settings.maintenanceMessage || '')}" placeholder="Mensagem para utilizadores" />
        </div>
      </div>
      <div class="row" style="margin-top:10px;justify-content:flex-end;">
        <button id="saveMaintenance" class="btn btn-primary">Guardar Configuração</button>
      </div>
    </div>

    <div class="card">
      <h2>Impersonation</h2>
      <p>Abre a App principal com o tenant selecionado em modo suporte.</p>
      <div class="row">
        <button id="impersonateBtn" class="btn btn-outline">Gerar Contexto de Impersonation</button>
      </div>
    </div>
  `;
}

function renderLogin() {
  el.viewTitle.textContent = 'Portal de Suporte Nível 3 · Login';
  el.mainContent.innerHTML = `
    <div class="card login-card">
      <div class="login-hero">
        <h2>Acesso seguro do suporte</h2>
        <p>Painel dedicado para operação técnica, auditoria e manutenção assistida.</p>
      </div>
      <div class="grid">
        <div>
          <label for="loginEmail">E-mail</label>
          <input id="loginEmail" class="input" type="email" placeholder="suporte@empresa.com" />
        </div>
        <div>
          <label for="loginPassword">Palavra-passe</label>
          <input id="loginPassword" class="input" type="password" placeholder="••••••••" />
        </div>
      </div>
      <div class="row" style="margin-top:10px;justify-content:flex-end;">
        <button id="loginBtn" class="btn btn-primary">Entrar</button>
      </div>
      <p class="support-note">Acesso permitido somente para contas autorizadas com perfil de suporte.</p>
    </div>
  `;
}

function renderTenantSelector() {
  const opts = state.tenants
    .map((t) => `<option value="${escapeHtml(t.uid)}" ${state.selectedTenantId === t.uid ? 'selected' : ''}>${escapeHtml(t.label)}</option>`)
    .join('');

  return `
    <div class="card">
      <h2>Tenant Ativo</h2>
      <div class="form-grid">
        <div>
          <label for="tenantSelector">Cliente / Tenant</label>
          <select id="tenantSelector">${opts}</select>
        </div>
      </div>
    </div>
  `;
}

async function renderMain() {
  if (!state.allowed) {
    renderLogin();
    return;
  }

  const viewConfig = MODULE_CONFIG[state.currentView];
  el.viewTitle.textContent = viewConfig?.title || 'Dashboard & Alertas';

  let viewHtml = '';
  if (state.currentView === 'overview') {
    viewHtml = await renderOverview();
  } else {
    const rows = await loadRows(viewConfig.collection);
    viewHtml = buildTableHtml(viewConfig, rows, viewConfig.collection);
  }

  el.mainContent.innerHTML = `${renderTenantSelector()}${viewHtml}`;
}

async function getProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

function canAccess(user, profile) {
  if (!user || !profile) return false;
  return profile.role === 'admin' || profile.isSupportAgent === true || user.uid === FIXED_SUPPORT_UID;
}

async function loadTenants() {
  const snap = await getDocs(collection(db, 'users'));
  state.tenants = snap.docs
    .map((d) => ({ uid: d.id, ...(d.data() || {}) }))
    .map((u) => ({
      uid: u.uid,
      label: `${u.name || u.displayName || u.email || u.uid} (${u.email || 'sem-email'})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-PT'));

  if (!state.selectedTenantId && state.tenants[0]) state.selectedTenantId = state.tenants[0].uid;
}

function attachGlobalListeners() {
  el.logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
  });

  el.sidebar.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-nav]');
    if (!btn) return;
    state.currentView = btn.dataset.nav;
    buildSidebar();
    await safeRenderMain();
  });

  el.mainContent.addEventListener('click', async (event) => {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    const collectionName = actionBtn.dataset.collection || MODULE_CONFIG[state.currentView]?.collection;
    const config = Object.values(MODULE_CONFIG).find((x) => x.collection === collectionName);
    if (!config) return;

    const rowEl = actionBtn.closest('tr[data-row-id]');
    const rowId = actionBtn.dataset.id || rowEl?.dataset.rowId;
    const rows = state.cachedRows[collectionName] || [];
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    if (action === 'edit') {
      const fields = getEditableFields(config)
        .map((f) => {
          const value = f.type === 'date' ? (toDate(row[f.key])?.toISOString().slice(0, 10) || '') : row[f.key] ?? '';
          const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
          return `
            <div>
              <label>${escapeHtml(f.label)}</label>
              <input class="input" name="${escapeHtml(f.key)}" type="${inputType}" value="${escapeHtml(value)}" />
            </div>
          `;
        })
        .join('');

      const html = `
        <div class="form-grid">${fields}</div>
        <div>
          <label for="editAuditNote">Justificação de auditoria</label>
          <textarea id="editAuditNote" name="auditNote" required minlength="8" placeholder="Justifique a alteração."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
          <button class="btn btn-primary" type="submit">Guardar Alterações</button>
        </div>
      `;

      openRecordModal(`Editar ${config.title}`, html, async (formData) => {
        const patch = {};
        getEditableFields(config).forEach((f) => {
          if (!formData.has(f.key)) return;
          patch[f.key] = parseValueByType(f.type, formData.get(f.key));
        });
        const note = String(formData.get('auditNote') || '').trim();
        if (!note || note.length < 8) throw new Error('Justificação mínima de 8 caracteres é obrigatória.');

        await auditedUpdate({
          collectionName,
          docId: row.id,
          before: row,
          patch,
          action: `${collectionName}.update`,
          note,
        });
      });
      return;
    }

    if (action === 'delete') {
      openAuditModal(`Apagar registo ${row.id}`, async (note) => {
        await auditedDelete({
          collectionName,
          docId: row.id,
          before: row,
          action: `${collectionName}.delete`,
          note,
        });
      });
      return;
    }

    if (action === 'force-status' && config.actions.forceStatus) {
      const next = prompt(
        `Novo status (${config.actions.forceStatus.options.join(' / ')}):`,
        row[config.actions.forceStatus.field] || config.actions.forceStatus.options[0]
      );
      if (!next) return;
      openAuditModal(`Forçar status em ${row.id}`, async (note) => {
        await auditedUpdate({
          collectionName,
          docId: row.id,
          before: row,
          patch: { [config.actions.forceStatus.field]: String(next).trim() },
          action: `${collectionName}.forceStatus`,
          note,
        });
      });
      return;
    }

    if (action === 'prev-page' || action === 'next-page') {
      const ts = ensureTableState(collectionName);
      ts.page = Math.max(1, ts.page + (action === 'next-page' ? 1 : -1));
      await safeRenderMain();
    }
  });

  el.mainContent.addEventListener('input', async (event) => {
    const input = event.target;
    if (input.id.startsWith('search-')) {
      const collectionName = input.id.replace('search-', '');
      const ts = ensureTableState(collectionName);
      ts.search = input.value;
      ts.page = 1;
      await safeRenderMain();
    }
  });

  el.mainContent.addEventListener('change', async (event) => {
    const target = event.target;
    if (target.id === 'tenantSelector') {
      state.selectedTenantId = target.value;
      state.cachedRows = {};
      await safeRenderMain();
    }
  });

  el.mainContent.addEventListener('click', async (event) => {
    if (event.target.id === 'saveMaintenance') {
      try {
        const enabled = document.getElementById('maintenanceEnabled').value === 'true';
        const message = document.getElementById('maintenanceMessage').value.trim();

        openAuditModal('Alterar modo de manutenção global', async (note) => {
          const beforeSnap = await getDoc(doc(db, 'tenant_settings', state.selectedTenantId));
          const before = beforeSnap.exists() ? beforeSnap.data() : null;
          const patch = {
            tenantId: state.selectedTenantId,
            userId: state.selectedTenantId,
            maintenanceMode: enabled,
            maintenanceMessage: message || null,
            maintenanceUpdatedByUid: state.user.uid,
            maintenanceUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await logSupportAction({
            action: 'tenant_settings.update_maintenance',
            note,
            metadata: {
              collectionName: 'tenant_settings',
              docId: state.selectedTenantId,
              before,
              after: { maintenanceMode: enabled, maintenanceMessage: message || null },
            },
          });

          await setDoc(doc(db, 'tenant_settings', state.selectedTenantId), patch, { merge: true });
        });
      } catch (error) {
        setStatus(error.message || 'Erro ao preparar atualização de manutenção.', true);
      }
    }

    if (event.target.id === 'impersonateBtn') {
      const payload = {
        tenantId: state.selectedTenantId,
        by: state.user.uid,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('sge_support_impersonation', JSON.stringify(payload));
      setStatus('Contexto de impersonation guardado no localStorage: sge_support_impersonation');
    }
  });

  el.recordModalClose.addEventListener('click', closeRecordModal);
  el.auditModalClose.addEventListener('click', closeAuditModal);
  el.auditCancelBtn.addEventListener('click', closeAuditModal);

  el.recordModalForm.addEventListener('click', (event) => {
    if (event.target.id === 'cancelRecordEdit') closeRecordModal();
  });

  el.recordModalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.pendingEditContext?.onSubmit) return;

    const formData = new FormData(el.recordModalForm);
    try {
      await state.pendingEditContext.onSubmit(formData);
      closeRecordModal();
      setStatus('Alteração aplicada com auditoria.');
      await safeRenderMain();
    } catch (error) {
      setStatus(error.message || 'Falha ao guardar alteração.', true);
    }
  });

  el.auditModalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const note = el.auditNote.value.trim();
    if (!note || note.length < 8) {
      setStatus('Justificação mínima de 8 caracteres é obrigatória.', true);
      return;
    }
    if (!state.pendingAuditAction) return;

    try {
      await state.pendingAuditAction(note);
      closeAuditModal();
      setStatus('Operação concluída com auditoria.');
      await safeRenderMain();
    } catch (error) {
      setStatus(error.message || 'Falha na operação auditada.', true);
    }
  });
}

async function safeRenderMain() {
  try {
    clearStatus();
    buildSidebar();
    await renderMain();
    appRoot?.classList.toggle('logged-out', !state.allowed);
    el.logoutBtn.classList.toggle('hidden', !state.allowed);
    if (state.user && state.allowed) {
      const txt = `${state.profile?.name || state.user.email || state.user.uid}`;
      el.userBadge.textContent = txt;
      el.userBadge.classList.remove('hidden');
    } else {
      el.userBadge.classList.add('hidden');
    }
  } catch (error) {
    setStatus(error.message || 'Erro ao renderizar painel.', true);
  }
}

async function bootstrapAuth() {
  onAuthStateChanged(auth, async (user) => {
    state.user = user;
    state.profile = null;
    state.allowed = false;

    if (!user) {
      state.tenants = [];
      state.selectedTenantId = '';
      await safeRenderMain();
      return;
    }

    try {
      const profile = await getProfile(user.uid);
      state.profile = profile;
      state.allowed = canAccess(user, profile);

      if (!state.allowed) {
        setStatus('Acesso negado. Permissão insuficiente para o portal de suporte.', true);
        await signOut(auth);
        return;
      }

      await loadTenants();
      await safeRenderMain();
    } catch (error) {
      setStatus(error.message || 'Falha ao validar permissões.', true);
    }
  });
}

function attachLoginHandler() {
  el.mainContent.addEventListener('click', async (event) => {
    if (event.target.id !== 'loginBtn') return;
    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!email || !password) {
      setStatus('Informe e-mail e palavra-passe.', true);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setStatus('Sessão autenticada.');
    } catch (error) {
      setStatus(error.message || 'Falha no login.', true);
    }
  });
}

function init() {
  attachGlobalListeners();
  attachLoginHandler();
  buildSidebar();
  renderLogin();
  bootstrapAuth();
}

init();
