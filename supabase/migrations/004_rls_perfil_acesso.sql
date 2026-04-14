-- BLOCO 4 — perfil_acesso RLS
-- Usuário vê apenas o próprio perfil, admin vê todos

ALTER TABLE public.perfil_acesso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role acesso total" ON public.perfil_acesso;
CREATE POLICY "service_role acesso total" ON public.perfil_acesso
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "usuario ve proprio perfil" ON public.perfil_acesso;
CREATE POLICY "usuario ve proprio perfil" ON public.perfil_acesso
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.perfil_acesso p2
      WHERE p2.auth_user_id = auth.uid()
      AND p2.role = 'admin'
    )
  );
