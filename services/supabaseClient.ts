import { createClient } from '@supabase/supabase-js';

// Em um ambiente de produção Vite, use import.meta.env.VITE_SUPABASE_URL
// Para este exemplo, usamos as chaves fornecidas como fallback.

// Cast import.meta to any to avoid TS errors if types aren't configured
const env = (import.meta as any).env;

const SUPABASE_URL = env?.VITE_SUPABASE_URL || 'https://eylnuxgwxlhyasigvzdj.supabase.co';
const SUPABASE_ANON_KEY = env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bG51eGd3eGxoeWFzaWd2emRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTU3MDgsImV4cCI6MjA4MjAzMTcwOH0.IQCLTyliIHYgxB3p0xHU72RRvgDcUyT_g9fxKRJD1po';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);