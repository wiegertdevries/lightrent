'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ClipboardList, Check, ChevronRight, Truck, Zap, Package, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import type { Gear, Accessory, Bus } from '@/lib/types'

const NEEDS_BULB = ['HMI', 'Tungsten']

interface GearItem {
  gear: Gear
  accs: Accessory[]
}

export default function PaklijstPage() {
  const [klussen, setKlussen] = useState<any[]>([])
  const [selectedKlus, setSelectedKlus] = useState<string | null>(null)
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [klusGear, setKlusGear] = useState<GearItem[]>([])
  const [gepakt, setGepakt] = useState<Set<string>>(new Set()) // gear ids + 'acc-{id}' + 'bulb-{id}'
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: k }, { data: g }, { data: a }, { data: b }] = await Promise.all([
        supabase.from('klussen').select('*, klant:klanten(naam)').order('start_datum'),
        supabase.from('gear').select('*'),
        supabase.from('accessories').select('*'),
        supabase.from('bussen').select('*'),
      ])
      setKlussen(k || [])
      setGear(g || [])
      setAccessories(a || [])
      setBussen(b || [])
    }
    load()
  }, [])

  async function selectKlus(klusId: string) {
    setSelectedKlus(klusId)
    setGepakt(new Set())
    setLoading(true)
    const { data: kg } = await supabase.from('klus_gear').select('gear_id').eq('klus_id', klusId)
    const { data: ka } = await supabase.from('klus_accessories').select('accessory_id').eq('klus_id', klusId)
    const gearIds = (kg || []).map((x: any) => x.gear_id)
    const accIds = (ka || []).map((x: any) => x.accessory_id)

    // Sort: LED first, then HMI, Tungsten, Textile, Overig
    const catOrder = ['LED', 'HMI', 'Tungsten', 'Textile/Frame', 'Overig']
    const selectedGear = gear.filter(g => gearIds.includes(g.id))
      .sort((a, b) => catOrder.indexOf(a.categorie) - catOrder.indexOf(b.categorie))

    const items: GearItem[] = selectedGear.map(g => ({
      gear: g,
      accs: accessories.filter(a => a.gear_id === g.id && accIds.includes(a.id))
    }))
    setKlusGear(items)
    setLoading(false)
  }

  function toggle(key: string) {
    setGepakt(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
  }

  const klus = klussen.find(k => k.id === selectedKlus)
  const klusBussen = klus ? bussen.filter(b => (klus.bus_ids || []).includes(b.id)) : []

  // Count total checkboxes
  const allKeys: string[] = []
  klusGear.forEach(({ gear: g, accs }) => {
    allKeys.push(g.id)
    accs.forEach(a => allKeys.push(`acc-${a.id}`))
    if (NEEDS_BULB.includes(g.categorie)) allKeys.push(`bulb-${g.id}`)
  })
  const totaal = allKeys.length
  const gepaktCount = allKeys.filter(k => gepakt.has(k)).length
  const pct = totaal > 0 ? Math.round((gepaktCount / totaal) * 100) : 0
  const allesGepakt = gepaktCount >= totaal && totaal > 0

  // Group by category
  const cats = ['LED', 'HMI', 'Tungsten', 'Textile/Frame', 'Overig']
  const grouped: Record<string, GearItem[]> = {}
  cats.forEach(cat => {
    const items = klusGear.filter(i => i.gear.categorie === cat)
    if (items.length > 0) grouped[cat] = items
  })

  return (
    <AppShell>
      <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList size={22} className="text-brand-500" />
          <h1 className="text-xl font-semibold text-ink-800">Paklijst</h1>
        </div>

        {!selectedKlus ? (
          <div>
            <p className="text-sm text-ink-500 mb-4">Kies een klus:</p>
            <div className="space-y-2">
              {klussen.map(k => (
                <button key={k.id} onClick={() => selectKlus(k.id)}
                  className="w-full text-left card p-4 hover:border-brand-300 hover:shadow-md transition-all active:scale-99">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink-800">{k.naam}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {fmt(k.start_datum, 'd MMM yyyy')}
                        {(k.klant as any)?.naam && ` · ${(k.klant as any).naam}`}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-ink-300" />
                  </div>
                </button>
              ))}
              {klussen.length === 0 && <div className="text-center py-12 text-ink-400 text-sm">Geen klussen gevonden.</div>}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setSelectedKlus(null)} className="text-sm text-brand-500 hover:text-brand-600 mb-4 flex items-center gap-1">
              ← Terug naar klussen
            </button>

            {/* Header card */}
            <div className="card p-4 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-bold text-lg text-ink-800">{klus?.naam}</h2>
                  <div className="text-sm text-ink-400">{fmt(klus?.start_datum, 'd MMM')} – {fmt(klus?.eind_datum, 'd MMM yyyy')}</div>
                </div>
                {allesGepakt && (
                  <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold">
                    <Check size={14} /> Klaar!
                  </div>
                )}
              </div>

              {klusBussen.length > 0 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {klusBussen.map(b => <span key={b.id} className="badge badge-purple text-xs"><Truck size={10} className="mr-1" />{b.naam}</span>)}
                  {(klus?.generator_info || []).map((g: any, i: number) => (
                    <span key={i} className="badge badge-amber text-xs"><Zap size={10} className="mr-1" />Generator</span>
                  ))}
                </div>
              )}

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-ink-500">{gepaktCount} / {totaal} afgevinkt</span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="h-3 bg-ink-100 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full transition-all duration-500', allesGepakt ? 'bg-green-500' : 'bg-brand-500')}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-ink-400 text-sm">Laden…</div>
            ) : klusGear.length === 0 ? (
              <div className="text-center py-8 card p-6">
                <Package size={32} className="mx-auto mb-2 text-ink-300" />
                <div className="text-sm text-ink-400">Geen gear op deze klus.</div>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2 px-1">{cat}</div>
                    <div className="space-y-2">
                      {items.map(({ gear: g, accs }) => {
                        const isGepakt = gepakt.has(g.id)
                        const needsBulb = NEEDS_BULB.includes(g.categorie)
                        const isBulbGepakt = gepakt.has(`bulb-${g.id}`)

                        return (
                          <div key={g.id} className={clsx('card overflow-hidden transition-all', isGepakt && accs.every(a => gepakt.has(`acc-${a.id}`)) && (!needsBulb || isBulbGepakt) ? 'opacity-60' : '')}>
                            {/* Hoofditem */}
                            <button
                              className="w-full flex items-center gap-3 p-4 text-left active:bg-ink-50"
                              onClick={() => toggle(g.id)}>
                              <div className={clsx('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                isGepakt ? 'bg-green-500 border-green-500' : 'border-ink-300')}>
                                {isGepakt && <Check size={13} className="text-white" />}
                              </div>
                              <span className={clsx('flex-1 font-medium text-sm', isGepakt && 'line-through text-ink-400')}>
                                {g.naam}
                              </span>
                              {g.stelling && <span className="text-[11px] text-ink-400">{g.stelling}/{g.plank}</span>}
                            </button>

                            {/* Accessoires — elk apart afvinken */}
                            {accs.map(ac => {
                              const accKey = `acc-${ac.id}`
                              const isAccGepakt = gepakt.has(accKey)
                              return (
                                <button key={ac.id}
                                  className="w-full flex items-center gap-3 px-4 pb-2 text-left active:bg-ink-50"
                                  onClick={() => toggle(accKey)}>
                                  <div className="w-4 border-l-2 border-ink-100 h-5 flex-shrink-0 ml-1" />
                                  <div className={clsx('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                    isAccGepakt ? 'bg-blue-500 border-blue-500' : 'border-ink-200')}>
                                    {isAccGepakt && <Check size={11} className="text-white" />}
                                  </div>
                                  <span className={clsx('flex-1 text-xs text-ink-600', isAccGepakt && 'line-through text-ink-300')}>
                                    ↳ {ac.naam}
                                  </span>
                                </button>
                              )
                            })}

                            {/* Reservebulb voor HMI/Tungsten */}
                            {needsBulb && (
                              <button
                                className="w-full flex items-center gap-3 px-4 pb-3 text-left active:bg-amber-50"
                                onClick={() => toggle(`bulb-${g.id}`)}>
                                <div className="w-4 border-l-2 border-dashed border-amber-300 h-5 flex-shrink-0 ml-1" />
                                <div className={clsx('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                  isBulbGepakt ? 'bg-amber-400 border-amber-400' : 'border-amber-300')}>
                                  {isBulbGepakt && <Check size={11} className="text-white" />}
                                </div>
                                <span className={clsx('text-xs font-medium text-amber-600', isBulbGepakt && 'line-through opacity-50')}>
                                  ⚡ Reservebulb meepakken
                                </span>
                                <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {allesGepakt && (
                  <div className="card p-5 bg-green-50 border-green-200 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="font-semibold text-green-700 text-lg">Alles ingepakt!</div>
                    <div className="text-sm text-green-600 mt-1">De bus kan vertrekken.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
