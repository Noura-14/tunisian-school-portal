create sequence if not exists public.absence_periods_id_seq;

select setval(
	'public.absence_periods_id_seq',
	coalesce((select max(id) + 1 from public.absence_periods), 1),
	false
);

alter table public.absence_periods
	alter column id set default nextval('public.absence_periods_id_seq'),
	add column if not exists document_path text,
	add column if not exists document_name text;

alter sequence public.absence_periods_id_seq owned by public.absence_periods.id;
grant usage, select on sequence public.absence_periods_id_seq to service_role;
grant select, insert, update, delete on table public.absence_periods to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('absence-documents', 'absence-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;