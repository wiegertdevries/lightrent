'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { eur, GEAR_STATUS_COLORS } from '@/lib/utils'
import {
  PageHeader, CatBadge, OwnerBadge, Table, Thead, Th, Tbody, Tr, Td,
  EmptyState, Modal, FormField, FormGrid, ConfirmModal
} from '@/components/ui'
import { Plus, Pencil, Trash2, Wrench, Puzzle, Search, ChevronDown, MapPin, AlertTriangle, LayoutGrid, List } from 'lucide-react'
import type { Gear, Accessory, GearCat, GearStatus } from '@/lib/types'
import { CAT_EMOJI } from '@/lib/gear-thumbnails'
import clsx from 'clsx'

const CATS = ['Alle', 'HMI', 'Tungsten', 'LED', 'Textile/Frame', 'Overig']

const CAT_COLORS: Record<string, string> = {
  HMI: 'bg-purple-50 text-purple-700 border-purple-200',
  Tungsten: 'bg-orange-50 text-orange-700 border-orange-200',
  LED: 'bg-green-50 text-green-700 border-green-200',
  'Textile/Frame': 'bg-blue-50 text-blue-700 border-blue-200',
  Overig: 'bg-ink-50 text-ink-600 border-ink-200',
}

function GearThumbnail({ naam, categorie, fotoUrl }: { naam: string; categorie: string; fotoUrl?: string }) {
  const [imgError, setImgError] = useState(false)
  const emoji = CAT_EMOJI[categorie] || '💡'

  if (fotoUrl && !imgError) {
    return (
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-ink-100 flex-shrink-0">
        <img src={fotoUrl} alt={naam} className="w-full h-full object-cover"
          onError={() => setImgError(true)} />
      </div>
    )
  }

  // Generate a nice color-coded thumbnail with emoji + first letters
  const initials = naam.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const bgColors: Record<string, string> = {
    HMI: 'bg-purple-100', Tungsten: 'bg-orange-100', LED: 'bg-green-100',
    'Textile/Frame': 'bg-blue-100', Overig: 'bg-ink-100'
  }
  const textColors: Record<string, string> = {
    HMI: 'text-purple-600', Tungsten: 'text-orange-600', LED: 'text-green-600',
    'Textile/Frame': 'text-blue-600', Overig: 'text-ink-600'
  }

  return (
    <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border', bgColors[categorie] || 'bg-ink-100', 'border-ink-200')}>
      <span className={clsx('text-xs font-bold', textColors[categorie] || 'text-ink-600')}>{initials}</span>
    </div>
  )
}

