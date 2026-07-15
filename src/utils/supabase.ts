import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Default values
let url = process.env.VITE_SUPABASE_URL || 'https://tuwikdgoedsriixunykp.supabase.co';
let key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_rs14forZtZrbKKo_Gjv57Q_eda--oTD';

const CONFIG_PATH = path.join(process.cwd(), 'src', 'utils', 'supabase_config.json');

try {
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    if (config.url) url = config.url;
    if (config.key) key = config.key;
  }
} catch (err) {
  console.warn('Failed to load local Supabase config file:', err);
}

let activeClient = createClient(url, key);

export function getActiveConfig() {
  return { url, key };
}

export function reloadSupabaseConfig(newUrl: string, newKey: string) {
  url = newUrl;
  key = newKey;
  activeClient = createClient(url, key);
  
  // Save to config file
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ url, key }, null, 2));
  } catch (err) {
    console.error('Failed to write local Supabase config file:', err);
  }
}

// Proxy that forwards all properties to activeClient and binds functions correctly
export const supabase = new Proxy({} as any, {
  get(target, prop, receiver) {
    const value = Reflect.get(activeClient, prop);
    if (typeof value === 'function') {
      return value.bind(activeClient);
    }
    return value;
  }
});
