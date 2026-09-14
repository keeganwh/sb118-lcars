-- ---------------------------------------------------------------------------
-- MIGRATION 2026-09-14 : the Storage & Usage report, fixed
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor. It follows 2026-09-09-feedback-statuses.sql.
--
-- ORDER DOES NOT MATTER: this replaces one function and touches no columns, so
-- the deployed build cannot tell the difference either way.
--
-- WHAT WAS WRONG. admin_usage_overview() counted a writer's sims with
-- jsonb_array_length(payload -> 'docs'), but S.docs is an OBJECT keyed by sim
-- id, not an array. Postgres raised 'cannot get array length of a non-array'
-- and the whole report failed rather than one column, so the Admin panel showed
-- nothing but that message. It now reads an object or an array, and counts
-- anything else as zero.
--
-- Re-runnable, like everything else here.

select public.jp_drop_overloads('admin_usage_overview');
create or replace function public.admin_usage_overview()
returns table (
  writer_id      text,
  display_name   text,
  role           text,
  last_active    timestamptz,
  doc_count      integer,
  snapshot_count integer,
  joint_count    integer,
  file_bytes     bigint,
  bytes          bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.my_role() <> 'super_admin' then
    raise exception 'Only a super admin can view usage.';
  end if;
  return query
    select w.writer_id,
           nullif(btrim(coalesce(w.display_name, '')), ''),
           w.role,
           greatest(w.updated_at, s.updated_at)                      as last_active,
           -- Solo sims live in the payload blob, so the count comes out of the
           -- JSON rather than a table. A joint sim is an ordinary doc in there
           -- too, which is why it is counted separately below rather than
           -- assumed to be absent.
           --
           -- S.docs IS AN OBJECT KEYED BY ID, NOT AN ARRAY. jsonb_array_length()
           -- on it raises 'cannot get array length of a non-array', which took
           -- the whole report down rather than one column -- the first version
           -- of this function did exactly that. Both shapes are read, and
           -- anything else counts as nothing, so a payload written by some
           -- future version cannot break the page again.
           coalesce(dc.n, 0)::int                                    as doc_count,
           coalesce(sn.n, 0)::int                                    as snapshot_count,
           coalesce(jp.n, 0)::int                                    as joint_count,
           coalesce(ob.b, 0)::bigint                                 as file_bytes,
           (coalesce(pg_column_size(s.payload), 0)
            + coalesce(sn.b, 0)
            + coalesce(jp.b, 0)
            + coalesce(ob.b, 0))::bigint                             as bytes
      from public.writers w
      left join public.state s on s.writer_uid = w.id
      left join lateral (
        select case jsonb_typeof(s.payload -> 'docs')
                 when 'object' then (select count(*) from jsonb_object_keys(s.payload -> 'docs'))
                 when 'array'  then jsonb_array_length(s.payload -> 'docs')
                 else 0 end as n
      ) dc on true
      left join lateral (
        select count(*) n, sum(pg_column_size(x.html))::bigint b
          from public.snapshots x where x.writer_uid = w.id
      ) sn on true
      left join lateral (
        select count(*) n,
               sum(pg_column_size(d.content) + pg_column_size(d.meta))::bigint b
          from public.jp_docs d where d.owner_uid = w.id
      ) jp on true
      left join lateral (
        select sum(coalesce((o.metadata ->> 'size')::bigint, 0))::bigint b
          from storage.objects o
         where o.bucket_id in ('character-pics', 'app-feedback')
           and (storage.foldername(o.name))[1] = w.id::text
      ) ob on true
     order by bytes desc nulls last;
end $$;

revoke all on function public.admin_usage_overview() from public, anon;
grant execute on function public.admin_usage_overview() to authenticated;
