import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const supabase = createClient()

// Helper: get current user profile
export async function getCurrentProfiel() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profielen').select('*').eq('id', user.id).single()
  return data
}

// Helper: log audit entry
export async function logAudit(actie: string, tabel: string, recordId: string, omschrijving: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profiel } = await supabase.from('profielen').select('naam').eq('id', user.id).single()
  await supabase.from('audit_log').insert({
    user_id: user.id,
    user_naam: profiel?.naam || user.email,
    actie, tabel, record_id: recordId, omschrijving
  })
}
