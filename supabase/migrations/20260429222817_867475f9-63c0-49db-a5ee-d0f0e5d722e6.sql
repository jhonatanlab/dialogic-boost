
WITH norm AS (
  SELECT
    c.company_id,
    regexp_replace(coalesce(c.phone,''), '\D', '', 'g') AS p_norm
  FROM public.contacts c
),
expanded AS (
  SELECT company_id::text AS company_id, p_norm AS tel FROM norm WHERE p_norm <> ''
  UNION
  SELECT company_id::text,
    CASE
      WHEN length(p_norm)=13 AND substring(p_norm,1,2)='55' AND substring(p_norm,5,1)='9'
        THEN substring(p_norm,1,4) || substring(p_norm,6)
      WHEN length(p_norm)=12 AND substring(p_norm,1,2)='55'
        THEN substring(p_norm,1,4) || '9' || substring(p_norm,5)
      ELSE p_norm
    END
  FROM norm WHERE p_norm <> ''
)
DELETE FROM public.ai_control a
WHERE NOT EXISTS (
  SELECT 1 FROM expanded e
  WHERE e.company_id = a.company_id AND e.tel = a.telefone
);
