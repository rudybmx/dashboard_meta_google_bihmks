-- BLOCO 1 — system_config RLS

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role acesso total" ON public.system_config;
CREATE POLICY "service_role acesso total" ON public.system_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "autenticados leem config" ON public.system_config;
CREATE POLICY "autenticados leem config" ON public.system_config
  FOR SELECT TO authenticated USING (true);
