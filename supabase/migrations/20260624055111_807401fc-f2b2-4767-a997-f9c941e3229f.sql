
CREATE OR REPLACE FUNCTION public.simulate_appointment_rules(
  p_company_id uuid,
  p_user_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes int
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rules public.appointment_rules;
  v_end timestamptz;
  v_dow int;
  v_key text;
  v_windows jsonb;
  v_window jsonb;
  v_in_window boolean := false;
  v_start_time time;
  v_end_time time;
  v_appt_start time;
  v_appt_end time;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_count int;
  v_checks jsonb := '[]'::jsonb;
  v_ok boolean;
  v_detail text;
  v_label text;
  v_all_ok boolean := true;
BEGIN
  v_rules := public.resolve_appointment_rules(p_company_id, p_user_id);
  v_end := p_scheduled_at + (p_duration_minutes || ' minutes')::interval;

  -- Duration min
  v_label := 'Duração mínima';
  v_ok := p_duration_minutes >= v_rules.min_duration_minutes;
  v_detail := format('Duração %s min (mínimo %s min)', p_duration_minutes, v_rules.min_duration_minutes);
  v_checks := v_checks || jsonb_build_object('label', v_label, 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

  -- Duration max
  v_label := 'Duração máxima';
  v_ok := p_duration_minutes <= v_rules.max_duration_minutes;
  v_detail := format('Duração %s min (máximo %s min)', p_duration_minutes, v_rules.max_duration_minutes);
  v_checks := v_checks || jsonb_build_object('label', v_label, 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

  -- Weekly window
  v_dow := EXTRACT(DOW FROM p_scheduled_at)::int;
  v_key := CASE v_dow
    WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' WHEN 3 THEN 'wed'
    WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' WHEN 6 THEN 'sat' END;
  v_windows := COALESCE(v_rules.weekly_schedule -> v_key, '[]'::jsonb);
  v_appt_start := p_scheduled_at::time;
  v_appt_end := v_end::time;

  v_label := 'Dia/Janela permitida';
  IF jsonb_array_length(v_windows) = 0 THEN
    v_ok := false;
    v_detail := 'Agendamentos não são permitidos neste dia da semana';
  ELSE
    FOR v_window IN SELECT * FROM jsonb_array_elements(v_windows) LOOP
      v_start_time := (v_window ->> 'start')::time;
      v_end_time := (v_window ->> 'end')::time;
      IF v_appt_start >= v_start_time AND v_appt_end <= v_end_time THEN
        v_in_window := true;
        EXIT;
      END IF;
    END LOOP;
    v_ok := v_in_window;
    v_detail := CASE WHEN v_in_window THEN 'Dentro da janela permitida'
                     ELSE 'Horário fora das janelas permitidas para este dia' END;
  END IF;
  v_checks := v_checks || jsonb_build_object('label', v_label, 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

  -- Max per day
  IF v_rules.max_per_day IS NOT NULL AND p_user_id IS NOT NULL THEN
    v_day_start := date_trunc('day', p_scheduled_at);
    v_day_end := v_day_start + interval '1 day';
    SELECT count(*) INTO v_count FROM public.appointments
     WHERE company_id = p_company_id AND user_id = p_user_id
       AND status <> 'cancelled'
       AND scheduled_at >= v_day_start AND scheduled_at < v_day_end;
    v_ok := v_count < v_rules.max_per_day;
    v_detail := format('%s agendamento(s) neste dia (limite %s)', v_count, v_rules.max_per_day);
    v_checks := v_checks || jsonb_build_object('label', 'Limite por dia', 'ok', v_ok, 'detail', v_detail);
    IF NOT v_ok THEN v_all_ok := false; END IF;
  END IF;

  -- Max per slot
  SELECT count(*) INTO v_count FROM public.appointments
   WHERE company_id = p_company_id
     AND status <> 'cancelled'
     AND scheduled_at < v_end
     AND (scheduled_at + (duration_minutes || ' minutes')::interval) > p_scheduled_at;
  v_ok := v_count < v_rules.max_per_slot;
  v_detail := format('%s agendamento(s) sobrepostos (limite %s)', v_count, v_rules.max_per_slot);
  v_checks := v_checks || jsonb_build_object('label', 'Limite por horário', 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

  -- Buffer
  IF v_rules.buffer_minutes > 0 AND p_user_id IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM public.appointments
     WHERE company_id = p_company_id AND user_id = p_user_id
       AND status <> 'cancelled'
       AND scheduled_at < (v_end + (v_rules.buffer_minutes || ' minutes')::interval)
       AND (scheduled_at + (duration_minutes || ' minutes')::interval) > (p_scheduled_at - (v_rules.buffer_minutes || ' minutes')::interval);
    v_ok := v_count = 0;
    v_detail := CASE WHEN v_ok THEN format('Intervalo de %s min respeitado', v_rules.buffer_minutes)
                     ELSE format('Conflito com intervalo mínimo de %s min', v_rules.buffer_minutes) END;
    v_checks := v_checks || jsonb_build_object('label', 'Intervalo entre agendamentos', 'ok', v_ok, 'detail', v_detail);
    IF NOT v_ok THEN v_all_ok := false; END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', v_all_ok,
    'checks', v_checks,
    'resolved_scope', CASE WHEN v_rules.id IS NULL THEN 'defaults'
                           WHEN v_rules.user_id IS NOT NULL THEN 'user'
                           ELSE 'company' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.simulate_appointment_rules(uuid, uuid, timestamptz, int) TO authenticated;
