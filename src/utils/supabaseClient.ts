import { createClient } from '@supabase/supabase-js';

// Default public sandbox credentials
let url = 'https://tuwikdgoedsriixunykp.supabase.co';
let key = 'sb_publishable_rs14forZtZrbKKo_Gjv57Q_eda--oTD';

// Load from localStorage if present
try {
  const savedUrl = localStorage.getItem('supabase_url');
  const savedKey = localStorage.getItem('supabase_key');
  if (savedUrl) url = savedUrl.trim();
  if (savedKey) key = savedKey.trim();
} catch (e) {
  console.warn('LocalStorage not available for client-side Supabase config:', e);
}

export let supabaseClient = createClient(url, key);

export function getClientConfig() {
  return { url, key };
}

export function reloadClientSupabaseConfig(newUrl: string, newKey: string) {
  url = newUrl.trim();
  key = newKey.trim();
  supabaseClient = createClient(url, key);
  try {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
  } catch (e) {
    console.error('Failed to save config to LocalStorage:', e);
  }
}
