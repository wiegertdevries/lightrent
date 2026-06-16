'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { PageHeader, Table, Thead, Th, Tbody, Tr, Td, EmptyState, ConfirmModal, FormField, FormGrid } from '@/components/ui'
import { Plus, UserCheck, Pencil, Trash2, Mail, Phone, Send } from 'lucide-react'

interface Gaffer {
  id: string
  naam: string
  email?: string
  telefoon?: string
  bedrijf?: string
  notities?: string
}

export default function GaffersPage() {
  const [gaffers, setGaffers] = useState<Gaffer[]>([])
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ naam: '', email: '', telefoon: '', bedrijf: '', notities: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data, error } = await supabase.from('gaffers').select('*').order('naam')
    if (!error) setGaffers(data || [])
  }

  function openNew() {
    setEditId(null)
    setError('')
    setForm({ naam: '', email: '', telefoon: '', bedrijf: '', notities: '' })
    setModal(true)
  }

  function openEdit(g: Gaffer) {
    setEditId(g.id)
    setError('')
    setForm({ naam: g.naam, email: g.email || '', telefoon: g.telefoon || '', bedrijf: g.bedrijf || '', notities: g.notities || '' })
    setModal(true)
  }

  async function save() {
    if (!form.naam.trim()) { setError('Naam is verplicht'); return }
    setSaving(true)
    setError('')
    const data = {
      naam: form.naam.trim(),
      email: form.email.trim() || null,
      telefoon: form.telefoon.trim() || null,
      bedrijf: form.bedrijf.trim() || null,
      notities: form.notities.trim() || null
    }
    let err
    if (editId) {
      const res = await supabase.from('gaffers').update(data).eq('id', editId)
      err = res.error
    } else {
      const res = await supabase.from('gaffers').insert([data])
      err = res.error
    }
    if (err) {
      setError(`Fout: ${err.message}`)
      setSaving(false)
      return
    }
    await loadAll()
    setModal(false)
    setSaving(false)
  }

  async function deleteGaffer(id: string) {
    await supabase.from('gaffers').delete().eq('id', id)
    setDeleteId(null)
    await loadAll()
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 page-enter">
        <PageHeader title="Gaffers" subtitle={`${gaffers.length} gaffers in database`}
          actions={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Gaffer toevoegen</button>} />

        {gaffers.length === 0 ? (
          <EmptyState icon={<UserCheck size={40} />} title="Nog geen gaffers"
            description="Voeg gaffers toe om ze te koppelen aan klussen."
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Gaffer toevoegen</button>} />
        ) : (
          <Table>
            <Thead>
              <Th>Naam</Th><Th>Bedrijf</Th><Th>Email</Th><Th>Telefoon</Th><Th>Notities</Th><Th />
            </Thead>
            <Tbody>
              {gaffers.map(g => (
                <Tr key={g.id} onClick={() => openEdit(g)} className="cursor-pointer">
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs flex-shrink-0">
                        {g.naam.charAt(0)}
                      </div>
                      <span className="font-medium">{g.naam}</span>
                    </div>
                  </Td>
                  <Td>{g.bedrijf || '—'}</Td>
                  <Td>
                    {g.email
                      ? <a href={`mailto:${g.email}`} onClick={e => e.stopPropagation()} className="text-brand-500 hover:underline flex items-center gap-1 text-sm"><Mail size={12} /> {g.email}</a>
                      : '—'}
                  </Td>
                  <Td>
                    {g.telefoon
                      ? <a href={`tel:${g.telefoon}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-sm text-ink-600"><Phone size={12} /> {g.telefoon}</a>
                      : '—'}
                  </Td>
                  <Td className="text-xs text-ink-400 max-w-xs truncate">{g.notities || '—'}</Td>
                  <Td>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      {g.email && (
                        <a href={`mailto:${g.email}?subject=Lichtlijst`} className="btn btn-ghost btn-sm" title="Lichtlijst sturen">
                          <Send size={12} />
                        </a>
                      )}
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

      {/* Modal - no outside click dismiss */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.stopPropagation()}>
          <div className="modal-box w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editId ? 'Gaffer bewerken' : 'Gaffer toevoegen'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
            )}

            <div className="space-y-3">
              <FormGrid>
                <FormField label="Naam *">
                  <input className="input" value={form.naam} autoFocus
                    onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && save()} />
                </FormField>
                <FormField label="Bedrijf">
                  <input className="input" value={form.bedrijf}
                    onChange={e => setForm(f => ({ ...f, bedrijf: e.target.value }))} />
                </FormField>
                <FormField label="Email">
                  <input type="email" className="input" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </FormField>
                <FormField label="Telefoon">
                  <input className="input" value={form.telefoon}
                    onChange={e => setForm(f => ({ ...f, telefoon: e.target.value }))} />
                </FormField>
              </FormGrid>
              <FormField label="Notities">
                <textarea className="input h-14 resize-none" value={form.notities}
                  onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
              </FormField>
            </div>

            <div className="mt-5 pt-4 border-t border-ink-100 flex justify-end gap-2">
              <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteGaffer(deleteId)}
        title="Gaffer verwijderen?" danger />
    </AppShell>
  )
}
