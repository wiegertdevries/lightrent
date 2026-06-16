'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, getCurrentProfiel } from '@/lib/supabase'
import { eur, fmt, dagsBetween } from '@/lib/utils'
import { getStaffelkorting, staffelLabel } from '@/lib/staffel'
import { Plus, Trash2, GripVertical, Save, ArrowLeft, Printer, ExternalLink, Check, X, Pencil } from 'lucide-react'
import clsx from 'clsx'
import type { Gear, Accessory, Profiel } from '@/lib/types'

interface Regel {
  id: string
  volgorde: number
  type: string
  omschrijving: string
  gear_id?: string | null
  dagprijs: number
  dagen: number
  subtotaal: number
  korting_pct: number
  korting_bedrag: number
  is_korting_regel: boolean
  _dirty?: boolean
  _new?: boolean
}

export default function OfferteDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [offerte, setOfferte] = useState<any>(null)
  const [regels, setRegels] = useState<Regel[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [printMode, setPrintMode] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [id])

  async function loadAll() {
    const [{ data: o }, { data: r }, { data: g }, { data: a }] = await Promise.all([
      supabase.from('offertes').select('*, klant:klanten(*)').eq('id', id).single(),
      supabase.from('offerte_regels').select('*').eq('offerte_id', id).order('volgorde'),
      supabase.from('gear').select('*').order('naam'),
      supabase.from('accessories').select('*'),
    ])
    setOfferte(o)
    setGear(g || [])
    setAccessories(a || [])
    const p = await getCurrentProfiel()
    setProfiel(p)

    // If no regels yet, generate from gear_ids
    if (!r || r.length === 0) {
      await generateRegels(o, g || [], a || [])
    } else {
      setRegels(r)
    }
    setLoading(false)
  }

  async function generateRegels(o: any, gearList: Gear[], accList: Accessory[]) {
    if (!o) return
    const dagen = dagsBetween(o.start_datum, o.eind_datum)
    const newRegels: Omit<Regel, 'id'>[] = []
    let volgorde = 0

    // Bus
    if (o.bus_dagprijs > 0) {
      newRegels.push({ volgorde: volgorde++, type: 'transport', omschrijving: 'Transport bus', dagprijs: o.bus_dagprijs, dagen, subtotaal: o.bus_dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
    }
    // Generator
    if (o.generator_dagprijs > 0) {
      newRegels.push({ volgorde: volgorde++, type: 'generator', omschrijving: 'Generator', dagprijs: o.generator_dagprijs, dagen, subtotaal: o.generator_dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
    }
    // Gear
    ;(o.gear_ids || []).forEach((gid: string) => {
      const g = gearList.find(x => x.id === gid)
      if (g) newRegels.push({ volgorde: volgorde++, type: 'gear', omschrijving: g.naam, gear_id: gid, dagprijs: g.dagprijs, dagen, subtotaal: g.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
    })
    // Accessories
    ;(o.accessory_ids || []).forEach((aid: string) => {
      const a = accList.find(x => x.id === aid)
      if (a) {
        const parent = gearList.find(x => x.id === a.gear_id)
        newRegels.push({ volgorde: volgorde++, type: 'accessory', omschrijving: `↳ ${a.naam}${parent ? ' (' + parent.naam.split(' ').slice(0,3).join(' ') + ')' : ''}`, dagprijs: a.dagprijs, dagen, subtotaal: a.dagprijs * dagen, korting_pct: 0, korting_bedrag: 0, is_korting_regel: false })
      }
    })
    // Staffelkorting
    const staffelPct = getStaffelkorting(dagen)
    if (staffelPct > 0) {
      const subtotaalGear = newRegels.reduce((s, r) => s + r.subtotaal, 0)
      const kortingBedrag = subtotaalGear * (staffelPct / 100)
      newRegels.push({ volgorde: volgorde++, type: 'korting', omschrijving: staffelLabel(staffelPct), dagprijs: 0, dagen: 1, subtotaal: -kortingBedrag, korting_pct: staffelPct, korting_bedrag: kortingBedrag, is_korting_regel: true })
    }

    // Save to DB
    if (newRegels.length > 0) {
      const { data: saved } = await supabase.from('offerte_regels')
        .insert(newRegels.map(r => ({ ...r, offerte_id: id }))).select()
      setRegels(saved || [])
    }
  }

  function updateRegel(regelId: string, field: string, value: any) {
    setRegels(prev => prev.map(r => {
      if (r.id !== regelId) return r
      const updated = { ...r, [field]: value, _dirty: true }
      // Recalculate subtotaal
      if (field === 'dagprijs' || field === 'dagen') {
        updated.subtotaal = updated.dagprijs * updated.dagen
      }
      if (field === 'korting_pct' && r.is_korting_regel) {
        const subtotaal = regels.filter(x => !x.is_korting_regel).reduce((s, x) => s + x.subtotaal, 0)
        updated.korting_bedrag = subtotaal * (Number(value) / 100)
        updated.subtotaal = -updated.korting_bedrag
        updated.omschrijving = staffelLabel(Number(value)) || updated.omschrijving
      }
      return updated
    }))
  }

  async function saveAll() {
    setSaving(true)
    const dirty = regels.filter(r => r._dirty || r._new)
    for (const r of dirty) {
      const { _dirty, _new, ...data } = r as any
      if (_new) {
        await supabase.from('offerte_regels').insert({ ...data, offerte_id: id })
      } else {
        await supabase.from('offerte_regels').update(data).eq('id', r.id)
      }
    }
    // Update offerte totaal
    const excl = regels.reduce((s, r) => s + r.subtotaal, 0)
    await supabase.from('offertes').update({ totaal_excl: excl }).eq('id', id)
    await loadAll()
    setSaving(false)
  }

  async function deleteRegel(regelId: string) {
    await supabase.from('offerte_regels').delete().eq('id', regelId)
    setRegels(prev => prev.filter(r => r.id !== regelId))
  }

  function addGearRegel() {
    const dagen = dagsBetween(offerte?.start_datum, offerte?.eind_datum)
    const nieuw: Regel = {
      id: `new-${Date.now()}`, volgorde: regels.length, type: 'gear',
      omschrijving: 'Nieuwe regel', dagprijs: 0, dagen, subtotaal: 0,
      korting_pct: 0, korting_bedrag: 0, is_korting_regel: false, _new: true
    }
    setRegels(prev => [...prev, nieuw])
  }

  function addKortingRegel() {
    const subtotaal = regels.filter(r => !r.is_korting_regel).reduce((s, r) => s + r.subtotaal, 0)
    const nieuw: Regel = {
      id: `new-${Date.now()}`, volgorde: regels.length, type: 'korting',
      omschrijving: 'Korting', dagprijs: 0, dagen: 1, subtotaal: 0,
      korting_pct: 0, korting_bedrag: 0, is_korting_regel: true, _new: true
    }
    setRegels(prev => [...prev, nieuw])
  }

  function handleDragStart(e: React.DragEvent, regelId: string) { e.dataTransfer.setData('text/plain', regelId) }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const dragId = e.dataTransfer.getData('text/plain')
    if (dragId === targetId) return
    setRegels(prev => {
      const list = [...prev]
      const from = list.findIndex(r => r.id === dragId), to = list.findIndex(r => r.id === targetId)
      list.splice(from, 1); list.splice(to, 0, list[from] || prev[from])
      return list.map((r, i) => ({ ...r, volgorde: i, _dirty: true }))
    })
    setDragOver(null)
  }

  // Totals
  const regelSubtotaal = regels.filter(r => !r.is_korting_regel).reduce((s, r) => s + r.subtotaal, 0)
  const kortingTotaal = regels.filter(r => r.is_korting_regel).reduce((s, r) => s + Math.abs(r.subtotaal), 0)
  const excl = regelSubtotaal - kortingTotaal
  const btw = excl * 0.21
  const incl = excl + btw

  const hasDirty = regels.some(r => r._dirty || r._new)
  const klant = offerte?.klant
  const bedrijfsnaam = offerte?.bedrijfsnaam || profiel?.bedrijfsnaam || 'LightRent Pro'
  const iban = profiel?.iban || ''

  if (loading) return <AppShell><div className="p-8 text-ink-400 text-sm">Laden…</div></AppShell>

  if (printMode) {
    return (
      <div className="min-h-screen bg-white p-10 max-w-[800px] mx-auto" ref={printRef}>
        <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
        <div className="no-print mb-6 flex gap-3">
          <button className="btn" onClick={() => setPrintMode(false)}><ArrowLeft size={14} /> Terug</button>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Afdrukken / Opslaan als PDF</button>
        </div>

        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-ink-200">
          <div>
            <div className="text-2xl font-bold text-ink-800">{bedrijfsnaam}</div>
            {profiel?.bedrijfsadres && <div className="text-sm text-ink-500 mt-1">{profiel.bedrijfsadres}</div>}
            {profiel?.bedrijfspostcode && <div className="text-sm text-ink-500">{profiel.bedrijfspostcode} {profiel.bedrijfsplaats}</div>}
            {profiel?.btw_nummer && <div className="text-xs text-ink-400 mt-1">BTW: {profiel.btw_nummer}</div>}
            {iban && <div className="text-xs text-ink-400">IBAN: {iban}</div>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-brand-500">OFFERTE</div>
            <div className="font-semibold text-ink-700 mt-1">{offerte.nummer}</div>
            <div className="text-sm text-ink-400">Datum: {fmt(offerte.datum)}</div>
            {offerte.geldig_tot && <div className="text-sm text-ink-400">Geldig tot: {fmt(offerte.geldig_tot)}</div>}
          </div>
        </div>

        {klant && (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wider text-ink-400 mb-1">Aan</div>
            <div className="font-semibold">{klant.naam}</div>
            {klant.bedrijf && <div className="text-ink-500">{klant.bedrijf}</div>}
            {klant.adres && <div className="text-sm text-ink-500">{klant.adres}</div>}
            {klant.btw_nummer && <div className="text-xs text-ink-400">BTW: {klant.btw_nummer}</div>}
          </div>
        )}

        {offerte.onderwerp && <div className="font-semibold text-ink-700 mb-2">{offerte.onderwerp}</div>}
        {offerte.intro_tekst && <div className="text-sm text-ink-500 mb-4 italic">{offerte.intro_tekst}</div>}
        <div className="text-xs text-ink-400 mb-4">
          Verhuurperiode: {fmt(offerte.start_datum)} – {fmt(offerte.eind_datum || offerte.start_datum)} ({dagsBetween(offerte.start_datum, offerte.eind_datum)} dag{dagsBetween(offerte.start_datum, offerte.eind_datum) !== 1 ? 'en' : ''})
        </div>

        <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #DDD9D0' }}>
              <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: '#5C574D', fontWeight: 600 }}>Omschrijving</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: '#5C574D', fontWeight: 600 }}>Dagprijs</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: '#5C574D', fontWeight: 600 }}>Dagen</th>
              <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: '#5C574D', fontWeight: 600 }}>Subtotaal</th>
            </tr>
          </thead>
          <tbody>
            {regels.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #EFEDE8' }}>
                <td style={{ padding: '7px 4px', fontStyle: r.omschrijving.startsWith('↳') ? 'italic' : 'normal', color: r.is_korting_regel ? '#0F6E56' : '#26231D' }}>
                  {r.omschrijving}
                </td>
                <td style={{ textAlign: 'right', padding: '7px 4px', fontFamily: 'monospace', color: '#5C574D' }}>
                  {r.is_korting_regel ? '' : eur(r.dagprijs)}
                </td>
                <td style={{ textAlign: 'right', padding: '7px 4px', color: '#5C574D' }}>
                  {r.is_korting_regel ? (r.korting_pct > 0 ? `${r.korting_pct}%` : '') : r.dagen}
                </td>
                <td style={{ textAlign: 'right', padding: '7px 4px', fontFamily: 'monospace', color: r.is_korting_regel ? '#0F6E56' : '#26231D' }}>
                  {r.is_korting_regel ? `−${eur(Math.abs(r.subtotaal))}` : eur(r.subtotaal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1px solid #DDD9D0' }}>
              <td colSpan={3} style={{ textAlign: 'right', padding: '8px 4px', color: '#5C574D', fontSize: 13 }}>Subtotaal excl. BTW</td>
              <td style={{ textAlign: 'right', padding: '8px 4px', fontFamily: 'monospace' }}>{eur(excl)}</td>
            </tr>
            <tr>
              <td colSpan={3} style={{ textAlign: 'right', padding: '6px 4px', color: '#9B9589', fontSize: 12 }}>BTW 21%</td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'monospace', color: '#9B9589', fontSize: 12 }}>{eur(btw)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #131109' }}>
              <td colSpan={3} style={{ textAlign: 'right', padding: '10px 4px', fontWeight: 700, fontSize: 16 }}>Totaal incl. BTW</td>
              <td style={{ textAlign: 'right', padding: '10px 4px', fontFamily: 'monospace', fontWeight: 700, fontSize: 16 }}>{eur(incl)}</td>
            </tr>
          </tfoot>
        </table>

        {offerte.notities && <div style={{ padding: 12, background: '#F8F7F4', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#5C574D' }}>{offerte.notities}</div>}
        {offerte.footer_tekst && <div style={{ fontSize: 12, color: '#9B9589', fontStyle: 'italic', marginBottom: 12 }}>{offerte.footer_tekst}</div>}
        {iban && <div style={{ padding: 12, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, color: '#166534', marginBottom: 12 }}>Betalen op IBAN <strong>{iban}</strong> t.n.v. {bedrijfsnaam} o.v.v. {offerte.nummer}</div>}
        {offerte.algemene_voorwaarden_url && (
          <div style={{ fontSize: 11, color: '#9B9589', borderTop: '1px solid #EFEDE8', paddingTop: 12 }}>
            Op deze offerte zijn onze algemene voorwaarden van toepassing. Zie bijlage.
          </div>
        )}
      </div>
    )
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 page-enter">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/offertes')}><ArrowLeft size={14} /></button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-ink-800">{offerte.nummer}</h1>
              <span className="text-ink-400">·</span>
              <span className="text-ink-600 font-medium">{offerte.onderwerp || offerte.klant?.naam || '—'}</span>
              <span className={`badge text-xs ${offerte.status === 'verzonden' ? 'badge-blue' : offerte.status === 'geaccepteerd' ? 'badge-green' : 'badge-gray'}`}>
                {offerte.status}
              </span>
            </div>
            <div className="text-sm text-ink-400 mt-0.5">
              {fmt(offerte.start_datum, 'd MMM')} – {fmt(offerte.eind_datum, 'd MMM yyyy')}
              {klant && ` · ${klant.naam}`}
            </div>
          </div>
          <div className="flex gap-2">
            {hasDirty && (
              <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
                <Save size={13} /> {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            )}
            <button className="btn" onClick={() => setPrintMode(true)}>
              <Printer size={13} /> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT: Regels editor */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="bg-ink-50 border-b border-ink-100 grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-ink-400 uppercase tracking-wide">
                <div className="col-span-1" />
                <div className="col-span-4">Omschrijving</div>
                <div className="col-span-2 text-right">Dagprijs</div>
                <div className="col-span-1 text-right">Dagen</div>
                <div className="col-span-2 text-right">Subtotaal</div>
                <div className="col-span-2" />
              </div>

              <div className="divide-y divide-ink-100">
                {regels.map(r => (
                  <div key={r.id}
                    draggable
                    onDragStart={e => handleDragStart(e, r.id)}
                    onDragOver={e => { e.preventDefault(); setDragOver(r.id) }}
                    onDrop={e => handleDrop(e, r.id)}
                    onDragLeave={() => setDragOver(null)}
                    className={clsx('grid grid-cols-12 gap-2 px-4 py-2 items-center group',
                      dragOver === r.id && 'bg-brand-50',
                      r.is_korting_regel && 'bg-green-50'
                    )}>
                    <div className="col-span-1 flex items-center">
                      <GripVertical size={13} className="text-ink-200 cursor-grab hidden md:block" />
                    </div>
                    <div className="col-span-4">
                      <input
                        className={clsx('w-full text-sm bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 focus:outline-none py-0.5 transition-colors',
                          r.is_korting_regel ? 'text-green-700 font-medium' : 'text-ink-800'
                        )}
                        value={r.omschrijving}
                        onChange={e => updateRegel(r.id, 'omschrijving', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      {r.is_korting_regel ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input type="number" step="1" min="0" max="100"
                            className="w-14 text-sm text-right bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 focus:outline-none py-0.5"
                            value={r.korting_pct || ''}
                            placeholder="0"
                            onChange={e => updateRegel(r.id, 'korting_pct', Number(e.target.value))} />
                          <span className="text-xs text-green-600">%</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end">
                          <span className="text-xs text-ink-400 mr-1">€</span>
                          <input type="number" step="0.01" min="0"
                            className="w-20 text-sm text-right bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 focus:outline-none py-0.5"
                            value={r.dagprijs || ''}
                            placeholder="0"
                            onFocus={e => e.target.select()}
                            onChange={e => updateRegel(r.id, 'dagprijs', Number(e.target.value))} />
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 text-right">
                      {!r.is_korting_regel && (
                        <input type="number" min="1"
                          className="w-12 text-sm text-right bg-transparent border-b border-transparent hover:border-ink-200 focus:border-brand-400 focus:outline-none py-0.5"
                          value={r.dagen}
                          onFocus={e => e.target.select()}
                          onChange={e => updateRegel(r.id, 'dagen', Number(e.target.value))} />
                      )}
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={clsx('font-mono text-sm', r.is_korting_regel ? 'text-green-700' : 'text-ink-700')}>
                        {r.is_korting_regel ? `−${eur(Math.abs(r.subtotaal))}` : eur(r.subtotaal)}
                      </span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button className="btn btn-ghost btn-sm p-1 opacity-0 group-hover:opacity-100 text-red-400"
                        onClick={() => deleteRegel(r.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add buttons */}
              <div className="px-4 py-3 bg-ink-50 border-t border-ink-100 flex gap-2 flex-wrap">
                <button className="btn btn-sm text-xs" onClick={addGearRegel}>
                  <Plus size={12} /> Regel toevoegen
                </button>
                <button className="btn btn-sm text-xs text-green-700 border-green-200 hover:bg-green-50" onClick={addKortingRegel}>
                  <Plus size={12} /> Korting toevoegen
                </button>
                {hasDirty && (
                  <button className="btn btn-sm btn-primary text-xs ml-auto" onClick={saveAll} disabled={saving}>
                    <Save size={12} /> {saving ? '…' : 'Opslaan'}
                  </button>
                )}
              </div>

              {/* Totalen */}
              <div className="px-4 py-4 bg-ink-50 border-t-2 border-ink-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-1.5">
                    {kortingTotaal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Subtotaal</span>
                        <span className="font-mono">{eur(regelSubtotaal)}</span>
                      </div>
                    )}
                    {kortingTotaal > 0 && (
                      <div className="flex justify-between text-sm text-green-700">
                        <span>Korting</span>
                        <span className="font-mono">−{eur(kortingTotaal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-500">Excl. BTW</span>
                      <span className="font-mono font-medium">{eur(excl)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-ink-400">
                      <span>BTW 21%</span>
                      <span className="font-mono">{eur(btw)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t-2 border-ink-800 pt-2">
                      <span>Totaal</span>
                      <span className="font-mono">{eur(incl)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Meta */}
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <div className="section-title">Details</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-ink-400">Klant</span><span className="font-medium">{klant?.naam || '—'}</span></div>
                <div className="flex justify-between"><span className="text-ink-400">Datum</span><span>{fmt(offerte.datum)}</span></div>
                <div className="flex justify-between"><span className="text-ink-400">Periode</span><span>{fmt(offerte.start_datum, 'd MMM')} – {fmt(offerte.eind_datum, 'd MMM')}</span></div>
                {offerte.geldig_tot && <div className="flex justify-between"><span className="text-ink-400">Geldig tot</span><span>{fmt(offerte.geldig_tot)}</span></div>}
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <div className="section-title">Tekst</div>
              <div>
                <label className="label">Onderwerp</label>
                <input className="input text-sm" defaultValue={offerte.onderwerp || ''}
                  onBlur={async e => {
                    await supabase.from('offertes').update({ onderwerp: e.target.value }).eq('id', id)
                  }} />
              </div>
              <div>
                <label className="label">Intro tekst</label>
                <textarea className="input text-xs h-16 resize-none" defaultValue={offerte.intro_tekst || ''}
                  onBlur={async e => {
                    await supabase.from('offertes').update({ intro_tekst: e.target.value }).eq('id', id)
                  }} />
              </div>
              <div>
                <label className="label">Notities / bijzonderheden</label>
                <textarea className="input text-xs h-16 resize-none" defaultValue={offerte.notities || ''}
                  onBlur={async e => {
                    await supabase.from('offertes').update({ notities: e.target.value }).eq('id', id)
                  }} />
              </div>
            </div>

            <div className="card p-4">
              <div className="section-title">Status</div>
              <select className="input text-sm" defaultValue={offerte.status}
                onChange={async e => {
                  await supabase.from('offertes').update({ status: e.target.value }).eq('id', id)
                  setOfferte((o: any) => ({ ...o, status: e.target.value }))
                }}>
                <option value="concept">Concept</option>
                <option value="verzonden">Verzonden</option>
                <option value="geaccepteerd">Geaccepteerd</option>
                <option value="verlopen">Verlopen</option>
                <option value="afgewezen">Afgewezen</option>
                <option value="omgezet">Omgezet naar factuur</option>
              </select>
              {offerte.algemene_voorwaarden_url && (
                <a href={offerte.algemene_voorwaarden_url} target="_blank"
                  className="btn btn-sm w-full justify-center mt-2 text-xs">
                  Algemene voorwaarden <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
