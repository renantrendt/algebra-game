create or replace function create_ranking_table()
returns void
language plpgsql
security definer
as $$
begin
  create table if not exists ranking (
    id serial primary key,
    name text unique not null,
    score integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
  );
  
  create index if not exists ranking_score_idx on ranking (score desc);
end;
$$;

