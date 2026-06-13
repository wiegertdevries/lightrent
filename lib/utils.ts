import { format, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { Gear, Accessory, Klus } from './types'

export function fmt(date: string | undefined, pattern = 'd MMM yyyy') {
  if (!date) return '—'
  try { return format(parseISO(date), pattern, { locale: nl }) }
  catch { return date }
}

export function eur(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount)
}

export function dagsBetween(start: string, end: string) {
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
  kortingPct: number
) {
  const dagen = dagsBetween(startDatum, eindDatum)
  const regels: { naam: string; dp: number; dagen: number; sub: number; isAcc?: boolean }[] = []

  gearIds.forEach(id => {
    const g = gear.find(x => x.id === id)
    if (g) regels.push({ naam: g.naam, dp: g.dagprijs, dagen, sub: g.dagprijs * dagen })
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
