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
  parent_id uuid references public.materials(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.materials enable row level security;

create policy "Users can view their own materials" 
on public.materials for select using (auth.uid() = user_id);

create policy "Users can insert their own materials" 
on public.materials for insert with check (auth.uid() = user_id);

create policy "Users can update their own materials" 
on public.materials for update using (auth.uid() = user_id);

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

-- 6. Study Groups
create table if not exists public.study_groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.study_groups enable row level security;

create policy "Users can view study groups they are in" 
on public.study_groups for select using (
  auth.uid() = created_by or exists (select 1 from public.study_group_members where group_id = id and user_id = auth.uid())
);

create policy "Users can insert study groups" 
on public.study_groups for insert with check (auth.uid() = created_by);

create policy "Creator can update study groups" 
on public.study_groups for update using (auth.uid() = created_by);

create policy "Creator can delete study groups" 
on public.study_groups for delete using (auth.uid() = created_by);

-- 7. Study Group Members
create table if not exists public.study_group_members (
  group_id uuid references public.study_groups on delete cascade not null,
  user_id uuid references auth.users not null,
  role text default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (group_id, user_id)
);

alter table public.study_group_members enable row level security;

create policy "Users can view members of their groups" 
on public.study_group_members for select using (
  user_id = auth.uid() or exists (select 1 from public.study_group_members as sgm where sgm.group_id = study_group_members.group_id and sgm.user_id = auth.uid())
);

create policy "Users can join groups" 
on public.study_group_members for insert with check (auth.uid() = user_id);

create policy "Users can leave groups" 
on public.study_group_members for delete using (auth.uid() = user_id);

-- 8. Study Group Messages
create table if not exists public.study_group_messages (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.study_groups on delete cascade not null,
  user_id uuid references auth.users not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.study_group_messages enable row level security;

create policy "Users can view messages in their groups" 
on public.study_group_messages for select using (
  exists (select 1 from public.study_group_members where group_id = public.study_group_messages.group_id and user_id = auth.uid())
);

create policy "Users can insert messages in their groups" 
on public.study_group_messages for insert with check (
  auth.uid() = user_id and exists (select 1 from public.study_group_members where group_id = public.study_group_messages.group_id and user_id = auth.uid())
);

-- 9. Study Group Documents
create table if not exists public.study_group_documents (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.study_groups on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null,
  url text,
  file_data text,
  mime_type text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.study_group_documents enable row level security;

create policy "Users can view documents in their groups" 
on public.study_group_documents for select using (
  exists (select 1 from public.study_group_members where group_id = public.study_group_documents.group_id and user_id = auth.uid())
);

create policy "Users can insert documents in their groups" 
on public.study_group_documents for insert with check (
  auth.uid() = user_id and exists (select 1 from public.study_group_members where group_id = public.study_group_documents.group_id and user_id = auth.uid())
);

-- 10. Study Group Sessions
create table if not exists public.study_group_sessions (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.study_groups on delete cascade not null,
  created_by uuid references auth.users not null,
  title text not null,
  start_time timestamp with time zone not null,
  duration_minutes integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.study_group_sessions enable row level security;

create policy "Users can view sessions in their groups" 
on public.study_group_sessions for select using (
  exists (select 1 from public.study_group_members where group_id = public.study_group_sessions.group_id and user_id = auth.uid())
);

create policy "Users can insert sessions in their groups" 
on public.study_group_sessions for insert with check (
  auth.uid() = created_by and exists (select 1 from public.study_group_members where group_id = public.study_group_sessions.group_id and user_id = auth.uid())
);
