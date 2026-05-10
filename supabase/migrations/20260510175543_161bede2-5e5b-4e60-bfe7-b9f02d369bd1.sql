CREATE OR REPLACE FUNCTION public.sweep_stale_presence()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH stale AS (
    SELECT id, session_started_at, last_seen_at, total_online_seconds
    FROM public.user_presence
    WHERE is_online = true
      AND last_seen_at < (now() - interval '3 minutes')
  ), upd AS (
    UPDATE public.user_presence up
    SET
      is_online = false,
      session_started_at = NULL,
      total_online_seconds = up.total_online_seconds + GREATEST(
        0,
        COALESCE(EXTRACT(EPOCH FROM (up.last_seen_at - up.session_started_at))::bigint, 0)
      ),
      updated_at = now()
    FROM stale
    WHERE up.id = stale.id
    RETURNING up.id
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;