import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
    if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
    try {
        // @ts-ignore - access import.meta.env only if it exists
        if (import.meta && import.meta.env && import.meta.env[name]) return import.meta.env[name];
    } catch (e) { }
    return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
