-- Eseguire una volta nell'SQL Editor del proprio progetto Supabase.
-- I dati sono isolati per proprietario tramite RLS; nessuna service_role nel browser.
create table if not exists public.user_spaces (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.user_spaces enable row level security;
revoke all on public.user_spaces from anon;
grant select, insert, update, delete on public.user_spaces to authenticated;
drop policy if exists "Owner reads own space" on public.user_spaces;
create policy "Owner reads own space" on public.user_spaces for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Owner inserts own space" on public.user_spaces;
create policy "Owner inserts own space" on public.user_spaces for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Owner updates own space" on public.user_spaces;
create policy "Owner updates own space" on public.user_spaces for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "Owner deletes own space" on public.user_spaces;
create policy "Owner deletes own space" on public.user_spaces for delete to authenticated using ((select auth.uid()) = id);
create or replace function public.vyra_touch_space() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists vyra_touch_space on public.user_spaces;
create trigger vyra_touch_space before update on public.user_spaces for each row execute function public.vyra_touch_space();
