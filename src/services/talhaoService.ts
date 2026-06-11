import { Talhao } from '../types/domain';
import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';

const mapSupabaseTalhaoToDomain = (row: any): Talhao => ({
  id: row.id,
  tenantId: row.tenant_id,
  userId: row.created_by || row.tenant_id,
  createdBy: row.created_by || row.tenant_id,
  nome: row.nome,
  codigo: row.codigo || undefined,
  culturaPrincipal: row.cultura_principal || undefined,
  areaHectares: row.area_hectares != null ? Number(row.area_hectares) : undefined,
  areaCalculadaHectares: row.area_calculada_hectares != null ? Number(row.area_calculada_hectares) : undefined,
  boundaryPoints: Array.isArray(row.boundary_points) ? row.boundary_points : undefined,
  tipoSolo: row.tipo_solo || undefined,
  cidade: row.cidade || undefined,
  observacoes: row.observacoes || undefined,
  status: row.status || 'ativo',
  createdAt: new Date(row.created_at).getTime(),
  updatedAt: new Date(row.updated_at).getTime(),
});

const listTalhoesSupabase = async (tenantId: string): Promise<Talhao[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('talhoes').select('*').eq('tenant_id', tenantId).order('nome');
  if (error) throw new Error(`Erro ao listar talhoes. ${error.message}`);
  return (data || []).map(mapSupabaseTalhaoToDomain);
};

export const listTalhoes = async (userId: string): Promise<Talhao[]> => {
  const tenantId = assertTenantId(userId);
  return listTalhoesSupabase(tenantId);
};

const createTalhaoSupabase = async (tenantId: string, data: Partial<Talhao>) => {
  const supabase = getSupabaseClient();
  const payload = {
    tenant_id: tenantId,
    nome: data.nome,
    codigo: data.codigo ?? null,
    cultura_principal: data.culturaPrincipal ?? null,
    area_hectares: data.areaHectares ?? null,
    area_calculada_hectares: data.areaCalculadaHectares ?? null,
    boundary_points: data.boundaryPoints ?? null,
    tipo_solo: data.tipoSolo ?? null,
    cidade: data.cidade ?? null,
    observacoes: data.observacoes ?? null,
    status: data.status ?? 'ativo',
  };
  const { data: inserted, error } = await supabase.from('talhoes').insert(payload).select('id').single();
  if (error || !inserted?.id) throw new Error(`Erro ao criar talhao. ${error?.message || ''}`.trim());
  return inserted.id as string;
};

export const createTalhao = async (data: Partial<Talhao>, userId: string) => {
  const tenantId = assertTenantId(userId);
  if (!String(data.nome || '').trim()) throw new Error('Nome do talhao e obrigatorio.');
  return createTalhaoSupabase(tenantId, data);
};

export const updateTalhao = async (talhaoId: string, data: Partial<Talhao>, userId: string) => {
  const tenantId = assertTenantId(userId);
  if (!talhaoId) throw new Error('Talhao invalido.');

  const supabase = getSupabaseClient();
  const payload = {
    nome: data.nome,
    codigo: data.codigo ?? null,
    cultura_principal: data.culturaPrincipal ?? null,
    area_hectares: data.areaHectares ?? null,
    area_calculada_hectares: data.areaCalculadaHectares ?? null,
    boundary_points: data.boundaryPoints ?? null,
    tipo_solo: data.tipoSolo ?? null,
    cidade: data.cidade ?? null,
    observacoes: data.observacoes ?? null,
    status: data.status ?? 'ativo',
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('talhoes').update(payload).eq('id', talhaoId).eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao atualizar talhao. ${error.message}`);
};

export const deleteTalhao = async (talhaoId: string, userId: string) => {
  const tenantId = assertTenantId(userId);
  if (!talhaoId) throw new Error('Talhao invalido.');

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('talhoes').delete().eq('id', talhaoId).eq('tenant_id', tenantId);
  if (error) throw new Error(`Erro ao excluir talhao. ${error.message}`);
};
