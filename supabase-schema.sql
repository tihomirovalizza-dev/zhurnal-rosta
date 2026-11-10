-- Одна таблица для всех записей журнала. Каждый пользователь видит и меняет только свои строки.
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coll text not null check (coll in ('days', 'weeks', 'tests', 'open')),
  id text not null,
  data jsonb not null,
  primary key (user_id, coll, id)
);

alter table public.docs enable row level security;

drop policy if exists "docs_select_own" on public.docs;
create policy "docs_select_own" on public.docs
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "docs_insert_own" on public.docs;
create policy "docs_insert_own" on public.docs
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "docs_update_own" on public.docs;
create policy "docs_update_own" on public.docs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.docs to authenticated;
