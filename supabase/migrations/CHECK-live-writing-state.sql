-- ---------------------------------------------------------------------------
-- CHECK : has live writing been migrated, and how far?
-- ---------------------------------------------------------------------------
-- Read-only. Paste into the Supabase SQL editor to see where the database is.
-- Changes nothing, so it is safe to run any time.
--
-- Reading the result:
--
--   0 | 0 | 0 | f | f   nothing applied yet
--                       -> run 2026-10-04-live-coauthoring.sql, then
--                          2026-10-07-jp-list-doc-live.sql
--
--   1 | 1 | 5 | f | f   the live migration landed, the functions did not
--                       -> run 2026-10-07-jp-list-doc-live.sql
--                       This is the state a truncated schema.sql paste leaves.
--
--   1 | 1 | 5 | t | t   fully migrated; live writing will offer itself
--
-- Anything else is a part-applied run: re-run schema.sql, which always ends in
-- the current state and is always safe to re-run.

select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'jp_docs'
       and column_name = 'live')                                    as live_column,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'jp_updates')    as jp_updates_table,
  (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'jp_live%' or p.proname = 'jp_set_live'))  as live_functions,
  (select pg_get_function_result(p.oid) like '%live%' from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'jp_doc')             as jp_doc_reports_live,
  (select pg_get_function_result(p.oid) like '%live%' from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'jp_list')            as jp_list_reports_live;
