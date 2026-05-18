create extension if not exists "pgcrypto";

create type public.app_role as enum ('admin', 'operator', 'guest');
create type public.production_mode as enum ('long_cycle', 'hydroponics', 'seedlings', 'seedling_resale');
create type public.hydroponic_system_type as enum ('nft', 'dwc', 'floating', 'substrate', 'semi_hydroponic', 'other');
create type public.estufa_status as enum ('ativa', 'manutencao', 'desativada');
create type public.plantio_status as enum (
  'em_crescimento',
  'colheita_iniciada',
  'finalizado',
  'abortado',
  'em_desenvolvimento',
  'em_colheita',
  'cancelado'
);
create type public.despesa_categoria as enum ('energia', 'agua', 'manutencao', 'mao_de_obra', 'outro');
create type public.pagamento_status as enum ('pendente', 'pago', 'atrasado', 'cancelado');
create type public.tarefa_status as enum ('pendente', 'em_andamento', 'concluida', 'cancelada');
create type public.tarefa_prioridade as enum ('baixa', 'media', 'alta', 'critica');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role public.app_role not null default 'operator',
  is_support_agent boolean not null default false,
  support_level text check (support_level in ('read', 'write', 'owner')),
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'operator',
  can_read boolean not null default true,
  can_write boolean not null default true,
  can_delete boolean not null default false,
  can_manage_sharing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create table public.share_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null unique,
  tenant_name text,
  owner_name text,
  grant_role public.app_role not null default 'guest',
  permissions jsonb not null default '{"canRead": true, "canWrite": false, "canDelete": false, "canManageSharing": false}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  used_by jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  data_inicio timestamptz not null,
  data_fim timestamptz,
  status text not null check (status in ('ativa', 'encerrada')),
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  cidade text,
  telefone text,
  email text,
  documento text,
  contato_responsavel text,
  cep text,
  endereco text,
  numero text,
  bairro text,
  estado text,
  complemento text,
  tipo text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  contato text,
  telefone text,
  email text,
  categoria text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estufas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  tipo text check (tipo in ('hidroponia', 'solo', 'semi-hidroponia')),
  production_modes public.production_mode[] not null default '{}'::public.production_mode[],
  hydroponic_system_type public.hydroponic_system_type,
  capacidade_total numeric(12,2),
  unidade_medida text check (unidade_medida in ('m2', 'plantas', 'bancadas')),
  percentual_ocupacao numeric(7,2),
  status public.estufa_status not null default 'ativa',
  cidade text,
  propriedade text,
  responsavel text,
  latitude text,
  longitude text,
  comprimento_m numeric(12,2),
  largura_m numeric(12,2),
  altura_m numeric(12,2),
  area_m2 numeric(12,2),
  tipo_cobertura text,
  observacoes text,
  data_inicio_operacao timestamptz,
  legacy_setores jsonb,
  legacy_motores jsonb,
  legacy_reservatorios jsonb,
  legacy_subdivisoes jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plantios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  safra_id uuid references public.safras(id) on delete set null,
  estufa_id uuid not null references public.estufas(id) on delete restrict,
  cultura text not null,
  variedade text,
  data_inicio timestamptz,
  data_plantio timestamptz,
  data_previsao_colheita timestamptz,
  data_encerramento timestamptz,
  status public.plantio_status not null default 'em_desenvolvimento',
  ocupacao_estimada numeric(12,2),
  custo_acumulado numeric(12,2) not null default 0,
  custo_total numeric(12,2),
  ciclo_dias integer,
  ciclo_desbloqueado_por_admin boolean not null default false,
  desbloqueio_admin_by_uid uuid references auth.users(id) on delete set null,
  desbloqueio_admin_by_name text,
  desbloqueio_admin_at timestamptz,
  desbloqueio_admin_reason text,
  codigo_lote text,
  origem_semente text,
  quantidade_plantada numeric(12,2),
  quantidade_bandejas integer,
  mudas_por_bandeja integer,
  preco_estimado_unidade numeric(12,2),
  unidade_preco_estimado text,
  custo_estimado_inicial numeric(12,2),
  unidade_quantidade text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insumos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome text not null,
  fabricante text,
  categoria text check (categoria in ('fertilizante', 'defensivo', 'biologico', 'substrato', 'outro')),
  tipo text,
  unidade_medida text check (unidade_medida in ('kg', 'L', 'un', 'g', 'ml', 'l')),
  unidade_padrao text,
  estoque_atual numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3),
  lote text,
  data_validade timestamptz,
  dias_carencia integer,
  custo_unitario numeric(12,4) not null default 0,
  registro_mapa text,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insumo_entradas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  insumo_id uuid not null references public.insumos(id) on delete cascade,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  quantidade_comprada numeric(12,3) not null,
  custo_unitario_compra numeric(12,4) not null,
  observacoes text,
  data_entrada timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.aplicacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plantio_id uuid not null references public.plantios(id) on delete restrict,
  estufa_id uuid references public.estufas(id) on delete set null,
  tipo_aplicacao text check (tipo_aplicacao in ('defensivo', 'fertilizacao')),
  data_aplicacao timestamptz not null default now(),
  volume_tanque numeric(12,2),
  numero_tanques numeric(12,2),
  observacoes text,
  custo_calculado numeric(12,2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.aplicacao_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  aplicacao_id uuid not null references public.aplicacoes(id) on delete cascade,
  insumo_id uuid references public.insumos(id) on delete set null,
  nome_insumo text not null,
  dose_por_tanque numeric(12,3),
  quantidade_aplicada numeric(12,3) not null,
  unidade text not null,
  custo_unitario_na_aplicacao numeric(12,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.colheitas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plantio_id uuid not null references public.plantios(id) on delete restrict,
  estufa_id uuid references public.estufas(id) on delete set null,
  safra_id uuid references public.safras(id) on delete set null,
  data_colheita timestamptz not null default now(),
  quantidade numeric(12,3) not null,
  unidade_medida text check (unidade_medida in ('kg', 'maços', 'caixas', 'un')),
  unidade text,
  qualidade text check (qualidade in ('premium', 'padrao', 'industrial')),
  lote_colheita text,
  destino text not null check (destino in ('estoque', 'venda_direta', 'descarte')),
  observacoes text,
  peso_bruto numeric(12,3),
  peso_liquido numeric(12,3),
  preco_unitario numeric(12,4),
  cliente_id uuid references public.clientes(id) on delete set null,
  metodo_pagamento text,
  status_pagamento public.pagamento_status,
  data_pagamento timestamptz,
  ciclo_desbloqueado_por_admin boolean not null default false,
  desbloqueio_admin_by_uid uuid references auth.users(id) on delete set null,
  desbloqueio_admin_by_name text,
  desbloqueio_admin_at timestamptz,
  desbloqueio_admin_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plantio_id uuid references public.plantios(id) on delete set null,
  estufa_id uuid references public.estufas(id) on delete set null,
  colheita_id uuid references public.colheitas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  origin_type text check (origin_type in ('plantio', 'hydro_lote', 'seedling_lote', 'resale_lote')),
  origin_id uuid,
  hydro_lote_id uuid,
  traceability_public_token text,
  traceability_public_url text,
  data_venda timestamptz not null default now(),
  data_vencimento timestamptz,
  valor_total numeric(14,2) not null,
  status_pagamento public.pagamento_status not null default 'pendente',
  forma_pagamento text,
  metodo_pagamento text,
  observacoes text,
  quantidade numeric(12,3),
  ciclo_desbloqueado_por_admin boolean not null default false,
  desbloqueio_admin_by_uid uuid references auth.users(id) on delete set null,
  desbloqueio_admin_by_name text,
  desbloqueio_admin_at timestamptz,
  desbloqueio_admin_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  venda_id uuid not null references public.vendas(id) on delete cascade,
  colheita_id uuid references public.colheitas(id) on delete set null,
  descricao text not null,
  quantidade numeric(12,3) not null,
  unidade text,
  valor_unitario numeric(12,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  descricao text not null,
  categoria public.despesa_categoria not null default 'outro',
  valor numeric(14,2) not null,
  data_vencimento timestamptz,
  data_despesa timestamptz not null default now(),
  status_pagamento public.pagamento_status not null default 'pendente',
  plantio_id uuid references public.plantios(id) on delete set null,
  estufa_id uuid references public.estufas(id) on delete set null,
  tipo_gasto text,
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.manejos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plantio_id uuid not null references public.plantios(id) on delete restrict,
  estufa_id uuid references public.estufas(id) on delete set null,
  tipo_manejo text not null check (tipo_manejo in ('clima', 'praga_doenca', 'outro')),
  descricao text not null,
  data_registro timestamptz not null default now(),
  responsavel text,
  severidade text check (severidade in ('baixa', 'media', 'alta')),
  temperatura numeric(8,2),
  umidade numeric(8,2),
  fotos jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tarefas_agricolas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plantio_id uuid not null references public.plantios(id) on delete restrict,
  estufa_id uuid references public.estufas(id) on delete set null,
  tipo_tarefa text not null check (tipo_tarefa in ('irrigacao', 'adubacao', 'manejo', 'colheita', 'inspecao', 'outro')),
  data_prevista timestamptz not null,
  status public.tarefa_status not null default 'pendente',
  prioridade public.tarefa_prioridade not null default 'media',
  observacoes text,
  cancel_reason text,
  status_history jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rastreabilidade_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plantio_id uuid references public.plantios(id) on delete set null,
  estufa_id uuid references public.estufas(id) on delete set null,
  hydro_lote_id uuid,
  entidade text not null,
  entidade_id uuid not null,
  acao text not null,
  descricao text not null,
  motivo text,
  actor_uid uuid references auth.users(id) on delete set null,
  actor_name text,
  metadata jsonb,
  event_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_verduras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nome_comum text not null,
  nome_cientifico text,
  variedade_padrao text,
  ciclo_dias integer,
  ph_min numeric(8,2),
  ph_max numeric(8,2),
  ec_min numeric(8,2),
  ec_max numeric(8,2),
  temperatura_min_c numeric(8,2),
  temperatura_max_c numeric(8,2),
  observacoes text,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_motores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete cascade,
  nome text not null,
  codigo text,
  status text not null check (status in ('ativo', 'inativo', 'manutencao')),
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_setores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete cascade,
  nome text not null,
  motor_id uuid references public.hidro_motores(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_reservatorios (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete cascade,
  setor_id uuid references public.hidro_setores(id) on delete set null,
  nome text not null,
  volume_litros numeric(12,2),
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_estruturas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete cascade,
  setor_id uuid references public.hidro_setores(id) on delete set null,
  reservatorio_id uuid references public.hidro_reservatorios(id) on delete set null,
  nome text not null,
  codigo text,
  tipo text not null check (tipo in ('bancada', 'canal', 'perfil', 'mesa', 'bercario', 'outro')),
  capacidade_plantas integer,
  quantidade_furos integer,
  x numeric(12,2),
  y numeric(12,2),
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_lotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete restrict,
  setor_id uuid not null references public.hidro_setores(id) on delete restrict,
  codigo_lote text not null,
  quantidade_inicial numeric(12,3) not null,
  saldo_disponivel numeric(12,3) not null,
  origem_material_nome text not null,
  origem_material_documento text,
  nome_operacional text,
  verdura_id uuid references public.hidro_verduras(id) on delete set null,
  cultura_base text,
  variedade_base text,
  status text not null check (status in ('ativo', 'concluido', 'cancelado')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, codigo_lote)
);

create table public.hidro_ocupacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lote_id uuid not null references public.hidro_lotes(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete restrict,
  setor_id uuid references public.hidro_setores(id) on delete set null,
  estrutura_id uuid not null references public.hidro_estruturas(id) on delete restrict,
  cultura text not null,
  variedade text,
  verdura_id uuid references public.hidro_verduras(id) on delete set null,
  fase text not null,
  quantidade_alocada numeric(12,3) not null,
  quantidade_perdida numeric(12,3),
  data_inicio timestamptz not null default now(),
  data_fim timestamptz,
  status text not null check (status in ('ativa', 'encerrada')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lote_id uuid not null references public.hidro_lotes(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete restrict,
  from_estrutura_id uuid references public.hidro_estruturas(id) on delete set null,
  to_estrutura_id uuid references public.hidro_estruturas(id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'movimento', 'saida', 'perda')),
  quantidade numeric(12,3) not null,
  cultura text,
  variedade text,
  verdura_id uuid references public.hidro_verduras(id) on delete set null,
  fase text not null,
  moved_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hidro_leituras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  estufa_id uuid not null references public.estufas(id) on delete restrict,
  motor_id uuid references public.hidro_motores(id) on delete set null,
  reservatorio_id uuid references public.hidro_reservatorios(id) on delete set null,
  estrutura_id uuid references public.hidro_estruturas(id) on delete set null,
  lote_id uuid references public.hidro_lotes(id) on delete set null,
  setores_aplicados_ids uuid[],
  aplicar_em_todos_setores_do_motor boolean not null default false,
  ph numeric(8,3),
  condutividade_eletrica numeric(8,3),
  temperatura_solucao numeric(8,3),
  temperatura_ambiente numeric(8,3),
  umidade_ambiente numeric(8,3),
  volume_litros numeric(12,3),
  acao text not null check (acao in ('medicao', 'corrigir_ph', 'repor_agua', 'trocar_solucao', 'adicionar_nutriente', 'limpeza')),
  insumos_adicionados jsonb,
  observacoes text,
  responsavel text,
  measured_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ensure_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    role,
    can_read,
    can_write,
    can_delete,
    can_manage_sharing
  )
  values (new.id, new.owner_user_id, 'admin', true, true, true, true)
  on conflict (tenant_id, user_id) do nothing;
  return new;
end;
$$;

create or replace function public.is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.can_read = true
  );
$$;

create or replace function public.can_write_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.can_write = true
  );
$$;

create or replace function public.can_delete_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.can_delete = true
  );
$$;

create or replace function public.can_manage_sharing_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = p_tenant_id
      and tm.user_id = auth.uid()
      and tm.can_manage_sharing = true
  );
$$;

create trigger trg_tenants_owner_membership
after insert on public.tenants
for each row
execute function public.ensure_owner_membership();

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'tenants',
      'profiles',
      'tenant_memberships',
      'share_codes',
      'safras',
      'clientes',
      'fornecedores',
      'estufas',
      'plantios',
      'insumos',
      'insumo_entradas',
      'aplicacoes',
      'aplicacao_itens',
      'colheitas',
      'vendas',
      'venda_itens',
      'despesas',
      'manejos',
      'tarefas_agricolas',
      'rastreabilidade_eventos',
      'hidro_verduras',
      'hidro_motores',
      'hidro_setores',
      'hidro_reservatorios',
      'hidro_estruturas',
      'hidro_lotes',
      'hidro_ocupacoes',
      'hidro_movimentacoes',
      'hidro_leituras'
    ])
  loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end$$;

