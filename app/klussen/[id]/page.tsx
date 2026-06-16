'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { fmt, eur, dagsBetween } from '@/lib/utils'
import { CatBadge, ConfirmModal, FormField, FormGrid } from '@/components/ui'
import {
  ArrowLeft, Plus, X, Search, Check, FileText, Receipt,
  Truck, Zap, Puzzle, Trash2, Copy, Star, StarOff, GripVertical,
  Pencil, Save, ChevronDown, UserPlus
} from 'lucide-react'
import type { Gear, Accessory, Bus, Generator, Klant } from '@/lib/types'
import clsx from 'clsx'

const CATS = ['Alle', 'LED', 'HMI', 'Tungsten', 'Textile/Frame', 'Overig']

type KlusStatus2 = 'in_optie' | 'bevestigd' | 'uitgevoerd' | 'gefactureerd'
const STATUS_CFG: Record<KlusStatus2, { label: string; cls: string }> = {
  in_optie:     { label: 'In optie',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  bevestigd:    { label: 'Bevestigd',    cls: 'bg-green-50 text-green-700 border-green-200' },
  uitgevoerd:   { label: 'Uitgevoerd',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  gefactureerd: { label: 'Gefactureerd', cls: 'bg-ink-100 text-ink-600 border-ink-200' },
}

export default function KlusDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()

  // Data
  const [klus, setKlus] = useState<any>(null)
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [gaffers, setGaffers] = useState<any[]>([])
  const [klusGearIds, setKlusGearIds] = useState<string[]>([])
  const [klusAccIds, setKlusAccIds] = useState<string[]>([])

  // UI
  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [nieuweKlantModal, setNieuweKlantModal] = useState(false)
  const [nieuweKlantForm, setNieuweKlantForm] = useState({ naam: '', bedrijf: '', email: '', telefoon: '' })

  // Edit form (mirrors klus fields)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const [{ data: k }, { data: g }, { data: a }, { data: b }, { data: gen },
      { data: kl }, { data: gaf }, { data: kg }, { data: ka }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(*), gaffer:gaffers(*)').eq('id', id).single(),
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('bussen').select('*'),
      supabase.from('generators').select('*'),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('gaffers').select('*').order('naam'),
      supabase.from('klus_gear').select('gear_id').eq('klus_id', id),
      supabase.from('klus_accessories').select('accessory_id').eq('klus_id', id),
    ])
    setKlus(k)
    setGear(g || [])
    setAccessories(a || [])
    setBussen(b || [])
    setGenerators(gen || [])
    setKlanten(kl || [])
    setGaffers(gaf || [])
    setKlusGearIds((kg || []).map((x: any) => x.gear_id))
    setKlusAccIds((ka || []).map((x: any) => x.accessory_id))
    if (k) {
      setForm({
        naam: k.naam || '', klus_nummer: k.klus_nummer || '',
        klant_id: k.klant_id || '', gaffer_id: k.gaffer_id || '',
        verantwoordelijke: k.verantwoordelijke || '',
        start_datum: k.start_datum || '', eind_datum: k.eind_datum || '',
        bus_ids: k.bus_ids || [], generator_info: k.generator_info || [],
        locatie: k.locatie || '', referentie: k.referentie || '',
        notities: k.notities || '', interne_notities: k.interne_notities || '',
        status_v2: k.status_v2 || 'in_optie',
      })
    }
    setLoading(false)
  }

  async function saveDetails() {
    setSaving(true)
    // Auto-set gaffer from verantwoordelijke if not manually set
    let gaffer_id = form.gaffer_id
    if (!gaffer_id && form.verantwoordelijke) {
      const matchGaffer = gaffers.find(g => g.naam.toLowerCase().startsWith(form.verantwoordelijke.toLowerCase()))
      if (matchGaffer) gaffer_id = matchGaffer.id
    }
    const syncStatus = form.status_v2 === 'uitgevoerd' || form.status_v2 === 'gefactureerd' ? 'afgerond'
      : form.status_v2 === 'bevestigd' ? 'actief' : 'gepland'
    await supabase.from('klussen').update({
      naam: form.naam, klus_nummer: form.klus_nummer || null,
      klant_id: form.klant_id || null, gaffer_id: gaffer_id || null,
      verantwoordelijke: form.verantwoordelijke || null,
      start_datum: form.start_datum || null, eind_datum: form.eind_datum || null,
      bus_ids: form.bus_ids, generator_info: form.generator_info,
      locatie: form.locatie, referentie: form.referentie,
      notities: form.notities, interne_notities: form.interne_notities,
      status_v2: form.status_v2, status: syncStatus,
    }).eq('id', id)
    await loadAll()
    setEditingDetails(false)
    setSaving(false)
  }

  // Gear management
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

  // Drag reorder
  function handleDragStart(e: React.DragEvent, gearId: string) { e.dataTransfer.setData('text/plain', gearId) }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    if (dragId === targetId) return
    setKlusGearIds(prev => {
      const list = [...prev]
      const from = list.indexOf(dragId), to = list.indexOf(targetId)
      list.splice(from, 1); list.splice(to, 0, dragId)
      return list
    })
    setDragOver(null)
  }

  async function dupliceer() {
    if (!klus) return
    const { data: nieuw } = await supabase.from('klussen').insert({
      naam: `${klus.naam} (kopie)`, klant_id: klus.klant_id,
      verantwoordelijke: klus.verantwoordelijke, gaffer_id: klus.gaffer_id,
      start_datum: klus.start_datum, eind_datum: klus.eind_datum,
      bus_ids: klus.bus_ids, generator_info: klus.generator_info,
      notities: klus.notities, status: 'gepland', status_v2: 'in_optie'
    }).select().single()
    if (nieuw) {
      if (klusGearIds.length > 0)
        await supabase.from('klus_gear').insert(klusGearIds.map(gid => ({ klus_id: nieuw.id, gear_id: gid })))
      if (klusAccIds.length > 0)
        await supabase.from('klus_accessories').insert(klusAccIds.map(aid => ({ klus_id: nieuw.id, accessory_id: aid })))
      router.push(`/klussen/${nieuw.id}`)
    }
  }

  async function verwijder() {
    await supabase.from('klussen').delete().eq('id', id)
    router.push('/klussen')
  }

  async function markeerSjabloon() {
    const isSjabloon = klus?.is_sjabloon
    await supabase.from('klussen').update({ is_sjabloon: !isSjabloon }).eq('id', id)
    await loadAll()
  }

  async function maakNieuweKlant() {
    if (!nieuweKlantForm.naam) return
    const { data } = await supabase.from('klanten').insert(nieuweKlantForm).select().single()
    if (data) { await loadAll(); setForm((f: any) => ({ ...f, klant_id: data.id })) }
    setNieuweKlantModal(false)
    setNieuweKlantForm({ naam: '', bedrijf: '', email: '', telefoon: '' })
  }

  // Navigate to offerte/factuur with klus data pre-filled
  function maakOfferte() {
    router.push(`/offertes?nieuw=1&klus=${id}`)
  }
  function maakFactuur() {
    router.push(`/facturen?nieuw=1&klus=${id}`)
  }

  // Computed values
  const busList = bussen.filter(b => (form.bus_ids || []).includes(b.id))
  const busTotal = busList.reduce((s, b) => s + b.dagprijs, 0)
  const genList = generators.filter(g => (form.generator_info || []).some((gi: any) => gi.generator_id === g.id))
  const gearDagwaarde = klusGearIds.reduce((s, gid) => {
    const g = gear.find(x => x.id === gid); return s + (g?.dagprijs || 0)
  }, 0)
  const accDagwaarde = klusAccIds.reduce((s, aid) => {
    const a = accessories.find(x => x.id === aid); return s + (a?.dagprijs || 0)
  }, 0)
  const dagwaarde = gearDagwaarde + accDagwaarde + busTotal

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

  const status = klus.status_v2 || 'in_optie'
  const statusCfg = STATUS_CFG[status as KlusStatus2] || STATUS_CFG.in_optie
  const isSjabloon = klus.is_sjabloon

  function toggleBus(busId: string) {
    setForm((f: any) => ({ ...f, bus_ids: f.bus_ids.includes(busId) ? f.bus_ids.filter((x: string) => x !== busId) : [...f.bus_ids, busId] }))
  }
  function toggleGenerator(genId: string) {
    setForm((f: any) => {
      const has = f.generator_info.find((g: any) => g.generator_id === genId)
      return { ...f, generator_info: has ? f.generator_info.filter((g: any) => g.generator_id !== genId) : [...f.generator_info, { generator_id: genId }] }
    })
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 page-enter">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-5">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/klussen')}>
            <ArrowLeft size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-ink-400">{klus.klus_nummer || ''}</span>
              <h1 className="text-xl font-semibold text-ink-800 truncate">{klus.naam}</h1>
              <span className={clsx('badge border text-xs', statusCfg.cls)}>{statusCfg.label}</span>
              {isSjabloon && <span className="badge badge-amber text-[10px]">★ Sjabloon</span>}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <button className="btn btn-sm hidden md:flex" onClick={markeerSjabloon}>
              {isSjabloon ? <StarOff size={13} /> : <Star size={13} />}
            </button>
            <button className="btn btn-sm hidden md:flex" onClick={dupliceer}><Copy size={13} /> Kopie</button>
            <button className="btn btn-sm btn-danger hidden md:flex" onClick={() => setDeleteConfirm(true)}><Trash2 size={13} /></button>
            <button className="btn btn-sm" onClick={maakOfferte}><FileText size={13} /> Offerte</button>
            <button className="btn btn-sm btn-primary" onClick={maakFactuur}><Receipt size={13} /> Factuur</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* LEFT: Details + Gear list */}
          <div className="lg:col-span-3 space-y-4">

            {/* DETAILS CARD - always visible, collapsible edit */}
            <div className="card">
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-ink-50 transition-colors rounded-2xl"
                onClick={() => setEditingDetails(!editingDetails)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="text-xs text-ink-400 flex gap-3 flex-wrap">
                      {klus.start_datum && <span>{fmt(klus.start_datum, 'd MMM')} – {fmt(klus.eind_datum || klus.start_datum, 'd MMM yyyy')}</span>}
                      {klus.klant?.naam && <span>· {klus.klant.naam}</span>}
                      {klus.locatie && <span>· 📍 {klus.locatie}</span>}
                    </div>
                    <div className="text-xs text-ink-400 mt-1 flex gap-3 flex-wrap">
                      {busList.map(b => (
                        <span key={b.id} className="flex items-center gap-1 text-purple-600">
                          <Truck size={11} /> {b.naam} — {eur(b.dagprijs)}/dag
                        </span>
                      ))}
                      {genList.map(g => (
                        <span key={g.id} className="flex items-center gap-1 text-amber-600">
                          <Zap size={11} /> {g.naam}
                        </span>
                      ))}
                    </div>
                    {klus.interne_notities && (
                      <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-1.5 inline-block">
                        📝 {klus.interne_notities}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-brand-500 font-medium">{editingDetails ? 'Sluiten' : 'Bewerken'}</span>
                  <ChevronDown size={14} className={clsx('text-ink-400 transition-transform', editingDetails && 'rotate-180')} />
                </div>
              </button>

              {editingDetails && (
                <div className="px-4 pb-4 border-t border-ink-100 pt-4 space-y-4">
                  <FormGrid>
                    <FormField label="Klusnummer">
                      <input className="input font-mono" value={form.klus_nummer} onChange={e => setForm((f: any) => ({ ...f, klus_nummer: e.target.value }))} />
                    </FormField>
                    <FormField label="Status">
                      <select className="input" value={form.status_v2} onChange={e => setForm((f: any) => ({ ...f, status_v2: e.target.value }))}>
                        {Object.entries(STATUS_CFG).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
                      </select>
                    </FormField>
                  </FormGrid>
                  <FormField label="Naam *">
                    <input className="input" value={form.naam} onChange={e => setForm((f: any) => ({ ...f, naam: e.target.value }))} />
                  </FormField>
                  <FormGrid>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="label mb-0">Klant</label>
                        <button className="text-[10px] text-brand-500" onClick={() => setNieuweKlantModal(true)}>
                          <UserPlus size={10} className="inline" /> nieuwe klant
                        </button>
                      </div>
                      <select className="input" value={form.klant_id} onChange={e => setForm((f: any) => ({ ...f, klant_id: e.target.value }))}>
                        <option value="">— geen —</option>
                        {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}{k.bedrijf ? ` (${k.bedrijf})` : ''}</option>)}
                      </select>
                    </div>
                    <FormField label="Verantwoordelijke">
                      <select className="input" value={form.verantwoordelijke}
                        onChange={e => {
                          const val = e.target.value
                          // Auto-match gaffer
                          const matchGaffer = gaffers.find(g => g.naam.toLowerCase().startsWith(val.toLowerCase()))
                          setForm((f: any) => ({ ...f, verantwoordelijke: val, gaffer_id: matchGaffer ? matchGaffer.id : f.gaffer_id }))
                        }}>
                        <option value="">—</option>
                        <option>Wiegert</option><option>Gideon</option><option>Julian</option>
                      </select>
                    </FormField>
                    <FormField label="Gaffer">
                      <select className="input" value={form.gaffer_id} onChange={e => setForm((f: any) => ({ ...f, gaffer_id: e.target.value }))}>
                        <option value="">— geen —</option>
                        {gaffers.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Locatie">
                      <input className="input" value={form.locatie} onChange={e => setForm((f: any) => ({ ...f, locatie: e.target.value }))} />
                    </FormField>
                    <FormField label="Startdatum">
                      <input type="date" className="input" value={form.start_datum}
                        onChange={e => {
                          const val = e.target.value
                          setForm((f: any) => ({ ...f, start_datum: val, eind_datum: f.eind_datum < val ? val : f.eind_datum }))
                        }} />
                    </FormField>
                    <FormField label="Einddatum">
                      <input type="date" className="input" min={form.start_datum || undefined} value={form.eind_datum}
                        onChange={e => setForm((f: any) => ({ ...f, eind_datum: e.target.value }))} />
                    </FormField>
                  </FormGrid>

                  <FormField label="Bussen">
                    <div className="grid grid-cols-2 gap-2">
                      {bussen.map(b => (
                        <label key={b.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer">
                          <input type="checkbox" className="rounded" checked={form.bus_ids.includes(b.id)} onChange={() => toggleBus(b.id)} />
                          <div>
                            <div className="text-sm font-medium">{b.naam}</div>
                            <div className="text-xs text-ink-400">{eur(b.dagprijs)}/dag</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Generators">
                    <div className="grid grid-cols-2 gap-2">
                      {generators.map(g => (
                        <label key={g.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer">
                          <input type="checkbox" className="rounded" checked={form.generator_info.some((x: any) => x.generator_id === g.id)} onChange={() => toggleGenerator(g.id)} />
                          <div>
                            <div className="text-sm font-medium">{g.naam}</div>
                            <div className="text-xs text-ink-400">{g.eigenaar || g.type}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormField>

                  <FormField label="Notities">
                    <textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm((f: any) => ({ ...f, notities: e.target.value }))} />
                  </FormField>
                  <FormField label="Interne notities">
                    <textarea className="input h-12 resize-none bg-yellow-50" value={form.interne_notities} onChange={e => setForm((f: any) => ({ ...f, interne_notities: e.target.value }))} />
                  </FormField>

                  <div className="flex justify-end gap-2 pt-2">
                    <button className="btn" onClick={() => setEditingDetails(false)}>Annuleren</button>
                    <button className="btn btn-primary" onClick={saveDetails} disabled={saving}>
                      <Save size={13} /> {saving ? 'Opslaan…' : 'Opslaan'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* GEAR LIJST */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-sm text-ink-700">
                  Gear op deze klus
                  <span className="ml-2 text-ink-400 font-normal text-xs">{klusGearIds.length} items</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-ink-800">{eur(dagwaarde)}<span className="text-xs text-ink-400 font-normal">/dag</span></div>
                  {busTotal > 0 && <div className="text-xs text-ink-400">incl. {eur(busTotal)} transport</div>}
                </div>
              </div>

              {/* Bussen bovenaan */}
              {busList.length > 0 && (
                <div className="space-y-1 mb-2">
                  {busList.map(b => (
                    <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-purple-100 bg-purple-50">
                      <Truck size={14} className="text-purple-500 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-purple-700">{b.naam}</span>
                      <span className="text-xs text-purple-500 font-mono">{eur(b.dagprijs)}/dag</span>
                    </div>
                  ))}
                  {/* Generators direct na bussen */}
                  {genList.map(g => (
                    <div key={g.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-amber-100 bg-amber-50">
                      <Zap size={14} className="text-amber-500 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-amber-700">{g.naam}</span>
                      <span className="text-xs text-amber-500">{g.eigenaar}</span>
                    </div>
                  ))}
                  <div className="border-b border-ink-100 my-2" />
                </div>
              )}

              {klusGearIds.length === 0 ? (
                <div className="py-8 text-center text-ink-300 text-sm">
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
                      <div key={gid} draggable
                        onDragStart={e => handleDragStart(e, gid)}
                        onDragOver={e => { e.preventDefault(); setDragOver(gid) }}
                        onDrop={e => handleDrop(e, gid)}
                        onDragLeave={() => setDragOver(null)}
                        className={clsx('rounded-xl border transition-all', dragOver === gid ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white')}>
                        <div className="flex items-center gap-2.5 px-3 py-2.5 group">
                          <GripVertical size={13} className="text-ink-200 cursor-grab flex-shrink-0 hidden md:block" />
                          <CatBadge cat={g.categorie.split('/')[0]} />
                          <span className="flex-1 text-sm font-medium text-ink-800 truncate">{g.naam}</span>
                          {g.stelling && <span className="text-[10px] text-ink-300 hidden md:block">St.{g.stelling}/{g.plank}</span>}
                          <span className="text-xs text-ink-400 font-mono">{eur(g.dagprijs)}/dag</span>
                          <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100" onClick={() => removeGear(gid)}>
                            <X size={12} className="text-red-400" />
                          </button>
                        </div>
                        {onKlus.map(ac => (
                          <div key={ac.id} className="flex items-center gap-2 ml-8 px-3 py-1.5 border-t border-ink-50 group">
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
                                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-ink-200 text-xs text-ink-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50"
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
          <div className="lg:col-span-2">
            <div className="card p-4 sticky top-4">
              <div className="font-semibold text-sm text-ink-700 mb-3">Gear toevoegen</div>
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
              <div className="overflow-y-auto max-h-[50vh] space-y-0.5 -mx-1 px-1">
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
                        <div className="text-[10px] text-ink-400">{g.categorie}{g.eigenaar && ` · ${g.eigenaar}`}</div>
                      </div>
                      <span className="text-xs text-ink-400 font-mono">{eur(g.dagprijs)}</span>
                      {added ? <Check size={13} className="text-green-500 flex-shrink-0" /> : <Plus size={13} className="text-ink-300 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nieuwe klant modal */}
      {nieuweKlantModal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nieuwe klant</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setNieuweKlantModal(false)}>✕</button>
            </div>
            <FormGrid>
              <FormField label="Naam *"><input className="input" autoFocus value={nieuweKlantForm.naam} onChange={e => setNieuweKlantForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
              <FormField label="Bedrijf"><input className="input" value={nieuweKlantForm.bedrijf} onChange={e => setNieuweKlantForm(f => ({ ...f, bedrijf: e.target.value }))} /></FormField>
              <FormField label="Email"><input type="email" className="input" value={nieuweKlantForm.email} onChange={e => setNieuweKlantForm(f => ({ ...f, email: e.target.value }))} /></FormField>
              <FormField label="Telefoon"><input className="input" value={nieuweKlantForm.telefoon} onChange={e => setNieuweKlantForm(f => ({ ...f, telefoon: e.target.value }))} /></FormField>
            </FormGrid>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setNieuweKlantModal(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={maakNieuweKlant}>Toevoegen</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={deleteConfirm} onClose={() => setDeleteConfirm(false)}
        onConfirm={verwijder}
        title="Klus verwijderen?"
        description={`"${klus.naam}" wordt permanent verwijderd.`}
        danger />
    </AppShell>
  )
}
