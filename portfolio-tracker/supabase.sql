-- Jalankan sekali di Supabase: SQL Editor > New query > Run
create table portfolios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table portfolios enable row level security;
create policy "baris milik sendiri" on portfolios for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
