import { createClient } from '@supabase/supabase-js';

// Access environment variables with fallbacks to the provided credentials
// We cast import.meta to any to avoid TypeScript errors if types aren't perfectly set up
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mygefdicammrvpnksaqb.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fFFHU6cNapaSXv-wozIi9Q_EWMq-qlD';

// Ensure the client is created with valid strings
export const supabase = createClient(supabaseUrl, supabaseAnonKey);