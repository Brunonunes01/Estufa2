alter table public.profiles
  add column if not exists nome_propriedade text,
  add column if not exists tamanho_hectares text,
  add column if not exists cidade_estado text,
  add column if not exists latitude text,
  add column if not exists longitude text;
