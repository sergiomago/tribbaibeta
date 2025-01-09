import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://wdffpyeesafsejfmzwvi.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZmZweWVlc2Fmc2VqZm16d3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NDA2ODcsImV4cCI6MjA1MjAxNjY4N30.fzRXTg_yy2pDDPAaAnJdmrfSERo5NmyVRqN-kzFhP6A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);