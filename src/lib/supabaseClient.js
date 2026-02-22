import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'dummy'
const appSecret = import.meta.env.VITE_APP_SECRET || 'fallback_secret'

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            'x-shopstock-secret': appSecret
        }
    }
})

export default supabase
