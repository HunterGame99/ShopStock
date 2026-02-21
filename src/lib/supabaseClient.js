import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'dummy'

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
