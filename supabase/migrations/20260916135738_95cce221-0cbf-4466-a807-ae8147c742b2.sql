REVOKE ALL ON FUNCTION public.save_instance_zapster_config(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_instance_zapster_config(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_instance_zapster_config(uuid, text, text, text) TO authenticated;