alter table public.tenants enable row level security;
create policy tenants_select on public.tenants
  for select using (public.is_tenant_member(id));
create policy tenants_insert on public.tenants
  for insert with check (owner_user_id = auth.uid());
create policy tenants_update on public.tenants
  for update using (public.can_manage_sharing_tenant(id))
  with check (public.can_manage_sharing_tenant(id));
create policy tenants_delete on public.tenants
  for delete using (public.can_delete_tenant(id));

alter table public.profiles enable row level security;
create policy profiles_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

alter table public.tenant_memberships enable row level security;
create policy memberships_select on public.tenant_memberships
  for select using (
    user_id = auth.uid() or public.can_manage_sharing_tenant(tenant_id)
  );
create policy memberships_insert on public.tenant_memberships
  for insert with check (public.can_manage_sharing_tenant(tenant_id));
create policy memberships_update on public.tenant_memberships
  for update using (public.can_manage_sharing_tenant(tenant_id))
  with check (public.can_manage_sharing_tenant(tenant_id));
create policy memberships_delete on public.tenant_memberships
  for delete using (public.can_manage_sharing_tenant(tenant_id));

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'share_codes',
      'safras',
      'clientes',
      'fornecedores',
      'estufas',
      'plantios',
      'insumos',
      'insumo_entradas',
      'aplicacoes',
      'aplicacao_itens',
      'colheitas',
      'vendas',
      'venda_itens',
      'despesas',
      'manejos',
      'tarefas_agricolas',
      'rastreabilidade_eventos',
      'hidro_verduras',
      'hidro_motores',
      'hidro_setores',
      'hidro_reservatorios',
      'hidro_estruturas',
      'hidro_lotes',
      'hidro_ocupacoes',
      'hidro_movimentacoes',
      'hidro_leituras'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_tenant_member(tenant_id));',
      t || '_select',
      t
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.can_write_tenant(tenant_id));',
      t || '_insert',
      t
    );
    execute format(
      'create policy %I on public.%I for update using (public.can_write_tenant(tenant_id)) with check (public.can_write_tenant(tenant_id));',
      t || '_update',
      t
    );
    execute format(
      'create policy %I on public.%I for delete using (public.can_delete_tenant(tenant_id));',
      t || '_delete',
      t
    );
  end loop;
