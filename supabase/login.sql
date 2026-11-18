-- =============================================================================
-- Convergas Control Center — LOGIN E PERMISSÕES
-- Rodar UMA vez no SQL Editor do Supabase (projeto convergascontrol).
--
-- O que faz:
--  1. Cria a tabela cc_perfis (um perfil por usuário do Auth): nome, admin, ativo,
--     permissões por aba ({"abas": {"rh-colab": "editar", ...}, "areas": {"rh": "editar"}}).
--  2. Fecha as tabelas do sistema (entities, computers e o bucket "files"):
--     só quem está logado e ATIVO lê; só quem tem "editar" na área grava.
--  3. Cria funções seguras para a página PÚBLICA de avaliação de satisfação
--     (/a/<token>) continuar funcionando sem login — só aquela avaliação, nada mais.
--
-- Depois de rodar, crie o 1º administrador (instruções no fim do arquivo).
-- =============================================================================

-- ---------- 1. perfis ----------
create table if not exists public.cc_perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  nome text not null default '',
  admin boolean not null default false,
  ativo boolean not null default true,
  permissoes jsonb not null default '{}'::jsonb,
  team_id text,
  trocar_senha boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cc_perfis enable row level security;

-- o próprio usuário lê o seu perfil; admin lê todos. Escrita só pelo servidor (service role).
create or replace function public.cc_sou_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin and ativo from public.cc_perfis where id = auth.uid()), false);
$$;
drop policy if exists cc_perfis_select on public.cc_perfis;
create policy cc_perfis_select on public.cc_perfis for select to authenticated
  using (id = auth.uid() or public.cc_sou_admin());

-- ---------- 2. funções de permissão ----------
create or replace function public.cc_me()
returns public.cc_perfis language sql stable security definer set search_path = public as $$
  select * from public.cc_perfis where id = auth.uid();
$$;

create or replace function public.cc_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo from public.cc_perfis where id = auth.uid()), false);
$$;

-- o usuário marca que já trocou a senha temporária
create or replace function public.cc_senha_trocada()
returns void language sql security definer set search_path = public as $$
  update public.cc_perfis set trocar_senha = false, updated_at = now() where id = auth.uid();
$$;

-- áreas que podem GRAVAR cada coleção
create or replace function public.cc_areas_da_colecao(ent text)
returns text[] language sql immutable as $$
  select case
    when ent in ('printers','commands','runbooks','inventory','phones','sharepoint','webDomains','dnsRecords','computers') then array['ti']
    when ent = 'licenses' then array['ti','qualidade']
    when ent in ('certificates','labs','epis','epiEntregas','epiFichas') then array['qualidade']
    when ent in ('equipments','serviceOrders','parts') then array['manutencao']
    when ent = 'pvChamados' then array['pos-vendas','qualidade']
    when ent in ('pvClientes','pvAvaliacoes') then array['pos-vendas']
    when ent = 'team' then array['rh','ti','programacao']
    when ent like 'rh%' then array['rh']
    when ent like 'prog%' then array['programacao']
    when ent = 'history' then array['*']
    else array[]::text[]
  end;
$$;

create or replace function public.cc_pode_gravar(ent text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare p public.cc_perfis; a text;
begin
  select * into p from public.cc_perfis where id = auth.uid();
  if p.id is null or not p.ativo then return false; end if;
  if p.admin then return true; end if;
  foreach a in array public.cc_areas_da_colecao(ent) loop
    if a = '*' then return true; end if;
    if coalesce(p.permissoes -> 'areas' ->> a, '') = 'editar' then return true; end if;
  end loop;
  return false;
end $$;

-- ---------- 3. fecha as tabelas ----------
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('entities','computers') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
alter table public.entities enable row level security;
alter table public.computers enable row level security;

create policy cc_ent_select on public.entities for select to authenticated using (public.cc_ativo());
create policy cc_ent_insert on public.entities for insert to authenticated with check (public.cc_pode_gravar(entity));
create policy cc_ent_update on public.entities for update to authenticated using (public.cc_pode_gravar(entity)) with check (public.cc_pode_gravar(entity));
create policy cc_ent_delete on public.entities for delete to authenticated using (public.cc_pode_gravar(entity));

create policy cc_pc_select on public.computers for select to authenticated using (public.cc_ativo());
create policy cc_pc_insert on public.computers for insert to authenticated with check (public.cc_pode_gravar('computers'));
create policy cc_pc_update on public.computers for update to authenticated using (public.cc_pode_gravar('computers')) with check (public.cc_pode_gravar('computers'));
create policy cc_pc_delete on public.computers for delete to authenticated using (public.cc_pode_gravar('computers'));

-- arquivos (PDFs) do bucket "files": pasta = coleção
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
           and (coalesce(qual,'') like '%files%' or coalesce(with_check,'') like '%files%') loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;
create policy cc_files_select on storage.objects for select to authenticated using (bucket_id = 'files' and public.cc_ativo());
create policy cc_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'files' and public.cc_pode_gravar(split_part(name, '/', 1)));
create policy cc_files_update on storage.objects for update to authenticated using (bucket_id = 'files' and public.cc_pode_gravar(split_part(name, '/', 1)));
create policy cc_files_delete on storage.objects for delete to authenticated using (bucket_id = 'files' and public.cc_pode_gravar(split_part(name, '/', 1)));

