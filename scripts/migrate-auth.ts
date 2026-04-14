import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

type PerfilAcessoRow = {
  id: string;
  email: string | null;
  password: string | null;
  nome: string | null;
  role: string | null;
  auth_user_id: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env antes de executar a migracao.',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isAlreadyRegisteredError = (message: string) =>
  message.toLowerCase().includes('already registered');

async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (match) {
      return match;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function linkPerfilToAuthUser(perfilId: string, authUserId: string) {
  const { error } = await supabase
    .from('perfil_acesso')
    .update({ auth_user_id: authUserId })
    .eq('id', perfilId);

  if (error) {
    throw error;
  }
}

async function main() {
  const { data: perfis, error } = await supabase
    .from('perfil_acesso')
    .select('id, email, password, nome, role, auth_user_id')
    .is('auth_user_id', null)
    .order('email', { ascending: true });

  if (error) {
    throw error;
  }

  const pendentes = (perfis ?? []) as PerfilAcessoRow[];

  let ok = 0;
  let skip = 0;
  let errorCount = 0;

  console.log(`Migrando ${pendentes.length} usuario(s) de perfil_acesso...`);

  for (const perfil of pendentes) {
    const email = perfil.email?.trim();
    const password = perfil.password;

    try {
      if (!email) {
        throw new Error('email ausente');
      }

      if (!password) {
        throw new Error('password ausente');
      }

      const { data, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome: perfil.nome,
          role: perfil.role,
          perfil_acesso_id: perfil.id,
        },
      });

      if (createError) {
        if (!isAlreadyRegisteredError(createError.message)) {
          throw createError;
        }

        const existingUser = await findAuthUserByEmail(email);

        if (!existingUser) {
          throw new Error(
            'usuario ja registrado no auth, mas nao foi encontrado via listUsers',
          );
        }

        await linkPerfilToAuthUser(perfil.id, existingUser.id);
        skip += 1;
        console.log(`${email} -> ✓ ja existia`);
      } else {
        const userId = data.user?.id;

        if (!userId) {
          throw new Error('createUser nao retornou user.id');
        }

        await linkPerfilToAuthUser(perfil.id, userId);
        ok += 1;
        console.log(`${email} -> ✓ migrado`);
      }
    } catch (migrationError) {
      errorCount += 1;
      const message =
        migrationError instanceof Error ? migrationError.message : String(migrationError);
      console.log(`${email ?? perfil.id} -> ✗ ERRO: ${message}`);
    }

    await delay(150);
  }

  console.log('');
  console.log(`Resumo final: ok=${ok} | skip=${skip} | error=${errorCount}`);

  if (errorCount === 0) {
    console.log('');
    console.log(
      'SQL de cleanup: UPDATE perfil_acesso SET password = NULL WHERE auth_user_id IS NOT NULL;',
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Falha na migracao: ${message}`);
  process.exitCode = 1;
});
