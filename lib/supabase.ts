
import { createClient } from '@supabase/supabase-js';

// Access environment variables - these MUST be set in .env.local
// We cast import.meta to any to avoid TypeScript errors if types aren't perfectly set up
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Ensure the client is created with valid strings
// Casting to any to avoid type errors with mismatched supabase-js versions
export const supabase: any = createClient(supabaseUrl, supabaseAnonKey);
