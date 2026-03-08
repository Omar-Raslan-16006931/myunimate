-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. ToDo Items Table
create table if not exists public.todos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  text text not null,
  completed boolean default false,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  created_at bigint default extract(epoch from now()) * 1000 -- Store as timestamp (ms)
);

alter table public.todos enable row level security;

create policy "Users can view their own todos" 
on public.todos for select using (auth.uid() = user_id);

create policy "Users can insert their own todos" 
on public.todos for insert with check (auth.uid() = user_id);

create policy "Users can update their own todos" 
on public.todos for update using (auth.uid() = user_id);

create policy "Users can delete their own todos" 
on public.todos for delete using (auth.uid() = user_id);


-- 2. Materials (Files) Table
create table if not exists public.materials (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text not null,
  size text,
  date_added text, -- YYYY-MM-DD
  file_data text, -- Base64 string (Note: Supabase has limits on row size, consider Storage for large files)
  mime_type text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.materials enable row level security;

create policy "Users can view their own materials" 
on public.materials for select using (auth.uid() = user_id);

create policy "Users can insert their own materials" 
on public.materials for insert with check (auth.uid() = user_id);

create policy "Users can delete their own materials" 
on public.materials for delete using (auth.uid() = user_id);


-- 3. Courses Table
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  code text,
  target_grade text,
  categories jsonb default '[]'::jsonb, -- Store grade categories as JSON
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.courses enable row level security;

create policy "Users can view their own courses" 
on public.courses for select using (auth.uid() = user_id);

create policy "Users can insert their own courses" 
on public.courses for insert with check (auth.uid() = user_id);

create policy "Users can update their own courses" 
on public.courses for update using (auth.uid() = user_id);

create policy "Users can delete their own courses" 
on public.courses for delete using (auth.uid() = user_id);


-- 4. Schedule Profiles Table
create table if not exists public.schedule_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  is_active boolean default false,
  periods jsonb default '[]'::jsonb, -- Store periods as JSON
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.schedule_profiles enable row level security;

create policy "Users can view their own schedule profiles" 
on public.schedule_profiles for select using (auth.uid() = user_id);

create policy "Users can insert their own schedule profiles" 
on public.schedule_profiles for insert with check (auth.uid() = user_id);

create policy "Users can update their own schedule profiles" 
on public.schedule_profiles for update using (auth.uid() = user_id);

create policy "Users can delete their own schedule profiles" 
on public.schedule_profiles for delete using (auth.uid() = user_id);


-- 5. Events Table
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  schedule_id text not null, -- Link to profile ID (which might be UUID or string 'main')
  title text not null,
  type text not null,
  start_time text not null,
  duration_minutes integer not null,
  is_recurring boolean default false,
  day_of_week text,
  date text,
  location text,
  description text,
  code text,
  "group" text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.events enable row level security;

create policy "Users can view their own events" 
on public.events for select using (auth.uid() = user_id);

create policy "Users can insert their own events" 
on public.events for insert with check (auth.uid() = user_id);

create policy "Users can update their own events" 
on public.events for update using (auth.uid() = user_id);

create policy "Users can delete their own events" 
on public.events for delete using (auth.uid() = user_id);
