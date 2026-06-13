'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import { StatusBadge, OwnerBadge, CatBadge, ConfirmModal } from '@/components/ui'
import {
  ArrowLeft, Plus, X, Search, Check, FileText, Receipt,
  Truck, Zap, Puzzle, Pencil, Trash2, Copy, Star, StarOff, GripVertical
} from 'lucide-react'
import type { Klus, Gear, Accessory, Bus, Generator } from '@/lib/types'
import clsx from 'clsx'

const CATS = ['Alle', 'HMI', 'Tungsten', 'LED', 'Textile/Frame', 'Overig']

export default function KlusDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [klus, setKlus] = useState<Klus | null>(null)
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [klusGearIds, setKlusGearIds] = useState<string[]>([])
  const [klusAccIds, setKlusAccIds] = useState<string[]>([])
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const [{ data: k }, { data: g }, { data: a }, { data: b }, { data: gen }, { data: kg }, { data: ka }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(*)').eq('id', id).single(),
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('bussen').select('*'),
      supabase.from('generators').select('*'),
      supabase.from('klus_gear').select('gear_id').eq('klus_id', id),
      supabase.from('klus_accessories').select('accessory_id').eq('klus_id', id),
    ])
    setKlus(k)
    setGear(g || [])
    setAccessories(a || [])
    setBussen(b || [])
    setGenerators(gen || [])
    setKlusGearIds((kg || []).map((x: any) => x.gear_id))
    setKlusAccIds((ka || []).map((x: any) => x.accessory_id))
    setLoading(false)
  }

  async function addGear(gearId: string) {
    if (klusGearIds.includes(gearId)) return
    await supabase.from('klus_gear').insert({ klus_id: id, gear_id: gearId })
    setKlusGearIds(prev => [...prev, gearId])
  }

  async function removeGear(gearId: string) {
    await supabase.from('klus_gear').delete().eq('klus_id', id).eq('gear_id', gearId)
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
    await logAudit('gewijzigd', 'klussen', id, `Status → ${newStatus}`)
    setKlus(k => k ? { ...k, status: newStatus as any } : k)
  }

  async function dupliceer() {
    if (!klus) return
    const { data: nieuw } = await supabase.from('klussen').insert({
      naam: `${klus.naam} (kopie)`, klant_id: klus.klant_id,
      verantwoordelijke: klus.verantwoordelijke, start_datum: klus.start_datum,
      eind_datum: klus.eind_datum, bus_ids: klus.bus_ids,
      generator_info: klus.generator_info, notities: klus.notities, status: 'gepland'
    }).select().single()
    if (nieuw) {
      if (klusGearIds.length > 0)
        await supabase.from('klus_gear').insert(klusGearIds.map(gid => ({ klus_id: nieuw.id, gear_id: gid })))
      if (klusAccIds.length > 0)
        await supabase.from('klus_accessories').insert(klusAccIds.map(aid => ({ klus_id: nieuw.id, accessory_id: aid })))
      await logAudit('aangemaakt', 'klussen', nieuw.id, `Gedupliceerd van ${klus.naam}`)
      router.push(`/klussen/${nieuw.id}`)
    }
  }

  async function markeerSjabloon() {
    if (!klus) return
    const isSjabloon = (klus as any).is_sjabloon
    await supabase.from('klussen').update({ is_sjabloon: !isSjabloon }).eq('id', id)
    setKlus(k => k ? { ...k, is_sjabloon: !isSjabloon } as any : k)
  }

  async function verwijder() {
    if (!klus) return
    await supabase.from('klussen').delete().eq('id', id)
    await logAudit('verwijderd', 'klussen', id, `${klus.naam} verwijderd`)
    router.push('/klussen')
  }

  // Drag to reorder gear
  function handleDragStart(e: React.DragEvent, gearId: string) {
    e.dataTransfer.setData('text/plain', gearId)
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    if (dragId === targetId) return
    setKlusGearIds(prev => {
      const list = [...prev]
      const from = list.indexOf(dragId)
      const to = list.indexOf(targetId)
      list.splice(from, 1)
      list.splice(to, 0, dragId)
      return list
    })
    setDragOver(null)
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
      <div className="p-8 flex items-center justify-center h-full text-ink-400 text-sm">Laden…</div>
    </AppShell>
  )

  const busList = bussen.filter(b => (klus.bus_ids || []).includes(b.id))
  const isSjabloon = (klus as any).is_sjabloon

  return (
    <AppShell>
      <div className="p-8 page-enter">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <button className="btn btn-ghost btn-sm mt-0.5" onClick={() => router.push('/klussen')}>
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold text-ink-800">{klus.naam}</h1>
              <button onClick={cycleStatus}><StatusBadge status={klus.status} /></button>
              {klus.verantwoordelijke && <OwnerBadge owner={klus.verantwoordelijke} />}
              {isSjabloon && <span className="badge badge-amber text-[10px]"><Star size={9} className="mr-1" />Sjabloon</span>}
            </div>
            <div className="text-sm text-ink-400 mt-1 flex items-center gap-3 flex-wrap">
              {klus.start_datum && <span>{fmt(klus.start_datum)} – {fmt(klus.eind_datum || klus.start_datum)}</span>}
              {(klus.klant as any) && <span>· {(klus.klant as any).naam}</span>}
              {klus.locatie && <span>· 📍 {klus.locatie}</span>}
              {busList.map(b => <span key={b.id} className="flex items-center gap-1 text-purple-600 text-xs"><Truck size={11} />{b.naam}</span>)}
              {(klus.generator_info || []).map((g, i) => {
                const gen = generators.find(x => x.id === g.generator_id)
                return <span key={i} className="flex items-center gap-1 text-amber-600 text-xs"><Zap size={11} />{gen?.naam}{g.chauffeur && ` – ${g.chauffeur}`}</span>
              })}
            </div>
            {klus.interne_notities && (
              <div className="mt-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                📝 {klus.interne_notities}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <button className="btn btn-sm" onClick={markeerSjabloon}>
              {isSjabloon ? <><StarOff size={13} /> Sjabloon verwijderen</> : <><Star size={13} /> Sjabloon</>}
            </button>
            <button className="btn btn-sm" onClick={dupliceer}><Copy size={13} /> Dupliceer</button>
            <button className="btn btn-sm btn-danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={13} /> Verwijderen</button>
            <button className="btn btn-sm" onClick={() => router.push(`/offertes?nieuw=1&klus=${id}`)}><FileText size={13} /> Offerte</button>
            <button className="btn btn-sm btn-primary" onClick={() => router.push(`/facturen?nieuw=1&klus=${id}`)}><Receipt size={13} /> Factuur</button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-5">
          {/* LEFT: Selected gear - draggable */}
          <div className="col-span-3">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-ink-700">
                  Gear op deze klus
                  <span className="ml-2 text-ink-400 font-normal text-xs">{klusGearIds.length} items · {klusAccIds.length} acc.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">per dag</span>
                  <span className="font-bold text-xl text-ink-800">{eur(dagwaarde)}</span>
                </div>
              </div>

              {klusGearIds.length === 0 ? (
                <div className="py-10 text-center text-ink-300 text-sm">
                  Gebruik de browser rechts om gear toe te voegen →
                </div>
              ) : (
                <div className="space-y-1.5">
                  {klusGearIds.map(gid => {
                    const g = gear.find(x => x.id === gid)
                    if (!g) return null
                    const gAccs = accessories.filter(a => a.gear_id === gid)
                    const onKlus = gAccs.filter(a => klusAccIds.includes(a.id))
                    const available = gAccs.filter(a => !klusAccIds.includes(a.id))
                    return (
                      <div key={gid}
                        draggable
                        onDragStart={e => handleDragStart(e, gid)}
                        onDragOver={e => { e.preventDefault(); setDragOver(gid) }}
                        onDrop={e => handleDrop(e, gid)}
                        onDragLeave={() => setDragOver(null)}
                        className={clsx('rounded-xl border transition-all', dragOver === gid ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white')}>
                        <div className="flex items-center gap-2.5 px-3 py-2.5 group">
                          <GripVertical size={14} className="text-ink-200 cursor-grab flex-shrink-0" />
                          <CatBadge cat={g.categorie.split('/')[0]} />
                          <span className="flex-1 text-sm font-medium text-ink-800 truncate">{g.naam}</span>
                          {g.stelling && <span className="text-[10px] text-ink-300">St.{g.stelling}/{g.plank}</span>}
                          <span className="text-xs text-ink-400 font-mono">{eur(g.dagprijs)}/dag</span>
                          <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100" onClick={() => removeGear(gid)}>
                            <X size={12} className="text-red-400" />
                          </button>
                        </div>
                        {onKlus.map(ac => (
                          <div key={ac.id} className="flex items-center gap-2.5 ml-8 px-3 py-1.5 border-t border-ink-50 group">
                            <Puzzle size={10} className="text-ink-300 flex-shrink-0" />
                            <span className="flex-1 text-xs text-ink-500">{ac.naam}</span>
                            <span className="text-xs text-ink-400 font-mono">{eur(ac.dagprijs)}/dag</span>
                            <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100" onClick={() => removeAcc(ac.id)}>
                              <X size={10} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                        {available.length > 0 && (
                          <div className="ml-8 px-3 pb-2 pt-1 flex flex-wrap gap-1">
                            {available.map(ac => (
                              <button key={ac.id}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-ink-200 text-xs text-ink-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50 transition-all"
                                onClick={() => addAcc(ac.id)}>
                                <Plus size={9} /> {ac.naam} <span className="text-ink-300">{eur(ac.dagprijs)}</span>
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
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                <input className="input pl-8 text-sm" placeholder="Zoek gear…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
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
              <div className="overflow-y-auto max-h-[460px] space-y-0.5 -mx-1 px-1">
                {filteredGear.map(g => {
                  const added = klusGearIds.includes(g.id)
                  return (
                    <div key={g.id}
                      className={clsx('flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all',
                        added ? 'opacity-50' : 'hover:bg-ink-50 cursor-pointer'
                      )}
                      onClick={() => !added && addGear(g.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-ink-700 truncate">{g.naam}</div>
                        <div className="text-[10px] text-ink-400">
                          {g.categorie}{g.eigenaar && ` · ${g.eigenaar}`}
                          {g.stelling && ` · St.${g.stelling} Pl.${g.plank}`}
                        </div>
                      </div>
                      <span className="text-xs text-ink-400 font-mono flex-shrink-0">{eur(g.dagprijs)}</span>
                      {added ? <Check size={13} className="text-green-500 flex-shrink-0" /> : <Plus size={13} className="text-ink-300 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal open={deleteConfirm} onClose={() => setDeleteConfirm(false)}
        onConfirm={verwijder}
        title="Klus verwijderen?"
        description={`"${klus.naam}" wordt permanent verwijderd, inclusief alle gear-koppelingen.`}
        danger />
    </AppShell>
  )
}
