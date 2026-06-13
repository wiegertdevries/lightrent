import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Gear, Accessory, Klus } from './types'

export function fmt(date: string | undefined | null, pattern = 'd MMM yyyy') {
  if (!date) return '—'
  try { return format(parseISO(date), pattern, { locale: nl }) }
  catch { return date }
}

export function eur(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount || 0)
}

export function dagsBetween(start: string | undefined, end: string | undefined) {
  if (!start || !end) return 1
  try {
    const s = parseISO(start), e = parseISO(end)
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
  } catch { return 1 }
}

export function klusDagwaarde(klus: Klus, gear: Gear[], accessories: Accessory[]) {
  const gearVal = (klus.gear_ids || []).reduce((s, id) => {
    const g = gear.find(x => x.id === id)
    return s + (g ? g.dagprijs : 0)
  }, 0)
  const accVal = (klus.accessory_ids || []).reduce((s, id) => {
    const a = accessories.find(x => x.id === id)
    return s + (a ? a.dagprijs : 0)
  }, 0)
  return gearVal + accVal
}

export function calcDoc(
  gearIds: string[],
  accIds: string[],
  gear: Gear[],
  accessories: Accessory[],
  startDatum: string,
  eindDatum: string,
  busExt: number,
  genExt: number,
  kortingPct: number,
  kortingPerRegel?: Record<string, number>
) {
  const dagen = dagsBetween(startDatum, eindDatum)
  const regels: { naam: string; dp: number; dagen: number; sub: number; isAcc?: boolean; korting_pct?: number; korting_bedrag?: number }[] = []

  gearIds.forEach(id => {
    const g = gear.find(x => x.id === id)
    if (g) {
      const k = kortingPerRegel?.[id] || 0
      const sub = g.dagprijs * dagen * (1 - k / 100)
      regels.push({ naam: g.naam, dp: g.dagprijs, dagen, sub, korting_pct: k, korting_bedrag: k > 0 ? g.dagprijs * dagen * (k / 100) : 0 })
    }
  })
  accIds.forEach(id => {
    const a = accessories.find(x => x.id === id)
    if (a) {
      const parent = gear.find(x => x.id === a.gear_id)
      regels.push({ naam: `↳ ${a.naam}${parent ? ' (' + parent.naam.split(' ').slice(0, 3).join(' ') + ')' : ''}`, dp: a.dagprijs, dagen, sub: a.dagprijs * dagen, isAcc: true })
    }
  })
  if (busExt > 0) regels.push({ naam: 'Transport bus', dp: busExt, dagen, sub: busExt * dagen })
  if (genExt > 0) regels.push({ naam: 'Generator', dp: genExt, dagen, sub: genExt * dagen })

  const subtotaal = regels.reduce((s, r) => s + r.sub, 0)
  const kortingBedrag = subtotaal * (kortingPct / 100)
  const excl = subtotaal - kortingBedrag
  const btw = excl * 0.21
  return { regels, dagen, subtotaal, kortingBedrag, excl, btw, totaal: excl + btw, kortingPct }
}

export async function logAudit(supabase: any, actie: string, tabel: string, recordId: string, omschrijving: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profiel } = await supabase.from('profielen').select('naam').eq('id', user.id).single()
  await supabase.from('audit_log').insert({
    user_id: user.id,
    user_naam: profiel?.naam || user.email,
    actie, tabel, record_id: recordId, omschrijving
  })
}

export const OWNER_COLORS: Record<string, string> = {
  Wiegert: '#185FA5',
  Gideon: '#0F6E56',
  Julian: '#854F0B',
}

export const CAT_COLORS: Record<string, string> = {
  HMI: '#534AB7',
  Tungsten: '#C2410C',
  LED: '#0F6E56',
  'Textile/Frame': '#185FA5',
  Overig: '#5C574D',
}

export const PRIORITEIT_COLORS: Record<string, string> = {
  laag: 'badge-gray',
  normaal: 'badge-blue',
  hoog: 'badge-amber',
  urgent: 'badge-red',
}

export const GEAR_STATUS_COLORS: Record<string, string> = {
  beschikbaar: 'badge-green',
  defect: 'badge-red',
  reparatie: 'badge-amber',
  vermist: 'badge-red',
}
