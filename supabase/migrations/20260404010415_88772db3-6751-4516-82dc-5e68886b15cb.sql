UPDATE public.admin_settings AS a
SET company_id = p.company_id
FROM public.profiles AS p
WHERE a.user_id = p.user_id
  AND a.company_id IS NULL;