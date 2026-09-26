import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

console.log(
    'PRIVATE SUPABASE KEY LOADED:',
    Boolean(env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY)
);

export const supabaseServer = createClient(
    PUBLIC_SUPABASE_URL,
    env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY
);