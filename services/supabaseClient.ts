import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Tipagem segura para variáveis de ambiente
const getEnvVar = (key: string): string => {
  const val = import.meta.env[key];
  if (!val) {
    throw new Error(`Environment variable ${key} is required but not set!`);
  }
  return val;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);