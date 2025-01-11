import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdffpyeesafsejfmzwvi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZmZweWVlc2Fmc2VqZm16d3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5ODc2MDAsImV4cCI6MjAyMDU2MzYwMH0.GG5UNYg6G4cBrQVlHH0COhb6-cQyvAdHrEgKGFf4ync';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
  },
});