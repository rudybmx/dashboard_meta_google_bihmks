-- BLOCO 2 — ai_insights RLS

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role acesso total" ON public.ai_insights;
CREATE POLICY "service_role acesso total" ON public.ai_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios veem seus insights" ON public.ai_insights;
CREATE POLICY "usuarios veem seus insights" ON public.ai_insights
  FOR SELECT TO authenticated
  USING (
    account_id IN (
      SELECT unnest(assigned_account_ids)
      FROM public.perfil_acesso
      WHERE auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.perfil_acesso
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );
