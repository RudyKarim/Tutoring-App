-- Praxis — initial schema. Run once in the Supabase SQL editor (or `supabase db push`).
create extension if not exists btree_gist;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  faculty     text check (faculty in ('engineering', 'finance', 'law')),
  goals       text not null default '' check (char_length(goals) <= 500),
  created_at  timestamptz not null default now()
);

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- bookings ----------
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  tutor_id          text not null,
  specialization    text not null,
  topic             text not null check (char_length(topic) between 3 and 140),
  notes             text not null default '' check (char_length(notes) <= 1000),
  date              date not null,
  start_time        time not null,
  duration_minutes  int  not null check (duration_minutes between 15 and 240),
  format            text not null check (format in ('online', 'in-person')),
  price             int  not null check (price >= 0),
  status            text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  contact_name      text not null,
  contact_email     text not null,
  contact_phone     text not null default '',
  created_at        timestamptz not null default now(),
  slot              tsrange generated always as (
                      tsrange(date + start_time, date + start_time + duration_minutes * interval '1 minute', '[)')
                    ) stored
);

create index if not exists bookings_user_idx  on public.bookings (user_id, date);
create index if not exists bookings_tutor_idx on public.bookings (tutor_id, date);

-- Double-booking guards: a tutor can't have two overlapping confirmed sessions,
-- and neither can a student. Violations raise SQLSTATE 23P01.
alter table public.bookings drop constraint if exists no_tutor_overlap;
alter table public.bookings add constraint no_tutor_overlap
  exclude using gist (tutor_id with =, slot with &&) where (status = 'confirmed');

alter table public.bookings drop constraint if exists no_student_overlap;
alter table public.bookings add constraint no_student_overlap
  exclude using gist (user_id with =, slot with &&) where (status = 'confirmed');

-- ---------- favorites ----------
create table if not exists public.favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  tutor_id    text not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, tutor_id)
);

-- ---------- row level security ----------
alter table public.profiles  enable row level security;
alter table public.bookings  enable row level security;
alter table public.favorites enable row level security;

drop policy if exists "own profile read"   on public.profiles;
drop policy if exists "own profile update" on public.profiles;
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own bookings read"   on public.bookings;
drop policy if exists "own bookings insert" on public.bookings;
drop policy if exists "own bookings update" on public.bookings;
create policy "own bookings read"   on public.bookings for select using (auth.uid() = user_id);
create policy "own bookings insert" on public.bookings for insert with check (auth.uid() = user_id and status = 'confirmed');
create policy "own bookings update" on public.bookings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own favorites" on public.favorites;
create policy "own favorites" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
