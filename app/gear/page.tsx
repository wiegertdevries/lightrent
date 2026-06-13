'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { eur, GEAR_STATUS_COLORS } from '@/lib/utils'
import {
  PageHeader, CatBadge, OwnerBadge, Table, Thead, Th, Tbody, Tr, Td,
  EmptyState, Modal, FormField, FormGrid, ConfirmModal
} from '@/components/ui'
import { Plus, Pencil, Trash2, Wrench, Puzzle, Search, ChevronDown, MapPin, AlertTriangle } from 'lucide-react'
import type { Gear, Accessory, GearCat, GearStatus } from '@/lib/types'
import clsx from 'clsx'

export default function GearPage() {
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [activeGearIds, setActiveGearIds] = useState<Set<string>>(new Set())
  const [catFilter, setCatFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    naam: '', categorie: 'LED' as GearCat, eigenaar: '', serienr: '',
    dagprijs: 0, weekprijs: 0, aankoopprijs: 0, notities: '',
    stelling: '', plank: '', status: 'beschikbaar' as GearStatus, defect_notitie: '', barcode: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: g }, { data: a }, { data: kg }] = await Promise.all([
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*').order('naam'),
      supabase.from('klus_gear').select('gear_id, klus:klussen(status)'),
    ])
    setGear(g || [])
    setAccessories(a || [])
    const active = new Set((kg || []).filter((x: any) => x.klus?.status === 'actief').map((x: any) => x.gear_id as string))
    setActiveGearIds(active)
  }

  function openNew() {
    setEditId(null)
    setForm({ naam: '', categorie: 'LED', eigenaar: '', serienr: '', dagprijs: 0, weekprijs: 0, aankoopprijs: 0, notities: '', stelling: '', plank: '', status: 'beschikbaar', defect_notitie: '', barcode: '' })
    setModal(true)
  }

  function openEdit(g: Gear) {
    setEditId(g.id)
    setForm({
      naam: g.naam, categorie: g.categorie, eigenaar: g.eigenaar || '',
      serienr: g.serienr || '', dagprijs: g.dagprijs, weekprijs: g.weekprijs,
      aankoopprijs: g.aankoopprijs || 0, notities: g.notities || '',
      stelling: g.stelling || '', plank: g.plank || '',
      status: g.status || 'beschikbaar', defect_notitie: g.defect_notitie || '',
      barcode: g.barcode || ''
    })
    setModal(true)
  }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const data = {
      naam: form.naam, categorie: form.categorie, eigenaar: form.eigenaar || null,
      serienr: form.serienr || null, dagprijs: form.dagprijs, weekprijs: form.weekprijs,
      aankoopprijs: form.aankoopprijs, notities: form.notities || null,
      stelling: form.stelling || null, plank: form.plank || null,
      status: form.status, defect_notitie: form.defect_notitie || null,
      barcode: form.barcode || null
    }
    if (editId) {
      await supabase.from('gear').update(data).eq('id', editId)
      await logAudit('gewijzigd', 'gear', editId, `${form.naam} bijgewerkt`)
    } else {
      const { data: res } = await supabase.from('gear').insert(data).select().single()
      if (res) await logAudit('aangemaakt', 'gear', res.id, `${form.naam} toegevoegd`)
    }
    await loadAll(); setModal(false); setSaving(false)
  }

  async function deleteGear(id: string) {
    const g = gear.find(x => x.id === id)
    await supabase.from('gear').delete().eq('id', id)
    if (g) await logAudit('verwijderd', 'gear', id, `${g.naam} verwijderd`)
    setDeleteId(null); await loadAll()
  }

  const filtered = gear.filter(g => {
    if (catFilter && g.categorie !== catFilter) return false
    if (ownerFilter && g.eigenaar !== ownerFilter) return false
    if (statusFilter && g.status !== statusFilter) return false
    if (search && !g.naam.toLowerCase().includes(search.toLowerCase()) && !g.serienr?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleExpanded = (id: string) => setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n })

  const gearStatusLabel: Record<string, string> = {
    beschikbaar: 'Beschikbaar', defect: 'Defect', reparatie: 'Reparatie', vermist: 'Vermist'
  }

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader
          title="Gear"
          subtitle={`${gear.length} items · ${eur(gear.reduce((s, g) => s + g.dagprijs, 0))}/dag totale dagwaarde`}
          actions={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Toevoegen</button>}
        />

        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input className="input pl-8 text-sm" style={{ width: 210 }} placeholder="Naam of serienummer…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm" style={{ width: 150 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Alle categorieën</option>
            <option>HMI</option><option>Tungsten</option><option>LED</option><option>Textile/Frame</option><option>Overig</option>
          </select>
          <select className="input text-sm" style={{ width: 130 }} value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
            <option value="">Alle eigenaren</option>
            <option>Wiegert</option><option>Gideon</option><option>Julian</option>
          </select>
          <select className="input text-sm" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Alle statussen</option>
            <option value="beschikbaar">Beschikbaar</option>
            <option value="defect">Defect</option>
            <option value="reparatie">Reparatie</option>
            <option value="vermist">Vermist</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Wrench size={40} />} title="Geen gear gevonden" />
        ) : (
          <Table>
            <Thead>
              <Th>Naam</Th><Th>Cat.</Th><Th>Eigenaar</Th><Th>Stelling/Plank</Th>
              <Th>Serienr.</Th><Th>Dagprijs</Th><Th>Weekprijs</Th><Th>Status</Th><Th>Acc.</Th><Th />
            </Thead>
            <Tbody>
              {filtered.map(g => {
                const accs = accessories.filter(a => a.gear_id === g.id)
                const isExpanded = expanded.has(g.id)
                const isActive = activeGearIds.has(g.id)
                const statusCls = isActive ? 'badge-amber' : (GEAR_STATUS_COLORS[g.status || 'beschikbaar'] || 'badge-green')
                const statusLabel = isActive ? 'Verhuurd' : gearStatusLabel[g.status || 'beschikbaar']
                return (
                  <>
                    <Tr key={g.id}>
                      <Td>
                        <div className="font-medium text-ink-800">{g.naam}</div>
                        {g.notities && <div className="text-xs text-ink-400 mt-0.5 truncate max-w-48">{g.notities}</div>}
                        {g.defect_notitie && <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle size={10} />{g.defect_notitie}</div>}
                      </Td>
                      <Td><CatBadge cat={g.categorie} /></Td>
                      <Td>{g.eigenaar ? <OwnerBadge owner={g.eigenaar} /> : <span className="text-ink-300 text-xs">—</span>}</Td>
                      <Td>
                        {(g.stelling || g.plank) ? (
                          <div className="flex items-center gap-1 text-xs text-ink-500">
                            <MapPin size={11} />
                            {g.stelling && <span>St. {g.stelling}</span>}
                            {g.plank && <span>Pl. {g.plank}</span>}
                          </div>
                        ) : <span className="text-ink-300 text-xs">—</span>}
                      </Td>
                      <Td><span className="font-mono text-xs text-ink-500">{g.serienr || '—'}</span></Td>
                      <Td className="font-mono text-sm">{eur(g.dagprijs)}</Td>
                      <Td className="font-mono text-sm">{eur(g.weekprijs)}</Td>
                      <Td><span className={`badge ${statusCls}`}>{statusLabel}</span></Td>
                      <Td>
                        {accs.length > 0 && (
                          <button className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700" onClick={() => toggleExpanded(g.id)}>
                            <Puzzle size={11} /> {accs.length} <ChevronDown size={10} className={clsx('transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Pencil size={12} /></button>
                          <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(g.id)}><Trash2 size={12} /></button>
                        </div>
                      </Td>
                    </Tr>
                    {isExpanded && accs.map(ac => (
                      <tr key={ac.id} className="bg-ink-50">
                        <td className="td pl-8 text-xs text-ink-500" colSpan={4}>
                          <div className="flex items-center gap-2"><Puzzle size={10} className="text-ink-300" />{ac.naam}</div>
                        </td>
                        <td className="td font-mono text-xs">{eur(ac.dagprijs)}</td>
                        <td className="td font-mono text-xs">{eur(ac.weekprijs || 0)}</td>
                        <td colSpan={4} />
                      </tr>
                    ))}
                  </>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? 'Gear bewerken' : 'Gear toevoegen'}
        width="max-w-2xl"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          </>
        }>
        <div className="space-y-4">
          <FormField label="Naam *"><input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
          <FormGrid>
            <FormField label="Categorie">
              <select className="input" value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value as GearCat }))}>
                <option>HMI</option><option>Tungsten</option><option>LED</option><option>Textile/Frame</option><option>Overig</option>
              </select>
            </FormField>
            <FormField label="Eigenaar">
              <select className="input" value={form.eigenaar} onChange={e => setForm(f => ({ ...f, eigenaar: e.target.value }))}>
                <option value="">—</option><option>Wiegert</option><option>Gideon</option><option>Julian</option>
              </select>
            </FormField>
            <FormField label="Serienummer"><input className="input" value={form.serienr} onChange={e => setForm(f => ({ ...f, serienr: e.target.value }))} /></FormField>
            <FormField label="Barcode"><input className="input" value={form.barcode} onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} /></FormField>
            <FormField label="Dagprijs (€)"><input type="number" className="input" value={form.dagprijs} onChange={e => setForm(f => ({ ...f, dagprijs: +e.target.value }))} /></FormField>
            <FormField label="Weekprijs (€)"><input type="number" className="input" value={form.weekprijs} onChange={e => setForm(f => ({ ...f, weekprijs: +e.target.value }))} /></FormField>
            <FormField label="Aankoopprijs (€)"><input type="number" className="input" value={form.aankoopprijs} onChange={e => setForm(f => ({ ...f, aankoopprijs: +e.target.value }))} /></FormField>
          </FormGrid>

          <div className="border-t border-ink-100 pt-3">
            <div className="section-title">Loods locatie</div>
            <FormGrid>
              <FormField label="Stellingnummer"><input className="input" value={form.stelling} placeholder="bijv. A, B, C…" onChange={e => setForm(f => ({ ...f, stelling: e.target.value }))} /></FormField>
              <FormField label="Planknummer"><input className="input" value={form.plank} placeholder="bijv. 1, 2, 3…" onChange={e => setForm(f => ({ ...f, plank: e.target.value }))} /></FormField>
            </FormGrid>
          </div>

          <div className="border-t border-ink-100 pt-3">
            <div className="section-title">Status</div>
            <FormGrid>
              <FormField label="Status">
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as GearStatus }))}>
                  <option value="beschikbaar">Beschikbaar</option>
                  <option value="defect">Defect</option>
                  <option value="reparatie">In reparatie</option>
                  <option value="vermist">Vermist</option>
                </select>
              </FormField>
              {form.status !== 'beschikbaar' && (
                <FormField label="Toelichting">
                  <input className="input" value={form.defect_notitie} placeholder="Wat is er mis?" onChange={e => setForm(f => ({ ...f, defect_notitie: e.target.value }))} />
                </FormField>
              )}
            </FormGrid>
          </div>

          <FormField label="Notities"><textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} /></FormField>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteGear(deleteId)}
        title="Gear verwijderen?" description="Dit verwijdert ook alle accessoires en klus-koppelingen." danger />
    </AppShell>
  )
}
