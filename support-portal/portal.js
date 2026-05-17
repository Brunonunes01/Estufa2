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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  user: null,
  profile: null,
  supportAllowed: false,
  tenants: [],
  selectedTenantId: '',
  data: null,
  statusMessage: '',
  statusError: false,
};

const FIXED_SUPPORT_UID = 'fsCWNyTtuOOeYAmVokbhfU0xA2e2';
const LOAD_TIMEOUT_MS = 20000;

const root = document.getElementById('appRoot');
const logoutBtn = document.getElementById('logoutBtn');

const fmtCurrency = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toMillisSafe = (value) => {
  if (!value) return 0;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmtDate = (value) => {
  if (!value) return '-';
  if (typeof value.toDate === 'function') return value.toDate().toLocaleDateString('pt-BR');
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toLocaleDateString('pt-BR');
  return new Date(value).toLocaleDateString('pt-BR');
};

const escape = (value) =>
  String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const setStatus = (message, isError = false) => {
  state.statusMessage = message;
  state.statusError = isError;
  render();
};

const mergeTenantAndLegacyDocs = (docsA, docsB) => {
  const map = new Map();
  [...docsA, ...docsB].forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

const listByTenant = async (collectionName, tenantId) => {
  const [tenantSnap, legacySnap] = await Promise.all([
    getDocs(query(collection(db, collectionName), where('tenantId', '==', tenantId))),
    getDocs(query(collection(db, collectionName), where('userId', '==', tenantId))),
  ]);

  const tenantDocs = tenantSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
  const legacyDocs = legacySnap.docs.map((d) => ({ ...d.data(), id: d.id }));
  return mergeTenantAndLegacyDocs(tenantDocs, legacyDocs);
};

const withTimeout = (promise, timeoutMs, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ao carregar ${label} após ${timeoutMs / 1000}s.`)), timeoutMs)
    ),
  ]);

const getFinancialStatus = (venda) => {
  const status = String(venda.statusPagamento || '').toLowerCase();
  if (status === 'cancelado') return 'cancelado';
  if (status === 'pendente' || status === 'atrasado' || (!status && venda.metodoPagamento === 'prazo')) {
    return 'pendente';
  }
  return 'pago';
};

const loadSupportData = async () => {
  if (!state.selectedTenantId) return;

  const tenantId = state.selectedTenantId;
  const [clientes, vendas, plantios, despesas, tenantSettingsSnap] = await withTimeout(
    Promise.all([
      listByTenant('clientes', tenantId),
      listByTenant('vendas', tenantId),
      listByTenant('plantios', tenantId),
      listByTenant('despesas', tenantId),
      getDoc(doc(db, 'tenant_settings', tenantId)),
    ]),
    LOAD_TIMEOUT_MS,
    'dados base do tenant'
  );

  let auditSnap = { docs: [] };
  try {
    auditSnap = await withTimeout(
      getDocs(query(collection(db, 'support_audit'), where('tenantId', '==', tenantId))),
      LOAD_TIMEOUT_MS,
      'auditoria de suporte'
    );
  } catch (error) {
    console.warn('Falha ao carregar support_audit, seguindo sem auditoria:', error);
  }

  const totals = vendas.reduce(
    (acc, venda) => {
      const total = Number(venda.valorTotal || 0);
      const status = getFinancialStatus(venda);
      if (status === 'pendente') acc.receber += total;
      if (status === 'pago') acc.recebido += total;
      return acc;
    },
    { receber: 0, recebido: 0 }
  );

  const totalPagar = despesas
    .filter((d) => (d.statusPagamento || d.status || 'pendente') !== 'pago')
    .reduce((acc, d) => acc + Number(d.valor || 0), 0);

  const recentClientes = [...clientes]
    .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt) - toMillisSafe(a.updatedAt || a.createdAt))
    .slice(0, 12);
  const recentVendas = [...vendas]
    .sort((a, b) => toMillisSafe(b.dataVenda || b.createdAt) - toMillisSafe(a.dataVenda || a.createdAt))
    .slice(0, 12);
  const recentPlantios = [...plantios]
    .sort((a, b) => toMillisSafe(b.updatedAt || b.createdAt) - toMillisSafe(a.updatedAt || a.createdAt))
    .slice(0, 12);
  const audit = auditSnap.docs
    .map((d) => ({ ...d.data(), id: d.id }))
    .sort((a, b) => toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt))
    .slice(0, 12);

  const settings = tenantSettingsSnap.exists() ? tenantSettingsSnap.data() : {};

  state.data = {
    tenantId,
    summary: {
      totalClientes: clientes.length,
      totalVendas: vendas.length,
      totalPlantios: plantios.length,
      totalDespesas: despesas.length,
      totalReceber: totals.receber,
      totalRecebido: totals.recebido,
      totalPagar,
      maintenanceMode: settings.maintenanceMode === true,
      maintenanceMessage: settings.maintenanceMessage || '',
    },
    recentClientes,
    recentVendas,
    recentPlantios,
    audit,
  };
};

const loadAllTenantsForSupport = async () => {
  const usersSnap = await withTimeout(getDocs(collection(db, 'users')), LOAD_TIMEOUT_MS, 'lista global de usuários');
  const tenants = usersSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() || {}) }))
    .map((u) => ({
      uid: u.id,
      label: `${u.name || u.displayName || u.email || u.id} (${u.email || 'sem-email'})`,
      role: u.role || 'sem-role',
      email: u.email || '',
      name: u.name || u.displayName || '',
    }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'pt-BR'));
  return tenants;
};

const logSupportAction = async (action, note, metadata = {}) => {
  if (!state.user || !state.selectedTenantId) return;
  await addDoc(collection(db, 'support_audit'), {
    tenantId: state.selectedTenantId,
    userId: state.selectedTenantId,
    createdBy: state.user.uid,
    action,
    note: note || null,
    actorUid: state.user.uid,
    actorName: state.profile?.name || state.profile?.displayName || state.user.email || null,
    metadata,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

const setMaintenanceMode = async (enabled, message) => {
  if (!state.user || !state.selectedTenantId) return;
  await setDoc(
    doc(db, 'tenant_settings', state.selectedTenantId),
    {
      tenantId: state.selectedTenantId,
      userId: state.selectedTenantId,
      createdBy: state.user.uid,
      maintenanceMode: enabled,
      maintenanceMessage: message?.trim() || null,
      maintenanceUpdatedByUid: state.user.uid,
      maintenanceUpdatedByName: state.profile?.name || state.profile?.displayName || state.user.email || null,
      maintenanceUpdatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const loadVendaForSupport = async (vendaId) => {
  if (!vendaId) throw new Error('Informe o ID da venda.');
  const saleSnap = await getDoc(doc(db, 'vendas', vendaId));
  if (!saleSnap.exists()) throw new Error('Venda não encontrada.');
  const venda = { ...saleSnap.data(), id: saleSnap.id };
  const vendaTenantId = venda.tenantId || venda.userId || '';
  if (!vendaTenantId) throw new Error('Venda sem tenantId/userId.');
  return { venda, vendaTenantId };
};

const applySupportSaleFix = async ({ vendaId, nextStatus, nextValorTotal, note }) => {
  if (!state.user) throw new Error('Sessão inválida.');
  const { venda, vendaTenantId } = await loadVendaForSupport(vendaId);

  if (state.selectedTenantId && vendaTenantId !== state.selectedTenantId) {
    throw new Error(
      `A venda pertence ao tenant ${vendaTenantId}, mas o tenant selecionado é ${state.selectedTenantId}.`
    );
  }

  const payload = {
    statusPagamento: nextStatus || venda.statusPagamento || 'pago',
    updatedAt: serverTimestamp(),
    suporteUltimaCorrecaoPorUid: state.user.uid,
    suporteUltimaCorrecaoPorNome: state.profile?.name || state.user.email || null,
  };

  if (nextValorTotal !== '' && nextValorTotal !== null && nextValorTotal !== undefined) {
    const parsed = Number(nextValorTotal);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Valor total inválido.');
    payload.valorTotal = parsed;
  }

  await updateDoc(doc(db, 'vendas', venda.id), payload);
  await logSupportAction(
    'sale_fix',
    note || 'Correção manual de venda efetuada via suporte.',
    {
      source: 'support-portal-web',
      vendaId: venda.id,
      tenantId: vendaTenantId,
      before: {
        statusPagamento: venda.statusPagamento || null,
        valorTotal: Number(venda.valorTotal || 0),
      },
      after: {
        statusPagamento: payload.statusPagamento,
        valorTotal: payload.valorTotal !== undefined ? payload.valorTotal : Number(venda.valorTotal || 0),
      },
    }
  );
  return vendaTenantId;
};

const buildLoginView = () => `
  <section class="card">
    <h2>Login de suporte</h2>
    <p class="line-meta">Use credencial autorizada (owner/admin ou usuário com isSupportAgent).</p>
    <div class="row">
      <div class="col-6">
        <label for="emailInput">E-mail</label>
        <input id="emailInput" type="email" placeholder="suporte@empresa.com" />
      </div>
      <div class="col-6">
        <label for="passwordInput">Senha</label>
        <input id="passwordInput" type="password" placeholder="••••••••" />
      </div>
      <div class="col-12 btns">
        <button id="loginBtn" class="primary">Entrar no portal</button>
      </div>
    </div>
    ${state.statusMessage ? `<div class="${state.statusError ? 'error' : 'ok'}">${escape(state.statusMessage)}</div>` : ''}
  </section>
`;

const buildDeniedView = () => `
  <section class="card">
    <h2>Acesso negado</h2>
    <p class="line-meta">
      Seu usuário está autenticado, mas sem permissão de suporte. Exigido: role admin dono da conta ou
      <code>isSupportAgent: true</code> no documento <code>users/{uid}</code>.
    </p>
  </section>
`;

const buildStatusTag = (status) => {
  const css = status === 'pago' ? 'status-pago' : status === 'cancelado' ? 'status-cancelado' : 'status-pendente';
  return `<span class="status-tag ${css}">${status.toUpperCase()}</span>`;
};

const buildPortalView = () => {
  const data = state.data;
  if (!data) {
    return `
      <section class="card">
        <p>Carregando dados de suporte...</p>
        ${state.statusMessage ? `<div class="${state.statusError ? 'error' : 'ok'}">${escape(state.statusMessage)}</div>` : ''}
        <div class="btns" style="margin-top:8px">
          <button id="retryLoadBtn" class="primary">Tentar novamente</button>
        </div>
      </section>
    `;
  }

  const tenantOptions = state.tenants
    .map((t) => `<option value="${escape(t.uid)}" ${t.uid === state.selectedTenantId ? 'selected' : ''}>${escape(t.label)}</option>`)
    .join('');

  const clientesRows = data.recentClientes
    .map(
      (c) => `
      <li>
        <div class="line-main">${escape(c.nome || 'Sem nome')}</div>
        <div class="line-meta">${escape(c.telefone || c.email || c.documento || 'Sem contato')}</div>
      </li>
    `
    )
    .join('');

  const clientMap = new Map(data.recentClientes.map((c) => [c.id, c.nome || 'Cliente']));

  const vendasRows = data.recentVendas
    .map((v) => {
      const status = getFinancialStatus(v);
      const clienteNome = v.clienteId ? clientMap.get(v.clienteId) || 'Cliente' : 'Avulso';
      return `
        <li>
          <div class="line-main">${escape(clienteNome)} • ${fmtCurrency(v.valorTotal || 0)} • ${buildStatusTag(status)}</div>
          <div class="line-meta">${escape(fmtDate(v.dataVenda))} • ${escape(v.id)}</div>
        </li>
      `;
    })
    .join('');

  const plantiosRows = data.recentPlantios
    .map(
      (p) => `
      <li>
        <div class="line-main">${escape(p.cultura || 'Cultura')} • ${escape(p.status || 'sem status')}</div>
        <div class="line-meta">Lote: ${escape(p.codigoLote || 'N/A')} • Atualizado: ${escape(fmtDate(p.updatedAt || p.createdAt))}</div>
      </li>
    `
    )
    .join('');

  const auditRows = data.audit
    .map(
      (a) => `
      <li>
        <div class="line-main">${escape(a.action)} • ${escape(a.actorName || a.actorUid || 'suporte')}</div>
        <div class="line-meta">${escape(a.note || 'sem nota')} • ${escape(fmtDate(a.createdAt))}</div>
      </li>
    `
    )
    .join('');

  return `
    <section class="card">
      <div class="row">
        <div class="col-6">
          <label for="tenantSelect">Tenant alvo</label>
          <select id="tenantSelect">${tenantOptions}</select>
        </div>
        <div class="col-6">
          <label for="searchInput">Busca rápida</label>
          <input id="searchInput" placeholder="cliente, id venda, lote..." />
        </div>
        <div class="col-12 btns">
          <button id="refreshBtn" class="primary">Atualizar diagnóstico</button>
          <button id="diagBtn" class="soft">Registrar diagnóstico</button>
          <button id="fixBtn" class="soft">Registrar correção</button>
        </div>
      </div>
      ${state.statusMessage ? `<div class="${state.statusError ? 'error' : 'ok'}">${escape(state.statusMessage)}</div>` : ''}
    </section>

    <section class="card">
      <h3>Correção rápida de venda (suporte)</h3>
      <div class="row">
        <div class="col-4">
          <label for="fixVendaIdInput">ID da venda</label>
          <input id="fixVendaIdInput" placeholder="ex.: AbC123..." />
        </div>
        <div class="col-4">
          <label for="fixStatusSelect">Novo status</label>
          <select id="fixStatusSelect">
            <option value="pago">PAGO</option>
            <option value="pendente">PENDENTE</option>
            <option value="atrasado">ATRASADO</option>
            <option value="cancelado">CANCELADO</option>
          </select>
        </div>
        <div class="col-4">
          <label for="fixValorInput">Novo valor total (opcional)</label>
          <input id="fixValorInput" type="number" min="0" step="0.01" placeholder="ex.: 250.00" />
        </div>
        <div class="col-12">
          <label for="fixNoteInput">Motivo da correção (auditoria)</label>
          <textarea id="fixNoteInput" placeholder="Ex.: cliente Tião informou lançamento incorreto de valor/status."></textarea>
        </div>
        <div class="col-12 btns">
          <button id="applySaleFixBtn" class="primary">Aplicar correção da venda</button>
        </div>
      </div>
    </section>

    <section class="row">
      <div class="col-4"><div class="metric"><div class="k">Clientes</div><div class="v">${data.summary.totalClientes}</div></div></div>
      <div class="col-4"><div class="metric"><div class="k">Vendas</div><div class="v">${data.summary.totalVendas}</div></div></div>
      <div class="col-4"><div class="metric"><div class="k">Plantios</div><div class="v">${data.summary.totalPlantios}</div></div></div>
      <div class="col-4"><div class="metric warning"><div class="k">A Receber</div><div class="v">${fmtCurrency(data.summary.totalReceber)}</div></div></div>
      <div class="col-4"><div class="metric success"><div class="k">Recebido</div><div class="v">${fmtCurrency(data.summary.totalRecebido)}</div></div></div>
      <div class="col-4"><div class="metric danger"><div class="k">A Pagar</div><div class="v">${fmtCurrency(data.summary.totalPagar)}</div></div></div>
    </section>

    <section class="card">
      <h3>Modo manutenção</h3>
      <div class="row">
        <div class="col-8">
          <label for="maintenanceMessage">Mensagem de manutenção</label>
          <textarea id="maintenanceMessage" placeholder="Ex.: ajustes financeiros em andamento">${escape(
            data.summary.maintenanceMessage || ''
          )}</textarea>
        </div>
        <div class="col-4">
          <label>Status atual</label>
          <div class="btns">
            <button id="enableMaintenanceBtn" class="warn">Ativar</button>
            <button id="disableMaintenanceBtn" class="soft">Desativar</button>
          </div>
          <p class="line-meta">
            Atual: <strong>${data.summary.maintenanceMode ? 'ATIVO' : 'INATIVO'}</strong>
          </p>
        </div>
      </div>
    </section>

    <section class="row">
      <div class="col-6 card">
        <h3>Clientes recentes</h3>
        <ul class="list" id="clientesList">${clientesRows || '<li><span class="line-meta">Sem registros</span></li>'}</ul>
      </div>
      <div class="col-6 card">
        <h3>Vendas recentes</h3>
        <ul class="list" id="vendasList">${vendasRows || '<li><span class="line-meta">Sem registros</span></li>'}</ul>
      </div>
    </section>

    <section class="row">
      <div class="col-6 card">
        <h3>Plantios recentes</h3>
        <ul class="list">${plantiosRows || '<li><span class="line-meta">Sem registros</span></li>'}</ul>
      </div>
      <div class="col-6 card">
        <h3>Auditoria de suporte</h3>
        <ul class="list">${auditRows || '<li><span class="line-meta">Sem registros</span></li>'}</ul>
      </div>
    </section>
  `;
};

const render = () => {
  if (!state.user) {
    root.innerHTML = buildLoginView();
    logoutBtn.classList.add('hidden');
    bindLoginEvents();
    return;
  }

  logoutBtn.classList.remove('hidden');

  if (!state.supportAllowed) {
    root.innerHTML = buildDeniedView();
    return;
  }

  root.innerHTML = buildPortalView();
  bindPortalEvents();
};

const bindLoginEvents = () => {
  const loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) return;
  loginBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const email = emailInput?.value?.trim() || '';
    const password = passwordInput?.value || '';
    if (!email || !password) {
      setStatus('Informe e-mail e senha.', true);
      return;
    }
    try {
      setStatus('Autenticando...');
      await signInWithEmailAndPassword(auth, email, password);
      setStatus('');
    } catch (error) {
      setStatus(error?.message || 'Falha no login.', true);
    }
  });
};

const applySearchFilter = () => {
  const input = document.getElementById('searchInput');
  if (!input) return;
  const value = String(input.value || '').toLowerCase().trim();
  ['clientesList', 'vendasList'].forEach((listId) => {
    const list = document.getElementById(listId);
    if (!list) return;
    Array.from(list.querySelectorAll('li')).forEach((li) => {
      const text = li.textContent?.toLowerCase() || '';
      li.style.display = !value || text.includes(value) ? '' : 'none';
    });
  });
};

const bindPortalEvents = () => {
  const retryLoadBtn = document.getElementById('retryLoadBtn');
  retryLoadBtn?.addEventListener('click', async () => {
    setStatus('Recarregando...');
    try {
      await loadSupportData();
      setStatus('Dados carregados.');
    } catch (error) {
      setStatus(error?.message || 'Falha ao carregar dados de suporte.', true);
    }
    render();
  });

  const tenantSelect = document.getElementById('tenantSelect');
  const refreshBtn = document.getElementById('refreshBtn');
  const diagBtn = document.getElementById('diagBtn');
  const fixBtn = document.getElementById('fixBtn');
  const enableMaintenanceBtn = document.getElementById('enableMaintenanceBtn');
  const disableMaintenanceBtn = document.getElementById('disableMaintenanceBtn');
  const searchInput = document.getElementById('searchInput');
  const applySaleFixBtn = document.getElementById('applySaleFixBtn');

  tenantSelect?.addEventListener('change', async () => {
    state.selectedTenantId = tenantSelect.value;
    setStatus('Carregando tenant...');
    await loadSupportData();
    setStatus('Tenant carregado.');
    render();
  });

  refreshBtn?.addEventListener('click', async () => {
    setStatus('Atualizando diagnóstico...');
    await loadSupportData();
    setStatus('Diagnóstico atualizado.');
    render();
  });

  diagBtn?.addEventListener('click', async () => {
    await logSupportAction('diagnostic', 'Diagnóstico remoto executado no portal separado.', {
      source: 'support-portal-web',
    });
    setStatus('Diagnóstico registrado.');
    await loadSupportData();
    render();
  });

  fixBtn?.addEventListener('click', async () => {
    await logSupportAction('correction', 'Correção remota registrada no portal separado.', {
      source: 'support-portal-web',
    });
    setStatus('Correção registrada.');
    await loadSupportData();
    render();
  });

  enableMaintenanceBtn?.addEventListener('click', async () => {
    const message = document.getElementById('maintenanceMessage')?.value || '';
    await setMaintenanceMode(true, message);
    await logSupportAction('maintenance_enabled', 'Modo manutenção ativado no portal separado.', {
      source: 'support-portal-web',
    });
    setStatus('Modo manutenção ativado.');
    await loadSupportData();
    render();
  });

  disableMaintenanceBtn?.addEventListener('click', async () => {
    const message = document.getElementById('maintenanceMessage')?.value || '';
    await setMaintenanceMode(false, message);
    await logSupportAction('maintenance_disabled', 'Modo manutenção desativado no portal separado.', {
      source: 'support-portal-web',
    });
    setStatus('Modo manutenção desativado.');
    await loadSupportData();
    render();
  });

  searchInput?.addEventListener('input', applySearchFilter);

  applySaleFixBtn?.addEventListener('click', async () => {
    try {
      const vendaId = document.getElementById('fixVendaIdInput')?.value?.trim() || '';
      const nextStatus = document.getElementById('fixStatusSelect')?.value || 'pago';
      const nextValorRaw = document.getElementById('fixValorInput')?.value;
      const nextValorTotal = nextValorRaw === '' ? '' : Number(nextValorRaw);
      const note = document.getElementById('fixNoteInput')?.value?.trim() || '';

      setStatus('Aplicando correção de venda...');
      const tenantFromSale = await applySupportSaleFix({ vendaId, nextStatus, nextValorTotal, note });
      state.selectedTenantId = tenantFromSale;
      await loadSupportData();
      setStatus(`Venda ${vendaId} corrigida com sucesso no tenant ${tenantFromSale}.`);
      render();
    } catch (error) {
      setStatus(error?.message || 'Falha ao corrigir venda.', true);
    }
  });
};

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  setStatus('Sessão encerrada.');
});

onAuthStateChanged(auth, async (firebaseUser) => {
  state.user = firebaseUser || null;
  state.profile = null;
  state.supportAllowed = false;
  state.tenants = [];
  state.selectedTenantId = '';
  state.data = null;

  if (!firebaseUser) {
    render();
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
    state.profile = userSnap.exists() ? userSnap.data() : {};

    const isOwnerAdmin = state.profile?.role === 'admin';
    const isSupportAgent = state.profile?.isSupportAgent === true;
    state.supportAllowed = isOwnerAdmin || isSupportAgent || firebaseUser.uid === FIXED_SUPPORT_UID;

    if (state.supportAllowed) {
      state.tenants = await loadAllTenantsForSupport();
      state.selectedTenantId = state.tenants[0]?.uid || '';
    } else {
      const ownLabel = state.profile?.name ? `Minha Estufa (${state.profile.name})` : 'Minha Estufa (Principal)';
      const tenants = [{ uid: firebaseUser.uid, label: ownLabel }];
      state.tenants = tenants;
      state.selectedTenantId = firebaseUser.uid;
    }

    if (state.supportAllowed && state.selectedTenantId) {
      await loadSupportData();
    }

    setStatus('');
  } catch (error) {
    setStatus(error?.message || 'Falha ao carregar perfil de suporte.', true);
  }

  render();
});
