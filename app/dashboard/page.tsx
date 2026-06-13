'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import { StatusBadge, OwnerBadge } from '@/components/ui'
import { CalendarDays, Truck, Zap, ArrowRight, Plus, X, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react'
import type { Klus, Gear, Accessory, Bus, Notitie } from '@/lib/types'
import Link from 'next/link'
import { format, addDays } from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'

const PRIORITEIT_STYLES: Record<string, string> = {
  urgent: 'bg-red-500 text-white border-red-500',
  hoog: 'bg-amber-50 text-amber-800 border border-amber-300',
  normaal: 'bg-blue-50 text-blue-700 border border-blue-200',
  laag: 'bg-ink-50 text-ink-500 border border-ink-200',
}
const PRIORITEIT_ICONS: Record<string, any> = {
  urgent: AlertTriangle, hoog: AlertTriangle, normaal: Info, laag: Info,
}

export default function DashboardPage() {
  const [klussen, setKlussen] = useState<Klus[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [notities, setNotities] = useState<Notitie[]>([])
  const [busGear, setBusGear] = useState<Record<string, { gear: Gear; klus: string; datum: string }[]>>({})
  const [factuurStats, setFactuurStats] = useState({ open: 0, betaald: 0, aantalOpen: 0 })
  const [nieuweNotitie, setNieuweNotitie] = useState('')
  const [notitieP, setNotitieP] = useState('normaal')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: k }, { data: g }, { data: a }, { data: b }, { data: kg }, { data: f }, { data: n }, { data: pk }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(naam, bedrijf)').order('start_datum'),
      supabase.from('gear').select('*, laatste_bus:bussen(naam)').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('bussen').select('*'),
      supabase.from('klus_gear').select('klus_id, gear_id'),
      supabase.from('facturen').select('status, totaal_excl'),
      supabase.from('notities').select('*, gear:gear(naam)').eq('afgehandeld', false).order('created_at', { ascending: false }),
      supabase.from('paklijst_items').select('*, gear:gear(naam, categorie), klus:klussen(naam, start_datum), bus:bussen(naam, id)').order('created_at', { ascending: false }).limit(50),
    ])

    const klussenMapped = (k || []).map(kl => ({
      ...kl,
      gear_ids: (kg || []).filter(x => x.klus_id === kl.id).map(x => x.gear_id)
    }))
    setKlussen(klussenMapped)
    setGear(g || [])
    setAccessories(a || [])
    setBussen(b || [])
    setNotities(n || [])

    // Gear per bus (laatste gebruik)
    const busGearMap: Record<string, { gear: Gear; klus: string; datum: string }[]> = {}
    ;(b || []).forEach(bus => { busGearMap[bus.id] = [] })
    ;(pk || []).forEach((item: any) => {
      if (item.bus_id && busGearMap[item.bus_id] && item.gear) {
        const exists = busGearMap[item.bus_id].find(x => x.gear.id === item.gear_id)
        if (!exists) {
          busGearMap[item.bus_id].push({
            gear: item.gear,
            klus: item.klus?.naam || '',
            datum: item.klus?.start_datum || ''
          })
        }
      }
    })
    setBusGear(busGearMap)

    const openF = (f || []).filter(x => x.status === 'onbetaald')
    setFactuurStats({
      open: openF.reduce((s, x) => s + x.totaal_excl, 0),
      betaald: (f || []).filter(x => x.status === 'betaald').reduce((s, x) => s + x.totaal_excl, 0),
      aantalOpen: openF.length,
    })
    setLoading(false)
  }

  async function voegNotitieOe() {
    if (!nieuweNotitie.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profiel } = await supabase.from('profielen').select('naam').eq('id', user?.id).single()
    await supabase.from('notities').insert({
      tekst: nieuweNotitie,
      prioriteit: notitieP,
      aangemaakt_door: user?.id,
      aangemaakt_door_naam: profiel?.naam || user?.email,
    })
    setNieuweNotitie('')
    await loadAll()
  }

  async function verwijderNotitie(id: string) {
    await supabase.from('notities').update({ afgehandeld: true, afgehandeld_op: new Date().toISOString() }).eq('id', id)
    await loadAll()
  }

  const today = new Date()
  const weekEnd = addDays(today, 7)
  const komend = klussen.filter(k => {
    if (!k.start_datum) return false
    const s = new Date(k.start_datum), e = new Date(k.eind_datum || k.start_datum)
    return e >= today && s <= weekEnd
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-ink-400 text-sm">Laden…</div>
    </div>
  )

  return (
    <div className="p-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-800">Dashboard</h1>
          <p className="text-sm text-ink-400 mt-0.5">{format(today, "EEEE d MMMM yyyy", { locale: nl })}</p>
        </div>
        <div className="flex gap-3">
          {factuurStats.aantalOpen > 0 && (
            <Link href="/facturen" className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl text-sm hover:bg-amber-100 transition-colors">
              <Clock size={14} /> {factuurStats.aantalOpen} open factuur{factuurStats.aantalOpen > 1 ? 'en' : ''} · {eur(factuurStats.open)}
            </Link>
          )}
          <Link href="/klussen" className="btn btn-primary">
            <Plus size={14} /> Nieuwe klus
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">

        {/* LEFT COLUMN */}
        <div className="col-span-8 space-y-5">

          {/* Komende week */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-ink-700 text-sm">
                <CalendarDays size={15} className="text-brand-500" /> Komende 7 dagen
              </div>
              <Link href="/planning" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
                Weekplanning <ArrowRight size={12} />
              </Link>
            </div>
            {komend.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-400">Geen klussen de komende week.</div>
            ) : (
              <div className="space-y-2">
                {komend.map(k => {
                  const dag = klusDagwaarde(k, gear, accessories)
                  const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
                  return (
                    <Link key={k.id} href={`/klussen/${k.id}`}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-ink-50 transition-colors group border border-transparent hover:border-ink-100">
                      <div className="w-1 self-stretch rounded-full bg-brand-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-medium text-sm text-ink-800">{k.naam}</span>
                          <StatusBadge status={k.status} />
                          {k.verantwoordelijke && <OwnerBadge owner={k.verantwoordelijke} />}
                        </div>
                        <div className="text-xs text-ink-400">
                          {fmt(k.start_datum, 'd MMM')} – {fmt(k.eind_datum || k.start_datum, 'd MMM')}
                          {(k.klant as any) && ` · ${(k.klant as any).naam}`}
                          {k.locatie && ` · ${k.locatie}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {busList.map(b => (
                            <span key={b.id} className="badge badge-purple text-[10px]">
                              <Truck size={9} className="mr-1" />{b.naam.split(' ').slice(-2).join(' ')}
                            </span>
                          ))}
                          {(k.generator_info || []).map((g, i) => (
                            <span key={i} className="badge badge-amber text-[10px]">
                              <Zap size={9} className="mr-1" />{g.chauffeur || 'Generator'}
                            </span>
                          ))}
                          {(k.gear_ids || []).length > 0 && (
                            <span className="text-[10px] text-ink-400">{(k.gear_ids || []).length} gear items</span>
                          )}
                          <span className="text-[10px] text-ink-400 ml-auto">{eur(dag)}/dag</span>
                        </div>
                      </div>
                      <ArrowRight size={13} className="text-ink-200 group-hover:text-brand-400 mt-0.5 flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Bussen met laatste gear */}
          <div className="grid grid-cols-2 gap-4">
            {bussen.map(bus => {
              const busItems = busGear[bus.id] || []
              const actieveKlus = komend.find(k => (k.bus_ids || []).includes(bus.id))
              return (
                <div key={bus.id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Truck size={15} className="text-purple-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-ink-800">{bus.naam}</div>
                        {bus.kenteken && <div className="text-[10px] text-ink-400 font-mono">{bus.kenteken}</div>}
                      </div>
                    </div>
                    {actieveKlus && (
                      <span className="badge badge-green text-[10px]">In gebruik</span>
                    )}
                  </div>
                  {actieveKlus && (
                    <div className="mb-2 p-2 bg-green-50 rounded-lg text-xs text-green-700 border border-green-100">
                      <strong>{actieveKlus.naam}</strong> · {fmt(actieveKlus.start_datum, 'd MMM')}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-300 mb-1.5">
                    Laatste lading
                  </div>
                  {busItems.length === 0 ? (
                    <div className="text-xs text-ink-300 italic">Geen registraties</div>
                  ) : (
                    <div className="space-y-0.5 max-h-28 overflow-y-auto">
                      {busItems.slice(0, 8).map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-ink-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-ink-200 flex-shrink-0" />
                          <span className="truncate">{item.gear.naam}</span>
                        </div>
                      ))}
                      {busItems.length > 8 && (
                        <div className="text-[10px] text-ink-400">+{busItems.length - 8} meer</div>
                      )}
                    </div>
                  )}
                  <div className="mt-2 pt-2 border-t border-ink-100 text-[10px] text-ink-400">
                    {bus.km_stand.toLocaleString('nl')} km stand
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-4 space-y-4">

          {/* Notities widget */}
          <div className="card p-4">
            <div className="flex items-center gap-2 font-semibold text-ink-700 text-sm mb-3">
              <AlertTriangle size={14} className="text-amber-500" /> Belangrijke notities
            </div>

            {/* Voeg notitie toe */}
            <div className="mb-3 space-y-2">
              <textarea
                className="input text-xs h-14 resize-none"
                placeholder="Notitie toevoegen…"
                value={nieuweNotitie}
                onChange={e => setNieuweNotitie(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.metaKey && voegNotitieOe()}
              />
              <div className="flex gap-2">
                <select className="input text-xs py-1 flex-1" value={notitieP} onChange={e => setNotitieP(e.target.value)}>
                  <option value="laag">Laag</option>
                  <option value="normaal">Normaal</option>
                  <option value="hoog">Hoog</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button className="btn btn-sm btn-primary" onClick={voegNotitieOe} disabled={!nieuweNotitie.trim()}>
                  <Plus size={12} /> Toevoegen
                </button>
              </div>
            </div>

            {/* Notities lijst */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notities.length === 0 ? (
                <div className="text-xs text-ink-400 text-center py-4">Geen openstaande notities</div>
              ) : notities.map(n => {
                const Icon = PRIORITEIT_ICONS[n.prioriteit] || Info
                return (
                  <div key={n.id} className={clsx('rounded-lg px-3 py-2.5 text-xs flex gap-2 items-start', PRIORITEIT_STYLES[n.prioriteit])}>
                    <Icon size={12} className="flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="leading-snug">{n.tekst}</div>
                      {n.gear && <div className="opacity-70 mt-0.5">📦 {(n.gear as any).naam}</div>}
                      <div className="opacity-60 mt-0.5">{n.aangemaakt_door_naam} · {fmt(n.created_at, 'd MMM')}</div>
                    </div>
                    <button onClick={() => verwijderNotitie(n.id)} className="opacity-60 hover:opacity-100 flex-shrink-0">
                      <CheckCircle size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Financieel overzicht */}
          <div className="card p-4">
            <div className="section-title">Financieel</div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-ink-100">
                <span className="text-xs text-ink-500">Open facturen</span>
                <span className="font-semibold text-sm text-amber-600">{eur(factuurStats.open)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-ink-500">Betaald totaal</span>
                <span className="font-semibold text-sm text-green-600">{eur(factuurStats.betaald)}</span>
              </div>
            </div>
            <Link href="/facturen" className="btn btn-sm w-full justify-center mt-3 text-xs">
              Naar facturen <ArrowRight size={11} />
            </Link>
          </div>

          {/* Gear status */}
          <div className="card p-4">
            <div className="section-title">Gear status</div>
            {(['defect', 'reparatie', 'vermist'] as const).map(status => {
              const items = gear.filter(g => g.status === status)
              if (items.length === 0) return null
              return (
                <div key={status} className="mb-2">
                  <div className={clsx('badge text-[10px] mb-1', status === 'defect' || status === 'vermist' ? 'badge-red' : 'badge-amber')}>
                    {status} ({items.length})
                  </div>
                  {items.map(g => (
                    <div key={g.id} className="text-xs text-ink-600 py-0.5 pl-2 border-l-2 border-ink-200 mt-0.5">
                      {g.naam}
                    </div>
                  ))}
                </div>
              )
            })}
            {gear.filter(g => g.status && g.status !== 'beschikbaar').length === 0 && (
              <div className="text-xs text-green-600 flex items-center gap-1.5">
                <CheckCircle size={12} /> Alle gear beschikbaar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
