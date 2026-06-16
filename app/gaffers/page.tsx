'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { PageHeader, Table, Thead, Th, Tbody, Tr, Td, EmptyState, ConfirmModal, FormField, FormGrid } from '@/components/ui'
import { Plus, UserCheck, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import { eur } from '@/lib/utils'

interface Gaffer {
  id: string; naam: string; email?: string; telefoon?: string
  bedrijf?: string; notities?: string; dagprijs?: number; weekprijs?: number
}

export default function GaffersPage() {
  const [gaffers, setGaffers] = useState<Gaffer[]>([])
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ naam: '', email: '', telefoon: '', bedrijf: '', notities: '', dagprijs: '' as string | number, weekprijs: '' as string | number })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data } = await supabase.from('gaffers').select('*').order('naam')
    setGaffers(data || [])
  }

  function openNew() {
    setEditId(null); setError('')
    setForm({ naam: '', email: '', telefoon: '', bedrijf: '', notities: '', dagprijs: '', weekprijs: '' })
    setModal(true)
  }

  function openEdit(g: Gaffer) {
    setEditId(g.id); setError('')
    setForm({ naam: g.naam, email: g.email || '', telefoon: g.telefoon || '', bedrijf: g.bedrijf || '', notities: g.notities || '', dagprijs: g.dagprijs ?? '', weekprijs: g.weekprijs ?? '' })
    setModal(true)
  }

  async function save() {
    if (!form.naam.trim()) { setError('Naam is verplicht'); return }
    setSaving(true); setError('')
    const data = {
      naam: form.naam.trim(),
      email: form.email.trim() || null,
      telefoon: form.telefoon.trim() || null,
      bedrijf: form.bedrijf.trim() || null,
      notities: form.notities.trim() || null,
      dagprijs: Number(form.dagprijs) || 0,
      weekprijs: Number(form.weekprijs) || 0,
    }
    const res = editId
      ? await supabase.from('gaffers').update(data).eq('id', editId)
      : await supabase.from('gaffers').insert([data])
    if (res.error) { setError(`Fout: ${res.error.message}`); setSaving(false); return }
    await loadAll(); setModal(false); setSaving(false)
  }

  async function deleteGaffer(id: string) {
    await supabase.from('gaffers').delete().eq('id', id)
    setDeleteId(null); await loadAll()
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 page-enter">
        <PageHeader title="Gaffers" subtitle={`${gaffers.length} gaffers`}
          actions={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Gaffer toevoegen</button>} />

        {gaffers.length === 0 ? (
          <EmptyState icon={<UserCheck size={40} />} title="Nog geen gaffers"
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Gaffer toevoegen</button>} />
        ) : (
          <Table>
            <Thead><Th>Naam</Th><Th>Bedrijf</Th><Th>Email</Th><Th>Telefoon</Th><Th>Dagprijs</Th><Th>Weekprijs</Th><Th /></Thead>
            <Tbody>
              {gaffers.map(g => (
                <Tr key={g.id} onClick={() => openEdit(g)} className="cursor-pointer">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs">{g.naam.charAt(0)}</div>
                      <span className="font-medium">{g.naam}</span>
                    </div>
                  </Td>
                  <Td>{g.bedrijf || '—'}</Td>
                  <Td>{g.email ? <a href={`mailto:${g.email}`} onClick={e => e.stopPropagation()} className="text-brand-500 hover:underline flex items-center gap-1 text-sm"><Mail size={12} />{g.email}</a> : '—'}</Td>
                  <Td>{g.telefoon ? <span className="flex items-center gap-1 text-sm"><Phone size={12} />{g.telefoon}</span> : '—'}</Td>
                  <Td><span className="font-mono font-medium">{g.dagprijs ? eur(g.dagprijs) : '—'}</span></Td>
                  <Td><span className="font-mono text-ink-500">{g.weekprijs ? eur(g.weekprijs) : '—'}</span></Td>
                  <Td>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(g)}><Pencil size={12} /></button>
                      <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(g.id)}><Trash2 size={12} /></button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-box w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editId ? 'Gaffer bewerken' : 'Gaffer toevoegen'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
            <div className="space-y-3">
              <FormGrid>
                <FormField label="Naam *">
                  <input className="input" value={form.naam} autoFocus onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} />
                </FormField>
                <FormField label="Bedrijf">
                  <input className="input" value={form.bedrijf} onChange={e => setForm(f => ({ ...f, bedrijf: e.target.value }))} />
                </FormField>
                <FormField label="Email">
                  <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </FormField>
                <FormField label="Telefoon">
                  <input className="input" value={form.telefoon} onChange={e => setForm(f => ({ ...f, telefoon: e.target.value }))} />
                </FormField>
                <FormField label="Dagprijs (€)">
                  <input type="number" className="input" value={form.dagprijs}
                    onFocus={e => { if (e.target.value === '0') setForm(f => ({ ...f, dagprijs: '' })) }}
                    onChange={e => setForm(f => ({ ...f, dagprijs: e.target.value }))} />
                </FormField>
                <FormField label="Weekprijs (€)">
                  <input type="number" className="input" value={form.weekprijs}
                    onFocus={e => { if (e.target.value === '0') setForm(f => ({ ...f, weekprijs: '' })) }}
                    onChange={e => setForm(f => ({ ...f, weekprijs: e.target.value }))} />
                </FormField>
              </FormGrid>
              <FormField label="Notities">
                <textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
              </FormField>
            </div>
            <div className="mt-5 pt-4 border-t border-ink-100 flex justify-end gap-2">
              <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteGaffer(deleteId)} title="Gaffer verwijderen?" danger />
    </AppShell>
  )
}
