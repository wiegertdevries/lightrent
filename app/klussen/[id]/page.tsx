'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import { StatusBadge, OwnerBadge, CatBadge, Modal, FormField, FormGrid } from '@/components/ui'
import {
  ArrowLeft, Plus, X, Search, Check, FileText, Receipt,
  Truck, Zap, Puzzle, ChevronDown, ChevronUp, Pencil
} from 'lucide-react'
import type { Klus, Gear, Accessory, Bus, Generator, Klant } from '@/lib/types'
import clsx from 'clsx'

const CATS = ['Alle', 'HMI', 'Tungsten', 'LED', 'Textile/Frame', 'Overig']

export default function KlusDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [klus, setKlus] = useState<Klus | null>(null)
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klusGearIds, setKlusGearIds] = useState<string[]>([])
  const [klusAccIds, setKlusAccIds] = useState<string[]>([])
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const [{ data: k }, { data: g }, { data: a }, { data: b }, { data: gen }, { data: kl }, { data: kg }, { data: ka }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(*)').eq('id', id).single(),
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('bussen').select('*'),
      supabase.from('generators').select('*'),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('klus_gear').select('gear_id').eq('klus_id', id),
      supabase.from('klus_accessories').select('accessory_id').eq('klus_id', id),
    ])
    setKlus(k)
    setGear(g || [])
    setAccessories(a || [])
    setBussen(b || [])
    setGenerators(gen || [])
    setKlanten(kl || [])
    setKlusGearIds((kg || []).map(x => x.gear_id))
    setKlusAccIds((ka || []).map(x => x.accessory_id))
    setLoading(false)
  }

  async function addGear(gearId: string) {
    if (klusGearIds.includes(gearId)) return
    await supabase.from('klus_gear').insert({ klus_id: id, gear_id: gearId })
    setKlusGearIds(prev => [...prev, gearId])
  }

  async function removeGear(gearId: string) {
    await supabase.from('klus_gear').delete().eq('klus_id', id).eq('gear_id', gearId)
    // Also remove accessories of this gear item
    const gearAccIds = accessories.filter(a => a.gear_id === gearId).map(a => a.id)
    const toRemove = klusAccIds.filter(id => gearAccIds.includes(id))
    if (toRemove.length > 0) {
      await supabase.from('klus_accessories').delete().eq('klus_id', id).in('accessory_id', toRemove)
      setKlusAccIds(prev => prev.filter(id => !toRemove.includes(id)))
    }
    setKlusGearIds(prev => prev.filter(x => x !== gearId))
  }

  async function addAcc(accId: string) {
    if (klusAccIds.includes(accId)) return
    await supabase.from('klus_accessories').insert({ klus_id: id, accessory_id: accId })
    setKlusAccIds(prev => [...prev, accId])
  }

  async function removeAcc(accId: string) {
    await supabase.from('klus_accessories').delete().eq('klus_id', id).eq('accessory_id', accId)
    setKlusAccIds(prev => prev.filter(x => x !== accId))
  }

  async function cycleStatus() {
    if (!klus) return
    const next: Record<string, string> = { gepland: 'actief', actief: 'afgerond', afgerond: 'gepland' }
    const newStatus = next[klus.status]
    await supabase.from('klussen').update({ status: newStatus }).eq('id', id)
    setKlus(k => k ? { ...k, status: newStatus as any } : k)
  }

  const dagwaarde = (() => {
    const fakeKlus = { ...klus, gear_ids: klusGearIds, accessory_ids: klusAccIds } as Klus
    return klusDagwaarde(fakeKlus, gear, accessories)
  })()

  const filteredGear = gear.filter(g => {
    if (catFilter && g.categorie !== catFilter) return false
    if (search && !g.naam.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading || !klus) return (
    <AppShell>
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-ink-400 text-sm">Laden…</div>
      </div>
    </AppShell>
  )

  const busList = bussen.filter(b => (klus.bus_ids || []).includes(b.id))

  return (
    <AppShell>
      <div className="p-8 page-enter">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <button className="btn btn-ghost btn-sm mt-0.5" onClick={() => router.push('/klussen')}>
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-ink-800">{klus.naam}</h1>
              <button onClick={cycleStatus} title="Klik om status te wijzigen">
                <StatusBadge status={klus.status} />
              </button>
              {klus.verantwoordelijke && <OwnerBadge owner={klus.verantwoordelijke} />}
            </div>
            <div className="text-sm text-ink-400 mt-1 flex items-center gap-3 flex-wrap">
              {klus.start_datum && <span>{fmt(klus.start_datum)} – {fmt(klus.eind_datum || klus.start_datum)}</span>}
              {klus.klant && <span>· {(klus.klant as any).naam}</span>}
              {busList.map(b => (
                <span key={b.id} className="flex items-center gap-1 text-purple-600 text-xs">
                  <Truck size={11} /> {b.naam}
                </span>
              ))}
              {(klus.generator_info || []).map((g, i) => {
                const gen = generators.find(x => x.id === g.generator_id)
                return <span key={i} className="flex items-center gap-1 text-amber-600 text-xs">
                  <Zap size={11} /> {gen?.naam} {g.chauffeur && `– ${g.chauffeur}`}
                </span>
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="btn" onClick={() => router.push(`/klussen?edit=${id}`)}>
              <Pencil size={14} /> Details
            </button>
            <button className="btn btn-primary" onClick={() => router.push(`/offertes/new?klus=${id}`)}>
              <FileText size={14} /> Offerte
            </button>
            <button className="btn btn-primary" onClick={() => router.push(`/facturen/new?klus=${id}`)}>
              <Receipt size={14} /> Factuur
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* LEFT: Selected gear */}
          <div className="col-span-3 space-y-3">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-ink-700">
                  Gear op deze klus
                  <span className="ml-2 text-ink-400 font-normal text-xs">
                    {klusGearIds.length} items · {klusAccIds.length} accessoires
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">per dag</span>
                  <span className="font-semibold text-lg text-ink-800">{eur(dagwaarde)}</span>
                </div>
              </div>

              {klusGearIds.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="text-ink-300 text-sm mb-1">Nog geen gear geselecteerd</div>
                  <div className="text-ink-300 text-xs">Gebruik de browser rechts om gear toe te voegen →</div>
                </div>
              ) : (
                <div className="space-y-1">
                  {klusGearIds.map(gid => {
                    const g = gear.find(x => x.id === gid)
                    if (!g) return null
                    const gAccs = accessories.filter(a => a.gear_id === gid)
                    const onKlus = gAccs.filter(a => klusAccIds.includes(a.id))
                    const available = gAccs.filter(a => !klusAccIds.includes(a.id))
                    return (
                      <div key={gid}>
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-ink-100 bg-white group hover:border-ink-200">
                          <CatBadge cat={g.categorie.split('/')[0]} />
                          <span className="flex-1 text-sm font-medium text-ink-800 truncate">{g.naam}</span>
                          <span className="text-xs text-ink-400 font-mono">{eur(g.dagprijs)}/dag</span>
                          <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100"
                            onClick={() => removeGear(gid)}>
                            <X size={13} className="text-red-400" />
                          </button>
                        </div>
                        {/* Attached accessories */}
                        {onKlus.map(ac => (
                          <div key={ac.id} className="flex items-center gap-2.5 ml-6 mt-0.5 px-3 py-2 rounded-lg border border-dashed border-ink-150 bg-ink-50 group hover:border-ink-200">
                            <Puzzle size={12} className="text-ink-300 flex-shrink-0" />
                            <span className="flex-1 text-xs text-ink-600">{ac.naam}</span>
                            <span className="text-xs text-ink-400 font-mono">{eur(ac.dagprijs)}/dag</span>
                            <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100"
                              onClick={() => removeAcc(ac.id)}>
                              <X size={11} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                        {/* Available accessories to add */}
                        {available.length > 0 && (
                          <div className="ml-6 mt-0.5 flex flex-wrap gap-1">
                            {available.map(ac => (
                              <button key={ac.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-ink-200 text-xs text-ink-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                                onClick={() => addAcc(ac.id)}>
                                <Plus size={10} /> {ac.naam} <span className="text-ink-300">{eur(ac.dagprijs)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Gear browser */}
          <div className="col-span-2">
            <div className="card p-4 sticky top-4">
              <div className="text-sm font-semibold text-ink-700 mb-3">Gear toevoegen</div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                <input className="input pl-9 text-sm" placeholder="Zoek gear…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1 mb-3">
                {CATS.map(c => (
                  <button key={c}
                    className={clsx('px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                      (c === 'Alle' ? catFilter === '' : catFilter === c)
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                    )}
                    onClick={() => setCatFilter(c === 'Alle' ? '' : c)}>
                    {c}
                  </button>
                ))}
              </div>
              {/* Gear list */}
              <div className="overflow-y-auto max-h-[500px] space-y-0.5 -mx-1 px-1">
                {filteredGear.map(g => {
                  const added = klusGearIds.includes(g.id)
                  return (
                    <div key={g.id}
                      className={clsx(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all',
                        added ? 'opacity-50' : 'hover:bg-ink-50 cursor-pointer'
                      )}
                      onClick={() => !added && addGear(g.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ink-700 truncate">{g.naam}</div>
                        <div className="text-[10px] text-ink-400">{g.categorie}{g.eigenaar ? ` · ${g.eigenaar}` : ''}</div>
                      </div>
                      <span className="text-xs text-ink-400 font-mono flex-shrink-0">{eur(g.dagprijs)}</span>
                      {added
                        ? <Check size={13} className="text-green-500 flex-shrink-0" />
                        : <Plus size={13} className="text-ink-300 flex-shrink-0" />
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
