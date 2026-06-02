alter table public.despesas
  add column if not exists comprovante_url text,
  add column if not exists comprovante_public_id text,
  add column if not exists comprovante_nome text,
  add column if not exists comprovante_mime text,
  add column if not exists comprovante_bytes bigint;

