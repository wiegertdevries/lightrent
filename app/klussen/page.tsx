'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import {
  Modal, FormField, FormGrid, PageHeader, StatusBadge,
  OwnerBadge, Table, Thead, Th, Tbody, Tr, Td,
  EmptyState, ConfirmModal
} from '@/components/ui'
import { Plus, Pencil, Trash2, ArrowRight, CalendarClock, Truck, Zap } from 'lucide-react'
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
  const [form, setForm] = useState({
    naam: '', klant_id: '', verantwoordelijke: '', start_datum: '', eind_datum: '',
    bus_ids: [] as string[], generator_info: [] as { generator_id: string; chauffeur: string }[],
    notities: '', status: 'gepland' as const
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
    setForm({ naam: '', klant_id: '', verantwoordelijke: '', start_datum: '', eind_datum: '', bus_ids: [], generator_info: [], notities: '', status: 'gepland' })
    setModal(true)
  }

  function openEdit(k: Klus) {
    setEditId(k.id)
    setForm({
      naam: k.naam, klant_id: k.klant_id || '', verantwoordelijke: k.verantwoordelijke || '',
      start_datum: k.start_datum || '', eind_datum: k.eind_datum || '',
      bus_ids: k.bus_ids || [], generator_info: k.generator_info || [],
      notities: k.notities || '', status: k.status
    })
    setModal(true)
  }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const data = {
      naam: form.naam, klant_id: form.klant_id || null,
      verantwoordelijke: form.verantwoordelijke || null,
      start_datum: form.start_datum || null, eind_datum: form.eind_datum || null,
      bus_ids: form.bus_ids, generator_info: form.generator_info,
      notities: form.notities, status: form.status
    }
    if (editId) {
      await supabase.from('klussen').update(data).eq('id', editId)
    } else {
      await supabase.from('klussen').insert(data)
    }
    await loadAll()
    setModal(false)
    setSaving(false)
  }

  async function deleteKlus(id: string) {
    await supabase.from('klussen').delete().eq('id', id)
    setDeleteId(null)
    await loadAll()
  }

  async function cycleStatus(k: Klus) {
    const next: Record<string, string> = { gepland: 'actief', actief: 'afgerond', afgerond: 'gepland' }
    await supabase.from('klussen').update({ status: next[k.status] }).eq('id', k.id)
    await loadAll()
  }

  function toggleBus(id: string) {
    setForm(f => ({
      ...f,
      bus_ids: f.bus_ids.includes(id) ? f.bus_ids.filter(x => x !== id) : [...f.bus_ids, id]
    }))
  }

  function toggleGenerator(genId: string) {
    setForm(f => {
      const existing = f.generator_info.find(g => g.generator_id === genId)
      if (existing) return { ...f, generator_info: f.generator_info.filter(g => g.generator_id !== genId) }
      return { ...f, generator_info: [...f.generator_info, { generator_id: genId, chauffeur: '' }] }
    })
  }

  function setGenChauffeur(genId: string, chauffeur: string) {
    setForm(f => ({
      ...f,
      generator_info: f.generator_info.map(g => g.generator_id === genId ? { ...g, chauffeur } : g)
    }))
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
              <button className="btn btn-primary" onClick={openNew}>
                <Plus size={15} /> Nieuwe klus
              </button>
            </>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState icon={<CalendarClock size={40} />} title="Geen klussen gevonden"
            description="Maak een nieuwe klus aan om te beginnen."
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Nieuwe klus</button>} />
        ) : (
          <Table>
            <Thead>
              <Th>Naam</Th><Th>Klant</Th><Th>Van</Th><Th>Tot</Th>
              <Th>Transport</Th><Th>Generator</Th><Th>Gear</Th><Th>Dagwaarde</Th>
              <Th>Status</Th><Th />
            </Thead>
            <Tbody>
              {filtered.map(k => {
                const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
                const dag = klusDagwaarde(k, gear, accessories)
                return (
                  <Tr key={k.id}>
                    <Td>
                      <button
                        onClick={() => router.push(`/klussen/${k.id}`)}
                        className="font-medium text-brand-600 hover:text-brand-700 hover:underline text-left">
                        {k.naam}
                      </button>
                    </Td>
                    <Td>{k.klant?.naam || '—'}</Td>
                    <Td>{fmt(k.start_datum, 'd MMM')}</Td>
                    <Td>{fmt(k.eind_datum, 'd MMM')}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {busList.map(b => (
                          <span key={b.id} className="badge badge-purple text-[10px]">
                            <Truck size={9} className="mr-1" />{b.naam.split(' ').slice(-2).join(' ')}
                          </span>
                        ))}
                        {busList.length === 0 && <span className="text-ink-300 text-xs">—</span>}
                      </div>
                    </Td>
                    <Td>
                      {(k.generator_info || []).length > 0
                        ? <span className="badge badge-amber text-[10px]"><Zap size={9} className="mr-1" />{(k.generator_info || []).length}x</span>
                        : <span className="text-ink-300 text-xs">—</span>}
                    </Td>
                    <Td>{(k.gear_ids || []).length}</Td>
                    <Td className="font-mono text-xs">{eur(dag)}</Td>
                    <Td>
                      <button onClick={() => cycleStatus(k)} title="Klik om status te wijzigen">
                        <StatusBadge status={k.status} />
                      </button>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/klussen/${k.id}`)} title="Openen">
                          <ArrowRight size={14} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(k)} title="Bewerken">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(k.id)} title="Verwijderen">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Klus modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? 'Klus bewerken' : 'Nieuwe klus'}
        width="max-w-2xl"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Opslaan…' : editId ? 'Opslaan' : 'Aanmaken & gear toevoegen'}
            </button>
          </>
        }>
        <div className="space-y-4">
          <FormField label="Naam / productie">
            <input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} placeholder="bijv. TVC Nike – locatie Utrecht" />
          </FormField>
          <FormGrid>
            <FormField label="Klant">
              <select className="input" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value }))}>
                <option value="">— geen —</option>
                {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}{k.bedrijf ? ` (${k.bedrijf})` : ''}</option>)}
              </select>
            </FormField>
            <FormField label="Verantwoordelijke">
              <select className="input" value={form.verantwoordelijke} onChange={e => setForm(f => ({ ...f, verantwoordelijke: e.target.value }))}>
                <option value="">—</option>
                <option>Wiegert</option><option>Gideon</option><option>Julian</option>
              </select>
            </FormField>
            <FormField label="Startdatum">
              <input type="date" className="input" value={form.start_datum}
                onChange={e => {
                  const val = e.target.value
                  setForm(f => ({
                    ...f,
                    start_datum: val,
                    // Auto-correct: end can't be before start
                    eind_datum: f.eind_datum && f.eind_datum < val ? val : f.eind_datum
                  }))
                }} />
            </FormField>
            <FormField label="Einddatum">
              <input type="date" className="input" value={form.eind_datum}
                min={form.start_datum || undefined}
                onChange={e => setForm(f => ({ ...f, eind_datum: e.target.value }))} />
            </FormField>
          </FormGrid>

          {/* Bussen - multiple select with checkboxes */}
          <FormField label="Bussen (meerdere mogelijk)">
            <div className="grid grid-cols-2 gap-2">
              {bussen.map(b => (
                <label key={b.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-ink-100 hover:bg-ink-50 cursor-pointer">
                  <input type="checkbox" className="rounded"
                    checked={form.bus_ids.includes(b.id)}
                    onChange={() => toggleBus(b.id)} />
                  <div>
                    <div className="text-sm font-medium text-ink-700">{b.naam}</div>
                    {b.kenteken && <div className="text-xs text-ink-400">{b.kenteken}</div>}
                  </div>
                </label>
              ))}
            </div>
          </FormField>

          {/* Generators */}
          <FormField label="Generators (meerdere mogelijk)">
            <div className="space-y-2">
              {generators.map(g => {
                const selected = form.generator_info.find(x => x.generator_id === g.id)
                return (
                  <div key={g.id} className="rounded-lg border border-ink-100 overflow-hidden">
                    <label className="flex items-center gap-2.5 p-2.5 hover:bg-ink-50 cursor-pointer">
                      <input type="checkbox" className="rounded"
                        checked={!!selected}
                        onChange={() => toggleGenerator(g.id)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-ink-700">{g.naam}</div>
                        <div className="text-xs text-ink-400">{g.type}</div>
                      </div>
                    </label>
                    {selected && (
                      <div className="px-3 pb-2.5 border-t border-ink-100 pt-2">
                        <label className="label">Meegegeven door</label>
                        <select className="input text-sm"
                          value={selected.chauffeur}
                          onChange={e => setGenChauffeur(g.id, e.target.value)}>
                          <option value="">— kies —</option>
                          <option>Wiegert</option><option>Gideon</option><option>Julian</option>
                        </select>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </FormField>

          <FormField label="Notities">
            <textarea className="input h-16 resize-none" value={form.notities}
              onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
          </FormField>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteKlus(deleteId)}
        title="Klus verwijderen?"
        description="Dit verwijdert ook alle gear-koppelingen. Dit kan niet ongedaan worden gemaakt."
        danger />
    </AppShell>
  )
}
