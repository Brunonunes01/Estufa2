import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const PAGE_SIZE = 20;
const TEAM_AUDIT_PAGE_SIZE = 6;
const CASE_SLA_HOURS = {
  critica: 4,
  alta: 8,
  media: 24,
  baixa: 48,
};
const STORAGE_KEY = 'sge_support_supabase_cfg';
const WRITE_UNLOCK_KEY = 'sge_support_write_unlock_until';
const WRITE_UNLOCK_MINUTES = 20;

let supabase = null;

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
  cachedRows: {},
  tableState: {},
  pendingAuditAction: null,
  pendingEditContext: null,
  globalSearchTerm: '',
  globalSearchResults: [],
  globalSearching: false,
  auditFilters: { action: '', actor: '', from: '', to: '' },
  teamRows: [],
  teamFilters: { term: '', role: '' },
  teamSort: { key: 'updated_at', direction: 'desc' },
  teamAuditRows: [],
  teamAuditPage: 1,
  teamFilterDebounceHandle: null,
  supportCases: [],
  supportOps: { statusFilter: '' },
  supportExpandedCaseId: '',
  salesReportFilters: { status: 'todos', from: '', to: '' },
};

const appRoot = document.getElementById('portalApp');

const MENU = [
  {
    section: 'Visao Geral',
    items: [{ id: 'overview', label: 'Dashboard' }],
  },
  {
    section: 'Operacional',
    items: [
      { id: 'estufas', label: 'Estufas' },
      { id: 'plantios', label: 'Plantios' },
      { id: 'tarefas_agricolas', label: 'Tarefas' },
      { id: 'colheitas', label: 'Colheitas' },
      { id: 'manejos', label: 'Manejos' },
    ],
  },
  {
    section: 'Hidroponia',
    items: [
      { id: 'hidro_lotes', label: 'Lotes' },
      { id: 'hidro_leituras', label: 'Leituras' },
      { id: 'hidro_movimentacoes', label: 'Movimentacoes' },
      { id: 'hidro_motores', label: 'Motores' },
    ],
  },
  {
    section: 'Financeiro',
    items: [
      { id: 'vendas', label: 'Vendas' },
      { id: 'despesas', label: 'Despesas' },
      { id: 'clientes', label: 'Clientes' },
      { id: 'fornecedores', label: 'Fornecedores' },
    ],
  },
  {
    section: 'Seguranca',
    items: [
      { id: 'team_access', label: 'Equipe e Acessos' },
      { id: 'support_audit', label: 'Auditoria' },
    ],
  },
  {
    section: 'Suporte',
    items: [{ id: 'support_ops', label: 'Central de Suporte' }],
  },
];

