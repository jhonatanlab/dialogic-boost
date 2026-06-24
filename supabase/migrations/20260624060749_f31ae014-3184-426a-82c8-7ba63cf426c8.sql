
ALTER TABLE public.appointment_rules
  ADD COLUMN IF NOT EXISTS fixed_duration_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fixed_duration_minutes integer NOT NULL DEFAULT 60;

CREATE OR REPLACE FUNCTION public.resolve_appointment_rules(p_company_id uuid, p_user_id uuid)
 RETURNS appointment_rules
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.appointment_rules;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_row FROM public.appointment_rules
     WHERE company_id = p_company_id AND user_id = p_user_id LIMIT 1;
    IF FOUND THEN RETURN v_row; END IF;
  END IF;

  SELECT * INTO v_row FROM public.appointment_rules
   WHERE company_id = p_company_id AND user_id IS NULL LIMIT 1;
  IF FOUND THEN RETURN v_row; END IF;

  v_row.id := NULL;
  v_row.company_id := p_company_id;
  v_row.user_id := NULL;
  v_row.min_duration_minutes := 15;
  v_row.max_duration_minutes := 240;
  v_row.buffer_minutes := 0;
  v_row.max_per_day := NULL;
  v_row.max_per_slot := 1;
  v_row.allow_repeat_same_slot := false;
  v_row.fixed_duration_enabled := false;
  v_row.fixed_duration_minutes := 60;
  v_row.weekly_schedule := '{
    "mon":[{"start":"00:00","end":"23:59"}],
    "tue":[{"start":"00:00","end":"23:59"}],
    "wed":[{"start":"00:00","end":"23:59"}],
    "thu":[{"start":"00:00","end":"23:59"}],
    "fri":[{"start":"00:00","end":"23:59"}],
    "sat":[{"start":"00:00","end":"23:59"}],
    "sun":[{"start":"00:00","end":"23:59"}]
  }'::jsonb;
  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_appointment_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_rules := public.resolve_appointment_rules(NEW.company_id, NEW.user_id);
  v_end := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval;

  -- Fixed duration
  IF v_rules.fixed_duration_enabled AND NEW.duration_minutes <> v_rules.fixed_duration_minutes THEN
    RAISE EXCEPTION 'Duração fixa de % minutos definida pelas regras de agendamento', v_rules.fixed_duration_minutes;
  END IF;

  -- Duration
  IF NEW.duration_minutes < v_rules.min_duration_minutes THEN
    RAISE EXCEPTION 'Duração mínima permitida é % minutos', v_rules.min_duration_minutes;
  END IF;
  IF NEW.duration_minutes > v_rules.max_duration_minutes THEN
    RAISE EXCEPTION 'Duração máxima permitida é % minutos', v_rules.max_duration_minutes;
  END IF;

  v_dow := EXTRACT(DOW FROM NEW.scheduled_at)::int;
  v_key := CASE v_dow
    WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue' WHEN 3 THEN 'wed'
    WHEN 4 THEN 'thu' WHEN 5 THEN 'fri' WHEN 6 THEN 'sat' END;
  v_windows := COALESCE(v_rules.weekly_schedule -> v_key, '[]'::jsonb);

  IF jsonb_array_length(v_windows) = 0 THEN
    RAISE EXCEPTION 'Agendamentos não são permitidos neste dia da semana';
  END IF;

  v_appt_start := NEW.scheduled_at::time;
  v_appt_end := v_end::time;

  FOR v_window IN SELECT * FROM jsonb_array_elements(v_windows) LOOP
    v_start_time := (v_window ->> 'start')::time;
    v_end_time := (v_window ->> 'end')::time;
    IF v_appt_start >= v_start_time AND v_appt_end <= v_end_time THEN
      v_in_window := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_in_window THEN
    RAISE EXCEPTION 'Horário fora das janelas permitidas para este dia';
  END IF;

  IF v_rules.max_per_day IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    v_day_start := date_trunc('day', NEW.scheduled_at);
    v_day_end := v_day_start + interval '1 day';
    SELECT count(*) INTO v_count
      FROM public.appointments
     WHERE company_id = NEW.company_id
       AND user_id = NEW.user_id
       AND status <> 'cancelled'
       AND scheduled_at >= v_day_start
       AND scheduled_at < v_day_end
       AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF v_count >= v_rules.max_per_day THEN
      RAISE EXCEPTION 'Limite de % agendamentos por dia atingido', v_rules.max_per_day;
    END IF;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.appointments
   WHERE company_id = NEW.company_id
     AND status <> 'cancelled'
     AND (TG_OP = 'INSERT' OR id <> NEW.id)
     AND scheduled_at < v_end
     AND (scheduled_at + (duration_minutes || ' minutes')::interval) > NEW.scheduled_at;
  IF v_count >= v_rules.max_per_slot THEN
    RAISE EXCEPTION 'Já existem % agendamento(s) neste horário (limite: %)', v_count, v_rules.max_per_slot;
  END IF;

  IF v_rules.buffer_minutes > 0 AND NEW.user_id IS NOT NULL THEN
    SELECT count(*) INTO v_count
      FROM public.appointments
     WHERE company_id = NEW.company_id
       AND user_id = NEW.user_id
       AND status <> 'cancelled'
       AND (TG_OP = 'INSERT' OR id <> NEW.id)
       AND scheduled_at < (v_end + (v_rules.buffer_minutes || ' minutes')::interval)
       AND (scheduled_at + (duration_minutes || ' minutes')::interval) > (NEW.scheduled_at - (v_rules.buffer_minutes || ' minutes')::interval);
    IF v_count > 0 THEN
      RAISE EXCEPTION 'É necessário respeitar % minutos de intervalo entre agendamentos', v_rules.buffer_minutes;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.simulate_appointment_rules(p_company_id uuid, p_user_id uuid, p_scheduled_at timestamp with time zone, p_duration_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Fixed duration
  IF v_rules.fixed_duration_enabled THEN
    v_ok := p_duration_minutes = v_rules.fixed_duration_minutes;
    v_detail := format('Duração fixa de %s min exigida pelas regras', v_rules.fixed_duration_minutes);
    v_checks := v_checks || jsonb_build_object('label', 'Duração fixa', 'ok', v_ok, 'detail', v_detail);
    IF NOT v_ok THEN v_all_ok := false; END IF;
  END IF;

  v_label := 'Duração mínima';
  v_ok := p_duration_minutes >= v_rules.min_duration_minutes;
  v_detail := format('Duração %s min (mínimo %s min)', p_duration_minutes, v_rules.min_duration_minutes);
  v_checks := v_checks || jsonb_build_object('label', v_label, 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

  v_label := 'Duração máxima';
  v_ok := p_duration_minutes <= v_rules.max_duration_minutes;
  v_detail := format('Duração %s min (máximo %s min)', p_duration_minutes, v_rules.max_duration_minutes);
  v_checks := v_checks || jsonb_build_object('label', v_label, 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

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

  SELECT count(*) INTO v_count FROM public.appointments
   WHERE company_id = p_company_id
     AND status <> 'cancelled'
     AND scheduled_at < v_end
     AND (scheduled_at + (duration_minutes || ' minutes')::interval) > p_scheduled_at;
  v_ok := v_count < v_rules.max_per_slot;
  v_detail := format('%s agendamento(s) sobrepostos (limite %s)', v_count, v_rules.max_per_slot);
  v_checks := v_checks || jsonb_build_object('label', 'Limite por horário', 'ok', v_ok, 'detail', v_detail);
  IF NOT v_ok THEN v_all_ok := false; END IF;

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
                           ELSE 'company' END,
    'fixed_duration_enabled', v_rules.fixed_duration_enabled,
    'fixed_duration_minutes', v_rules.fixed_duration_minutes
  );
END;
$function$;
