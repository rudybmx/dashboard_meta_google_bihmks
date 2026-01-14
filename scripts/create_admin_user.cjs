const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://eylnuxgwxlhyasigvzdj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bG51eGd3eGxoeWFzaWd2emRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTU3MDgsImV4cCI6MjA4MjAzMTcwOH0.IQCLTyliIHYgxB3p0xHU72RRvgDcUyT_g9fxKRJD1po';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createAdmin() {
    console.log("Iniciando criação de usuário Admin...");

    const email = 'rudy@op7.com';
    const password = '25576124';

    // 1. Criar Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error("Erro ao criar Auth User:", authError.message);
        // Se já existe, vamos tentar pegar o ID
        if (authError.message.includes('already registered')) {
            console.log("Usuário já existe. Tentando login para pegar ID...");
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (loginError) {
                console.error("Não foi possível logar:", loginError.message);
                return;
            }
            return handleProfile(loginData.user.id, email);
        }
        return;
    }

    if (authData.user) {
        console.log("Usuário Auth criado com ID:", authData.user.id);
        
        // O passo 2 (confirmar email) e 3 (criar perfil) faremos via SQL tool depois para garantir (pois via client pode ter RLS bloqueando insert em user_profiles se não estiver logado como admin real ou service role)
        // Mas como tenho o ID aqui, vou imprimir para usar no próximo passo.
    }
}

async function handleProfile(userId, email) {
    console.log(`Pronto para configurar perfil para ${userId}`);
}

createAdmin();
