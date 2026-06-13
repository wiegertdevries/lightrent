'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import {
  Modal, FormField, FormGrid, PageHeader, StatusBadge,
  OwnerBadge, Table, Thead, Th, Tbody, Tr, Td,
  EmptyState, ConfirmModal
} from '@/components/ui'
import { Plus, Pencil, Trash2, ArrowRight, CalendarClock, Truck, Zap, UserPlus } from 'lucide-react'
import type { Klus, Klant, Bus, Generator, Gear, Accessory } from '@/lib/types'

export default function KlussenPage() {
  const router = useRouter()
  const [klussen, setKlussen] = useState<Klus[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
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
    naam: '', klant_id: '', verantwoordelijke: '', start_datum: '', eind_datum: '',
    bus_ids: [] as string[], generator_info: [] as { generator_id: string; chauffeur: string }[],
    notities: '', interne_notities: '', locatie: '', referentie: '', status: 'gepland' as const
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: k }, { data: kl }, { data: b }, { data: g }, { data: ge }, { data: a }, { data: kg }] = await Promise.all([
      supabase.from('klussen').select('*, klant:klanten(naam)').order('start_datum', { ascending: false }),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('bussen').select('*'),
      supabase.from('generators').select('*'),
      supabase.from('gear').select('*'),
      supabase.from('accessories').select('*'),
      supabase.from('klus_gear').select('klus_id, gear_id'),
    ])
    const mapped = (k || []).map(kl => ({
      ...kl,
      gear_ids: (kg || []).filter(x => x.klus_id === kl.id).map(x => x.gear_id)
    }))
    setKlussen(mapped)
    setKlanten(kl || [])
    setBussen(b || [])
    setGenerators(g || [])
    setGear(ge || [])
    setAccessories(a || [])
  }

  function openNew() {
    setEditId(null)
    const today = new Date().toISOString().slice(0, 10)
    setForm({ naam: '', klant_id: '', verantwoordelijke: '', start_datum: today, eind_datum: today, bus_ids: [], generator_info: [], notities: '', interne_notities: '', locatie: '', referentie: '', status: 'gepland' })
    setModal(true)
  }

  function openEdit(k: Klus) {
    setEditId(k.id)
    setForm({
      naam: k.naam, klant_id: k.klant_id || '', verantwoordelijke: k.verantwoordelijke || '',
      start_datum: k.start_datum || '', eind_datum: k.eind_datum || '',
      bus_ids: k.bus_ids || [], generator_info: k.generator_info || [],
      notities: k.notities || '', interne_notities: k.interne_notities || '',
      locatie: k.locatie || '', referentie: k.referentie || '', status: k.status
    })
    setModal(true)
  }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profiel } = await supabase.from('profielen').select('naam').eq('id', user?.id).single()
    const data = {
      naam: form.naam, klant_id: form.klant_id || null,
      verantwoordelijke: form.verantwoordelijke || null,
      start_datum: form.start_datum || null, eind_datum: form.eind_datum || null,
      bus_ids: form.bus_ids, generator_info: form.generator_info,
      notities: form.notities, interne_notities: form.interne_notities,
      locatie: form.locatie, referentie: form.referentie, status: form.status,
      aangemaakt_door: user?.id, aangemaakt_door_naam: profiel?.naam || user?.email
    }
    if (editId) {
      await supabase.from('klussen').update(data).eq('id', editId)
      await logAudit('gewijzigd', 'klussen', editId, `${form.naam} bijgewerkt`)
      await loadAll(); setModal(false); setSaving(false)
    } else {
      const { data: res } = await supabase.from('klussen').insert(data).select().single()
      if (res) {
        await logAudit('aangemaakt', 'klussen', res.id, `${form.naam} aangemaakt`)
        setModal(false); setSaving(false)
        router.push(`/klussen/${res.id}`)
      } else {
        setSaving(false)
      }
    }
    await loadAll()
  }

  async function deleteKlus(id: string) {
    const k = klussen.find(x => x.id === id)
    await supabase.from('klussen').delete().eq('id', id)
    if (k) await logAudit('verwijderd', 'klussen', id, `${k.naam} verwijderd`)
    setDeleteId(null); await loadAll()
  }

  async function cycleStatus(k: Klus) {
    const cycle: Record<string, string> = { gepland: 'actief', actief: 'afgerond', afgerond: 'gepland' }
    const next = cycle[k.status]
    await supabase.from('klussen').update({ status: next }).eq('id', k.id)
    await logAudit('gewijzigd', 'klussen', k.id, `Status gewijzigd naar ${next}`)
    await loadAll()
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
      const existing = f.generator_info.find(g => g.generator_id === genId)
      if (existing) return { ...f, generator_info: f.generator_info.filter(g => g.generator_id !== genId) }
      return { ...f, generator_info: [...f.generator_info, { generator_id: genId, chauffeur: '' }] }
    })
  }
  function setGenChauffeur(genId: string, chauffeur: string) {
    setForm(f => ({ ...f, generator_info: f.generator_info.map(g => g.generator_id === genId ? { ...g, chauffeur } : g) }))
  }

  const filtered = filter ? klussen.filter(k => k.status === filter) : klussen

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader
          title="Klussen"
          subtitle={`${klussen.filter(k => k.status === 'actief').length} actief · ${klussen.filter(k => k.status === 'gepland').length} gepland`}
          actions={
            <>
              <select className="input text-sm py-1.5" style={{ width: 130 }} value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="">Alle</option>
                <option value="gepland">Gepland</option>
                <option value="actief">Actief</option>
                <option value="afgerond">Afgerond</option>
              </select>
              <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nieuwe klus</button>
            </>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState icon={<CalendarClock size={40} />} title="Geen klussen gevonden"
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nieuwe klus</button>} />
        ) : (
          <Table>
            <Thead>
              <Th>Naam</Th><Th>Klant</Th><Th>Locatie</Th><Th>Van</Th><Th>Tot</Th>
              <Th>Transport</Th><Th>Gen.</Th><Th>Gear</Th><Th>Dagwaarde</Th><Th>Door</Th><Th>Status</Th><Th />
            </Thead>
            <Tbody>
              {filtered.map(k => {
                const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
                const dag = klusDagwaarde(k, gear, accessories)
                return (
                  <Tr key={k.id}>
                    <Td>
                      <button onClick={() => router.push(`/klussen/${k.id}`)}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline text-left">
                        {k.naam}
                      </button>
                      {k.referentie && <div className="text-xs text-ink-400">{k.referentie}</div>}
                    </Td>
                    <Td>{(k.klant as any)?.naam || '—'}</Td>
                    <Td className="text-xs text-ink-500">{k.locatie || '—'}</Td>
                    <Td>{fmt(k.start_datum, 'd MMM')}</Td>
                    <Td>{fmt(k.eind_datum, 'd MMM')}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {busList.map(b => (
                          <span key={b.id} className="badge badge-purple text-[10px]">
                            <Truck size={9} className="mr-0.5" />{b.naam.split(' ').slice(-2).join(' ')}
                          </span>
                        ))}
                        {busList.length === 0 && <span className="text-ink-300 text-xs">—</span>}
                      </div>
                    </Td>
                    <Td>
                      {(k.generator_info || []).length > 0
                        ? <span className="badge badge-amber text-[10px]"><Zap size={9} className="mr-0.5" />{(k.generator_info || []).length}x</span>
                        : <span className="text-ink-300 text-xs">—</span>}
                    </Td>
                    <Td>{(k.gear_ids || []).length}</Td>
                    <Td className="font-mono text-xs">{eur(dag)}/dag</Td>
                    <Td className="text-xs text-ink-400">{k.aangemaakt_door_naam || '—'}</Td>
                    <Td>
                      <button onClick={() => cycleStatus(k)} title="Klik om status te wijzigen">
                        <StatusBadge status={k.status} />
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/klussen/${k.id}`)}><ArrowRight size={13} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(k)}><Pencil size={12} /></button>
                        <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(k.id)}><Trash2 size={12} /></button>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? 'Klus bewerken' : 'Nieuwe klus'}
        width="max-w-2xl"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Opslaan…' : editId ? 'Opslaan' : 'Aanmaken & gear toevoegen →'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <FormField label="Naam / productie *">
            <input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} placeholder="bijv. TVC Nike – Utrecht" />
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
            <FormField label="Locatie">
              <input className="input" value={form.locatie} placeholder="bijv. Studio Hilversum" onChange={e => setForm(f => ({ ...f, locatie: e.target.value }))} />
            </FormField>
            <FormField label="Referentie / PO nummer">
              <input className="input" value={form.referentie} onChange={e => setForm(f => ({ ...f, referentie: e.target.value }))} />
            </FormField>
          </FormGrid>

          <FormField label="Bussen (meerdere mogelijk)">
            <div className="grid grid-cols-2 gap-2">
              {bussen.map(b => (
                <label key={b.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={form.bus_ids.includes(b.id)} onChange={() => toggleBus(b.id)} />
                  <div><div className="text-sm font-medium text-ink-700">{b.naam}</div>{b.kenteken && <div className="text-xs text-ink-400">{b.kenteken}</div>}</div>
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Generators">
            <div className="space-y-2">
              {generators.map(g => {
                const selected = form.generator_info.find(x => x.generator_id === g.id)
                return (
                  <div key={g.id} className="rounded-lg border border-ink-100 overflow-hidden">
                    <label className="flex items-center gap-2.5 p-2.5 hover:bg-ink-50 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={!!selected} onChange={() => toggleGenerator(g.id)} />
                      <div className="flex-1"><div className="text-sm font-medium text-ink-700">{g.naam}</div><div className="text-xs text-ink-400">{g.type}</div></div>
                    </label>
                    {selected && (
                      <div className="px-3 pb-2.5 border-t border-ink-100 pt-2">
                        <label className="label">Meegenomen door</label>
                        <select className="input text-sm" value={selected.chauffeur} onChange={e => setGenChauffeur(g.id, e.target.value)}>
                          <option value="">— kies —</option><option>Wiegert</option><option>Gideon</option><option>Julian</option>
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </FormField>

          <FormField label="Notities (zichtbaar op offerte/factuur)">
            <textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
          </FormField>
          <FormField label="Interne notities (niet zichtbaar voor klant)">
            <textarea className="input h-14 resize-none bg-yellow-50" value={form.interne_notities} onChange={e => setForm(f => ({ ...f, interne_notities: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* Nieuwe klant inline */}
      <Modal open={nieuweKlantModal} onClose={() => setNieuweKlantModal(false)} title="Nieuwe klant toevoegen"
        footer={<><button className="btn" onClick={() => setNieuweKlantModal(false)}>Annuleren</button><button className="btn btn-primary" onClick={maakNieuweKlant}>Toevoegen</button></>}>
        <FormGrid>
          <FormField label="Naam *"><input className="input" value={nieuweKlantForm.naam} onChange={e => setNieuweKlantForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
          <FormField label="Bedrijf"><input className="input" value={nieuweKlantForm.bedrijf} onChange={e => setNieuweKlantForm(f => ({ ...f, bedrijf: e.target.value }))} /></FormField>
          <FormField label="Email"><input type="email" className="input" value={nieuweKlantForm.email} onChange={e => setNieuweKlantForm(f => ({ ...f, email: e.target.value }))} /></FormField>
          <FormField label="Telefoon"><input className="input" value={nieuweKlantForm.telefoon} onChange={e => setNieuweKlantForm(f => ({ ...f, telefoon: e.target.value }))} /></FormField>
        </FormGrid>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteKlus(deleteId)}
        title="Klus verwijderen?" description="Dit verwijdert ook alle gear-koppelingen." danger />
    </AppShell>
  )
}
