
-- Appointment rules table
CREATE TABLE public.appointment_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  min_duration_minutes integer NOT NULL DEFAULT 15,
  max_duration_minutes integer NOT NULL DEFAULT 240,
  buffer_minutes integer NOT NULL DEFAULT 0,
  max_per_day integer,
  max_per_slot integer NOT NULL DEFAULT 1,
  allow_repeat_same_slot boolean NOT NULL DEFAULT false,
  weekly_schedule jsonb NOT NULL DEFAULT '{
    "mon":[{"start":"08:00","end":"18:00"}],
    "tue":[{"start":"08:00","end":"18:00"}],
    "wed":[{"start":"08:00","end":"18:00"}],
    "thu":[{"start":"08:00","end":"18:00"}],
    "fri":[{"start":"08:00","end":"18:00"}],
    "sat":[],
    "sun":[]
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one company-default (user_id NULL) and one per user
CREATE UNIQUE INDEX appointment_rules_company_default_uidx
  ON public.appointment_rules(company_id) WHERE user_id IS NULL;
CREATE UNIQUE INDEX appointment_rules_company_user_uidx
  ON public.appointment_rules(company_id, user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_rules TO authenticated;
GRANT ALL ON public.appointment_rules TO service_role;

ALTER TABLE public.appointment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view rules of their company"
  ON public.appointment_rules FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins/managers manage company default rules"
  ON public.appointment_rules FOR ALL TO authenticated
  USING (
    company_id = public.get_user_company_id()
    AND user_id IS NULL
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND user_id IS NULL
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Users manage their own override rules"
  ON public.appointment_rules FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id() AND user_id = auth.uid())
  WITH CHECK (company_id = public.get_user_company_id() AND user_id = auth.uid());

CREATE TRIGGER appointment_rules_updated_at
  BEFORE UPDATE ON public.appointment_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resolve effective rules: user override > company default > built-in defaults
CREATE OR REPLACE FUNCTION public.resolve_appointment_rules(p_company_id uuid, p_user_id uuid)
RETURNS public.appointment_rules
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_appointment_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_rules := public.resolve_appointment_rules(NEW.company_id, NEW.user_id);
  v_end := NEW.scheduled_at + (NEW.duration_minutes || ' minutes')::interval;

  -- Duration
  IF NEW.duration_minutes < v_rules.min_duration_minutes THEN
    RAISE EXCEPTION 'Duração mínima permitida é % minutos', v_rules.min_duration_minutes;
  END IF;
  IF NEW.duration_minutes > v_rules.max_duration_minutes THEN
    RAISE EXCEPTION 'Duração máxima permitida é % minutos', v_rules.max_duration_minutes;
  END IF;

  -- Weekly window
  v_dow := EXTRACT(DOW FROM NEW.scheduled_at)::int; -- 0=Sun..6=Sat
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

  -- Max per day (per user)
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

  -- Max per slot (overlap, company-wide)
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

  -- Buffer between appointments (same user)
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
$$;

CREATE TRIGGER validate_appointment_rules_trg
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_rules();
