import { assertTenantId } from './tenantGuard';
import { getSupabaseClient } from './supabaseClient';

export interface CaixaPessoa {
  id: string;
  nome: string;
  ativo: boolean;
}

const isCaixaPessoasTableMissing = (error: any): boolean => {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    message.includes("could not find the table 'public.caixa_pessoas'") ||
    message.includes('relation "public.caixa_pessoas" does not exist') ||
    message.includes('relation "caixa_pessoas" does not exist') ||
    code === 'PGRST205' ||
    code === '42P01'
  );
};

const mapSupabaseCaixaPessoa = (row: any): CaixaPessoa => ({
  id: row.id,
  nome: row.nome,
  ativo: row.ativo !== false,
});

export const listCaixaPessoas = async (userId: string): Promise<CaixaPessoa[]> => {
  const tenantId = assertTenantId(userId);
  const supabase: any = getSupabaseClient();
  const { data, error } = await supabase
    .from('caixa_pessoas')
    .select('id, nome, ativo')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) {
    if (isCaixaPessoasTableMissing(error)) return [];
    throw new Error(`Erro ao listar pessoas do caixa. ${error.message}`);
  }
  return (data || []).map(mapSupabaseCaixaPessoa);
};

export const createCaixaPessoa = async (data: { nome: string }, userId: string): Promise<string> => {
  const tenantId = assertTenantId(userId);
  const nome = data.nome.trim();
  if (!nome) throw new Error('Informe o nome da pessoa do caixa.');

  const supabase: any = getSupabaseClient();
  const { data: inserted, error } = await supabase
    .from('caixa_pessoas')
    .insert({
      tenant_id: tenantId,
      nome,
      ativo: true,
    })
    .select('id')
    .single();
  if (error || !inserted?.id) {
    if (isCaixaPessoasTableMissing(error)) {
      throw new Error(
        'Estrutura do banco desatualizada: tabela caixa_pessoas nao existe. Rode a migration no Supabase (npm run supabase:db:push).'
      );
    }
    throw new Error(`Erro ao cadastrar pessoa do caixa. ${error?.message || ''}`.trim());
  }
  return inserted.id as string;
};