const MODULE_CONFIG = {
  estufas: {
    title: 'Estufas',
    collection: 'estufas',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'tipo', label: 'Tipo', editable: true },
      { key: 'status', label: 'Status', editable: true, format: formatStatus },
      { key: 'updated_at', label: 'Atualizado', format: formatDateTime },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  plantios: {
    title: 'Plantios',
    collection: 'plantios',
    columns: [
      { key: 'cultura', label: 'Cultura', editable: true },
      { key: 'status', label: 'Status', editable: true, format: formatStatus },
      { key: 'data_plantio', label: 'Plantio', editable: true, type: 'date', format: formatDate },
      { key: 'data_previsao_colheita', label: 'Previsao', editable: true, type: 'date', format: formatDate },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  tarefas_agricolas: {
    title: 'Tarefas Agricolas',
    collection: 'tarefas_agricolas',
    columns: [
      { key: 'tipo_tarefa', label: 'Tipo', editable: true },
      { key: 'status', label: 'Status', editable: true, format: formatStatus },
      { key: 'prioridade', label: 'Prioridade', editable: true },
      { key: 'data_prevista', label: 'Data', editable: true, type: 'date', format: formatDate },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  colheitas: {
    title: 'Colheitas',
    collection: 'colheitas',
    columns: [
      { key: 'data_colheita', label: 'Data', editable: true, type: 'date', format: formatDate },
      { key: 'quantidade', label: 'Quantidade', editable: true, type: 'number' },
      { key: 'unidade_medida', label: 'Unidade', editable: true },
      { key: 'destino', label: 'Destino', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  manejos: {
    title: 'Manejos',
    collection: 'manejos',
    columns: [
      { key: 'tipo_manejo', label: 'Tipo', editable: true },
      { key: 'data_registro', label: 'Data', editable: true, type: 'date', format: formatDate },
      { key: 'responsavel', label: 'Responsavel', editable: true },
      { key: 'severidade', label: 'Severidade', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  hidro_lotes: {
    title: 'Hidroponia | Lotes',
    collection: 'hidro_lotes',
    columns: [
      { key: 'codigo_lote', label: 'Codigo', editable: true },
      { key: 'cultura_base', label: 'Cultura', editable: true },
      { key: 'saldo_disponivel', label: 'Saldo', editable: true, type: 'number' },
      { key: 'status', label: 'Status', editable: true, format: formatStatus },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  hidro_leituras: {
    title: 'Hidroponia | Leituras',
    collection: 'hidro_leituras',
    columns: [
      { key: 'measured_at', label: 'Data', editable: true, type: 'date', format: formatDateTime },
      { key: 'ph', label: 'pH', editable: true, type: 'number' },
      { key: 'condutividade_eletrica', label: 'EC', editable: true, type: 'number' },
      { key: 'temperatura_solucao', label: 'Temp Solucao', editable: true, type: 'number' },
    ],
    actions: { edit: true, delete: true },
  },
  hidro_movimentacoes: {
    title: 'Hidroponia | Movimentacoes',
    collection: 'hidro_movimentacoes',
    columns: [
      { key: 'moved_at', label: 'Data', editable: true, type: 'date', format: formatDateTime },
      { key: 'tipo', label: 'Tipo', editable: true },
      { key: 'quantidade', label: 'Quantidade', editable: true, type: 'number' },
      { key: 'fase', label: 'Fase', editable: true },
    ],
    actions: { edit: true, delete: true },
  },
  hidro_motores: {
    title: 'Hidroponia | Motores',
    collection: 'hidro_motores',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'codigo', label: 'Codigo', editable: true },
      { key: 'status', label: 'Status', editable: true, format: formatStatus },
      { key: 'updated_at', label: 'Atualizado', format: formatDateTime },
    ],
    actions: { edit: true, delete: true },
  },
  vendas: {
    title: 'Vendas',
    collection: 'vendas',
    columns: [
      { key: 'data_venda', label: 'Data', editable: true, type: 'date', format: formatDate },
      { key: 'cliente_id', label: 'Cliente ID', editable: true },
      { key: 'valor_total', label: 'Valor', editable: true, type: 'number', format: formatCurrency },
      { key: 'status_pagamento', label: 'Pagamento', editable: true, format: formatStatus },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  despesas: {
    title: 'Despesas',
    collection: 'despesas',
    columns: [
      { key: 'descricao', label: 'Descricao', editable: true },
      { key: 'categoria', label: 'Categoria', editable: true },
      { key: 'valor', label: 'Valor', editable: true, type: 'number', format: formatCurrency },
      { key: 'status_pagamento', label: 'Status', editable: true, format: formatStatus },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  clientes: {
    title: 'Clientes',
    collection: 'clientes',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'telefone', label: 'Telefone', editable: true },
      { key: 'email', label: 'Email', editable: true },
      { key: 'cidade', label: 'Cidade', editable: true },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  fornecedores: {
    title: 'Fornecedores',
    collection: 'fornecedores',
    columns: [
      { key: 'nome', label: 'Nome', editable: true },
      { key: 'contato', label: 'Contato', editable: true },
      { key: 'telefone', label: 'Telefone', editable: true },
      { key: 'categoria', label: 'Categoria', editable: true },
    ],
    actions: { create: true, edit: true, delete: true },
  },
  support_audit: {
    title: 'Support Audit',
    collection: 'support_audit',
    columns: [
      { key: 'created_at', label: 'Data', format: formatDateTime },
      { key: 'action', label: 'Acao' },
      { key: 'created_by', label: 'Tecnico' },
      { key: 'note', label: 'Justificativa' },
    ],
    actions: { edit: false, delete: false },
    readOnly: true,
  },
};

const CREATE_FIELD_PRESETS = {
  estufas: [
    { key: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Nome da estufa' },
    {
      key: 'tipo',
      label: 'Tipo',
      type: 'select',
      options: ['hidroponia', 'solo', 'semi-hidroponia'],
      placeholder: 'Selecione',
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['ativa', 'manutencao', 'desativada'],
      defaultValue: 'ativa',
    },
  ],
  plantios: [
    { key: 'estufa_id', label: 'Estufa ID', type: 'text', required: true, placeholder: 'UUID da estufa' },
    { key: 'cultura', label: 'Cultura', type: 'text', required: true },
    { key: 'variedade', label: 'Variedade', type: 'text' },
    { key: 'data_plantio', label: 'Data de Plantio', type: 'date' },
    { key: 'data_previsao_colheita', label: 'Previsao de Colheita', type: 'date' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['em_desenvolvimento', 'em_crescimento', 'em_colheita', 'colheita_iniciada', 'finalizado', 'cancelado'],
      defaultValue: 'em_desenvolvimento',
    },
  ],
  tarefas_agricolas: [
    { key: 'plantio_id', label: 'Plantio ID', type: 'text', required: true, placeholder: 'UUID do plantio' },
    {
      key: 'tipo_tarefa',
      label: 'Tipo da Tarefa',
      type: 'select',
      required: true,
      options: ['irrigacao', 'adubacao', 'manejo', 'colheita', 'inspecao', 'outro'],
    },
    { key: 'data_prevista', label: 'Data Prevista', type: 'date', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
      defaultValue: 'pendente',
    },
    {
      key: 'prioridade',
      label: 'Prioridade',
      type: 'select',
      options: ['baixa', 'media', 'alta', 'critica'],
      defaultValue: 'media',
    },
    { key: 'observacoes', label: 'Observacoes', type: 'text' },
  ],
  hidro_lotes: [
    { key: 'estufa_id', label: 'Estufa ID', type: 'text', required: true, placeholder: 'UUID da estufa' },
    { key: 'setor_id', label: 'Setor ID', type: 'text', required: true, placeholder: 'UUID do setor hidro' },
    { key: 'nome_operacional', label: 'Nome Operacional', type: 'text', required: true },
    { key: 'origem_material_nome', label: 'Origem do Material', type: 'text', required: true },
    { key: 'origem_material_documento', label: 'Documento de Origem', type: 'text' },
    { key: 'codigo_lote', label: 'Codigo do Lote', type: 'text', placeholder: 'Opcional (auto se vazio)' },
    { key: 'quantidade_inicial', label: 'Quantidade Inicial', type: 'number', required: true },
    { key: 'cultura_base', label: 'Cultura Base', type: 'text' },
    { key: 'variedade_base', label: 'Variedade Base', type: 'text' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: ['ativo', 'concluido', 'cancelado'],
      defaultValue: 'ativo',
    },
  ],
  vendas: [
    {
      key: 'origin_type',
      label: 'Origem',
      type: 'select',
      options: ['plantio', 'hydro_lote'],
      defaultValue: 'plantio',
    },
    { key: 'origin_id', label: 'Origin ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'plantio_id', label: 'Plantio ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'hydro_lote_id', label: 'Lote Hidro ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'estufa_id', label: 'Estufa ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'cliente_id', label: 'Cliente ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'item_descricao', label: 'Descricao do Item', type: 'text' },
    { key: 'quantidade', label: 'Quantidade', type: 'number', required: true },
    { key: 'unidade', label: 'Unidade', type: 'text', required: true, placeholder: 'kg, unidade, moco...' },
    { key: 'preco_unitario', label: 'Preco Unitario', type: 'number', required: true },
    {
      key: 'metodo_pagamento',
      label: 'Metodo de Pagamento',
      type: 'select',
      options: ['pix', 'dinheiro', 'cartao', 'prazo'],
      defaultValue: 'pix',
    },
    { key: 'data_venda', label: 'Data da Venda', type: 'date' },
    { key: 'observacoes', label: 'Observacoes', type: 'text' },
  ],
  despesas: [
    { key: 'descricao', label: 'Descricao', type: 'text', required: true },
    {
      key: 'categoria',
      label: 'Categoria',
      type: 'select',
      options: ['energia', 'agua', 'manutencao', 'mao_de_obra', 'outro'],
      defaultValue: 'outro',
    },
    { key: 'valor', label: 'Valor', type: 'number', required: true },
    { key: 'data_despesa', label: 'Data da Despesa', type: 'date' },
    {
      key: 'status_pagamento',
      label: 'Status Pagamento',
      type: 'select',
      options: ['pendente', 'pago', 'atrasado', 'cancelado'],
      defaultValue: 'pendente',
    },
    { key: 'plantio_id', label: 'Plantio ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'estufa_id', label: 'Estufa ID', type: 'text', placeholder: 'UUID opcional' },
    { key: 'observacoes', label: 'Observacoes', type: 'text' },
  ],
  clientes: [
    { key: 'nome', label: 'Nome', type: 'text', required: true },
    { key: 'telefone', label: 'Telefone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'cidade', label: 'Cidade', type: 'text' },
    { key: 'documento', label: 'Documento', type: 'text' },
  ],
  fornecedores: [
    { key: 'nome', label: 'Nome', type: 'text', required: true },
    { key: 'contato', label: 'Contato', type: 'text' },
    { key: 'telefone', label: 'Telefone', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'categoria', label: 'Categoria', type: 'text' },
  ],
};

const GLOBAL_SEARCH_SOURCES = [
  { table: 'estufas', cols: ['nome', 'tipo', 'status'] },
  { table: 'plantios', cols: ['cultura', 'status', 'codigo_lote'] },
  { table: 'vendas', cols: ['status_pagamento', 'forma_pagamento', 'metodo_pagamento'] },
  { table: 'despesas', cols: ['descricao', 'categoria', 'tipo_gasto'] },
  { table: 'clientes', cols: ['nome', 'telefone', 'email', 'cidade'] },
  { table: 'fornecedores', cols: ['nome', 'contato', 'telefone', 'categoria'] },
  { table: 'hidro_lotes', cols: ['codigo_lote', 'cultura_base', 'status'] },
  { table: 'tarefas_agricolas', cols: ['tipo_tarefa', 'status', 'prioridade'] },
];

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
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('pt-BR') : '-';
}

function formatDateTime(value) {
  const d = toDate(value);
  return d ? d.toLocaleString('pt-BR') : '-';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatStatus(value) {
  const v = String(value || 'n/a').toLowerCase();
  const cls =
    v === 'pago' || v === 'concluida' || v === 'ativo' || v === 'ativa' ? 'success' : v === 'pendente' ? 'warn' : 'muted';
  return `<span class="tag ${cls}">${escapeHtml(v)}</span>`;
}

function setStatus(message, isError = false) {
  el.statusBar.classList.remove('hidden', 'ok', 'error');
  el.statusBar.classList.add(isError ? 'error' : 'ok');
  el.statusBar.textContent = message;
}

function clearStatus() {
  el.statusBar.classList.add('hidden');
  el.statusBar.textContent = '';
}

function ensureSupabase(url, key) {
  if (!url || !key) throw new Error('Informe URL e anon key do Supabase.');
  supabase = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isWriteUnlocked() {
  const until = Number(sessionStorage.getItem(WRITE_UNLOCK_KEY) || '0');
  return Number.isFinite(until) && until > Date.now();
}

function setWriteUnlocked(minutes) {
  const until = Date.now() + minutes * 60 * 1000;
  sessionStorage.setItem(WRITE_UNLOCK_KEY, String(until));
}

function lockWriteMode() {
  sessionStorage.removeItem(WRITE_UNLOCK_KEY);
}

function getUnlockRemainingMinutes() {
  const until = Number(sessionStorage.getItem(WRITE_UNLOCK_KEY) || '0');
  const diffMs = Math.max(0, until - Date.now());
  return Math.ceil(diffMs / 60000);
}

function ensureWriteAllowed() {
  if (!isWriteUnlocked()) {
    throw new Error('Modo leitura ativo. Destrave escrita para executar essa acao.');
  }
}

function ensureTableState(collectionName) {
  if (!state.tableState[collectionName]) {
    state.tableState[collectionName] = { page: 1, search: '' };
  }
  return state.tableState[collectionName];
}

function getCellValue(row, column) {
  const raw = row[column.key];
  if (column.format) return column.format(raw, row);
  return escapeHtml(raw ?? '-');
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,role,is_support_agent')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function canAccess(profile) {
  if (!profile) return false;
  return Boolean(profile.is_support_agent) || profile.role === 'admin';
}

async function loadTenants() {
  if (!state.allowed) return;
  const profile = state.profile || {};
  if (profile.is_support_agent || profile.role === 'admin') {
    const { data, error } = await supabase.from('tenants').select('id,name,owner_user_id').order('name');
    if (error) throw error;
    state.tenants = (data || []).map((t) => ({
      id: t.id,
      label: formatTenantLabel(t.name || 'Sem nome', t.id),
    }));
  } else {
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('tenant_id, tenants(id,name,owner_user_id)')
      .eq('user_id', state.user.id);
    if (error) throw error;
    state.tenants = (data || []).map((m) => ({
      id: m.tenant_id,
      label: formatTenantLabel(m.tenants?.name || 'Sem nome', m.tenant_id),
    }));
  }
  if (!state.selectedTenantId && state.tenants[0]) state.selectedTenantId = state.tenants[0].id;
}

function formatTenantLabel(name, tenantId) {
  const shortId = String(tenantId || '').slice(0, 8);
  return `${name} · ${shortId}`;
}

async function queryTenantCollection(collectionName) {
  if (!state.selectedTenantId) return [];
  let req = supabase.from(collectionName).select('*').eq('tenant_id', state.selectedTenantId);
  if (collectionName !== 'support_audit') req = req.limit(500);

  if (collectionName === 'support_audit') {
    const filters = state.auditFilters;
    if (filters.action) req = req.ilike('action', `%${filters.action}%`);
    if (filters.actor && isUuid(filters.actor)) req = req.eq('created_by', filters.actor);
    if (filters.from) req = req.gte('created_at', `${filters.from}T00:00:00.000Z`);
    if (filters.to) req = req.lte('created_at', `${filters.to}T23:59:59.999Z`);
  }

  const { data, error } = await req;
  if (error) throw error;
  const rows = data || [];
  rows.sort((a, b) => {
    const av = new Date(a.updated_at || a.created_at || 0).getTime();
    const bv = new Date(b.updated_at || b.created_at || 0).getTime();
    return bv - av;
  });
  return rows;
}

function getFilteredRowsForCollection(collectionName) {
  const config = MODULE_CONFIG[collectionName];
  const rows = state.cachedRows[collectionName] || [];
  if (!config) return rows;

  const table = ensureTableState(collectionName);
  const term = String(table.search || '')
    .toLowerCase()
    .trim();

  let filtered = rows;

  if (collectionName === 'vendas') {
    const { status, from, to } = state.salesReportFilters;
    filtered = filtered.filter((row) => {
      const rowStatus = String(row.status_pagamento || '').toLowerCase();
      const rowDate = toDate(row.data_venda);
      if (status && status !== 'todos' && rowStatus !== status) return false;
      if (from && rowDate) {
        const fromDate = new Date(`${from}T00:00:00`);
        if (rowDate.getTime() < fromDate.getTime()) return false;
      }
      if (to && rowDate) {
        const toDateLimit = new Date(`${to}T23:59:59`);
        if (rowDate.getTime() > toDateLimit.getTime()) return false;
      }
      return true;
    });
  }

  if (!term) return filtered;

  return filtered.filter((row) => config.columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(term)));
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilenameSegment(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function reportDateToken() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeSalesMeasureLabel(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'caixas' || raw === 'caixa' || raw === 'cx') return 'CAIXAS';
  if (raw === 'kg' || raw === 'quilo' || raw === 'quilos') return 'KG';
  if (raw === 'un' || raw === 'unidade' || raw === 'unidades') return 'UN';
  return raw ? raw.toUpperCase() : 'UN';
}

function buildSalesSummary(rows) {
  const totalGeral = rows.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  const pagos = rows.filter((item) => String(item.status_pagamento || '').toLowerCase() === 'pago');
  const pendentes = rows.filter((item) => String(item.status_pagamento || '').toLowerCase() === 'pendente');
  const cancelados = rows.filter((item) => String(item.status_pagamento || '').toLowerCase() === 'cancelado');
  const totalPago = pagos.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  const totalPendente = pendentes.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  const totalCancelado = cancelados.reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  return {
    totalGeral,
    totalPago,
    totalPendente,
    totalCancelado,
    registros: rows.length,
    pagos: pagos.length,
    pendentes: pendentes.length,
    cancelados: cancelados.length,
    recebimentoPercentual: totalGeral > 0 ? totalPago / totalGeral : 0,
    inadimplenciaPercentual: totalGeral > 0 ? totalPendente / totalGeral : 0,
  };
}

async function buildSalesExportRows() {
  const vendas = getFilteredRowsForCollection('vendas');
  const [clientes, estufas] = await Promise.all([queryTenantCollection('clientes'), queryTenantCollection('estufas')]);
  const clienteMap = new Map(clientes.map((item) => [item.id, item]));
  const estufaMap = new Map(estufas.map((item) => [item.id, item]));

  return vendas.map((item) => {
    const cliente = clienteMap.get(item.cliente_id);
    const estufa = estufaMap.get(item.estufa_id);
    const status = String(item.status_pagamento || 'pendente').toUpperCase();
    const metodo = String(item.metodo_pagamento || item.forma_pagamento || 'N/A').toUpperCase();
    const data = formatDate(item.data_venda);
    const valorTotal = Number(item.valor_total || 0);
    const valorRecebido = status === 'PAGO' ? valorTotal : 0;
    const valorPendente = status === 'PAGO' ? 0 : valorTotal;

    return {
      codigo: String(item.id || '-'),
      data,
      cliente: cliente?.nome || item.cliente_nome || item.nome_cliente || 'Venda avulsa',
      documentoCliente: cliente?.cpf_cnpj || cliente?.documento || '',
      estufa: estufa?.nome || item.estufa_nome || item.estufa_id || '-',
      lote: String(item.lote_colheita || item.codigo_lote || item.plantio_id || item.colheita_id || '-'),
      produto: item.produto_nome || item.descricao || item.cultura || 'Produto',
      quantidade: Number(item.quantidade || 0),
      medida: normalizeSalesMeasureLabel(item.unidade || item.unidade_medida || 'un'),
      quantidadeComercial: `${Number(item.quantidade || 0)} ${normalizeSalesMeasureLabel(item.unidade || item.unidade_medida || 'un')}`,
      precoUnitario: Number(item.preco_unitario || item.valor_unitario || 0),
      valorTotal,
      valorRecebido,
      valorPendente,
      metodoPagamento: metodo,
      status,
      recebidoPor: item.pagamento_para || item.recebido_por || '',
      observacoes: item.observacoes || '',
    };
  });
}

function buildPortalSalesInsights(rows) {
  const summary = buildSalesSummary(
    rows.map((item) => ({
      valor_total: item.valorTotal,
      status_pagamento: item.status.toLowerCase(),
    }))
  );

  const methodRows = Array.from(
    rows.reduce((map, item) => {
      const key = item.metodoPagamento || 'N/A';
      const current = map.get(key) || { Metodo: key, Vendas: 0, Total: 0, Pago: 0, Pendente: 0, Cancelado: 0 };
      current.Vendas += 1;
      current.Total += item.valorTotal;
      if (item.status === 'PAGO') current.Pago += item.valorTotal;
      if (item.status === 'PENDENTE') current.Pendente += item.valorTotal;
      if (item.status === 'CANCELADO') current.Cancelado += item.valorTotal;
      map.set(key, current);
      return map;
    }, new Map()).values()
  )
    .map((item) => ({ ...item, Participacao: summary.totalGeral > 0 ? item.Total / summary.totalGeral : 0 }))
    .sort((a, b) => b.Total - a.Total);

  const clientRows = Array.from(
    rows.reduce((map, item) => {
      const key = item.cliente || 'Venda avulsa';
      const current = map.get(key) || {
        Cliente: key,
        Documento: item.documentoCliente || '',
        Vendas: 0,
        Total: 0,
        Pago: 0,
        Pendente: 0,
        Cancelado: 0,
      };
      current.Vendas += 1;
      current.Total += item.valorTotal;
      if (item.status === 'PAGO') current.Pago += item.valorTotal;
      if (item.status === 'PENDENTE') current.Pendente += item.valorTotal;
      if (item.status === 'CANCELADO') current.Cancelado += item.valorTotal;
      map.set(key, current);
      return map;
    }, new Map()).values()
  )
    .map((item) => ({
      ...item,
      Participacao: summary.totalGeral > 0 ? item.Total / summary.totalGeral : 0,
      Inadimplencia: item.Total > 0 ? item.Pendente / item.Total : 0,
    }))
    .sort((a, b) => b.Total - a.Total);

  const productRows = Array.from(
    rows.reduce((map, item) => {
      const key = item.produto || 'Produto';
      const current = map.get(key) || { Produto: key, Vendas: 0, Quantidade: 0, Total: 0 };
      current.Vendas += 1;
      current.Quantidade += Number(item.quantidade || 0);
      current.Total += item.valorTotal;
      map.set(key, current);
      return map;
    }, new Map()).values()
  )
    .map((item) => ({
      ...item,
      TicketMedio: item.Vendas > 0 ? item.Total / item.Vendas : 0,
      Participacao: summary.totalGeral > 0 ? item.Total / summary.totalGeral : 0,
    }))
    .sort((a, b) => b.Total - a.Total);

  const dailyRows = Array.from(
    rows.reduce((map, item) => {
      const key = item.data || '-';
      const current = map.get(key) || { Data: key, Registros: 0, Total: 0, Pago: 0, Pendente: 0, Cancelado: 0 };
      current.Registros += 1;
      current.Total += item.valorTotal;
      if (item.status === 'PAGO') current.Pago += item.valorTotal;
      if (item.status === 'PENDENTE') current.Pendente += item.valorTotal;
      if (item.status === 'CANCELADO') current.Cancelado += item.valorTotal;
      map.set(key, current);
      return map;
    }, new Map()).values()
  );

  return {
    summary,
    methodRows,
    clientRows,
    productRows,
    dailyRows,
    pendingRows: rows.filter((item) => item.status === 'PENDENTE'),
  };
}

async function exportSalesExcelCompatFromPortal() {
  const tenant = state.tenants.find((item) => item.id === state.selectedTenantId);
  const empresa = tenant?.label || state.selectedTenantId;
  const rows = await buildSalesExportRows();
  const insights = buildPortalSalesInsights(rows);
  const fileName = `Portal_Vendas_Compativel_${sanitizeFilenameSegment(empresa)}_${reportDateToken()}.xlsx`;

  const lancamentosRows = rows.map((item) => ({
    Codigo: item.codigo,
    Data: item.data,
    Cliente: item.cliente,
    Documento: item.documentoCliente,
    Estufa: item.estufa,
    Lote: item.lote,
    Produto: item.produto,
    Quantidade: item.quantidade,
    'Caixas/KG/UN': item.medida,
    'Quantidade Comercial': item.quantidadeComercial,
    'Preco Unitario': item.precoUnitario,
    'Valor Total': item.valorTotal,
    'Valor Recebido': item.valorRecebido,
    'Valor Pendente': item.valorPendente,
    Metodo: item.metodoPagamento,
    Status: item.status,
    'Recebido Por': item.recebidoPor,
    Observacoes: item.observacoes,
  }));

  const totais = [
    { Indicador: 'Empresa', Valor: empresa },
    { Indicador: 'Tenant', Valor: state.selectedTenantId },
    { Indicador: 'Gerado em', Valor: new Date().toLocaleString('pt-BR') },
    { Indicador: 'Registros', Valor: insights.summary.registros },
    { Indicador: 'Total geral', Valor: insights.summary.totalGeral },
    { Indicador: 'Total pago', Valor: insights.summary.totalPago },
    { Indicador: 'Total pendente', Valor: insights.summary.totalPendente },
    { Indicador: 'Total cancelado', Valor: insights.summary.totalCancelado },
    { Indicador: 'Cobertura de recebimento', Valor: insights.summary.recebimentoPercentual },
  ];

  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(totais);
  const salesSheet = XLSX.utils.json_to_sheet(lancamentosRows);
  const methodsSheet = XLSX.utils.json_to_sheet(insights.methodRows);
  const clientsSheet = XLSX.utils.json_to_sheet(insights.clientRows);
  const productsSheet = XLSX.utils.json_to_sheet(insights.productRows);
  const pendingSheet = XLSX.utils.json_to_sheet(insights.pendingRows);
  const dailySheet = XLSX.utils.json_to_sheet(insights.dailyRows);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 18 }];
  salesSheet['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 24 }, { wch: 12 }, { wch: 12 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 18 }, { wch: 28 },
  ];
  salesSheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(lancamentosRows.length, 1), c: 17 } }) };
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Lancamentos');
  XLSX.utils.book_append_sheet(workbook, methodsSheet, 'Resumo Metodos');
  XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Resumo Clientes');
  XLSX.utils.book_append_sheet(workbook, productsSheet, 'Ranking Produtos');
  XLSX.utils.book_append_sheet(workbook, pendingSheet, 'Pendencias');
  XLSX.utils.book_append_sheet(workbook, dailySheet, 'Consolidado Diario');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  triggerBlobDownload(
    new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName
  );
}

async function exportSalesExcelStyledFromPortal() {
  const excelJsModule = await import('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm');
  const ExcelJS = excelJsModule.default ?? excelJsModule;
  const tenant = state.tenants.find((item) => item.id === state.selectedTenantId);
  const empresa = tenant?.label || state.selectedTenantId;
  const rows = await buildSalesExportRows();
  const insights = buildPortalSalesInsights(rows);
  const fileName = `Portal_Vendas_Completo_${sanitizeFilenameSegment(empresa)}_${reportDateToken()}.xlsx`;
  const workbook = new ExcelJS.Workbook();
  const palette = {
    brand: '1F4E78',
    brandSoft: 'D9EAF7',
    success: '2E7D32',
    successSoft: 'E8F5E9',
    warning: 'B26A00',
    warningSoft: 'FFF4D6',
    danger: 'B42318',
    dangerSoft: 'FDECEC',
    neutral: '5F6B7A',
    neutralSoft: 'EEF2F6',
    border: 'C9D3DD',
    text: '1B1F24',
    white: 'FFFFFF',
  };
  const currencyFormat = '"R$" #,##0.00';

  const applyBorder = (cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: palette.border } },
      left: { style: 'thin', color: { argb: palette.border } },
      bottom: { style: 'thin', color: { argb: palette.border } },
      right: { style: 'thin', color: { argb: palette.border } },
    };
  };

  const paint = (cell, fill, color = palette.text, bold = false) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.font = { name: 'Aptos', size: 11, bold, color: { argb: color } };
    applyBorder(cell);
  };

  const styleSheetIntro = (sheet, title, subtitle, fill, softFill, accent) => {
    sheet.insertRow(1, []);
    sheet.insertRow(1, []);
    sheet.mergeCells(`A1:${sheet.getColumn(sheet.columnCount).letter}1`);
    sheet.mergeCells(`A2:${sheet.getColumn(sheet.columnCount).letter}2`);
    sheet.getCell('A1').value = title;
    sheet.getCell('A2').value = subtitle;
    paint(sheet.getCell('A1'), fill, palette.white, true);
    paint(sheet.getCell('A2'), softFill, accent, true);
  };

  const applyZebraAndFormats = (sheet, startRow, endRow, options = {}) => {
    const { currencyCols = [], percentCols = [], statusCol = '' } = options;
    for (let i = startRow; i <= endRow; i += 1) {
      const row = sheet.getRow(i);
      row.eachCell((cell) => {
        applyBorder(cell);
        if (i % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FAFCFE' } };
        }
      });
      currencyCols.forEach((col) => {
        sheet.getCell(`${col}${i}`).numFmt = currencyFormat;
      });
      percentCols.forEach((col) => {
        sheet.getCell(`${col}${i}`).numFmt = '0.00%';
      });
      if (statusCol) {
        const statusCell = sheet.getCell(`${statusCol}${i}`);
        const status = String(statusCell.value || '').toUpperCase();
        if (status === 'PAGO') paint(statusCell, palette.successSoft, palette.success, true);
        if (status === 'PENDENTE') paint(statusCell, palette.warningSoft, palette.warning, true);
        if (status === 'CANCELADO') paint(statusCell, palette.dangerSoft, palette.danger, true);
      }
    }
  };

  const summary = workbook.addWorksheet('Resumo Executivo');
  summary.columns = [{ width: 24 }, { width: 18 }, { width: 24 }, { width: 18 }, { width: 24 }, { width: 18 }];
  summary.mergeCells('A1:D1');
  summary.getCell('A1').value = 'RELATORIO DE VENDAS - PORTAL DE SUPORTE';
  paint(summary.getCell('A1'), palette.brand, palette.white, true);
  const indicators = [
    ['Empresa', empresa, 'Tenant', state.selectedTenantId],
    ['Gerado em', new Date().toLocaleString('pt-BR'), 'Registros', insights.summary.registros],
    ['Total geral', insights.summary.totalGeral, 'Total pago', insights.summary.totalPago],
    ['Total pendente', insights.summary.totalPendente, 'Total cancelado', insights.summary.totalCancelado],
    ['Cobertura recebimento', insights.summary.recebimentoPercentual, 'Inadimplencia', insights.summary.inadimplenciaPercentual],
  ];
  indicators.forEach((line, index) => {
    const rowNumber = index + 3;
    line.forEach((value, colIndex) => {
      const cell = summary.getCell(rowNumber, colIndex + 1);
      cell.value = value;
      paint(cell, colIndex % 2 === 0 ? palette.brandSoft : palette.white, colIndex % 2 === 0 ? palette.brand : palette.text, colIndex % 2 === 0);
      if (typeof value === 'number' && colIndex % 2 === 1) {
        cell.numFmt = rowNumber === 6 ? '0.00%' : currencyFormat;
      }
    });
  });

  const sales = workbook.addWorksheet('Lancamentos', { views: [{ state: 'frozen', ySplit: 1 }] });
  sales.columns = [
    { header: 'Codigo', key: 'codigo', width: 14 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Cliente', key: 'cliente', width: 26 },
    { header: 'Documento', key: 'documentoCliente', width: 18 },
    { header: 'Estufa', key: 'estufa', width: 20 },
    { header: 'Lote', key: 'lote', width: 18 },
    { header: 'Produto', key: 'produto', width: 24 },
    { header: 'Quantidade', key: 'quantidade', width: 12 },
    { header: 'Caixas/KG/UN', key: 'medida', width: 12 },
    { header: 'Quantidade Comercial', key: 'quantidadeComercial', width: 18 },
    { header: 'Preco Unitario', key: 'precoUnitario', width: 14 },
    { header: 'Valor Total', key: 'valorTotal', width: 14 },
    { header: 'Valor Recebido', key: 'valorRecebido', width: 14 },
    { header: 'Valor Pendente', key: 'valorPendente', width: 14 },
    { header: 'Metodo', key: 'metodoPagamento', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Recebido Por', key: 'recebidoPor', width: 18 },
  ];
  sales.addRows(rows);
  styleSheetIntro(sales, 'LANCAMENTOS COMERCIAIS', `${empresa} • tenant ${state.selectedTenantId}`, palette.brand, palette.brandSoft, palette.brand);
  sales.getRow(1).eachCell((cell) => paint(cell, palette.brand, palette.white, true));
  sales.getRow(3).eachCell((cell) => paint(cell, palette.brand, palette.white, true));
  applyZebraAndFormats(sales, 4, sales.rowCount, { currencyCols: ['K', 'L', 'M', 'N'], statusCol: 'P' });

  const methods = workbook.addWorksheet('Resumo Metodos', { views: [{ state: 'frozen', ySplit: 1 }] });
  methods.columns = [
    { header: 'Metodo', key: 'Metodo', width: 22 },
    { header: 'Vendas', key: 'Vendas', width: 12 },
    { header: 'Total', key: 'Total', width: 14 },
    { header: 'Pago', key: 'Pago', width: 14 },
    { header: 'Pendente', key: 'Pendente', width: 14 },
    { header: 'Cancelado', key: 'Cancelado', width: 14 },
    { header: 'Participacao', key: 'Participacao', width: 14 },
  ];
  methods.addRows(insights.methodRows);
  styleSheetIntro(methods, 'RESUMO POR METODO DE PAGAMENTO', `${empresa} • conciliacao financeira`, palette.neutral, palette.neutralSoft, palette.neutral);
  methods.getRow(3).eachCell((cell) => paint(cell, palette.neutral, palette.white, true));
  applyZebraAndFormats(methods, 4, methods.rowCount, { currencyCols: ['C', 'D', 'E', 'F'], percentCols: ['G'] });

  const clients = workbook.addWorksheet('Resumo Clientes', { views: [{ state: 'frozen', ySplit: 1 }] });
  clients.columns = [
    { header: 'Cliente', key: 'Cliente', width: 28 },
    { header: 'Documento', key: 'Documento', width: 18 },
    { header: 'Vendas', key: 'Vendas', width: 12 },
    { header: 'Total', key: 'Total', width: 14 },
    { header: 'Pago', key: 'Pago', width: 14 },
    { header: 'Pendente', key: 'Pendente', width: 14 },
    { header: 'Cancelado', key: 'Cancelado', width: 14 },
    { header: 'Participacao', key: 'Participacao', width: 14 },
    { header: 'Inadimplencia', key: 'Inadimplencia', width: 14 },
  ];
  clients.addRows(insights.clientRows);
  styleSheetIntro(clients, 'RANKING E INADIMPLENCIA POR CLIENTE', `${empresa} • leitura comercial`, palette.success, palette.successSoft, palette.success);
  clients.getRow(3).eachCell((cell) => paint(cell, palette.success, palette.white, true));
  applyZebraAndFormats(clients, 4, clients.rowCount, { currencyCols: ['D', 'E', 'F', 'G'], percentCols: ['H', 'I'] });

  const products = workbook.addWorksheet('Ranking Produtos', { views: [{ state: 'frozen', ySplit: 1 }] });
  products.columns = [
    { header: 'Produto', key: 'Produto', width: 30 },
    { header: 'Vendas', key: 'Vendas', width: 12 },
    { header: 'Quantidade', key: 'Quantidade', width: 14 },
    { header: 'Total', key: 'Total', width: 14 },
    { header: 'TicketMedio', key: 'TicketMedio', width: 14 },
    { header: 'Participacao', key: 'Participacao', width: 14 },
  ];
  products.addRows(insights.productRows);
  styleSheetIntro(products, 'RANKING DE PRODUTOS', `${empresa} • participacao no faturamento`, palette.brand, palette.brandSoft, palette.brand);
  products.getRow(3).eachCell((cell) => paint(cell, palette.brand, palette.white, true));
  applyZebraAndFormats(products, 4, products.rowCount, { currencyCols: ['D', 'E'], percentCols: ['F'] });

  const pending = workbook.addWorksheet('Pendencias', { views: [{ state: 'frozen', ySplit: 1 }] });
  pending.columns = [
    { header: 'Codigo', key: 'codigo', width: 14 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Cliente', key: 'cliente', width: 26 },
    { header: 'Documento', key: 'documentoCliente', width: 18 },
    { header: 'Produto', key: 'produto', width: 24 },
    { header: 'Valor Pendente', key: 'valorPendente', width: 16 },
    { header: 'Metodo', key: 'metodoPagamento', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  pending.addRows(insights.pendingRows);
  styleSheetIntro(pending, 'PENDENCIAS FINANCEIRAS', `${empresa} • cobrancas em aberto`, palette.warning, palette.warningSoft, palette.warning);
  pending.getRow(3).eachCell((cell) => paint(cell, palette.warning, palette.white, true));
  applyZebraAndFormats(pending, 4, pending.rowCount, { currencyCols: ['F'], statusCol: 'H' });

  const daily = workbook.addWorksheet('Consolidado Diario', { views: [{ state: 'frozen', ySplit: 1 }] });
  daily.columns = [
    { header: 'Data', key: 'Data', width: 14 },
    { header: 'Registros', key: 'Registros', width: 12 },
    { header: 'Total', key: 'Total', width: 14 },
    { header: 'Pago', key: 'Pago', width: 14 },
    { header: 'Pendente', key: 'Pendente', width: 14 },
    { header: 'Cancelado', key: 'Cancelado', width: 14 },
  ];
  daily.addRows(insights.dailyRows);
  styleSheetIntro(daily, 'CONSOLIDADO DIARIO', `${empresa} • ritmo de faturamento`, palette.neutral, palette.neutralSoft, palette.neutral);
  daily.getRow(3).eachCell((cell) => paint(cell, palette.neutral, palette.white, true));
  applyZebraAndFormats(daily, 4, daily.rowCount, { currencyCols: ['C', 'D', 'E', 'F'] });

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
      triggerBlobDownload(
    new Blob([blobBytes.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName
  );
}

async function logSupportAction({ action, note, metadata }) {
  const payload = {
    tenant_id: state.selectedTenantId,
    action,
    note,
    metadata,
    created_by: state.user.id,
  };
  const { error } = await supabase.from('support_audit').insert(payload);
  if (error) throw error;
}

function buildRowActions(config, row) {
  if (config.readOnly) return '';
  const actions = [];
  const disabled = !isWriteUnlocked();
  if (config.actions.edit) {
    actions.push(
      `<button class="btn btn-soft" data-action="edit" data-id="${row.id}" ${disabled ? 'disabled' : ''}>Editar</button>`
    );
  }
  if (config.actions.delete) {
    actions.push(
      `<button class="btn btn-danger" data-action="delete" data-id="${row.id}" ${disabled ? 'disabled' : ''}>Apagar</button>`
    );
  }
  return `<div class="table-actions">${actions.join('')}</div>`;
}

function buildTableHtml(config, rows, collectionName) {
  const table = ensureTableState(collectionName);
  const filtered = getFilteredRowsForCollection(collectionName);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  table.page = Math.min(table.page, totalPages);
  const start = (table.page - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);
  const head = config.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = pageRows
    .map((row) => {
      const cols = config.columns.map((c) => `<td>${getCellValue(row, c)}</td>`).join('');
      return `<tr data-row-id="${row.id}">${cols}<td>${buildRowActions(config, row)}</td></tr>`;
    })
    .join('');

  const auditFilters =
    collectionName === 'support_audit'
      ? `
      <div class="row" style="margin-top:10px;">
        <input class="input" id="audit-filter-action" placeholder="Filtrar acao" value="${escapeHtml(state.auditFilters.action)}" />
        <input class="input" id="audit-filter-actor" placeholder="Filtrar tecnico" value="${escapeHtml(state.auditFilters.actor)}" />
      </div>
      <div class="row" style="margin-top:10px;">
        <input class="input" id="audit-filter-from" type="date" value="${escapeHtml(state.auditFilters.from)}" />
        <input class="input" id="audit-filter-to" type="date" value="${escapeHtml(state.auditFilters.to)}" />
        <button class="btn btn-outline" data-action="audit-apply-filters">Aplicar filtros</button>
        <button class="btn btn-outline" data-action="audit-reset-filters">Limpar</button>
        <button class="btn btn-primary" data-action="audit-export-csv">Exportar CSV</button>
      </div>
    `
      : '';

  const salesExports =
    collectionName === 'vendas'
      ? `
      ${(() => {
        const summary = buildSalesSummary(filtered);
        return `
      <div class="card" style="margin-top:10px;background:var(--surface-2);">
        <h2>Relatorio de vendas</h2>
        <div class="row">
          <select class="input" id="sales-filter-status">
            <option value="todos" ${state.salesReportFilters.status === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="pago" ${state.salesReportFilters.status === 'pago' ? 'selected' : ''}>Pagos</option>
            <option value="pendente" ${state.salesReportFilters.status === 'pendente' ? 'selected' : ''}>Pendentes</option>
            <option value="cancelado" ${state.salesReportFilters.status === 'cancelado' ? 'selected' : ''}>Cancelados</option>
          </select>
          <input class="input" id="sales-filter-from" type="date" value="${escapeHtml(state.salesReportFilters.from)}" />
          <input class="input" id="sales-filter-to" type="date" value="${escapeHtml(state.salesReportFilters.to)}" />
          <button class="btn btn-outline" data-action="sales-apply-filters">Aplicar filtros</button>
          <button class="btn btn-outline" data-action="sales-reset-filters">Limpar</button>
        </div>
        <div class="grid cols-4" style="margin-top:10px;">
          <div class="kpi"><span class="label">Registros</span><span class="value">${summary.registros}</span></div>
          <div class="kpi"><span class="label">Total geral</span><span class="value">${formatCurrency(summary.totalGeral)}</span></div>
          <div class="kpi"><span class="label">Total pago</span><span class="value">${formatCurrency(summary.totalPago)}</span></div>
          <div class="kpi"><span class="label">Total pendente</span><span class="value">${formatCurrency(summary.totalPendente)}</span></div>
        </div>
      </div>
      `;
      })()}
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-outline" data-action="sales-export-excel-compat">Excel Compativel</button>
        <button class="btn btn-primary" data-action="sales-export-excel-styled">Excel Completo</button>
      </div>
    `
      : '';

  return `
    <div class="card">
      <h2>${escapeHtml(config.title)}</h2>
      <div class="row">
        <input class="input" id="search-${collectionName}" placeholder="Pesquisar..." value="${escapeHtml(table.search)}" />
        ${
          config.actions?.create
            ? `<button class="btn btn-primary" data-action="create-record" data-collection="${escapeHtml(collectionName)}" ${!isWriteUnlocked() ? 'disabled' : ''}>Criar registro</button>`
            : ''
        }
      </div>
      ${auditFilters}
      ${salesExports}
      <div class="table-wrap" style="margin-top:10px;">
        <table>
          <thead><tr>${head}<th>Acoes</th></tr></thead>
          <tbody>${body || `<tr><td colspan="${config.columns.length + 1}">Sem registros.</td></tr>`}</tbody>
        </table>
      </div>
      <div class="row" style="margin-top:10px;justify-content:space-between;align-items:center;">
        <small>${filtered.length} registro(s)</small>
        <div class="row">
          <button class="btn btn-outline" data-action="prev-page" data-collection="${collectionName}">Anterior</button>
          <span>Pagina ${table.page}/${totalPages}</span>
          <button class="btn btn-outline" data-action="next-page" data-collection="${collectionName}">Proxima</button>
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
      <p>Portal Externo</p>
    </div>
    ${sections}
  `;
}

function renderTenantSelector() {
  const opts = state.tenants
    .map(
      (t) =>
        `<option value="${escapeHtml(t.id)}" ${state.selectedTenantId === t.id ? 'selected' : ''}>${escapeHtml(
          t.label
        )}</option>`
    )
    .join('');
  const writeUnlocked = isWriteUnlocked();
  const modeText = writeUnlocked
    ? `Escrita liberada (${getUnlockRemainingMinutes()} min restantes)`
    : 'Somente leitura';
  const modeClass = writeUnlocked ? 'ok' : 'error';
  return `
    <div class="card">
      <h2>Tenant Ativo</h2>
      <label for="tenantSelector">Cliente / Tenant</label>
      <select id="tenantSelector">${opts}</select>
      <div class="row" style="margin-top:10px;align-items:center;">
        <span class="tag ${modeClass}">${escapeHtml(modeText)}</span>
        <button class="btn btn-outline" data-action="unlock-write">Destravar escrita</button>
        <button class="btn btn-outline" data-action="lock-write">Voltar para leitura</button>
      </div>
    </div>
  `;
}

function renderGlobalSearchCard() {
  const rows = state.globalSearchResults
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.table)}</td>
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.summary)}</td>
        <td><button class="btn btn-outline" data-action="open-search-result" data-table="${escapeHtml(r.table)}" data-id="${escapeHtml(r.id)}">Abrir</button></td>
      </tr>
    `
    )
    .join('');
  return `
    <div class="card">
      <h2>Busca Global</h2>
      <div class="row">
        <input class="input" id="global-search-term" placeholder="Buscar por ID, nome, codigo, status..." value="${escapeHtml(state.globalSearchTerm)}" />
        <button class="btn btn-primary" data-action="global-search-run">${state.globalSearching ? 'Buscando...' : 'Buscar'}</button>
        <button class="btn btn-outline" data-action="global-search-clear">Limpar</button>
      </div>
      <div class="table-wrap" style="margin-top:10px;">
        <table>
          <thead><tr><th>Tabela</th><th>ID</th><th>Resumo</th><th>Acoes</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="4">Sem resultados.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

function roleBadge(role) {
  const clean = String(role || 'guest').toLowerCase();
  const cls = clean === 'admin' ? 'danger' : clean === 'operator' ? 'warn' : 'muted';
  return `<span class="tag ${cls}">${escapeHtml(clean)}</span>`;
}

function permissionSummary(row) {
  const flags = [];
  if (row.can_read) flags.push('R');
  if (row.can_write) flags.push('W');
  if (row.can_delete) flags.push('D');
  if (row.can_manage_sharing) flags.push('S');
  return flags.join(' ') || '-';
}

function rolePreset(role) {
  const clean = String(role || '').toLowerCase();
  if (clean === 'admin') {
    return { role: 'admin', can_read: true, can_write: true, can_delete: true, can_manage_sharing: true };
  }
  if (clean === 'operator') {
    return { role: 'operator', can_read: true, can_write: true, can_delete: false, can_manage_sharing: false };
  }
  return { role: 'guest', can_read: true, can_write: false, can_delete: false, can_manage_sharing: false };
}

async function loadTeamAccessRows() {
  if (!state.selectedTenantId) return [];
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id,user_id,role,can_read,can_write,can_delete,can_manage_sharing,created_at,updated_at')
    .eq('tenant_id', state.selectedTenantId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
  let profileMap = new Map();
  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id,name,email')
      .in('id', userIds);
    if (profileError) throw profileError;
    profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  }
  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      ...row,
      user_name: profile?.name || '-',
      user_email: profile?.email || '-',
    };
  });
}

function renderTeamAccessCard() {
  const term = String(state.teamFilters.term || '').toLowerCase().trim();
  const roleFilter = String(state.teamFilters.role || '').toLowerCase().trim();
  const filteredRows = state.teamRows.filter((row) => {
    const matchesRole = !roleFilter || String(row.role || '').toLowerCase() === roleFilter;
    if (!matchesRole) return false;
    if (!term) return true;
    return [row.user_name, row.user_email, row.user_id, row.role].some((value) =>
      String(value || '').toLowerCase().includes(term)
    );
  });

  const directionFactor = state.teamSort.direction === 'asc' ? 1 : -1;
  const rows = [...filteredRows].sort((a, b) => {
    const key = state.teamSort.key;
    const aValue = a?.[key];
    const bValue = b?.[key];
    if (key === 'updated_at') {
      const aTime = new Date(aValue || a.created_at || 0).getTime();
      const bTime = new Date(bValue || b.created_at || 0).getTime();
      return (aTime - bTime) * directionFactor;
    }
    return String(aValue || '')
      .localeCompare(String(bValue || ''), 'pt-BR', { sensitivity: 'base' }) * directionFactor;
  });

  const sortIcon = (key) => {
    if (state.teamSort.key !== key) return '';
    return state.teamSort.direction === 'asc' ? ' ^' : ' v';
  };

  const tableRows = rows
    .map(
      (row) => `
      <tr data-row-id="${escapeHtml(row.id)}">
        <td>${escapeHtml(row.user_name)}</td>
        <td>${escapeHtml(row.user_email)}</td>
        <td>${escapeHtml(row.user_id)}</td>
        <td>${roleBadge(row.role)}</td>
        <td>${escapeHtml(permissionSummary(row))}</td>
        <td>${formatDateTime(row.updated_at || row.created_at)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-soft" data-action="team-set-role" data-id="${escapeHtml(row.id)}" data-role="admin" ${!isWriteUnlocked() ? 'disabled' : ''}>Admin</button>
            <button class="btn btn-soft" data-action="team-set-role" data-id="${escapeHtml(row.id)}" data-role="operator" ${!isWriteUnlocked() ? 'disabled' : ''}>Operador</button>
            <button class="btn btn-outline" data-action="team-set-role" data-id="${escapeHtml(row.id)}" data-role="guest" ${!isWriteUnlocked() ? 'disabled' : ''}>Guest</button>
            <button class="btn btn-danger" data-action="team-remove" data-id="${escapeHtml(row.id)}" ${!isWriteUnlocked() ? 'disabled' : ''}>Remover</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="card">
      <h2>Equipe e Acessos</h2>
      <p class="support-note">Permissoes por tenant. R=read, W=write, D=delete, S=sharing.</p>
      <div class="row">
        <button class="btn btn-primary" data-action="team-add-member" ${!isWriteUnlocked() ? 'disabled' : ''}>Adicionar membro</button>
      </div>
      <div class="row" style="margin-top:10px;">
        <input class="input" id="team-filter-term" placeholder="Buscar por nome, email, user ID..." value="${escapeHtml(
          state.teamFilters.term
        )}" />
        <select class="input" id="team-filter-role">
          <option value="" ${state.teamFilters.role ? '' : 'selected'}>Todas as roles</option>
          <option value="admin" ${state.teamFilters.role === 'admin' ? 'selected' : ''}>admin</option>
          <option value="operator" ${state.teamFilters.role === 'operator' ? 'selected' : ''}>operator</option>
          <option value="guest" ${state.teamFilters.role === 'guest' ? 'selected' : ''}>guest</option>
        </select>
      </div>
      <div class="table-wrap" style="margin-top:10px;">
        <table>
          <thead>
            <tr>
              <th><button class="btn btn-outline" data-action="team-sort" data-key="user_name">Nome${sortIcon('user_name')}</button></th>
              <th><button class="btn btn-outline" data-action="team-sort" data-key="user_email">Email${sortIcon('user_email')}</button></th>
              <th><button class="btn btn-outline" data-action="team-sort" data-key="user_id">User ID${sortIcon('user_id')}</button></th>
              <th><button class="btn btn-outline" data-action="team-sort" data-key="role">Role${sortIcon('role')}</button></th>
              <th>Perm.</th>
              <th><button class="btn btn-outline" data-action="team-sort" data-key="updated_at">Atualizado${sortIcon('updated_at')}</button></th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="7">Sem membros neste tenant.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="row" style="margin-top:10px;justify-content:space-between;align-items:center;">
        <small>${rows.length} membro(s)</small>
      </div>
    </div>
  `;
}

async function loadTeamAuditRows() {
  if (!state.selectedTenantId) return [];
  const actions = ['tenant_memberships.create', 'tenant_memberships.update', 'tenant_memberships.delete'];
  const { data, error } = await supabase
    .from('support_audit')
    .select('id,created_at,created_by,action,note,metadata')
    .eq('tenant_id', state.selectedTenantId)
    .in('action', actions)
    .order('created_at', { ascending: false })
    .limit(12);
  if (error) throw error;
  return data || [];
}

function summarizeTeamAuditEntry(row) {
  const md = row?.metadata || {};
  const after = md.after || {};
  const before = md.before || {};
  if (row.action === 'tenant_memberships.create') {
    return `Acesso criado para ${after.user_id || '-'} como ${after.role || '-'}`;
  }
  if (row.action === 'tenant_memberships.delete') {
    return `Acesso removido de ${before.user_id || '-'}`;
  }
  if (row.action === 'tenant_memberships.update') {
    return `Role alterada de ${before.role || '-'} para ${after.role || '-'}`;
  }
  return row.action;
}

function renderTeamAuditCard() {
  const totalPages = Math.max(1, Math.ceil(state.teamAuditRows.length / TEAM_AUDIT_PAGE_SIZE));
  state.teamAuditPage = Math.max(1, Math.min(state.teamAuditPage, totalPages));
  const start = (state.teamAuditPage - 1) * TEAM_AUDIT_PAGE_SIZE;
  const rows = state.teamAuditRows.slice(start, start + TEAM_AUDIT_PAGE_SIZE);
  const body = rows
    .map(
      (row) => `
      <tr>
        <td>${formatDateTime(row.created_at)}</td>
        <td>${escapeHtml(row.created_by)}</td>
        <td>${escapeHtml(summarizeTeamAuditEntry(row))}</td>
        <td>${escapeHtml(row.note || '-')}</td>
      </tr>
    `
    )
    .join('');
  return `
    <div class="card">
      <h2>Historico de Acessos</h2>
      <div class="table-wrap" style="margin-top:10px;">
        <table>
          <thead><tr><th>Data</th><th>Tecnico</th><th>Mudanca</th><th>Justificativa</th></tr></thead>
          <tbody>${body || '<tr><td colspan="4">Sem historico recente.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="row" style="margin-top:10px;justify-content:space-between;align-items:center;">
        <small>${state.teamAuditRows.length} evento(s)</small>
        <div class="row">
          <button class="btn btn-outline" data-action="team-audit-prev">Anterior</button>
          <span>Pagina ${state.teamAuditPage}/${totalPages}</span>
          <button class="btn btn-outline" data-action="team-audit-next">Proxima</button>
        </div>
      </div>
    </div>
  `;
}

async function runGlobalSearch(term) {
  const clean = String(term || '').trim();
  if (!clean) {
    state.globalSearchResults = [];
    return;
  }
  state.globalSearching = true;
  await safeRenderMain();

  const isId = isUuid(clean);
  const encoded = clean.replaceAll(',', ' ').replaceAll('(', '').replaceAll(')', '').replaceAll('"', '').replaceAll("'", '');
  const tasks = GLOBAL_SEARCH_SOURCES.map(async (source) => {
    const filters = source.cols.map((c) => `${c}.ilike.%${encoded}%`);
    if (isId) filters.push(`id.eq.${clean}`);
    const orFilter = filters.join(',');
    const selectCols = ['id', ...source.cols].join(',');
    const { data, error } = await supabase
      .from(source.table)
      .select(selectCols)
      .eq('tenant_id', state.selectedTenantId)
      .or(orFilter)
      .limit(6);
    if (error) return [];
    return (data || []).map((row) => {
      const summaryCol = source.cols.find((c) => row[c]);
      const summary = summaryCol ? `${summaryCol}: ${row[summaryCol]}` : 'Sem resumo';
      return {
        table: source.table,
        id: row.id,
        summary: String(summary).slice(0, 120),
      };
    });
  });
  const chunks = await Promise.all(tasks);
  state.globalSearchResults = chunks.flat().slice(0, 80);
  state.globalSearching = false;
}

async function renderOverview() {
  if (!state.selectedTenantId) return '<div class="card">Selecione um tenant para iniciar.</div>';
  const [estufas, plantios, vendas, despesas, members] = await Promise.all([
    queryTenantCollection('estufas'),
    queryTenantCollection('plantios'),
    queryTenantCollection('vendas'),
    queryTenantCollection('despesas'),
    loadTeamAccessRows(),
  ]);
  const totalReceber = vendas
    .filter((v) => v.status_pagamento === 'pendente' || v.status_pagamento === 'atrasado')
    .reduce((acc, x) => acc + Number(x.valor_total || 0), 0);
  const totalPagar = despesas
    .filter((d) => d.status_pagamento === 'pendente' || d.status_pagamento === 'atrasado')
    .reduce((acc, x) => acc + Number(x.valor || 0), 0);
  return `
    <div class="card">
      <h2>KPIs</h2>
      <div class="grid cols-4">
        <div class="kpi"><span class="label">Estufas</span><span class="value">${estufas.length}</span></div>
        <div class="kpi"><span class="label">Plantios ativos</span><span class="value">${plantios.filter((p) => p.status !== 'finalizado').length}</span></div>
        <div class="kpi"><span class="label">Total a receber</span><span class="value">${formatCurrency(totalReceber)}</span></div>
        <div class="kpi"><span class="label">Total a pagar</span><span class="value">${formatCurrency(totalPagar)}</span></div>
        <div class="kpi"><span class="label">Membros</span><span class="value">${members.length}</span></div>
      </div>
    </div>
    ${renderGlobalSearchCard()}
  `;
}

function renderLogin() {
  const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  el.viewTitle.textContent = 'Portal de Suporte - Login';
  el.mainContent.innerHTML = `
    <div class="card login-card">
      <div class="login-hero">
        <h2>Acesso de suporte externo</h2>
        <p>Use uma conta com is_support_agent=true no perfil do Supabase.</p>
      </div>
      <div class="form-grid">
        <div>
          <label for="supabaseUrl">SUPABASE_URL</label>
          <input id="supabaseUrl" class="input" value="${escapeHtml(cfg.url || '')}" />
        </div>
        <div>
          <label for="supabaseAnonKey">SUPABASE_ANON_KEY</label>
          <input id="supabaseAnonKey" class="input" value="${escapeHtml(cfg.key || '')}" />
        </div>
      </div>
      <div class="form-grid">
        <div>
          <label for="loginEmail">Email</label>
          <input id="loginEmail" class="input" type="email" />
        </div>
        <div>
          <label for="loginPassword">Senha</label>
          <input id="loginPassword" class="input" type="password" />
        </div>
      </div>
      <div class="row" style="margin-top:10px;justify-content:flex-end;">
        <button id="loginBtn" class="btn btn-primary">Entrar</button>
      </div>
      <p class="support-note">Escrita fica bloqueada por padrao e exige destrave por sessao com justificativa.</p>
    </div>
  `;
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

const NON_EDITABLE_KEYS = new Set([
  'id',
  'tenant_id',
  'created_at',
  'created_by',
  'updated_at',
  'owner_user_id',
]);

function inferTypeFromValue(value) {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value && typeof value === 'object') return 'json';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
  return 'text';
}

function buildSupplementalEditableFields(row, config) {
  const mappedKeys = new Set(config.columns.map((c) => c.key));
  return Object.keys(row)
    .filter((key) => !mappedKeys.has(key) && !NON_EDITABLE_KEYS.has(key))
    .map((key) => ({
      key,
      label: key.replaceAll('_', ' '),
      type: inferTypeFromValue(row[key]),
      advanced: true,
    }));
}

function parseValueByType(type, raw) {
  if (type === 'boolean') return String(raw).toLowerCase() === 'true';
  if (type === 'json') {
    const txt = String(raw || '').trim();
    if (!txt) return null;
    try {
      return JSON.parse(txt);
    } catch (_error) {
      throw new Error('Campo JSON invalido. Revise a estrutura antes de salvar.');
    }
  }
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'date') return raw ? new Date(`${raw}T00:00:00.000Z`).toISOString() : null;
  return raw;
}

function defaultHydroLotCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `SUP-${y}${m}${d}-${hh}${mm}${ss}`;
}

function getCreateFields(collectionName, config) {
  return CREATE_FIELD_PRESETS[collectionName] || getEditableFields(config);
}

function buildCreateInput(field) {
  const name = escapeHtml(field.key);
  const label = escapeHtml(field.label || field.key);
  const required = field.required ? 'required' : '';
  const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
  const defaultValue = field.defaultValue ?? '';

  if (field.type === 'select') {
    const options = (field.options || [])
      .map((opt) => {
        const selected = String(defaultValue) === String(opt) ? 'selected' : '';
        return `<option value="${escapeHtml(opt)}" ${selected}>${escapeHtml(opt)}</option>`;
      })
      .join('');
    return `
      <div>
        <label>${label}${field.required ? ' *' : ''}</label>
        <select class="input" name="${name}" ${required}>
          ${!field.required ? '<option value="">Selecione</option>' : ''}
          ${options}
        </select>
      </div>
    `;
  }

  if (field.type === 'boolean') {
    const selectedTrue = String(defaultValue) === 'true' ? 'selected' : '';
    const selectedFalse = String(defaultValue) === 'false' ? 'selected' : '';
    return `
      <div>
        <label>${label}${field.required ? ' *' : ''}</label>
        <select class="input" name="${name}" ${required}>
          <option value="">Selecione</option>
          <option value="true" ${selectedTrue}>true</option>
          <option value="false" ${selectedFalse}>false</option>
        </select>
      </div>
    `;
  }

  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text';
  const valueAttr = defaultValue !== '' ? `value="${escapeHtml(String(defaultValue))}"` : '';
  return `
    <div>
      <label>${label}${field.required ? ' *' : ''}</label>
      <input class="input" name="${name}" type="${inputType}" ${placeholder} ${valueAttr} ${required} />
    </div>
  `;
}

function buildCreateModalHtml(collectionName, config) {
  const createFields = getCreateFields(collectionName, config);
  const fieldsHtml = createFields.map((field) => buildCreateInput(field)).join('');
  return `
    <div class="form-grid">${fieldsHtml}</div>
    <div>
      <label for="createAuditNote">Justificativa</label>
      <textarea id="createAuditNote" name="auditNote" required minlength="8" placeholder="Descreva o motivo da criacao remota."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
      <button class="btn btn-primary" type="submit">Criar</button>
    </div>
  `;
}

function buildCreatePayloadFromForm(collectionName, config, formData) {
  const createFields = getCreateFields(collectionName, config);
  const payload = {
    tenant_id: state.selectedTenantId,
    created_by: state.user?.id || null,
  };

  createFields.forEach((field) => {
    if (!formData.has(field.key)) return;
    const raw = String(formData.get(field.key) ?? '').trim();
    if (!raw) {
      if (field.required) {
        throw new Error(`Campo obrigatorio: ${field.label || field.key}`);
      }
      return;
    }
    const parsed = parseValueByType(field.type, raw);
    if (field.type === 'number' && parsed === null) {
      throw new Error(`Valor numerico invalido: ${field.label || field.key}`);
    }
    payload[field.key] = parsed;
  });

  if (collectionName === 'hidro_lotes') {
    if (!payload.codigo_lote) payload.codigo_lote = defaultHydroLotCode();
    if (!payload.quantidade_inicial || Number(payload.quantidade_inicial) <= 0) {
      throw new Error('Quantidade inicial deve ser maior que zero.');
    }
    payload.saldo_disponivel = Number(payload.quantidade_inicial);
    if (!payload.status) payload.status = 'ativo';
  }

  if (collectionName === 'vendas') {
    const quantidade = Number(payload.quantidade || 0);
    const precoUnitario = Number(payload.preco_unitario || 0);
    const unidade = String(payload.unidade || '').trim();
    if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('Quantidade deve ser maior que zero.');
    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) throw new Error('Preco unitario invalido.');
    if (!unidade) throw new Error('Unidade e obrigatoria.');

    const metodo = String(payload.metodo_pagamento || 'pix');
    const statusPagamento = metodo === 'prazo' ? 'pendente' : 'pago';
    const valorTotal = quantidade * precoUnitario;
    const dataVenda = payload.data_venda || new Date().toISOString();
    const dataVencimento =
      metodo === 'prazo' ? new Date(new Date(dataVenda).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : null;
    const originType = payload.origin_type || (payload.hydro_lote_id ? 'hydro_lote' : 'plantio');
    const originId =
      payload.origin_id !== undefined && payload.origin_id !== null && String(payload.origin_id).trim() !== ''
        ? payload.origin_id
        : originType === 'hydro_lote'
        ? payload.hydro_lote_id || null
        : payload.plantio_id || null;

    return {
      venda: {
        tenant_id: payload.tenant_id,
        created_by: payload.created_by,
        plantio_id: payload.plantio_id || null,
        hydro_lote_id: payload.hydro_lote_id || null,
        estufa_id: payload.estufa_id || null,
        cliente_id: payload.cliente_id || null,
        colheita_id: payload.colheita_id || null,
        origin_type: originType,
        origin_id: originId || null,
        data_venda: dataVenda,
        data_vencimento: dataVencimento,
        valor_total: valorTotal,
        status_pagamento: statusPagamento,
        forma_pagamento: metodo,
        metodo_pagamento: metodo,
        observacoes: payload.observacoes || '',
        quantidade,
      },
      item: {
        tenant_id: payload.tenant_id,
        descricao: payload.item_descricao || (originType === 'hydro_lote' ? 'Producao hidroponica' : 'Producao agricola'),
        quantidade,
        unidade,
        valor_unitario: precoUnitario,
      },
      _auditMetadata: {
        quantidade,
        unidade,
        preco_unitario: precoUnitario,
        metodo_pagamento: metodo,
      },
    };
  }

  if (collectionName === 'estufas' && !payload.status) payload.status = 'ativa';
  if (collectionName === 'plantios' && !payload.status) payload.status = 'em_desenvolvimento';
  if (collectionName === 'tarefas_agricolas') {
    if (!payload.status) payload.status = 'pendente';
    if (!payload.prioridade) payload.prioridade = 'media';
    if (!payload.status_history) {
      payload.status_history = [
        {
          status: payload.status,
          changedAt: new Date().toISOString(),
          changedBy: state.user?.id || null,
          reason: null,
        },
      ];
    }
  }
  if (collectionName === 'despesas') {
    if (!payload.categoria) payload.categoria = 'outro';
    if (!payload.status_pagamento) payload.status_pagamento = 'pendente';
    if (!payload.data_despesa) payload.data_despesa = new Date().toISOString();
  }

  return payload;
}

function buildCsvFromRows(rows) {
  const headers = ['created_at', 'action', 'created_by', 'note', 'tenant_id', 'metadata'];
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    const values = headers.map((key) => {
      const value = key === 'metadata' ? JSON.stringify(row[key] || {}) : String(row[key] ?? '');
      return `"${value.replaceAll('"', '""')}"`;
    });
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

function triggerCsvDownload(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateSupportCaseId() {
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CASE-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${token}`;
}

function getCaseSlaHours(priority) {
  const key = String(priority || 'media').toLowerCase();
  return CASE_SLA_HOURS[key] || CASE_SLA_HOURS.media;
}

function getCaseSlaState(item) {
  const baseTime = new Date(item.created_at || item.updated_at || Date.now()).getTime();
  const slaHours = getCaseSlaHours(item.priority);
  const deadline = baseTime + slaHours * 60 * 60 * 1000;
  const remainingMs = deadline - Date.now();
  if (item.status === 'resolvido') {
    return { label: 'Resolvido', cls: 'success' };
  }
  if (remainingMs <= 0) {
    return { label: `SLA vencido (${slaHours}h)`, cls: 'danger' };
  }
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (remainingHours <= Math.max(1, Math.floor(slaHours * 0.25))) {
    return { label: `SLA risco (${remainingHours}h)`, cls: 'warn' };
  }
  return { label: `SLA ok (${remainingHours}h)`, cls: 'success' };
}

async function loadSupportCases() {
  if (!state.selectedTenantId) return [];
  const { data, error } = await supabase
    .from('support_audit')
    .select('id,created_at,created_by,action,note,metadata')
    .eq('tenant_id', state.selectedTenantId)
    .in('action', ['support.case.opened', 'support.case.updated'])
    .order('created_at', { ascending: false })
    .limit(400);
  if (error) throw error;

  const map = new Map();
  (data || []).forEach((row) => {
    const md = row.metadata || {};
    const caseId = String(md.case_id || '').trim();
    if (!caseId) return;
    if (!map.has(caseId)) {
      map.set(caseId, {
        case_id: caseId,
        title: md.title || 'Sem titulo',
        status: md.status || 'aberto',
        priority: md.priority || 'media',
        assigned_to: md.assigned_to || '',
        tenant_id: state.selectedTenantId,
        last_note: row.note || '',
        created_at: row.created_at,
        updated_at: row.created_at,
        created_by: row.created_by,
        history: [],
      });
    }
    const current = map.get(caseId);
    current.history.push({
      audit_id: row.id,
      at: row.created_at,
      by: row.created_by,
      action: row.action,
      note: row.note || '',
      status: md.status || current.status,
      priority: md.priority || current.priority,
      assigned_to: md.assigned_to || current.assigned_to || '',
    });
    const newer = new Date(row.created_at).getTime() > new Date(current.updated_at).getTime();
    if (newer) {
      current.status = md.status || current.status;
      current.priority = md.priority || current.priority;
      current.assigned_to = md.assigned_to || current.assigned_to;
      current.last_note = row.note || current.last_note;
      current.updated_at = row.created_at;
    }
  });

  return [...map.values()].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function renderSupportOpsCard() {
  const statusFilter = String(state.supportOps.statusFilter || '');
  const cases = state.supportCases.filter((item) => !statusFilter || item.status === statusFilter);
  const openCount = state.supportCases.filter((item) => item.status === 'aberto').length;
  const progressCount = state.supportCases.filter((item) => item.status === 'em_andamento').length;
  const closedCount = state.supportCases.filter((item) => item.status === 'resolvido').length;

  const rows = cases
    .map((item) => {
      const expanded = state.supportExpandedCaseId === item.case_id;
      const timeline = expanded
        ? `<tr><td colspan="8">${renderSupportTimelineHtml(item)}</td></tr>`
        : '';
      return `
      <tr>
        <td>${escapeHtml(item.case_id)}</td>
        <td>${escapeHtml(item.title)}</td>
        <td>${formatStatus(item.status)}</td>
        <td>${escapeHtml(item.priority)}</td>
        <td>${escapeHtml(item.assigned_to || '-')}</td>
        <td><span class="tag ${getCaseSlaState(item).cls}">${escapeHtml(getCaseSlaState(item).label)}</span></td>
        <td>${formatDateTime(item.updated_at)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-soft" data-action="support-case-update" data-case-id="${escapeHtml(item.case_id)}">Atualizar</button>
            <button class="btn btn-outline" data-action="support-case-toggle-timeline" data-case-id="${escapeHtml(item.case_id)}">${expanded ? 'Ocultar timeline' : 'Ver timeline'}</button>
            <button class="btn btn-danger" data-action="support-case-escalate" data-case-id="${escapeHtml(item.case_id)}" ${!isWriteUnlocked() ? 'disabled' : ''}>Escalar</button>
          </div>
        </td>
      </tr>
      ${timeline}
    `;
    })
    .join('');

  return `
    <div class="card">
      <h2>Central de Suporte</h2>
      <div class="grid cols-4">
        <div class="kpi"><span class="label">Casos abertos</span><span class="value">${openCount}</span></div>
        <div class="kpi"><span class="label">Em andamento</span><span class="value">${progressCount}</span></div>
        <div class="kpi"><span class="label">Resolvidos</span><span class="value">${closedCount}</span></div>
        <div class="kpi"><span class="label">Total</span><span class="value">${state.supportCases.length}</span></div>
      </div>
      <div class="row" style="margin-top:10px;">
        <button class="btn btn-primary" data-action="support-case-create" ${!isWriteUnlocked() ? 'disabled' : ''}>Abrir caso</button>
        <select class="input" id="support-status-filter">
          <option value="" ${!statusFilter ? 'selected' : ''}>Todos os status</option>
          <option value="aberto" ${statusFilter === 'aberto' ? 'selected' : ''}>aberto</option>
          <option value="em_andamento" ${statusFilter === 'em_andamento' ? 'selected' : ''}>em_andamento</option>
          <option value="resolvido" ${statusFilter === 'resolvido' ? 'selected' : ''}>resolvido</option>
        </select>
      </div>
      <div class="table-wrap" style="margin-top:10px;">
        <table>
          <thead><tr><th>Case ID</th><th>Titulo</th><th>Status</th><th>Prioridade</th><th>Atribuido</th><th>SLA</th><th>Atualizado</th><th>Acoes</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8">Sem casos para este filtro.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSupportTimelineHtml(selected) {
  const history = [...(selected.history || [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const items = history
    .map(
      (item) => `
      <div class="card" style="padding:10px;">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <strong>${escapeHtml(item.action)}</strong>
          <small>${formatDateTime(item.at)}</small>
        </div>
        <div><small>Por: ${escapeHtml(item.by || '-')}</small></div>
        <div class="row" style="margin-top:6px;">
          <span class="tag muted">status: ${escapeHtml(item.status || '-')}</span>
          <span class="tag muted">prioridade: ${escapeHtml(item.priority || '-')}</span>
          <span class="tag muted">atribuido: ${escapeHtml(item.assigned_to || '-')}</span>
        </div>
        <p style="margin:8px 0 0;">${escapeHtml(item.note || '-')}</p>
      </div>
    `
    )
    .join('');
  return `
    <div>
      <label>Timeline do caso ${escapeHtml(selected.case_id || '')}</label>
      <div class="grid" style="max-height:220px;overflow:auto;">${items || '<small>Sem eventos.</small>'}</div>
    </div>
  `;
}

async function auditedUpdate({ collectionName, docId, before, patch, action, note }) {
  ensureWriteAllowed();
  await logSupportAction({
    action,
    note,
    metadata: { collection_name: collectionName, doc_id: docId, before, after: patch },
  });
  const { error } = await supabase
    .from(collectionName)
    .update(patch)
    .eq('id', docId)
    .eq('tenant_id', state.selectedTenantId);
  if (error) throw error;
}

async function auditedDelete({ collectionName, docId, before, action, note }) {
  ensureWriteAllowed();
  await logSupportAction({
    action,
    note,
    metadata: { collection_name: collectionName, doc_id: docId, before, after: null },
  });
  const { error } = await supabase
    .from(collectionName)
    .delete()
    .eq('id', docId)
    .eq('tenant_id', state.selectedTenantId);
  if (error) throw error;
}

async function loadRows(collectionName) {
  const rows = await queryTenantCollection(collectionName);
  state.cachedRows[collectionName] = rows;
  return rows;
}

async function renderMain() {
  if (!state.allowed) {
    renderLogin();
    return;
  }
  const viewConfig = MODULE_CONFIG[state.currentView];
  el.viewTitle.textContent = state.currentView === 'team_access' ? 'Equipe e Acessos' : viewConfig?.title || 'Portal de Suporte';
  let viewHtml = '';
  if (state.currentView === 'overview') {
    viewHtml = await renderOverview();
  } else if (state.currentView === 'team_access') {
    state.teamRows = await loadTeamAccessRows();
    state.teamAuditRows = await loadTeamAuditRows();
    viewHtml = `${renderTeamAccessCard()}${renderTeamAuditCard()}`;
  } else if (state.currentView === 'support_ops') {
    state.supportCases = await loadSupportCases();
    viewHtml = renderSupportOpsCard();
  } else {
    const rows = await loadRows(viewConfig.collection);
    viewHtml = buildTableHtml(viewConfig, rows, viewConfig.collection);
  }
  el.mainContent.innerHTML = `${renderTenantSelector()}${viewHtml}`;
}

async function safeRenderMain() {
  try {
    clearStatus();
    buildSidebar();
    await renderMain();
    appRoot.classList.toggle('logged-out', !state.allowed);
    el.logoutBtn.classList.toggle('hidden', !state.allowed);
    if (state.user && state.allowed) {
      el.userBadge.textContent = state.profile?.name || state.user.email || state.user.id;
      el.userBadge.classList.remove('hidden');
    } else {
      el.userBadge.classList.add('hidden');
    }
  } catch (error) {
    setStatus(error.message || 'Erro ao renderizar portal.', true);
  }
}

async function refreshSessionUser() {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  state.user = data.user;
  if (!state.user) {
    state.profile = null;
    state.allowed = false;
    state.tenants = [];
    state.selectedTenantId = '';
    state.globalSearchResults = [];
    await safeRenderMain();
    return;
  }
  state.profile = await loadProfile(state.user.id);
  state.allowed = canAccess(state.profile);
  if (!state.allowed) {
    await supabase.auth.signOut();
    throw new Error('Acesso negado: perfil sem permissao de suporte.');
  }
  await loadTenants();
  await safeRenderMain();
}

function attachGlobalListeners() {
  el.logoutBtn.addEventListener('click', async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  });

  el.sidebar.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-nav]');
    if (!btn) return;
    state.currentView = btn.dataset.nav;
    buildSidebar();
    await safeRenderMain();
  });

  el.mainContent.addEventListener('click', async (event) => {
    if (event.target.id === 'loginBtn') {
      try {
        const url = document.getElementById('supabaseUrl').value.trim();
        const key = document.getElementById('supabaseAnonKey').value.trim();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        ensureSupabase(url, key);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshSessionUser();
      } catch (error) {
        setStatus(error.message || 'Falha no login.', true);
      }
      return;
    }

    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.dataset.action;

    if (action === 'unlock-write') {
      if (!state.selectedTenantId) {
        setStatus('Selecione um tenant antes de destravar escrita.', true);
        return;
      }
      openAuditModal('Destravar escrita por sessao', async (note) => {
        await logSupportAction({
          action: 'support_portal.unlock_write',
          note,
          metadata: { unlock_minutes: WRITE_UNLOCK_MINUTES, by_user: state.user?.id || null },
        });
        setWriteUnlocked(WRITE_UNLOCK_MINUTES);
      });
      return;
    }

    if (action === 'lock-write') {
      lockWriteMode();
      setStatus('Modo leitura reativado.');
      await safeRenderMain();
      return;
    }

    if (action === 'global-search-run') {
      const term = document.getElementById('global-search-term').value.trim();
      state.globalSearchTerm = term;
      await runGlobalSearch(term);
      await safeRenderMain();
      return;
    }

    if (action === 'global-search-clear') {
      state.globalSearchTerm = '';
      state.globalSearchResults = [];
      await safeRenderMain();
      return;
    }

    if (action === 'open-search-result') {
      const table = actionBtn.dataset.table;
      const id = actionBtn.dataset.id;
      if (table && MODULE_CONFIG[table]) {
        state.currentView = table;
        ensureTableState(table).search = id || '';
        await safeRenderMain();
      }
      return;
    }

    if (action === 'audit-apply-filters') {
      state.auditFilters.action = document.getElementById('audit-filter-action')?.value?.trim() || '';
      state.auditFilters.actor = document.getElementById('audit-filter-actor')?.value?.trim() || '';
      state.auditFilters.from = document.getElementById('audit-filter-from')?.value || '';
      state.auditFilters.to = document.getElementById('audit-filter-to')?.value || '';
      await safeRenderMain();
      return;
    }

    if (action === 'audit-reset-filters') {
      state.auditFilters = { action: '', actor: '', from: '', to: '' };
      await safeRenderMain();
      return;
    }

    if (action === 'audit-export-csv') {
      const rows = state.cachedRows.support_audit || [];
      const csv = buildCsvFromRows(rows);
      triggerCsvDownload(csv, `support_audit_${new Date().toISOString().slice(0, 10)}.csv`);
      return;
    }

    if (action === 'sales-apply-filters') {
      state.salesReportFilters.status = document.getElementById('sales-filter-status')?.value || 'todos';
      state.salesReportFilters.from = document.getElementById('sales-filter-from')?.value || '';
      state.salesReportFilters.to = document.getElementById('sales-filter-to')?.value || '';
      ensureTableState('vendas').page = 1;
      await safeRenderMain();
      return;
    }

    if (action === 'sales-reset-filters') {
      state.salesReportFilters = { status: 'todos', from: '', to: '' };
      ensureTableState('vendas').page = 1;
      await safeRenderMain();
      return;
    }

    if (action === 'sales-export-excel-compat') {
      try {
        await exportSalesExcelCompatFromPortal();
        setStatus('Excel compativel exportado com sucesso.');
      } catch (error) {
        setStatus(error.message || 'Falha ao exportar o Excel compativel.', true);
      }
      return;
    }

    if (action === 'sales-export-excel-styled') {
      try {
        await exportSalesExcelStyledFromPortal();
        setStatus('Excel completo exportado com sucesso.');
      } catch (error) {
        setStatus(error.message || 'Falha ao exportar o Excel completo.', true);
      }
      return;
    }

    if (action === 'team-add-member') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de adicionar membro.', true);
        return;
      }
      const html = `
        <div class="form-grid">
          <div>
            <label>User ID *</label>
            <input class="input" name="user_id" required placeholder="UUID do usuario" />
          </div>
          <div>
            <label>Role *</label>
            <select class="input" name="role" required>
              <option value="operator">operator</option>
              <option value="guest">guest</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
        <div>
          <label>Justificativa</label>
          <textarea name="auditNote" required minlength="8" placeholder="Descreva o motivo da concessao de acesso."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
          <button class="btn btn-primary" type="submit">Adicionar</button>
        </div>
      `;
      openRecordModal('Adicionar membro do tenant', html, async (formData) => {
        const userId = String(formData.get('user_id') || '').trim();
        const role = String(formData.get('role') || 'operator').trim();
        const note = String(formData.get('auditNote') || '').trim();
        if (!isUuid(userId)) throw new Error('User ID invalido. Informe um UUID valido.');
        if (note.length < 8) throw new Error('Justificativa minima de 8 caracteres.');
        const payload = {
          tenant_id: state.selectedTenantId,
          user_id: userId,
          ...rolePreset(role),
        };
        await logSupportAction({
          action: 'tenant_memberships.create',
          note,
          metadata: { collection_name: 'tenant_memberships', before: null, after: payload },
        });
        const { error } = await supabase.from('tenant_memberships').insert(payload);
        if (error) throw error;
        setStatus('Membro adicionado com sucesso.');
      });
      return;
    }

    if (action === 'team-audit-prev' || action === 'team-audit-next') {
      state.teamAuditPage = Math.max(1, state.teamAuditPage + (action === 'team-audit-next' ? 1 : -1));
      await safeRenderMain();
      return;
    }

    if (action === 'team-sort') {
      const key = actionBtn.dataset.key;
      if (!key) return;
      if (state.teamSort.key === key) {
        state.teamSort.direction = state.teamSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        state.teamSort.key = key;
        state.teamSort.direction = key === 'updated_at' ? 'desc' : 'asc';
      }
      await safeRenderMain();
      return;
    }

    if (action === 'team-set-role') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de alterar role.', true);
        return;
      }
      const membershipId = actionBtn.dataset.id;
      const nextRole = actionBtn.dataset.role;
      const row = state.teamRows.find((item) => item.id === membershipId);
      if (!row) return;
      if (row.user_id === state.user?.id && String(nextRole) !== 'admin') {
        setStatus('Voce nao pode rebaixar seu proprio acesso admin nesta tela.', true);
        return;
      }
      const patch = rolePreset(nextRole);
      if (String(nextRole) === 'admin' && String(row.role || '').toLowerCase() !== 'admin') {
        const confirmPhrase = window.prompt('Confirme a promocao digitando: PROMOVER ADMIN');
        if (confirmPhrase !== 'PROMOVER ADMIN') {
          setStatus('Promocao para admin cancelada: confirmacao invalida.', true);
          return;
        }
      }
      openAuditModal(`Alterar role para ${nextRole}`, async (note) => {
        await logSupportAction({
          action: 'tenant_memberships.update',
          note,
          metadata: {
            collection_name: 'tenant_memberships',
            doc_id: row.id,
            before: row,
            after: patch,
          },
        });
        const { error } = await supabase
          .from('tenant_memberships')
          .update(patch)
          .eq('id', row.id)
          .eq('tenant_id', state.selectedTenantId);
        if (error) throw error;
      });
      return;
    }

    if (action === 'team-remove') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de remover membro.', true);
        return;
      }
      const membershipId = actionBtn.dataset.id;
      const row = state.teamRows.find((item) => item.id === membershipId);
      if (!row) return;
      if (row.user_id === state.user?.id) {
        setStatus('Voce nao pode remover seu proprio acesso para evitar lockout.', true);
        return;
      }
      openAuditModal(`Remover acesso de ${row.user_name}`, async (note) => {
        await logSupportAction({
          action: 'tenant_memberships.delete',
          note,
          metadata: { collection_name: 'tenant_memberships', doc_id: row.id, before: row, after: null },
        });
        const { error } = await supabase
          .from('tenant_memberships')
          .delete()
          .eq('id', row.id)
          .eq('tenant_id', state.selectedTenantId);
        if (error) throw error;
      });
      return;
    }

    if (action === 'support-case-create') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de abrir caso.', true);
        return;
      }
      const html = `
        <div class="form-grid">
          <div>
            <label>Titulo *</label>
            <input class="input" name="title" required placeholder="Ex.: Falha no cadastro de vendas" />
          </div>
          <div>
            <label>Prioridade *</label>
            <select class="input" name="priority" required>
              <option value="baixa">baixa</option>
              <option value="media" selected>media</option>
              <option value="alta">alta</option>
              <option value="critica">critica</option>
            </select>
          </div>
          <div>
            <label>Atribuir para (user_id)</label>
            <input class="input" name="assigned_to" placeholder="UUID opcional" />
          </div>
          <div>
            <label>Status inicial *</label>
            <select class="input" name="status" required>
              <option value="aberto" selected>aberto</option>
              <option value="em_andamento">em_andamento</option>
            </select>
          </div>
        </div>
        <div>
          <label>Descricao tecnica / justificativa *</label>
          <textarea name="auditNote" required minlength="8" placeholder="Descreva contexto tecnico, impacto e proximo passo."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
          <button class="btn btn-primary" type="submit">Abrir caso</button>
        </div>
      `;
      openRecordModal('Abrir caso de suporte', html, async (formData) => {
        const note = String(formData.get('auditNote') || '').trim();
        const title = String(formData.get('title') || '').trim();
        const priority = String(formData.get('priority') || 'media');
        const status = String(formData.get('status') || 'aberto');
        const assignedTo = String(formData.get('assigned_to') || '').trim();
        if (note.length < 8) throw new Error('Justificativa minima de 8 caracteres.');
        if (!title) throw new Error('Titulo e obrigatorio.');
        if (assignedTo && !isUuid(assignedTo)) throw new Error('Atribuido deve ser UUID valido.');
        const caseId = generateSupportCaseId();
        await logSupportAction({
          action: 'support.case.opened',
          note,
          metadata: {
            case_id: caseId,
            title,
            status,
            priority,
            assigned_to: assignedTo || null,
          },
        });
        setStatus(`Caso aberto com sucesso: ${caseId}`);
      });
      return;
    }

    if (action === 'support-case-update') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de atualizar caso.', true);
        return;
      }
      const caseId = String(actionBtn.dataset.caseId || '').trim();
      const selected = state.supportCases.find((item) => item.case_id === caseId);
      if (!selected) {
        setStatus('Caso nao encontrado para atualizacao.', true);
        return;
      }
      const html = `
        ${renderSupportTimelineHtml(selected)}
        <div class="form-grid">
          <div>
            <label>Status *</label>
            <select class="input" name="status" required>
              <option value="aberto" ${selected.status === 'aberto' ? 'selected' : ''}>aberto</option>
              <option value="em_andamento" ${selected.status === 'em_andamento' ? 'selected' : ''}>em_andamento</option>
              <option value="resolvido" ${selected.status === 'resolvido' ? 'selected' : ''}>resolvido</option>
            </select>
          </div>
          <div>
            <label>Prioridade *</label>
            <select class="input" name="priority" required>
              <option value="baixa" ${selected.priority === 'baixa' ? 'selected' : ''}>baixa</option>
              <option value="media" ${selected.priority === 'media' ? 'selected' : ''}>media</option>
              <option value="alta" ${selected.priority === 'alta' ? 'selected' : ''}>alta</option>
              <option value="critica" ${selected.priority === 'critica' ? 'selected' : ''}>critica</option>
            </select>
          </div>
          <div>
            <label>Atribuir para (user_id)</label>
            <input class="input" name="assigned_to" value="${escapeHtml(selected.assigned_to || '')}" placeholder="UUID opcional" />
          </div>
        </div>
        <div>
          <label>Atualizacao tecnica / justificativa *</label>
          <textarea name="auditNote" required minlength="8" placeholder="Descreva progresso, bloqueios e proximo passo."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar atualizacao</button>
        </div>
      `;
      openRecordModal(`Atualizar ${caseId}`, html, async (formData) => {
        const note = String(formData.get('auditNote') || '').trim();
        const status = String(formData.get('status') || selected.status || 'aberto');
        const priority = String(formData.get('priority') || selected.priority || 'media');
        const assignedTo = String(formData.get('assigned_to') || '').trim();
        if (note.length < 8) throw new Error('Justificativa minima de 8 caracteres.');
        if (assignedTo && !isUuid(assignedTo)) throw new Error('Atribuido deve ser UUID valido.');
        await logSupportAction({
          action: 'support.case.updated',
          note,
          metadata: {
            case_id: selected.case_id,
            title: selected.title,
            status,
            priority,
            assigned_to: assignedTo || null,
          },
        });
        setStatus(`Caso ${selected.case_id} atualizado.`);
      });
      return;
    }

    if (action === 'support-case-toggle-timeline') {
      const caseId = String(actionBtn.dataset.caseId || '').trim();
      if (!caseId) return;
      state.supportExpandedCaseId = state.supportExpandedCaseId === caseId ? '' : caseId;
      await safeRenderMain();
      return;
    }

    if (action === 'support-case-escalate') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de escalar caso.', true);
        return;
      }
      const caseId = String(actionBtn.dataset.caseId || '').trim();
      const selected = state.supportCases.find((item) => item.case_id === caseId);
      if (!selected) {
        setStatus('Caso nao encontrado para escalonamento.', true);
        return;
      }
      const html = `
        ${renderSupportTimelineHtml(selected)}
        <div class="form-grid">
          <div>
            <label>Responsavel (user_id) *</label>
            <input class="input" name="assigned_to" required placeholder="UUID do responsavel" value="${escapeHtml(
              selected.assigned_to || ''
            )}" />
          </div>
          <div>
            <label>Canal de escalonamento *</label>
            <select class="input" name="escalation_channel" required>
              <option value="on_call">on_call</option>
              <option value="engenharia">engenharia</option>
              <option value="produto">produto</option>
            </select>
          </div>
        </div>
        <div>
          <label>Motivo tecnico do escalonamento *</label>
          <textarea name="auditNote" required minlength="8" placeholder="Descreva o impacto e por que precisa escalonar."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
          <button class="btn btn-danger" type="submit">Escalar caso</button>
        </div>
      `;
      openRecordModal(`Escalar ${caseId}`, html, async (formData) => {
        const note = String(formData.get('auditNote') || '').trim();
        const assignedTo = String(formData.get('assigned_to') || '').trim();
        const channel = String(formData.get('escalation_channel') || '').trim();
        if (note.length < 8) throw new Error('Justificativa minima de 8 caracteres.');
        if (!isUuid(assignedTo)) throw new Error('Responsavel deve ser UUID valido.');
        await logSupportAction({
          action: 'support.case.escalated',
          note,
          metadata: {
            case_id: selected.case_id,
            title: selected.title,
            status: 'em_andamento',
            priority: 'critica',
            assigned_to: assignedTo,
            escalation_channel: channel || 'on_call',
          },
        });
        await logSupportAction({
          action: 'support.case.updated',
          note: `Escalonado para ${channel || 'on_call'}. ${note}`,
          metadata: {
            case_id: selected.case_id,
            title: selected.title,
            status: 'em_andamento',
            priority: 'critica',
            assigned_to: assignedTo,
          },
        });
        setStatus(`Caso ${selected.case_id} escalado com prioridade critica.`);
      });
      return;
    }

    const collectionName = actionBtn.dataset.collection || MODULE_CONFIG[state.currentView]?.collection;
    const config = Object.values(MODULE_CONFIG).find((x) => x.collection === collectionName);
    if (!config) return;

    if (action === 'prev-page' || action === 'next-page') {
      const ts = ensureTableState(collectionName);
      ts.page = Math.max(1, ts.page + (action === 'next-page' ? 1 : -1));
      await safeRenderMain();
      return;
    }

    if (action === 'create-record') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de criar.', true);
        return;
      }

      const html = buildCreateModalHtml(collectionName, config);

      openRecordModal(`Criar ${config.title}`, html, async (formData) => {
        const note = String(formData.get('auditNote') || '').trim();
        if (note.length < 8) throw new Error('Justificativa minima de 8 caracteres.');

        const createData = buildCreatePayloadFromForm(collectionName, config, formData);

        if (collectionName === 'vendas') {
          await logSupportAction({
            action: `${collectionName}.create`,
            note,
            metadata: {
              collection_name: collectionName,
              before: null,
              after: createData.venda,
              venda_item: createData.item,
              ...createData._auditMetadata,
            },
          });

          const { data: insertedVenda, error: vendaError } = await supabase
            .from('vendas')
            .insert(createData.venda)
            .select('id')
            .single();
          if (vendaError || !insertedVenda?.id) throw vendaError || new Error('Falha ao criar venda.');

          const { error: itemError } = await supabase.from('venda_itens').insert({
            ...createData.item,
            venda_id: insertedVenda.id,
          });
          if (itemError) throw itemError;

          setStatus(`Venda criada com sucesso (${insertedVenda.id}).`);
          return;
        }

        await logSupportAction({
          action: `${collectionName}.create`,
          note,
          metadata: { collection_name: collectionName, before: null, after: createData },
        });

        const { data: inserted, error } = await supabase.from(collectionName).insert(createData).select('id').single();
        if (error) throw error;
        setStatus(`Registro criado com sucesso (${inserted?.id || 'sem id'}).`);
      });
      return;
    }

    const rowEl = actionBtn.closest('tr[data-row-id]');
    const rowId = actionBtn.dataset.id || rowEl?.dataset.rowId;
    const rows = state.cachedRows[collectionName] || [];
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    if (action === 'edit') {
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de editar.', true);
        return;
      }
      const baseFields = getEditableFields(config);
      const extraFields = buildSupplementalEditableFields(row, config);
      const allFields = [...baseFields, ...extraFields];

      const fields = allFields
        .map((f) => {
          const current = row[f.key];
          const rawValue =
            f.type === 'date'
              ? toDate(current)?.toISOString().slice(0, 10) || ''
              : f.type === 'json'
              ? JSON.stringify(current ?? null)
              : current ?? '';
          const inputType = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
          const input =
            f.type === 'json'
              ? `<textarea class="input" name="${escapeHtml(f.key)}" rows="3">${escapeHtml(rawValue)}</textarea>`
              : f.type === 'boolean'
              ? `<select class="input" name="${escapeHtml(f.key)}"><option value="true" ${String(rawValue) === 'true' ? 'selected' : ''}>true</option><option value="false" ${String(rawValue) === 'false' ? 'selected' : ''}>false</option></select>`
              : `<input class="input" name="${escapeHtml(f.key)}" type="${inputType}" value="${escapeHtml(rawValue)}" />`;
          const label = f.advanced ? `${escapeHtml(String(f.label))} (extra)` : escapeHtml(String(f.label));
          return `
            <div>
              <label>${label}</label>
              ${input}
            </div>
          `;
        })
        .join('');

      const html = `
        <div class="form-grid">${fields}</div>
        <div>
          <label for="editAuditNote">Justificativa</label>
          <textarea id="editAuditNote" name="auditNote" required minlength="8" placeholder="Descreva o motivo da alteracao."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-outline" type="button" id="cancelRecordEdit">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar</button>
        </div>
      `;

      openRecordModal(`Editar ${config.title}`, html, async (formData) => {
        const patch = {};
        allFields.forEach((f) => {
          if (!formData.has(f.key)) return;
          patch[f.key] = parseValueByType(f.type, formData.get(f.key));
        });
        const note = String(formData.get('auditNote') || '').trim();
        if (note.length < 8) throw new Error('Justificativa minima de 8 caracteres.');
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
      if (!isWriteUnlocked()) {
        setStatus('Modo leitura ativo. Destrave a escrita antes de apagar.', true);
        return;
      }
      openAuditModal(`Excluir registro ${row.id}`, async (note) => {
        await auditedDelete({
          collectionName,
          docId: row.id,
          before: row,
          action: `${collectionName}.delete`,
          note,
        });
      });
    }
  });

  el.mainContent.addEventListener('input', async (event) => {
    const input = event.target;
    if (!input.id.startsWith('search-')) return;
    const collectionName = input.id.replace('search-', '');
    const ts = ensureTableState(collectionName);
    ts.search = input.value;
    ts.page = 1;
    await safeRenderMain();
  });

  el.mainContent.addEventListener('change', async (event) => {
    const target = event.target;
    if (target.id === 'tenantSelector') {
      state.selectedTenantId = target.value;
      state.cachedRows = {};
      state.globalSearchResults = [];
      state.teamRows = [];
      state.teamAuditRows = [];
      state.teamAuditPage = 1;
      state.supportCases = [];
      state.supportExpandedCaseId = '';
      await safeRenderMain();
      return;
    }
    if (target.id === 'team-filter-role') {
      state.teamFilters.role = target.value || '';
      await safeRenderMain();
      return;
    }
    if (target.id === 'support-status-filter') {
      state.supportOps.statusFilter = target.value || '';
      await safeRenderMain();
    }
  });

  el.mainContent.addEventListener('input', async (event) => {
    const target = event.target;
    if (target.id !== 'team-filter-term') return;
    state.teamFilters.term = target.value || '';
    if (state.teamFilterDebounceHandle) clearTimeout(state.teamFilterDebounceHandle);
    state.teamFilterDebounceHandle = setTimeout(async () => {
      state.teamFilterDebounceHandle = null;
      await safeRenderMain();
    }, 250);
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
      setStatus('Alteracao aplicada com auditoria.');
      await safeRenderMain();
    } catch (error) {
      setStatus(error.message || 'Falha ao salvar alteracao.', true);
    }
  });

  el.auditModalForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const note = el.auditNote.value.trim();
    if (note.length < 8) {
      setStatus('Justificativa minima de 8 caracteres.', true);
      return;
    }
    if (!state.pendingAuditAction) return;
    try {
      await state.pendingAuditAction(note);
      closeAuditModal();
      setStatus('Operacao concluida com auditoria.');
      await safeRenderMain();
    } catch (error) {
      setStatus(error.message || 'Falha na operacao auditada.', true);
    }
  });
}

async function bootstrapAuth() {
  const cfg = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  if (cfg.url && cfg.key) {
    try {
      ensureSupabase(cfg.url, cfg.key);
      await refreshSessionUser();
      supabase.auth.onAuthStateChange(async () => {
        try {
          await refreshSessionUser();
        } catch (error) {
          setStatus(error.message || 'Erro de sessao.', true);
        }
      });
      return;
    } catch (_error) {
      state.allowed = false;
    }
  }
  await safeRenderMain();
}

function init() {
  attachGlobalListeners();
  buildSidebar();
  renderLogin();
  bootstrapAuth();
}

init();