export default function GearPage() {
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [activeGearIds, setActiveGearIds] = useState<Set<string>>(new Set())
  const [catFilter, setCatFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({
    naam: '', categorie: 'LED' as GearCat, eigenaar: '', serienr: '',
    dagprijs: '' as string | number, weekprijs: '' as string | number,
    aankoopprijs: '' as string | number, notities: '',
    stelling: '', plank: '', status: 'beschikbaar' as GearStatus,
    defect_notitie: '', barcode: '', foto_url: ''
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
    setForm({ naam: '', categorie: 'LED', eigenaar: '', serienr: '', dagprijs: '', weekprijs: '', aankoopprijs: '', notities: '', stelling: '', plank: '', status: 'beschikbaar', defect_notitie: '', barcode: '', foto_url: '' })
    setModal(true)
  }

  function openEdit(g: Gear) {
    setEditId(g.id)
    setForm({
      naam: g.naam, categorie: g.categorie, eigenaar: g.eigenaar || '',
      serienr: g.serienr || '', dagprijs: g.dagprijs, weekprijs: g.weekprijs,
      aankoopprijs: g.aankoopprijs || '', notities: g.notities || '',
      stelling: g.stelling || '', plank: g.plank || '',
      status: g.status || 'beschikbaar', defect_notitie: g.defect_notitie || '',
      barcode: g.barcode || '', foto_url: g.foto_url || ''
    })
    setModal(true)
  }

  function handleModalClose() {
    // Only close if explicitly called - not on outside click
    setModal(false)
  }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const data = {
      naam: form.naam, categorie: form.categorie, eigenaar: form.eigenaar || null,
      serienr: form.serienr || null, dagprijs: Number(form.dagprijs) || 0,
      weekprijs: Number(form.weekprijs) || 0, aankoopprijs: Number(form.aankoopprijs) || 0,
      notities: form.notities || null, stelling: form.stelling || null, plank: form.plank || null,
      status: form.status, defect_notitie: form.defect_notitie || null,
      barcode: form.barcode || null, foto_url: form.foto_url || null
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

  const dagwaarde = gear.reduce((s, g) => s + g.dagprijs, 0)

  // Group by category for grid view
  const grouped = CATS.filter(c => c !== 'Alle').reduce((acc, cat) => {
    const items = filtered.filter(g => g.categorie === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {} as Record<string, Gear[]>)

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader
          title="Gear"
          subtitle={`${gear.length} items · ${eur(dagwaarde)}/dag totale dagwaarde`}
          actions={
            <div className="flex gap-2">
              <button className={clsx('btn btn-sm', viewMode === 'grid' ? 'btn-primary' : '')} onClick={() => setViewMode('grid')}><LayoutGrid size={14} /></button>
              <button className={clsx('btn btn-sm', viewMode === 'list' ? 'btn-primary' : '')} onClick={() => setViewMode('list')}><List size={14} /></button>
              <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Toevoegen</button>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            {CATS.map(c => (
              <button key={c}
                className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  (c === 'Alle' ? !catFilter : catFilter === c)
                    ? 'bg-ink-800 text-white border-ink-800'
                    : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                )}
                onClick={() => setCatFilter(c === 'Alle' ? '' : c)}>
                {c === 'Alle' ? 'Alles' : c}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input className="input pl-8 text-sm" style={{ width: 200 }} placeholder="Zoeken…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
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
        ) : viewMode === 'grid' ? (
          // GRID VIEW - grouped by category
          <div className="space-y-8">
            {(catFilter ? { [catFilter]: filtered } : grouped) && Object.entries(catFilter ? { [catFilter]: filtered } : grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={clsx('badge border text-xs', CAT_COLORS[cat])}>{CAT_EMOJI[cat]} {cat}</span>
                  <span className="text-xs text-ink-400">{items.length} items · {eur(items.reduce((s, g) => s + g.dagprijs, 0))}/dag</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {items.map(g => {
                    const isActive = activeGearIds.has(g.id)
                    const accs = accessories.filter(a => a.gear_id === g.id)
                    const statusCls = isActive ? 'badge-amber' : (GEAR_STATUS_COLORS[g.status || 'beschikbaar'] || 'badge-green')
                    return (
                      <div key={g.id} className="card p-3 hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => openEdit(g)}>
                        <div className="flex items-start gap-2.5 mb-2.5">
                          <GearThumbnail naam={g.naam} categorie={g.categorie} fotoUrl={g.foto_url} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-ink-800 leading-tight line-clamp-2">{g.naam}</div>
                            {g.eigenaar && <OwnerBadge owner={g.eigenaar} />}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-bold text-ink-800">{eur(g.dagprijs)}<span className="text-ink-400 font-normal text-xs">/dag</span></span>
                          <span className={`badge text-[10px] ${statusCls}`}>{isActive ? 'Verhuurd' : gearStatusLabel[g.status || 'beschikbaar']}</span>
                        </div>
                        {(g.stelling || g.plank) && (
                          <div className="flex items-center gap-1 text-[10px] text-ink-400 mt-1.5">
                            <MapPin size={9} /> St.{g.stelling} Pl.{g.plank}
                          </div>
                        )}
                        {accs.length > 0 && (
                          <div className="mt-1.5 text-[10px] text-ink-400 flex items-center gap-1">
                            <Puzzle size={9} /> {accs.length} accessoire{accs.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        {g.defect_notitie && (
                          <div className="mt-1.5 text-[10px] text-red-500 flex items-center gap-1">
                            <AlertTriangle size={9} /> {g.defect_notitie}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // LIST VIEW
          <Table>
            <Thead>
              <Th></Th><Th>Naam</Th><Th>Cat.</Th><Th>Eigenaar</Th><Th>Stelling</Th>
              <Th>Dagprijs</Th><Th>Weekprijs</Th><Th>Status</Th><Th>Acc.</Th><Th />
            </Thead>
            <Tbody>
              {filtered.map(g => {
                const accs = accessories.filter(a => a.gear_id === g.id)
                const isExpanded = expanded.has(g.id)
                const isActive = activeGearIds.has(g.id)
                const statusCls = isActive ? 'badge-amber' : (GEAR_STATUS_COLORS[g.status || 'beschikbaar'] || 'badge-green')
                return (
                  <>
                    <Tr key={g.id}>
                      <Td><GearThumbnail naam={g.naam} categorie={g.categorie} fotoUrl={g.foto_url} /></Td>
                      <Td>
                        <div className="font-medium text-ink-800">{g.naam}</div>
                        {g.defect_notitie && <div className="text-xs text-red-500 mt-0.5 flex items-center gap-1"><AlertTriangle size={10} />{g.defect_notitie}</div>}
                      </Td>
                      <Td><CatBadge cat={g.categorie} /></Td>
                      <Td>{g.eigenaar ? <OwnerBadge owner={g.eigenaar} /> : <span className="text-ink-300 text-xs">—</span>}</Td>
                      <Td>
                        {(g.stelling || g.plank) ? (
                          <div className="flex items-center gap-1 text-xs text-ink-500"><MapPin size={11} />{g.stelling && `St. ${g.stelling}`}{g.plank && ` Pl. ${g.plank}`}</div>
                        ) : <span className="text-ink-300 text-xs">—</span>}
                      </Td>
                      <Td className="font-mono font-medium">{eur(g.dagprijs)}</Td>
                      <Td className="font-mono">{eur(g.weekprijs)}</Td>
                      <Td><span className={`badge ${statusCls}`}>{isActive ? 'Verhuurd' : gearStatusLabel[g.status || 'beschikbaar']}</span></Td>
                      <Td>
                        {accs.length > 0 && (
                          <button className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-700" onClick={() => toggleExpanded(g.id)}>
                            <Puzzle size={11} /> {accs.length} <ChevronDown size={10} className={clsx('transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        )}
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Pencil size={12} /></button>
                          <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(g.id)}><Trash2 size={12} /></button>
                        </div>
                      </Td>
                    </Tr>
                    {isExpanded && accs.map(ac => (
                      <tr key={ac.id} className="bg-ink-50">
                        <td colSpan={2} />
                        <td className="td text-xs text-ink-500" colSpan={3}>
                          <div className="flex items-center gap-2 pl-2"><Puzzle size={10} className="text-ink-300" />{ac.naam}</div>
                        </td>
                        <td className="td font-mono text-xs">{eur(ac.dagprijs)}</td>
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

      {/* Modal - no outside click close */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-box w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-ink-800">{editId ? 'Gear bewerken' : 'Gear toevoegen'}</h2>
              <button className="btn btn-ghost btn-sm p-1" onClick={handleModalClose}>✕</button>
            </div>

            <div className="space-y-4">
              <FormField label="Naam *">
                <input className="input" value={form.naam} autoFocus
                  onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} />
              </FormField>
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
                <FormField label="Dagprijs (€) *">
                  <input type="number" className="input" value={form.dagprijs}
                    onFocus={e => { if (e.target.value === '0') setForm(f => ({ ...f, dagprijs: '' })) }}
                    onBlur={e => { if (e.target.value === '') setForm(f => ({ ...f, dagprijs: 0 })) }}
                    onChange={e => setForm(f => ({ ...f, dagprijs: e.target.value }))} />
                </FormField>
                <FormField label="Weekprijs (€)">
                  <input type="number" className="input" value={form.weekprijs}
                    onFocus={e => { if (e.target.value === '0') setForm(f => ({ ...f, weekprijs: '' })) }}
                    onBlur={e => { if (e.target.value === '') setForm(f => ({ ...f, weekprijs: 0 })) }}
                    onChange={e => setForm(f => ({ ...f, weekprijs: e.target.value }))} />
                </FormField>
                <FormField label="Aankoopprijs (€)">
                  <input type="number" className="input" value={form.aankoopprijs}
                    onFocus={e => { if (e.target.value === '0') setForm(f => ({ ...f, aankoopprijs: '' })) }}
                    onBlur={e => { if (e.target.value === '') setForm(f => ({ ...f, aankoopprijs: 0 })) }}
                    onChange={e => setForm(f => ({ ...f, aankoopprijs: e.target.value }))} />
                </FormField>
                <FormField label="Serienummer">
                  <input className="input" value={form.serienr} onChange={e => setForm(f => ({ ...f, serienr: e.target.value }))} />
                </FormField>
              </FormGrid>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Stellingnummer">
                  <input className="input" value={form.stelling} placeholder="bijv. A" onChange={e => setForm(f => ({ ...f, stelling: e.target.value }))} />
                </FormField>
                <FormField label="Planknummer">
                  <input className="input" value={form.plank} placeholder="bijv. 3" onChange={e => setForm(f => ({ ...f, plank: e.target.value }))} />
                </FormField>
                <FormField label="Status">
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as GearStatus }))}>
                    <option value="beschikbaar">Beschikbaar</option>
                    <option value="defect">Defect</option>
                    <option value="reparatie">In reparatie</option>
                    <option value="vermist">Vermist</option>
                  </select>
                </FormField>
              </div>
              {form.status !== 'beschikbaar' && (
                <FormField label="Toelichting status">
                  <input className="input" value={form.defect_notitie} placeholder="Wat is er mis?" onChange={e => setForm(f => ({ ...f, defect_notitie: e.target.value }))} />
                </FormField>
              )}
              <FormField label="Foto URL (optioneel — plak een afbeeldingslink)">
                <input className="input" value={form.foto_url} placeholder="https://..." onChange={e => setForm(f => ({ ...f, foto_url: e.target.value }))} />
              </FormField>
              <FormField label="Notities">
                <textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
              </FormField>
            </div>

            <div className="mt-5 pt-4 border-t border-ink-100 flex justify-end gap-2">
              <button className="btn" onClick={handleModalClose}>Annuleren</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteGear(deleteId)}
        title="Gear verwijderen?" description="Dit verwijdert ook alle accessoires en klus-koppelingen." danger />
    </AppShell>
  )
}