end$$;

create index idx_membership_user_tenant on public.tenant_memberships(user_id, tenant_id);
create index idx_share_codes_tenant on public.share_codes(tenant_id);
create index idx_estufas_tenant on public.estufas(tenant_id);
create index idx_plantios_tenant_estufa on public.plantios(tenant_id, estufa_id);
create index idx_plantios_tenant_status on public.plantios(tenant_id, status);
create index idx_colheitas_tenant_plantio on public.colheitas(tenant_id, plantio_id);
create index idx_vendas_tenant_data on public.vendas(tenant_id, data_venda desc);
create index idx_vendas_tenant_status on public.vendas(tenant_id, status_pagamento);
create index idx_despesas_tenant_data on public.despesas(tenant_id, data_despesa desc);
create index idx_despesas_tenant_status on public.despesas(tenant_id, status_pagamento);
create index idx_tarefas_tenant_data on public.tarefas_agricolas(tenant_id, data_prevista);
create index idx_rastreabilidade_tenant_event on public.rastreabilidade_eventos(tenant_id, event_at desc);

create or replace view public.vw_financeiro_resumo as
with vendas_mensal as (
  select
    tenant_id,
    date_trunc('month', data_venda) as referencia_mes,
    coalesce(sum(valor_total) filter (where status_pagamento = 'pago'), 0) as total_recebido,
    coalesce(sum(valor_total) filter (where status_pagamento in ('pendente', 'atrasado')), 0) as total_receber
  from public.vendas
  group by tenant_id, date_trunc('month', data_venda)
),
despesas_mensal as (
  select
    tenant_id,
    date_trunc('month', data_despesa) as referencia_mes,
    coalesce(sum(valor) filter (where status_pagamento = 'pago'), 0) as total_pago,
    coalesce(sum(valor) filter (where status_pagamento in ('pendente', 'atrasado')), 0) as total_pagar
  from public.despesas
  group by tenant_id, date_trunc('month', data_despesa)
)
select
  coalesce(v.tenant_id, d.tenant_id) as tenant_id,
  coalesce(v.referencia_mes, d.referencia_mes) as referencia_mes,
  coalesce(v.total_recebido, 0) as total_recebido,
  coalesce(v.total_receber, 0) as total_receber,
  coalesce(d.total_pago, 0) as total_pago,
  coalesce(d.total_pagar, 0) as total_pagar
from vendas_mensal v
full join despesas_mensal d
  on d.tenant_id = v.tenant_id
  and d.referencia_mes = v.referencia_mes;
