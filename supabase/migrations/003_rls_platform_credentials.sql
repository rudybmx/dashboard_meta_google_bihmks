-- BLOCO 3 — platform_credentials RLS
-- Apenas service_role — tokens nunca expostos ao front

ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role acesso total" ON public.platform_credentials;
CREATE POLICY "service_role acesso total" ON public.platform_credentials
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- SEM policy para authenticated — tokens nunca vão ao front
