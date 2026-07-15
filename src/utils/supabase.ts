import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_URL) ||
  'https://tuwikdgoedsriixunykp.supabase.co';

const supabaseKey =
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  ((import.meta as any).env && (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_rs14forZtZrbKKo_Gjv57Q_eda--oTD';

export const supabase = createClient(supabaseUrl, supabaseKey);
