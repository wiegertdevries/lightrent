'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { ClipboardList, Check, ChevronDown, ChevronRight, Truck, Zap, Package, AlertTriangle, Send } from 'lucide-react'
import clsx from 'clsx'
import type { Klus, Gear, Accessory, Bus } from '@/lib/types'

const HMI_TUNGSTEN = ['HMI', 'Tungsten']

export default function PaklijstPage() {
  const [klussen, setKlussen] = useState<Klus[]>([])
  const [selectedKlus, setSelectedKlus] = useState<string | null>(null)
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [klusGear, setKlusGear] = useState<{ gear: Gear; accs: Accessory[] }[]>([])
  const [gepakt, setGepakt] = useState<Set<string>>(new Set())
  const [bulbGepakt, setBulbGepakt] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: k }, { data: g }, { data: a }, { data: b }] = await Promise.all([
        supabase.from('klussen').select('*, klant:klanten(naam)').in('status', ['gepland', 'actief', 'bevestigd', 'in_optie']).order('start_datum'),
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
    setBulbGepakt(new Set())
    setLoading(true)
    const { data: kg } = await supabase.from('klus_gear').select('gear_id').eq('klus_id', klusId)
    const { data: ka } = await supabase.from('klus_accessories').select('accessory_id').eq('klus_id', klusId)
    const gearIds = (kg || []).map((x: any) => x.gear_id)
    const accIds = (ka || []).map((x: any) => x.accessory_id)
    const selectedGear = gear.filter(g => gearIds.includes(g.id))
    const items = selectedGear.map(g => ({
      gear: g,
      accs: accessories.filter(a => a.gear_id === g.id && accIds.includes(a.id))
    }))
    // Sort: bussen/generators first (handled separately), then LED, HMI, Tungsten, rest
    const catOrder = ['LED', 'HMI', 'Tungsten', 'Textile/Frame', 'Overig']
    items.sort((a, b) => catOrder.indexOf(a.gear.categorie) - catOrder.indexOf(b.gear.categorie))
    setKlusGear(items)
    setLoading(false)
  }

  function toggleGepakt(id: string) {
    setGepakt(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleBulb(id: string) {
    setBulbGepakt(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const klus = klussen.find(k => k.id === selectedKlus)
  const klusBussen = klus ? bussen.filter(b => (klus.bus_ids || []).includes(b.id)) : []

  // Total items requiring a checkmark (gear + reserve bulbs for HMI/Tungsten)
  const totaalItems = klusGear.length + klusGear.filter(i => HMI_TUNGSTEN.includes(i.gear.categorie)).length
  const totaalGepakt = gepakt.size + bulbGepakt.size
  const pct = totaalItems > 0 ? Math.round((totaalGepakt / totaalItems) * 100) : 0
  const allesGepakt = totaalGepakt >= totaalItems && totaalItems > 0

  // Group by category for display
  const cats = ['LED', 'HMI', 'Tungsten', 'Textile/Frame', 'Overig']
  const grouped = cats.reduce((acc, cat) => {
    const items = klusGear.filter(i => i.gear.categorie === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, typeof klusGear>)

  return (
    <AppShell>
      <div className="p-4 md:p-6 page-enter max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList size={22} className="text-brand-500" />
          <h1 className="text-xl font-semibold text-ink-800">Paklijst</h1>
        </div>

        {/* Klus selectie */}
        {!selectedKlus ? (
          <div>
            <p className="text-sm text-ink-500 mb-4">Kies een klus om de paklijst te openen:</p>
            <div className="space-y-2">
              {klussen.map(k => (
                <button key={k.id} onClick={() => selectKlus(k.id)}
                  className="w-full text-left card p-4 hover:border-brand-300 hover:shadow-md transition-all active:scale-99">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-ink-800">{k.naam}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {fmt(k.start_datum, 'd MMM yyyy')}
                        {(k.klant as any) && ` · ${(k.klant as any).naam}`}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-ink-300" />
                  </div>
                </button>
              ))}
              {klussen.length === 0 && (
                <div className="text-center py-12 text-ink-400 text-sm">Geen aankomende klussen gevonden.</div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Header met terug + voortgang */}
            <div className="mb-4">
              <button onClick={() => setSelectedKlus(null)} className="text-sm text-brand-500 hover:text-brand-600 mb-3 flex items-center gap-1">
                ← Andere klus kiezen
              </button>
              <div className="card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-bold text-lg text-ink-800">{klus?.naam}</h2>
                    <div className="text-sm text-ink-400">{fmt(klus?.start_datum, 'd MMM')} – {fmt(klus?.eind_datum, 'd MMM yyyy')}</div>
                  </div>
                  {allesGepakt && (
                    <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                      <Check size={14} /> Klaar!
                    </div>
                  )}
                </div>

                {/* Bussen */}
                {klusBussen.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {klusBussen.map(b => (
                      <span key={b.id} className="badge badge-purple text-xs">
                        <Truck size={10} className="mr-1" />{b.naam}
                      </span>
                    ))}
                    {(klus?.generator_info || []).map((g, i) => (
                      <span key={i} className="badge badge-amber text-xs">
                        <Zap size={10} className="mr-1" />{g.chauffeur || 'Generator'}
                      </span>
                    ))}
                  </div>
                )}

                {/* Voortgangsbalk */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-ink-500">{totaalGepakt} / {totaalItems} ingepakt</span>
                    <span className="font-semibold text-ink-700">{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-500', allesGepakt ? 'bg-green-500' : 'bg-brand-500')}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-ink-400 text-sm">Laden…</div>
            ) : klusGear.length === 0 ? (
              <div className="text-center py-8 text-ink-400 text-sm card p-6">
                <Package size={32} className="mx-auto mb-2 text-ink-300" />
                Geen gear toegevoegd aan deze klus.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2 px-1">{cat}</div>
                    <div className="space-y-2">
                      {items.map(({ gear: g, accs }) => {
                        const isGepakt = gepakt.has(g.id)
                        const needsBulb = HMI_TUNGSTEN.includes(g.categorie)
                        const isBulbGepakt = bulbGepakt.has(g.id)
                        return (
                          <div key={g.id} className={clsx('card transition-all', isGepakt ? 'opacity-60' : '')}>
                            {/* Main gear item */}
                            <button
                              className="w-full flex items-center gap-3 p-4 text-left active:bg-ink-50 rounded-2xl"
                              onClick={() => toggleGepakt(g.id)}>
                              <div className={clsx(
                                'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                isGepakt ? 'bg-green-500 border-green-500' : 'border-ink-300'
                              )}>
                                {isGepakt && <Check size={13} className="text-white" />}
                              </div>
                              <span className={clsx('flex-1 font-medium text-sm', isGepakt && 'line-through text-ink-400')}>
                                {g.naam}
                              </span>
                              {g.stelling && (
                                <span className="text-[11px] text-ink-400 flex-shrink-0">St.{g.stelling} Pl.{g.plank}</span>
                              )}
                            </button>

                            {/* Accessories */}
                            {accs.map(ac => (
                              <div key={ac.id} className="flex items-center gap-3 px-4 pb-2 pl-13">
                                <div className="w-4 border-l-2 border-ink-100 h-4 flex-shrink-0 ml-3" />
                                <span className="text-xs text-ink-500 flex-1">↳ {ac.naam}</span>
                              </div>
                            ))}

                            {/* Reserve bulb voor HMI/Tungsten */}
                            {needsBulb && (
                              <button
                                className={clsx('w-full flex items-center gap-3 px-4 pb-3 text-left', isBulbGepakt ? 'opacity-60' : '')}
                                onClick={() => toggleBulb(g.id)}>
                                <div className="w-3 border-l-2 border-dashed border-amber-300 h-4 flex-shrink-0 ml-0.5" />
                                <div className={clsx(
                                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                                  isBulbGepakt ? 'bg-amber-400 border-amber-400' : 'border-amber-400'
                                )}>
                                  {isBulbGepakt && <Check size={11} className="text-white" />}
                                </div>
                                <span className={clsx('text-xs font-medium text-amber-600', isBulbGepakt && 'line-through opacity-60')}>
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

                {/* Alles afgevinkt banner */}
                {allesGepakt && (
                  <div className="card p-5 bg-green-50 border-green-200 text-center">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="font-semibold text-green-700">Alles ingepakt!</div>
                    <div className="text-sm text-green-600 mt-1">De bus kan vertrekken.</div>
                    {klus && (klus.klant as any)?.email && (
                      <a href={`mailto:${(klus.klant as any).email}?subject=Pakbon ${klus.naam}`}
                        className="btn btn-sm mt-3 mx-auto">
                        <Send size={13} /> Pakbon sturen
                      </a>
                    )}
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