-- ---------- 4. avaliação de satisfação pública (sem login) ----------
-- Só devolve o mínimo daquela avaliação e só grava a resposta uma vez, dentro do prazo.
create or replace function public.cc_av_get(tok text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when tok ~ '^[A-Za-z0-9]{20,48}$' then
    (select jsonb_build_object('status', data->>'status', 'expiraEm', data->>'expiraEm', 'clienteNome', data->>'clienteNome',
            'contatoNome', data->>'contatoNome', 'chamadoNumero', data->>'chamadoNumero')
       from public.entities where entity = 'pvAvaliacoes' and id = 'av_' || tok)
  end;
$$;

create or replace function public.cc_av_responder(tok text, resposta jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if tok !~ '^[A-Za-z0-9]{20,48}$' or resposta is null or length(resposta::text) > 8000 then return false; end if;
  update public.entities
     set data = data || jsonb_build_object('status', 'respondida', 'respostaEm', now(), 'resposta', resposta),
         updated_at = now()
   where entity = 'pvAvaliacoes' and id = 'av_' || tok
     and data->>'status' = 'enviada'
     and (data->>'expiraEm')::timestamptz > now();
  get diagnostics n = row_count;
  return n = 1;
end $$;

revoke all on function public.cc_av_get(text) from public;
revoke all on function public.cc_av_responder(text, jsonb) from public;
grant execute on function public.cc_av_get(text) to anon, authenticated;
grant execute on function public.cc_av_responder(text, jsonb) to anon, authenticated;
grant execute on function public.cc_me() to authenticated;
grant execute on function public.cc_senha_trocada() to authenticated;

-- =============================================================================
-- 1º ADMINISTRADOR
--  a) Supabase → Authentication → Users → "Add user" → "Create new user":
--     seu e-mail + uma senha, marque "Auto Confirm User".
--  b) Rode a linha abaixo trocando o e-mail:
--
-- insert into public.cc_perfis (id, email, nome, admin, ativo, trocar_senha)
-- select id, email, 'Seu nome', true, true, false from auth.users where email = 'seu@email.com'
-- on conflict (id) do update set admin = true, ativo = true;
-- =============================================================================

-- =============================================================================
-- BONECO (planta da Home): cada pessoa salva a aparência do PRÓPRIO boneco,
-- mesmo sem permissão de edição no RH. Só altera o campo "avatar" do cadastro
-- ligado à conta (cc_perfis.team_id).
-- =============================================================================
create or replace function public.cc_salvar_avatar(av jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare tid text; n int;
begin
  if av is null or length(av::text) > 1000 then return false; end if;
  select team_id into tid from public.cc_perfis where id = auth.uid() and ativo;
  if tid is null then return false; end if;
  update public.entities set data = jsonb_set(data, '{avatar}', av), updated_at = now() where entity = 'team' and id = tid;
  get diagnostics n = row_count; return n = 1;
end $$;
revoke all on function public.cc_salvar_avatar(jsonb) from public;
grant execute on function public.cc_salvar_avatar(jsonb) to authenticated;


-- =============================================================================
-- RH: documentos pessoais (CPF) — coleção "rhDocs" só é lida por quem tem acesso ao RH
-- =============================================================================
create or replace function public.cc_pode_ver(area text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select ativo and (admin or coalesce(permissoes -> 'areas' ->> area, '') in ('ver', 'editar')) from public.cc_perfis where id = auth.uid()), false);
$$;
drop policy if exists cc_ent_select on public.entities;
create policy cc_ent_select on public.entities for select to authenticated
  using (public.cc_ativo() and (entity <> 'rhDocs' or public.cc_pode_ver('rh')));


-- =============================================================================
-- Indicadores IATF: metas (coleção "qaKpi") gravadas por quem edita a Qualidade
-- =============================================================================
create or replace function public.cc_areas_da_colecao(ent text)
returns text[] language sql immutable as $$
  select case
    when ent in ('printers','commands','runbooks','inventory','phones','sharepoint','webDomains','dnsRecords','computers') then array['ti']
    when ent = 'licenses' then array['ti','qualidade']
    when ent in ('certificates','labs','epis','epiEntregas','epiFichas','qaKpi') then array['qualidade']
    when ent in ('equipments','serviceOrders','parts') then array['manutencao']
    when ent = 'pvChamados' then array['pos-vendas','qualidade']
    when ent in ('pvClientes','pvAvaliacoes') then array['pos-vendas']
    when ent = 'team' then array['rh','ti','programacao']
    when ent like 'rh%' then array['rh']
    when ent like 'prog%' then array['programacao']
    when ent = 'history' then array['*']
    else array[]::text[]
  end;
$$;
