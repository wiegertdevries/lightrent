'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import { Modal, FormField, FormGrid, PageHeader, OwnerBadge, Table, Thead, Th, Tbody, Tr, Td, EmptyState, ConfirmModal } from '@/components/ui'
import { Plus, CalendarClock, Truck, Zap, UserPlus, ChevronDown } from 'lucide-react'
import type { Klus, Klant, Bus, Generator, Gear, Accessory } from '@/lib/types'
import clsx from 'clsx'

type KlusStatus2 = 'in_optie' | 'bevestigd' | 'uitgevoerd' | 'gefactureerd'

const STATUS_CFG: Record<KlusStatus2, { label: string; cls: string; dot: string }> = {
  in_optie:    { label: 'In optie',    cls: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-400' },
  bevestigd:   { label: 'Bevestigd',   cls: 'bg-green-50 text-green-700 border border-green-200',   dot: 'bg-green-500' },
  uitgevoerd:  { label: 'Uitgevoerd',  cls: 'bg-blue-50 text-blue-700 border border-blue-200',      dot: 'bg-blue-500' },
  gefactureerd:{ label: 'Gefactureerd',cls: 'bg-ink-100 text-ink-600 border border-ink-200',        dot: 'bg-ink-400' },
}

function StatusBadge2({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as KlusStatus2] || STATUS_CFG.in_optie
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.cls)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function StatusSelect({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <select
        className={clsx('appearance-none pl-3 pr-7 py-1 rounded-full text-xs font-semibold border cursor-pointer',
          STATUS_CFG[status as KlusStatus2]?.cls || STATUS_CFG.in_optie.cls
        )}
        value={status}
        onChange={e => onChange(e.target.value)}>
        {Object.entries(STATUS_CFG).map(([val, cfg]) => (
          <option key={val} value={val}>{cfg.label}</option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
    </div>
  )
}

export default function KlussenPage() {
  const router = useRouter()
  const [klussen, setKlussen] = useState<any[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [gaffers, setGaffers] = useState<any[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [filter, setFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [nieuweKlantModal, setNieuweKlantModal] = useState(false)
  const [nieuweKlantForm, setNieuweKlantForm] = useState({ naam: '', bedrijf: '', email: '', telefoon: '' })
  const [form, setForm] = useState({
    naam: '', klus_nummer: '', klant_id: '', gaffer_id: '', verantwoordelijke: '',
    start_datum: '', eind_datum: '', bus_ids: [] as string[],
    generator_info: [] as { generator_id: string }[],
    notities: '', interne_notities: '', locatie: '', referentie: '',
    status_v2: 'in_optie' as KlusStatus2
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: k }, { data: kl }, { data: g }, { data: b }, { data: ge }, { data: a }, { data: kg }, { data: gaf }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(naam)').order('start_datum', { ascending: false }),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('generators').select('*'),
      supabase.from('bussen').select('*'),
      supabase.from('gear').select('*'),
      supabase.from('accessories').select('*'),
      supabase.from('klus_gear').select('klus_id, gear_id'),
      supabase.from('gaffers').select('*').order('naam'),
    ])
    const mapped = (k || []).map(kl => ({
      ...kl,
      gear_ids: (kg || []).filter(x => x.klus_id === kl.id).map(x => x.gear_id)
    }))
    setKlussen(mapped)
    setKlanten(kl || [])
    setGaffers(gaf || [])
    setGenerators(g || [])
    setBussen(b || [])
    setGear(ge || [])
    setAccessories(a || [])
  }

  function genKlusNummer(existing: any[]) {
    const year = new Date().getFullYear().toString().slice(-2)
    const max = existing
      .map(k => k.klus_nummer || '')
      .filter(n => n.startsWith(`K${year}-`))
      .map(n => parseInt(n.split('-')[1] || '0'))
      .reduce((a, b) => Math.max(a, b), 0)
    return `K${year}-${String(max + 1).padStart(3, '0')}`
  }

  function openNew() {
    setEditId(null)
    const today = new Date().toISOString().slice(0, 10)
    const nr = genKlusNummer(klussen)
    setForm({ naam: '', klus_nummer: nr, klant_id: '', gaffer_id: '', verantwoordelijke: '', start_datum: today, eind_datum: today, bus_ids: [], generator_info: [], notities: '', interne_notities: '', locatie: '', referentie: '', status_v2: 'in_optie' })
    setModal(true)
  }

  function openEdit(k: any) {
    setEditId(k.id)
    setForm({
      naam: k.naam, klus_nummer: k.klus_nummer || '', klant_id: k.klant_id || '',
      gaffer_id: k.gaffer_id || '', verantwoordelijke: k.verantwoordelijke || '',
      start_datum: k.start_datum || '', eind_datum: k.eind_datum || '',
      bus_ids: k.bus_ids || [], generator_info: k.generator_info || [],
      notities: k.notities || '', interne_notities: k.interne_notities || '',
      locatie: k.locatie || '', referentie: k.referentie || '',
      status_v2: k.status_v2 || 'in_optie'
    })
    setModal(true)
  }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profiel } = await supabase.from('profielen').select('naam').eq('id', user?.id || '').single()
    const data = {
      naam: form.naam, klus_nummer: form.klus_nummer || null,
      klant_id: form.klant_id || null, gaffer_id: form.gaffer_id || null,
      verantwoordelijke: form.verantwoordelijke || null,
      start_datum: form.start_datum || null, eind_datum: form.eind_datum || null,
      bus_ids: form.bus_ids, generator_info: form.generator_info,
      notities: form.notities, interne_notities: form.interne_notities,
      locatie: form.locatie, referentie: form.referentie, status_v2: form.status_v2,
      // Keep old status field in sync
      status: form.status_v2 === 'uitgevoerd' || form.status_v2 === 'gefactureerd' ? 'afgerond' : form.status_v2 === 'bevestigd' ? 'actief' : 'gepland',
      aangemaakt_door: user?.id, aangemaakt_door_naam: profiel?.naam || user?.email
    }
    if (editId) {
      await supabase.from('klussen').update(data).eq('id', editId)
      setModal(false); setSaving(false); await loadAll()
    } else {
      const { data: res } = await supabase.from('klussen').insert(data).select().single()
      setSaving(false)
      if (res) { setModal(false); router.push(`/klussen/${res.id}`) }
    }
  }

  async function updateStatus(id: string, status: string) {
    const syncStatus = status === 'uitgevoerd' || status === 'gefactureerd' ? 'afgerond' : status === 'bevestigd' ? 'actief' : 'gepland'
    await supabase.from('klussen').update({ status_v2: status, status: syncStatus }).eq('id', id)
    await loadAll()
  }

  async function deleteKlus(id: string) {
    await supabase.from('klussen').delete().eq('id', id)
    setDeleteId(null); await loadAll()
  }

  async function maakNieuweKlant() {
    if (!nieuweKlantForm.naam) return
    const { data } = await supabase.from('klanten').insert(nieuweKlantForm).select().single()
    if (data) { await loadAll(); setForm(f => ({ ...f, klant_id: data.id })) }
    setNieuweKlantModal(false)
    setNieuweKlantForm({ naam: '', bedrijf: '', email: '', telefoon: '' })
  }

  function toggleBus(id: string) {
    setForm(f => ({ ...f, bus_ids: f.bus_ids.includes(id) ? f.bus_ids.filter(x => x !== id) : [...f.bus_ids, id] }))
  }
  function toggleGenerator(genId: string) {
    setForm(f => {
      const has = f.generator_info.find(g => g.generator_id === genId)
      if (has) return { ...f, generator_info: f.generator_info.filter(g => g.generator_id !== genId) }
      return { ...f, generator_info: [...f.generator_info, { generator_id: genId }] }
    })
  }

  const filtered = filter ? klussen.filter(k => (k.status_v2 || 'in_optie') === filter) : klussen

  return (
    <AppShell>
      <div className="p-4 md:p-8 page-enter">
        <PageHeader
          title="Klussen"
          subtitle={`${klussen.filter(k => k.status_v2 === 'bevestigd').length} bevestigd · ${klussen.filter(k => k.status_v2 === 'in_optie').length} in optie`}
          actions={
            <>
              <select className="input text-sm py-1.5" style={{ width: 140 }} value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="">Alle statussen</option>
                {Object.entries(STATUS_CFG).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
              </select>
              <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nieuwe klus</button>
            </>
          }
        />

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map(k => {
            const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
            const status = k.status_v2 || 'in_optie'
            return (
              <div key={k.id} className="card p-4 active:bg-ink-50" onClick={() => router.push(`/klussen/${k.id}`)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold text-ink-800">{k.naam}</div>
                    {k.klus_nummer && <div className="text-xs text-ink-400 font-mono">{k.klus_nummer}</div>}
                  </div>
                  <StatusBadge2 status={status} />
                </div>
                <div className="text-xs text-ink-500 mb-2">
                  {fmt(k.start_datum, 'd MMM')} – {fmt(k.eind_datum, 'd MMM')}
                  {(k.klant as any)?.naam && ` · ${(k.klant as any).naam}`}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {busList.map(b => <span key={b.id} className="badge badge-purple text-[10px]"><Truck size={8} className="mr-1" />{b.naam.split(' ').slice(-2).join(' ')}</span>)}
                  {(k.generator_info || []).length > 0 && <span className="badge badge-amber text-[10px]"><Zap size={8} className="mr-1" />generator</span>}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <div className="text-center py-10 text-ink-400 text-sm">Geen klussen gevonden.</div>}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          {filtered.length === 0 ? (
            <EmptyState icon={<CalendarClock size={40} />} title="Geen klussen gevonden"
              action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nieuwe klus</button>} />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-ink-50 border-b border-ink-100">
                  <tr>
                    <Th>Nummer</Th><Th>Klus</Th><Th>Klant</Th><Th>Periode</Th>
                    <Th>Transport</Th><Th>Verantw.</Th><Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map(k => {
                    const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
                    const status = k.status_v2 || 'in_optie'
                    return (
                      <tr key={k.id}
                        className="hover:bg-ink-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/klussen/${k.id}`)}>
                        <td className="td">
                          <span className="font-mono text-xs text-ink-400">{k.klus_nummer || '—'}</span>
                        </td>
                        <td className="td">
                          <div className="font-medium text-ink-800">{k.naam}</div>
                          {k.locatie && <div className="text-xs text-ink-400">📍 {k.locatie}</div>}
                        </td>
                        <td className="td">{(k.klant as any)?.naam || '—'}</td>
                        <td className="td text-xs text-ink-500 whitespace-nowrap">
                          {fmt(k.start_datum, 'd MMM')} – {fmt(k.eind_datum, 'd MMM')}
                        </td>
                        <td className="td">
                          <div className="flex flex-wrap gap-1">
                            {busList.map(b => <span key={b.id} className="badge badge-purple text-[10px]"><Truck size={9} className="mr-1" />{b.naam.split(' ').slice(-2).join(' ')}</span>)}
                            {(k.generator_info || []).length > 0 && <span className="badge badge-amber text-[10px]"><Zap size={9} className="mr-1" />{(k.generator_info || []).length}x gen</span>}
                          </div>
                        </td>
                        <td className="td">{k.verantwoordelijke ? <OwnerBadge owner={k.verantwoordelijke} /> : '—'}</td>
                        <td className="td" onClick={e => e.stopPropagation()}>
                          <StatusSelect status={status} onChange={val => updateStatus(k.id, val)} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-box w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editId ? 'Klus bewerken' : 'Nieuwe klus'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="space-y-4">
              <FormGrid>
                <FormField label="Klusnummer">
                  <input className="input font-mono" value={form.klus_nummer} onChange={e => setForm(f => ({ ...f, klus_nummer: e.target.value }))} />
                </FormField>
                <FormField label="Status">
                  <select className="input" value={form.status_v2} onChange={e => setForm(f => ({ ...f, status_v2: e.target.value as KlusStatus2 }))}>
                    {Object.entries(STATUS_CFG).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
                  </select>
                </FormField>
              </FormGrid>
              <FormField label="Naam / productie *">
                <input className="input" value={form.naam} autoFocus onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} placeholder="bijv. TVC Nike – Utrecht" />
              </FormField>
              <FormGrid>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Klant</label>
                    <button className="text-[10px] text-brand-500 hover:underline flex items-center gap-0.5" onClick={() => setNieuweKlantModal(true)}>
                      <UserPlus size={10} /> nieuwe klant
                    </button>
                  </div>
                  <select className="input" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value }))}>
                    <option value="">— geen —</option>
                    {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}{k.bedrijf ? ` (${k.bedrijf})` : ''}</option>)}
                  </select>
                </div>
                <FormField label="Verantwoordelijke">
                  <select className="input" value={form.verantwoordelijke} onChange={e => setForm(f => ({ ...f, verantwoordelijke: e.target.value }))}>
                    <option value="">—</option><option>Wiegert</option><option>Gideon</option><option>Julian</option>
                  </select>
                </FormField>
                <FormField label="Gaffer">
                  <select className="input" value={form.gaffer_id} onChange={e => setForm(f => ({ ...f, gaffer_id: e.target.value }))}>
                    <option value="">— geen —</option>
                    {gaffers.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
                  </select>
                </FormField>
                <FormField label="Locatie">
                  <input className="input" value={form.locatie} onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} placeholder="bijv. Studio Hilversum" />
                </FormField>
                <FormField label="Startdatum">
                  <input type="date" className="input" value={form.start_datum}
                    onChange={e => {
                      const val = e.target.value
                      setForm(f => ({ ...f, start_datum: val, eind_datum: f.eind_datum && f.eind_datum < val ? val : f.eind_datum }))
                    }} />
                </FormField>
                <FormField label="Einddatum">
                  <input type="date" className="input" min={form.start_datum || undefined} value={form.eind_datum}
                    onChange={e => setForm(f => ({ ...f, eind_datum: e.target.value }))} />
                </FormField>
              </FormGrid>

              <FormField label="Bussen">
                <div className="grid grid-cols-2 gap-2">
                  {bussen.map(b => (
                    <label key={b.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={form.bus_ids.includes(b.id)} onChange={() => toggleBus(b.id)} />
                      <div>
                        <div className="text-sm font-medium text-ink-700">{b.naam}</div>
                        <div className="text-xs text-ink-400">{eur(b.dagprijs)}/dag</div>
                      </div>
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="Generators">
                <div className="grid grid-cols-2 gap-2">
                  {generators.map(g => (
                    <label key={g.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={!!form.generator_info.find(x => x.generator_id === g.id)} onChange={() => toggleGenerator(g.id)} />
                      <div>
                        <div className="text-sm font-medium text-ink-700">{g.naam}</div>
                        <div className="text-xs text-ink-400">{g.eigenaar || g.type}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </FormField>

              <FormField label="Notities">
                <textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
              </FormField>
              <FormField label="Interne notities (niet op factuur)">
                <textarea className="input h-14 resize-none bg-yellow-50" value={form.interne_notities} onChange={e => setForm(f => ({ ...f, interne_notities: e.target.value }))} />
              </FormField>
            </div>
            <div className="mt-5 pt-4 border-t border-ink-100 flex justify-end gap-2">
              <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Opslaan…' : editId ? 'Opslaan' : 'Aanmaken & gear toevoegen →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {nieuweKlantModal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nieuwe klant toevoegen</h2>
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

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteKlus(deleteId)}
        title="Klus verwijderen?" description="Dit verwijdert ook alle gear-koppelingen." danger />
    </AppShell>
  )
}
