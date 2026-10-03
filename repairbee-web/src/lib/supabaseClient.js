import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://emypajxnftinpnlkleqp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVteXBhanhuZnRpbnBubGtsZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzOTMyMzgsImV4cCI6MjEwNDk2OTIzOH0.Pe5SSKbjIWRZuNigS-36n86zouWzpu1X9ECznIm-ODc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
