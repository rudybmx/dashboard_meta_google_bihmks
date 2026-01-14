import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Tipagem segura para variáveis de ambiente
const getEnvVar = (key: string): string => {
  const val = import.meta.env[key];
  if (!val) {
    // Em desenvolvimento, podemos permitir fallbacks, mas em prod deve alertar
    // Mantendo fallbacks originais para não quebrar o setup atual do usuário
    if (key === 'VITE_SUPABASE_URL') return 'https://eylnuxgwxlhyasigvzdj.supabase.co';
    if (key === 'VITE_SUPABASE_ANON_KEY') return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bG51eGd3eGxoeWFzaWd2emRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTU3MDgsImV4cCI6MjA4MjAzMTcwOH0.IQCLTyliIHYgxB3p0xHU72RRvgDcUyT_g9fxKRJD1po';
    console.warn(`Environment variable ${key} is missing!`);
    return '';
  }
  return val;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);