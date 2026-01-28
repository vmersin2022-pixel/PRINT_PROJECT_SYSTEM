import { createClient } from '@supabase/supabase-js';

// Вставь свои данные из настроек Supabase (Project Settings -> API)
// Лучше использовать .env файл, но для быстрого старта можно временно вставить сюда
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://vwspjdsmdxmbzrancyhy.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_Mo0HevL9J2TrfYEj1CY__Q_AxFm-Gct';

export const supabase = createClient(supabaseUrl, supabaseKey);