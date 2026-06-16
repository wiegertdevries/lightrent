'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, getCurrentProfiel } from '@/lib/supabase'
import { fmt, eur, dagsBetween } from '@/lib/utils'
import { getStaffelkorting, staffelLabel } from '@/lib/staffel'
import { CatBadge, ConfirmModal, FormField, FormGrid } from '@/components/ui'
import {
  ArrowLeft, Plus, X, Search, Check, Printer, Truck, Zap,
  Puzzle, Trash2, Copy, Star, StarOff, GripVertical, Save,
  ChevronDown, UserPlus, FileText, Receipt, Send
} from 'lucide-react'
import type { Gear, Accessory, Bus, Generator, Klant, Profiel } from '@/lib/types'
import clsx from 'clsx'

const CATS = ['Alle', 'LED', 'HMI', 'Tungsten', 'Textile/Frame', 'Overig']

type KlusStatus2 = 'in_optie' | 'bevestigd' | 'uitgevoerd' | 'gefactureerd'
const STATUS_CFG: Record<KlusStatus2, { label: string; dot: string; cls: string }> = {
  in_optie:     { label: 'In optie',     dot: 'bg-amber-400',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  bevestigd:    { label: 'Bevestigd',    dot: 'bg-green-500',  cls: 'bg-green-50 text-green-700 border-green-200' },
  uitgevoerd:   { label: 'Uitgevoerd',   dot: 'bg-blue-500',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  gefactureerd: { label: 'Gefactureerd', dot: 'bg-ink-400',    cls: 'bg-ink-100 text-ink-600 border-ink-200' },
}

interface Regel {
  id: string
  volgorde: number
  type: string
  omschrijving: string
  dagprijs: number
  dagen: number
  subtotaal: number
  korting_pct: number
  is_korting_regel: boolean
  _dirty?: boolean
  _new?: boolean
}

export default function KlusDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()

  const [klus, setKlus] = useState<any>(null)
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [gaffers, setGaffers] = useState<any[]>([])
  const [klusGearIds, setKlusGearIds] = useState<string[]>([])
  const [klusAccIds, setKlusAccIds] = useState<string[]>([])
  const [regels, setRegels] = useState<Regel[]>([])
  const [profiel, setProfiel] = useState<Profiel | null>(null)

  const [catFilter, setCatFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<'gear' | 'offerte' | 'print'>('gear')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingRegels, setSavingRegels] = useState(false)
  const [nieuweKlantModal, setNieuweKlantModal] = useState(false)
  const [nieuweKlantForm, setNieuweKlantForm] = useState({ naam: '', bedrijf: '', email: '', telefoon: '' })
  const [form, setForm] = useState<any>({})

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const [{ data: k }, { data: g }, { data: a }, { data: b }, { data: gen },
      { data: kl }, { data: gaf }, { data: kg }, { data: ka }, { data: r }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(*), gaffer:gaffers(*)').eq('id', id).single(),
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('bussen').select('*'),
      supabase.from('generators').select('*'),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('gaffers').select('*').order('naam'),
      supabase.from('klus_gear').select('gear_id').eq('klus_id', id),
      supabase.from('klus_accessories').select('accessory_id').eq('klus_id', id),
      supabase.from('offerte_regels').select('*').eq('offerte_id', id).order('volgorde'),
    ])
    setKlus(k); setGear(g || []); setAccessories(a || []); setBussen(b || [])
    setGenerators(gen || []); setKlanten(kl || []); setGaffers(gaf || [])
    setKlusGearIds((kg || []).map((x: any) => x.gear_id))
    setKlusAccIds((ka || []).map((x: any) => x.accessory_id))
    const p = await getCurrentProfiel(); setProfiel(p)
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
        offerte_geldig_tot: k.offerte_geldig_tot || '',
        offerte_intro: k.offerte_intro || 'Graag doen wij u een offerte toekomen voor de huur van onderstaande apparatuur.',
        offerte_notities: k.offerte_notities || '',
        offerte_status: k.offerte_status || 'concept',
      })
    }
    // Load or generate offerte regels
    if (r && r.length > 0) {
      setRegels(r)
    } else if (k) {
      await generateRegels(k, kg || [], ka || [], g || [], a || [], b || [])
    }
    setLoading(false)
  }

  async function generateRegels(k: any, kg: any[], ka: any[], gearList: Gear[], accList: Accessory[], bussenList: Bus[]) {
    const dagen = dagsBetween(k.start_datum, k.eind_datum)
    const gearIds = kg.map((x: any) => x.gear_id)
    const accIds = ka.map((x: any) => x.accessory_id)
    const newRegels: any[] = []
    let vol = 0

    // Bussen eerst
    const klusBussen = bussenList.filter(b => (k.bus_ids || []).includes(b.id))
    // 60KVA before Honda
    const sortedBussen = [...klusBussen].sort((a, b) => {
      if (a.naam.toLowerCase().includes('atego')) return -1
      if (b.naam.toLowerCase().includes('atego')) return 1
      if (a.naam.toLowerCase().includes('sprinter')) return -1
      return 0
    })
    for (const bus of sortedBussen) {
      newRegels.push({ offerte_id: id, volgorde: vol++, type: 'transport', omschrijving: bus.naam, dagprijs: bus.dagprijs, dagen, subtotaal: bus.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
    }

    // Gear
    for (const gid of gearIds) {
      const g = gearList.find(x => x.id === gid)
      if (g) newRegels.push({ offerte_id: id, volgorde: vol++, type: 'gear', omschrijving: g.naam, gear_id: gid, dagprijs: g.dagprijs, dagen, subtotaal: g.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
    }
    // Accessories
    for (const aid of accIds) {
      const a = accList.find(x => x.id === aid)
      if (a) {
        const parent = gearList.find(x => x.id === a.gear_id)
        newRegels.push({ offerte_id: id, volgorde: vol++, type: 'accessory', omschrijving: `↳ ${a.naam}${parent ? ' (' + parent.naam.split(' ').slice(0,3).join(' ') + ')' : ''}`, dagprijs: a.dagprijs, dagen, subtotaal: a.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
      }
    }

    // Staffelkorting
    const staffelPct = getStaffelkorting(dagen)
    if (staffelPct > 0 && newRegels.length > 0) {
      const sub = newRegels.reduce((s: number, r: any) => s + r.subtotaal, 0)
      const kortingBedrag = sub * (staffelPct / 100)
      newRegels.push({ offerte_id: id, volgorde: vol++, type: 'korting', omschrijving: staffelLabel(staffelPct), dagprijs: 0, dagen: 1, subtotaal: -kortingBedrag, korting_pct: staffelPct, korting_bedrag: kortingBedrag, is_korting_regel: true })
    }

    if (newRegels.length > 0) {
      const { data: saved } = await supabase.from('offerte_regels').insert(newRegels).select()
      setRegels(saved || [])
    }
  }

  async function refreshRegels() {
    // Delete existing and regenerate
    await supabase.from('offerte_regels').delete().eq('offerte_id', id)
    const { data: kg } = await supabase.from('klus_gear').select('gear_id').eq('klus_id', id)
    const { data: ka } = await supabase.from('klus_accessories').select('accessory_id').eq('klus_id', id)
    await generateRegels(klus, kg || [], ka || [], gear, accessories, bussen)
  }

  // ── GEAR ──────────────────────────────────────────────────────
  async function addGear(gearId: string) {
    if (klusGearIds.includes(gearId)) return
    await supabase.from('klus_gear').insert({ klus_id: id, gear_id: gearId })
    const g = gear.find(x => x.id === gearId)
    if (g) {
      const dagen = dagsBetween(form.start_datum, form.eind_datum)
      const nieuw = { offerte_id: id, volgorde: regels.filter(r => !r.is_korting_regel).length, type: 'gear', omschrijving: g.naam, gear_id: gearId, dagprijs: g.dagprijs, dagen, subtotaal: g.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false }
      const { data } = await supabase.from('offerte_regels').insert([nieuw]).select()
      if (data) setRegels(prev => [...prev.filter(r => !r.is_korting_regel), ...data, ...prev.filter(r => r.is_korting_regel)])
    }
    setKlusGearIds(prev => [...prev, gearId])
  }

  async function removeGear(gearId: string) {
    await supabase.from('klus_gear').delete().eq('klus_id', id).eq('gear_id', gearId)
    const gearAccIds = accessories.filter(a => a.gear_id === gearId).map(a => a.id)
    const toRemove = klusAccIds.filter(aid => gearAccIds.includes(aid))
    if (toRemove.length > 0) {
      await supabase.from('klus_accessories').delete().eq('klus_id', id).in('accessory_id', toRemove)
      setKlusAccIds(prev => prev.filter(aid => !toRemove.includes(aid)))
    }
    setKlusGearIds(prev => prev.filter(x => x !== gearId))
    // Remove regel
    const regelIds = regels.filter(r => (r as any).gear_id === gearId).map(r => r.id)
    if (regelIds.length) await supabase.from('offerte_regels').delete().in('id', regelIds)
    setRegels(prev => prev.filter(r => (r as any).gear_id !== gearId))
  }

  async function addAcc(accId: string) {
    if (klusAccIds.includes(accId)) return
    await supabase.from('klus_accessories').insert({ klus_id: id, accessory_id: accId })
    const a = accessories.find(x => x.id === accId)
    if (a) {
      const parent = gear.find(x => x.id === a.gear_id)
      const dagen = dagsBetween(form.start_datum, form.eind_datum)
      const nieuw = { offerte_id: id, volgorde: regels.length, type: 'accessory', omschrijving: `↳ ${a.naam}${parent ? ' (' + parent.naam.split(' ').slice(0,3).join(' ') + ')' : ''}`, dagprijs: a.dagprijs, dagen, subtotaal: a.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false }
      const { data } = await supabase.from('offerte_regels').insert([nieuw]).select()
      if (data) setRegels(prev => [...prev, ...data])
    }
    setKlusAccIds(prev => [...prev, accId])
  }

  async function removeAcc(accId: string) {
    await supabase.from('klus_accessories').delete().eq('klus_id', id).eq('accessory_id', accId)
    setKlusAccIds(prev => prev.filter(x => x !== accId))
  }

  // ── OFFERTE REGELS ────────────────────────────────────────────
  function updateRegel(regelId: string, field: string, value: any) {
    setRegels(prev => prev.map(r => {
      if (r.id !== regelId) return r
      const updated = { ...r, [field]: value, _dirty: true }
      if (field === 'dagprijs' || field === 'dagen') updated.subtotaal = Number(updated.dagprijs) * Number(updated.dagen)
      if (field === 'korting_pct' && r.is_korting_regel) {
        const sub = prev.filter(x => !x.is_korting_regel).reduce((s, x) => s + x.subtotaal, 0)
        updated.subtotaal = -(sub * (Number(value) / 100))
        updated.omschrijving = staffelLabel(Number(value)) || updated.omschrijving
      }
      return updated
    }))
  }

  async function saveRegels() {
    setSavingRegels(true)
    const dirty = regels.filter(r => r._dirty || r._new)
    for (const r of dirty) {
      const { _dirty, _new, ...data } = r as any
      if (_new) await supabase.from('offerte_regels').insert({ ...data, offerte_id: id })
      else await supabase.from('offerte_regels').update(data).eq('id', r.id)
    }
    await loadAll()
    setSavingRegels(false)
  }

  async function deleteRegel(regelId: string) {
    if (regelId.startsWith('new-')) { setRegels(prev => prev.filter(r => r.id !== regelId)); return }
    await supabase.from('offerte_regels').delete().eq('id', regelId)
    setRegels(prev => prev.filter(r => r.id !== regelId))
  }

  function addRegel(isKorting = false) {
    const dagen = dagsBetween(form.start_datum, form.eind_datum)
    setRegels(prev => [...prev, {
      id: `new-${Date.now()}`, volgorde: prev.length, type: isKorting ? 'korting' : 'gear',
      omschrijving: isKorting ? 'Korting' : 'Omschrijving', dagprijs: 0, dagen: isKorting ? 1 : dagen,
      subtotaal: 0, korting_pct: 0, is_korting_regel: isKorting, _new: true
    }])
  }

  // ── DETAILS ───────────────────────────────────────────────────
  async function saveDetails() {
    setSaving(true)
    let gaffer_id = form.gaffer_id
    if (!gaffer_id && form.verantwoordelijke) {
      const matchGaffer = gaffers.find(g => g.naam.toLowerCase().startsWith(form.verantwoordelijke.toLowerCase()))
      if (matchGaffer) gaffer_id = matchGaffer.id
    }
    const syncStatus = ['uitgevoerd', 'gefactureerd'].includes(form.status_v2) ? 'afgerond' : form.status_v2 === 'bevestigd' ? 'actief' : 'gepland'
    await supabase.from('klussen').update({
      naam: form.naam, klus_nummer: form.klus_nummer || null,
      klant_id: form.klant_id || null, gaffer_id: gaffer_id || null,
      verantwoordelijke: form.verantwoordelijke || null,
      start_datum: form.start_datum || null, eind_datum: form.eind_datum || null,
      bus_ids: form.bus_ids, generator_info: form.generator_info,
      locatie: form.locatie, referentie: form.referentie,
      notities: form.notities, interne_notities: form.interne_notities,
      status_v2: form.status_v2, status: syncStatus,
      offerte_geldig_tot: form.offerte_geldig_tot || null,
      offerte_intro: form.offerte_intro,
      offerte_notities: form.offerte_notities,
      offerte_status: form.offerte_status,
    }).eq('id', id)
    await loadAll()
    setEditingDetails(false)
    setSaving(false)
  }

  async function maakNieuweKlant() {
    if (!nieuweKlantForm.naam) return
    const { data } = await supabase.from('klanten').insert(nieuweKlantForm).select().single()
    if (data) { await loadAll(); setForm((f: any) => ({ ...f, klant_id: data.id })) }
    setNieuweKlantModal(false)
    setNieuweKlantForm({ naam: '', bedrijf: '', email: '', telefoon: '' })
  }

  async function dupliceer() {
    if (!klus) return
    const { data: nieuw } = await supabase.from('klussen').insert({
      naam: `${klus.naam} (kopie)`, klant_id: klus.klant_id, verantwoordelijke: klus.verantwoordelijke,
      gaffer_id: klus.gaffer_id, start_datum: klus.start_datum, eind_datum: klus.eind_datum,
      bus_ids: klus.bus_ids, generator_info: klus.generator_info,
      notities: klus.notities, status: 'gepland', status_v2: 'in_optie'
    }).select().single()
    if (nieuw) {
      if (klusGearIds.length > 0) await supabase.from('klus_gear').insert(klusGearIds.map(gid => ({ klus_id: nieuw.id, gear_id: gid })))
      if (klusAccIds.length > 0) await supabase.from('klus_accessories').insert(klusAccIds.map(aid => ({ klus_id: nieuw.id, accessory_id: aid })))
      router.push(`/klussen/${nieuw.id}`)
    }
  }

  // ── DRAG REORDER ──────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, regelId: string) { e.dataTransfer.setData('text/plain', regelId) }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    if (dragId === targetId) return
    setRegels(prev => {
      const list = [...prev]
      const from = list.findIndex(r => r.id === dragId)
      const to = list.findIndex(r => r.id === targetId)
      const [item] = list.splice(from, 1)
      list.splice(to, 0, item)
      return list.map((r, i) => ({ ...r, volgorde: i, _dirty: true }))
    })
    setDragOver(null)
  }

  function toggleBus(busId: string) {
    setForm((f: any) => ({ ...f, bus_ids: f.bus_ids.includes(busId) ? f.bus_ids.filter((x: string) => x !== busId) : [...f.bus_ids, busId] }))
  }
  function toggleGenerator(genId: string) {
    setForm((f: any) => {
      const has = f.generator_info.find((g: any) => g.generator_id === genId)
      return { ...f, generator_info: has ? f.generator_info.filter((g: any) => g.generator_id !== genId) : [...f.generator_info, { generator_id: genId }] }
    })
  }

  // ── COMPUTED ──────────────────────────────────────────────────
  const busList = bussen.filter(b => (form.bus_ids || []).includes(b.id))
  const genList = generators.filter(g => (form.generator_info || []).some((gi: any) => gi.generator_id === g.id))
  const regelSubtotaal = regels.filter(r => !r.is_korting_regel).reduce((s, r) => s + r.subtotaal, 0)
  const kortingTotaal = regels.filter(r => r.is_korting_regel).reduce((s, r) => s + Math.abs(r.subtotaal), 0)
  const excl = regelSubtotaal - kortingTotaal
  const btw = excl * 0.21
  const incl = excl + btw
  const hasDirty = regels.some(r => r._dirty || r._new)

  const filteredGear = gear.filter(g => {
    if (catFilter && g.categorie !== catFilter) return false
    if (search && !g.naam.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading || !klus) return <AppShell><div className="p-8 text-ink-400 text-sm">Laden…</div></AppShell>

  const status = klus.status_v2 || 'in_optie'
  const statusCfg = STATUS_CFG[status as KlusStatus2] || STATUS_CFG.in_optie
  const klant = klus.klant
  const bedrijfsnaam = profiel?.bedrijfsnaam || 'LightRent Pro'

  // ── PRINT VIEW ────────────────────────────────────────────────
  if (activeTab === 'print') {
    return (
      <div className="min-h-screen bg-white">
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print bg-white border-b border-ink-100 px-8 py-4 flex items-center gap-3 sticky top-0">
          <button className="btn" onClick={() => setActiveTab('offerte')}><ArrowLeft size={14} /> Terug</button>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Afdrukken / PDF opslaan</button>
          <span className="text-sm text-ink-400 ml-2">Tip: kies "Opslaan als PDF" in het afdrukvenster</span>
        </div>
        <div className="p-10 max-w-[780px] mx-auto">
          {/* Briefhoofd */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-ink-800">
            <div>
              <div className="text-2xl font-bold text-ink-800">{bedrijfsnaam}</div>
              {profiel?.bedrijfsadres && <div className="text-sm text-ink-500 mt-1">{profiel.bedrijfsadres}</div>}
              {profiel?.bedrijfspostcode && <div className="text-sm text-ink-500">{profiel.bedrijfspostcode} {profiel.bedrijfsplaats}</div>}
              {profiel?.btw_nummer && <div className="text-xs text-ink-400 mt-1">BTW: {profiel.btw_nummer}</div>}
              {profiel?.iban && <div className="text-xs text-ink-400">IBAN: {profiel.iban}</div>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: '#F97316' }}>OFFERTE</div>
              <div className="font-semibold text-ink-700 mt-1">{klus.klus_nummer || klus.id.slice(0,8).toUpperCase()}</div>
              <div className="text-sm text-ink-400">Datum: {fmt(new Date().toISOString())}</div>
              {form.offerte_geldig_tot && <div className="text-sm text-ink-400">Geldig tot: {fmt(form.offerte_geldig_tot)}</div>}
            </div>
          </div>
          {/* Klantgegevens */}
          {klant && (
            <div className="mb-6">
              <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">Aan</div>
              <div className="font-semibold">{klant.naam}</div>
              {klant.bedrijf && <div className="text-ink-600">{klant.bedrijf}</div>}
              {klant.adres && <div className="text-sm text-ink-500">{klant.adres}</div>}
              {klant.postcode && <div className="text-sm text-ink-500">{klant.postcode} {klant.stad}</div>}
              {klant.btw_nummer && <div className="text-xs text-ink-400">BTW: {klant.btw_nummer}</div>}
            </div>
          )}
          {/* Onderwerp */}
          <div className="font-semibold text-ink-700 mb-2">{klus.naam}</div>
          {form.offerte_intro && <div className="text-sm text-ink-500 italic mb-4">{form.offerte_intro}</div>}
          <div className="text-xs text-ink-400 mb-4">
            Verhuurperiode: {fmt(form.start_datum)} – {fmt(form.eind_datum)} ({dagsBetween(form.start_datum, form.eind_datum)} dag{dagsBetween(form.start_datum, form.eind_datum) !== 1 ? 'en' : ''})
          </div>
          {/* Regels */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #26231D' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 11, color: '#5C574D', fontWeight: 600 }}>Omschrijving</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 11, color: '#5C574D', fontWeight: 600 }}>Dagprijs</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 11, color: '#5C574D', fontWeight: 600 }}>Dagen</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 11, color: '#5C574D', fontWeight: 600 }}>Subtotaal</th>
              </tr>
            </thead>
            <tbody>
              {regels.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #EFEDE8' }}>
                  <td style={{ padding: '7px 4px', fontStyle: r.omschrijving.startsWith('↳') ? 'italic' : 'normal', color: r.is_korting_regel ? '#0F6E56' : '#26231D', paddingLeft: r.omschrijving.startsWith('↳') ? 16 : 4 }}>{r.omschrijving}</td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', fontFamily: 'monospace', color: '#5C574D' }}>{r.is_korting_regel ? (r.korting_pct > 0 ? `${r.korting_pct}%` : '') : eur(r.dagprijs)}</td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', color: '#5C574D' }}>{r.is_korting_regel ? '' : r.dagen}</td>
                  <td style={{ textAlign: 'right', padding: '7px 4px', fontFamily: 'monospace', color: r.is_korting_regel ? '#0F6E56' : '#26231D' }}>{r.is_korting_regel ? `−${eur(Math.abs(r.subtotaal))}` : eur(r.subtotaal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {kortingTotaal > 0 && <tr><td colSpan={3} style={{ textAlign: 'right', padding: '8px 4px', color: '#5C574D', borderTop: '1px solid #DDD9D0' }}>Subtotaal</td><td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace', borderTop: '1px solid #DDD9D0' }}>{eur(regelSubtotaal)}</td></tr>}
              <tr><td colSpan={3} style={{ textAlign: 'right', padding: '6px 4px', color: '#9B9589', fontSize: 12 }}>BTW 21%</td><td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'monospace', color: '#9B9589', fontSize: 12 }}>{eur(btw)}</td></tr>
              <tr style={{ borderTop: '2px solid #131109' }}>
                <td colSpan={3} style={{ textAlign: 'right', padding: '10px 4px', fontWeight: 700, fontSize: 16 }}>Totaal incl. BTW</td>
                <td style={{ textAlign: 'right', padding: '10px 4px', fontFamily: 'monospace', fontWeight: 700, fontSize: 16 }}>{eur(incl)}</td>
              </tr>
            </tfoot>
          </table>
          {form.offerte_notities && <div style={{ padding: 12, background: '#F8F7F4', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#5C574D' }}>{form.offerte_notities}</div>}
          {profiel?.iban && <div style={{ padding: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, color: '#166534', marginBottom: 12 }}>Betaalreferentie: <strong>{klus.klus_nummer || klus.naam}</strong> · IBAN: <strong>{profiel.iban}</strong></div>}
        </div>
      </div>
    )
  }

  // ── MAIN VIEW ─────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="p-4 md:p-8 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/klussen')}><ArrowLeft size={14} /></button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {klus.klus_nummer && <span className="font-mono text-xs text-ink-400 bg-ink-100 px-2 py-0.5 rounded">{klus.klus_nummer}</span>}
              <h1 className="text-xl font-semibold text-ink-800">{klus.naam}</h1>
              <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border', statusCfg.cls)}>
                <span className={clsx('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />{statusCfg.label}
              </span>
            </div>
            <div className="text-xs text-ink-400 mt-1 flex gap-3 flex-wrap">
              {form.start_datum && <span>{fmt(form.start_datum, 'd MMM')} – {fmt(form.eind_datum, 'd MMM yyyy')}</span>}
              {klant && <span>· {klant.naam}</span>}
              {form.locatie && <span>· 📍 {form.locatie}</span>}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button className="btn btn-sm hidden md:flex" onClick={dupliceer}><Copy size={13} /></button>
            <button className="btn btn-sm btn-danger hidden md:flex" onClick={() => setDeleteConfirm(true)}><Trash2 size={13} /></button>
            <button className="btn btn-sm" onClick={() => setActiveTab('print')}><Printer size={13} /> PDF</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-ink-100">
          {[
            { key: 'gear', label: 'Gear & details' },
            { key: 'offerte', label: `Offerte${hasDirty ? ' ●' : ''}` },
          ].map(t => (
            <button key={t.key}
              className={clsx('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === t.key ? 'border-brand-500 text-brand-600' : 'border-transparent text-ink-400 hover:text-ink-700'
              )}
              onClick={() => setActiveTab(t.key as any)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: GEAR & DETAILS ───────────────────────────────── */}
        {activeTab === 'gear' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-4">
              {/* Details card */}
              <div className="card">
                <button className="w-full flex items-center justify-between p-4 hover:bg-ink-50 transition-colors rounded-2xl"
                  onClick={() => setEditingDetails(!editingDetails)}>
                  <div className="text-left">
                    <div className="text-sm font-medium text-ink-700">Details klus</div>
                    <div className="text-xs text-ink-400 mt-0.5 flex gap-3 flex-wrap">
                      {busList.map(b => <span key={b.id} className="flex items-center gap-1 text-purple-600"><Truck size={10} />{b.naam}</span>)}
                      {genList.map(g => <span key={g.id} className="flex items-center gap-1 text-amber-600"><Zap size={10} />{g.naam}</span>)}
                      {klus.verantwoordelijke && <span>Verantw: {klus.verantwoordelijke}</span>}
                    </div>
                    {form.interne_notities && <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-0.5 mt-1 inline-block">📝 {form.interne_notities}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-500">{editingDetails ? 'Sluiten' : 'Bewerken'}</span>
                    <ChevronDown size={14} className={clsx('text-ink-400 transition-transform', editingDetails && 'rotate-180')} />
                  </div>
                </button>

                {editingDetails && (
                  <div className="px-4 pb-4 border-t border-ink-100 pt-4 space-y-3">
                    <FormGrid>
                      <FormField label="Klusnummer">
                        <input className="input font-mono" value={form.klus_nummer} onChange={e => setForm((f: any) => ({ ...f, klus_nummer: e.target.value }))} />
                      </FormField>
                      <FormField label="Status">
                        <select className="input" value={form.status_v2} onChange={e => setForm((f: any) => ({ ...f, status_v2: e.target.value }))}>
                          {Object.entries(STATUS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
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
                          <button className="text-[10px] text-brand-500" onClick={() => setNieuweKlantModal(true)}><UserPlus size={10} className="inline" /> nieuw</button>
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
                            const match = gaffers.find(g => g.naam.toLowerCase().startsWith(val.toLowerCase()))
                            setForm((f: any) => ({ ...f, verantwoordelijke: val, gaffer_id: match ? match.id : f.gaffer_id }))
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
                      <FormField label="Start">
                        <input type="date" className="input" value={form.start_datum}
                          onChange={e => { const v = e.target.value; setForm((f: any) => ({ ...f, start_datum: v, eind_datum: f.eind_datum < v ? v : f.eind_datum })) }} />
                      </FormField>
                      <FormField label="Eind">
                        <input type="date" className="input" min={form.start_datum} value={form.eind_datum}
                          onChange={e => setForm((f: any) => ({ ...f, eind_datum: e.target.value }))} />
                      </FormField>
                    </FormGrid>
                    <FormField label="Bussen">
                      <div className="grid grid-cols-2 gap-2">
                        {bussen.map(b => (
                          <label key={b.id} className="flex items-center gap-2 p-2 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={form.bus_ids.includes(b.id)} onChange={() => toggleBus(b.id)} />
                            <span>{b.naam}</span><span className="text-xs text-ink-400 ml-auto">{eur(b.dagprijs)}</span>
                          </label>
                        ))}
                      </div>
                    </FormField>
                    <FormField label="Generators">
                      <div className="grid grid-cols-2 gap-2">
                        {generators.map(g => (
                          <label key={g.id} className="flex items-center gap-2 p-2 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer text-sm">
                            <input type="checkbox" checked={form.generator_info.some((x: any) => x.generator_id === g.id)} onChange={() => toggleGenerator(g.id)} />
                            <span className="truncate">{g.naam}</span>
                          </label>
                        ))}
                      </div>
                    </FormField>
                    <FormField label="Interne notities">
                      <textarea className="input h-12 resize-none bg-yellow-50" value={form.interne_notities} onChange={e => setForm((f: any) => ({ ...f, interne_notities: e.target.value }))} />
                    </FormField>
                    <div className="flex justify-end gap-2 pt-1">
                      <button className="btn" onClick={() => setEditingDetails(false)}>Annuleren</button>
                      <button className="btn btn-primary" onClick={saveDetails} disabled={saving}>
                        <Save size={13} /> {saving ? 'Opslaan…' : 'Opslaan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Gear lijst */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-sm text-ink-700">{klusGearIds.length} gear items</div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-ink-800">{eur(regelSubtotaal - kortingTotaal)}<span className="text-xs text-ink-400 font-normal">/dag excl. BTW</span></div>
                  </div>
                </div>

                {/* Bussen */}
                {busList.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {busList.sort((a, b) => a.naam.includes('Atego') ? -1 : 1).map(b => (
                      <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-purple-100 bg-purple-50">
                        <Truck size={14} className="text-purple-500 flex-shrink-0" />
                        <span className="flex-1 text-sm font-medium text-purple-700">{b.naam}</span>
                        <span className="text-xs font-mono text-purple-500">{eur(b.dagprijs)}/dag</span>
                      </div>
                    ))}
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
                  <div className="py-8 text-center text-ink-300 text-sm">Gebruik de browser rechts om gear toe te voegen →</div>
                ) : (
                  <div className="space-y-1.5">
                    {klusGearIds.map(gid => {
                      const g = gear.find(x => x.id === gid)
                      if (!g) return null
                      const gAccs = accessories.filter(a => a.gear_id === gid)
                      const onKlus = gAccs.filter(a => klusAccIds.includes(a.id))
                      const available = gAccs.filter(a => !klusAccIds.includes(a.id))
                      return (
                        <div key={gid} className="rounded-xl border border-ink-100 bg-white">
                          <div className="flex items-center gap-2.5 px-3 py-2.5 group">
                            <CatBadge cat={g.categorie.split('/')[0]} />
                            <span className="flex-1 text-sm font-medium text-ink-800 truncate">{g.naam}</span>
                            <span className="text-xs font-mono text-ink-400">{eur(g.dagprijs)}/dag</span>
                            <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100" onClick={() => removeGear(gid)}><X size={12} className="text-red-400" /></button>
                          </div>
                          {onKlus.map(ac => (
                            <div key={ac.id} className="flex items-center gap-2 ml-8 px-3 py-1.5 border-t border-ink-50 group">
                              <Puzzle size={10} className="text-ink-300 flex-shrink-0" />
                              <span className="flex-1 text-xs text-ink-500">{ac.naam}</span>
                              <span className="text-xs font-mono text-ink-400">{eur(ac.dagprijs)}</span>
                              <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100" onClick={() => removeAcc(ac.id)}><X size={10} className="text-red-400" /></button>
                            </div>
                          ))}
                          {available.length > 0 && (
                            <div className="ml-8 px-3 pb-2 pt-1 flex flex-wrap gap-1">
                              {available.map(ac => (
                                <button key={ac.id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-ink-200 text-xs text-ink-400 hover:border-brand-300 hover:text-brand-600" onClick={() => addAcc(ac.id)}>
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

            {/* Gear browser */}
            <div className="lg:col-span-2">
              <div className="card p-4 sticky top-4">
                <div className="font-semibold text-sm text-ink-700 mb-3">Gear toevoegen</div>
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input className="input pl-8 text-sm" placeholder="Zoek…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {CATS.map(c => (
                    <button key={c} className={clsx('px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      (c === 'Alle' ? catFilter === '' : catFilter === c) ? 'bg-brand-500 text-white border-brand-500' : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                    )} onClick={() => setCatFilter(c === 'Alle' ? '' : c)}>{c}</button>
                  ))}
                </div>
                <div className="overflow-y-auto max-h-[50vh] space-y-0.5">
                  {filteredGear.map(g => {
                    const added = klusGearIds.includes(g.id)
                    return (
                      <div key={g.id} className={clsx('flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all', added ? 'opacity-50' : 'hover:bg-ink-50 cursor-pointer')}
                        onClick={() => !added && addGear(g.id)}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-ink-700 truncate">{g.naam}</div>
                          <div className="text-[10px] text-ink-400">{g.categorie}{g.eigenaar && ` · ${g.eigenaar}`}</div>
                        </div>
                        <span className="text-xs font-mono text-ink-400">{eur(g.dagprijs)}</span>
                        {added ? <Check size={13} className="text-green-500 flex-shrink-0" /> : <Plus size={13} className="text-ink-300 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: OFFERTE ─────────────────────────────────────── */}
        {activeTab === 'offerte' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <div className="card overflow-hidden">
                {/* Tabel header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-ink-50 border-b border-ink-100 text-xs font-semibold text-ink-400 uppercase tracking-wide">
                  <div className="col-span-1" />
                  <div className="col-span-5">Omschrijving</div>
                  <div className="col-span-2 text-right">Dagprijs / %</div>
                  <div className="col-span-1 text-right">Dgn</div>
                  <div className="col-span-2 text-right">Subtotaal</div>
                  <div className="col-span-1" />
                </div>

                <div className="divide-y divide-ink-100">
                  {regels.map(r => (
                    <div key={r.id} draggable
                      onDragStart={e => handleDragStart(e, r.id)}
                      onDragOver={e => { e.preventDefault(); setDragOver(r.id) }}
                      onDrop={e => handleDrop(e, r.id)}
                      onDragLeave={() => setDragOver(null)}
                      className={clsx('grid grid-cols-12 gap-2 px-4 py-2 items-center group', dragOver === r.id && 'bg-brand-50', r.is_korting_regel && 'bg-green-50')}>
                      <div className="col-span-1"><GripVertical size={13} className="text-ink-200 cursor-grab" /></div>
                      <div className="col-span-5">
                        <input className={clsx('w-full text-sm bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 outline-none py-0.5',
                          r.is_korting_regel ? 'text-green-700 font-medium' : r.omschrijving.startsWith('↳') ? 'text-ink-500 italic pl-3' : 'text-ink-800'
                        )} value={r.omschrijving} onChange={e => updateRegel(r.id, 'omschrijving', e.target.value)} />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        {r.is_korting_regel ? (
                          <><input type="number" className="w-14 text-sm text-right bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 outline-none py-0.5"
                            value={r.korting_pct || ''} placeholder="0" onChange={e => updateRegel(r.id, 'korting_pct', Number(e.target.value))} />
                          <span className="text-xs text-green-600">%</span></>
                        ) : (
                          <><span className="text-xs text-ink-400">€</span>
                          <input type="number" className="w-20 text-sm text-right bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 outline-none py-0.5"
                            value={r.dagprijs || ''} placeholder="0" onFocus={e => e.target.select()} onChange={e => updateRegel(r.id, 'dagprijs', Number(e.target.value))} /></>
                        )}
                      </div>
                      <div className="col-span-1 text-right">
                        {!r.is_korting_regel && <input type="number" className="w-10 text-sm text-right bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 outline-none py-0.5"
                          value={r.dagen} onFocus={e => e.target.select()} onChange={e => updateRegel(r.id, 'dagen', Number(e.target.value))} />}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className={clsx('font-mono text-sm', r.is_korting_regel ? 'text-green-700' : 'text-ink-700')}>
                          {r.is_korting_regel ? `−${eur(Math.abs(r.subtotaal))}` : eur(r.subtotaal)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100 text-red-400" onClick={() => deleteRegel(r.id)}><Trash2 size={11} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 bg-ink-50 border-t border-ink-100 flex gap-2 flex-wrap items-center">
                  <button className="btn btn-sm text-xs" onClick={() => addRegel(false)}><Plus size={12} /> Regel</button>
                  <button className="btn btn-sm text-xs text-green-700 border-green-200 hover:bg-green-50" onClick={() => addRegel(true)}><Plus size={12} /> Korting</button>
                  <button className="btn btn-sm text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={refreshRegels}>↺ Hergenereren</button>
                  {hasDirty && (
                    <button className="btn btn-sm btn-primary text-xs ml-auto" onClick={saveRegels} disabled={savingRegels}>
                      <Save size={12} /> {savingRegels ? '…' : 'Opslaan'}
                    </button>
                  )}
                </div>

                {/* Totalen */}
                <div className="px-4 py-4 border-t-2 border-ink-200 bg-ink-50">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-1.5 text-sm">
                      {kortingTotaal > 0 && <>
                        <div className="flex justify-between text-ink-500"><span>Subtotaal</span><span className="font-mono">{eur(regelSubtotaal)}</span></div>
                        <div className="flex justify-between text-green-700"><span>Korting</span><span className="font-mono">−{eur(kortingTotaal)}</span></div>
                      </>}
                      <div className="flex justify-between"><span className="text-ink-500">Excl. BTW</span><span className="font-mono font-medium">{eur(excl)}</span></div>
                      <div className="flex justify-between text-ink-400 text-xs"><span>BTW 21%</span><span className="font-mono">{eur(btw)}</span></div>
                      <div className="flex justify-between font-bold text-lg border-t-2 border-ink-800 pt-2"><span>Totaal</span><span className="font-mono">{eur(incl)}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="space-y-4">
              <div className="card p-4 space-y-3">
                <div className="section-title">Offerte instellingen</div>
                <FormField label="Status offerte">
                  <select className="input text-sm" value={form.offerte_status}
                    onChange={async e => { setForm((f: any) => ({ ...f, offerte_status: e.target.value })); await supabase.from('klussen').update({ offerte_status: e.target.value }).eq('id', id) }}>
                    <option value="concept">Concept</option>
                    <option value="verzonden">Verzonden</option>
                    <option value="geaccepteerd">Geaccepteerd</option>
                    <option value="verlopen">Verlopen</option>
                    <option value="afgewezen">Afgewezen</option>
                  </select>
                </FormField>
                <FormField label="Geldig tot">
                  <input type="date" className="input text-sm" value={form.offerte_geldig_tot}
                    onChange={e => setForm((f: any) => ({ ...f, offerte_geldig_tot: e.target.value }))}
                    onBlur={async e => { await supabase.from('klussen').update({ offerte_geldig_tot: e.target.value || null }).eq('id', id) }} />
                </FormField>
                <FormField label="Intro tekst">
                  <textarea className="input text-xs h-16 resize-none" value={form.offerte_intro}
                    onChange={e => setForm((f: any) => ({ ...f, offerte_intro: e.target.value }))}
                    onBlur={async e => { await supabase.from('klussen').update({ offerte_intro: e.target.value }).eq('id', id) }} />
                </FormField>
                <FormField label="Notities (op offerte)">
                  <textarea className="input text-xs h-16 resize-none" value={form.offerte_notities}
                    onChange={e => setForm((f: any) => ({ ...f, offerte_notities: e.target.value }))}
                    onBlur={async e => { await supabase.from('klussen').update({ offerte_notities: e.target.value }).eq('id', id) }} />
                </FormField>
                <button className="btn w-full justify-center" onClick={() => setActiveTab('print')}>
                  <Printer size={13} /> Offerte PDF bekijken
                </button>
              </div>
            </div>
          </div>
        )}
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

      <ConfirmModal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} onConfirm={async () => { await supabase.from('klussen').delete().eq('id', id); router.push('/klussen') }}
        title="Klus verwijderen?" description={`"${klus.naam}" wordt permanent verwijderd.`} danger />
    </AppShell>
  )
}
