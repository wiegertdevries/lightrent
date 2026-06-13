'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { PageHeader, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, EmptyState, ConfirmModal } from '@/components/ui'
import { Plus, Users, Pencil, Trash2 } from 'lucide-react'
import type { Klant } from '@/lib/types'

export default function KlantenPage() {
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klusCount, setKlusCount] = useState<Record<string, number>>({})
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ naam: '', bedrijf: '', email: '', telefoon: '', adres: '', btw_nummer: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: k }, { data: kl }] = await Promise.all([
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('klussen').select('klant_id'),
    ])
    setKlanten(k || [])
    const counts: Record<string, number> = {}
    ;(kl || []).forEach(k => { if (k.klant_id) counts[k.klant_id] = (counts[k.klant_id] || 0) + 1 })
    setKlusCount(counts)
  }

  function openNew() { setEditId(null); setForm({ naam: '', bedrijf: '', email: '', telefoon: '', adres: '', btw_nummer: '' }); setModal(true) }
  function openEdit(k: Klant) { setEditId(k.id); setForm({ naam: k.naam, bedrijf: k.bedrijf || '', email: k.email || '', telefoon: k.telefoon || '', adres: k.adres || '', btw_nummer: k.btw_nummer || '' }); setModal(true) }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const data = { naam: form.naam, bedrijf: form.bedrijf || null, email: form.email || null, telefoon: form.telefoon || null, adres: form.adres || null, btw_nummer: form.btw_nummer || null }
    if (editId) await supabase.from('klanten').update(data).eq('id', editId)
    else await supabase.from('klanten').insert(data)
    await loadAll(); setModal(false); setSaving(false)
  }

  async function deleteKlant(id: string) {
    await supabase.from('klanten').delete().eq('id', id)
    setDeleteId(null); await loadAll()
  }

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader title="Klanten" subtitle={`${klanten.length} klanten`}
          actions={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Klant toevoegen</button>} />

        {klanten.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="Nog geen klanten"
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={15} /> Klant toevoegen</button>} />
        ) : (
          <Table>
            <Thead>
              <Th>Naam</Th><Th>Bedrijf</Th><Th>Email</Th><Th>Telefoon</Th><Th>BTW</Th><Th>Klussen</Th><Th />
            </Thead>
            <Tbody>
              {klanten.map(k => (
                <Tr key={k.id}>
                  <Td className="font-medium">{k.naam}</Td>
                  <Td>{k.bedrijf || '—'}</Td>
                  <Td><a href={`mailto:${k.email}`} className="text-brand-500 hover:underline text-sm">{k.email || '—'}</a></Td>
                  <Td>{k.telefoon || '—'}</Td>
                  <Td><span className="font-mono text-xs text-ink-500">{k.btw_nummer || '—'}</span></Td>
                  <Td><span className="badge badge-blue">{klusCount[k.id] || 0}</span></Td>
                  <Td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(k)}><Pencil size={13} /></button>
                      <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(k.id)}><Trash2 size={13} /></button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? 'Klant bewerken' : 'Klant toevoegen'}
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          </>
        }>
        <div className="space-y-3">
          <FormGrid>
            <FormField label="Naam *"><input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
            <FormField label="Bedrijf"><input className="input" value={form.bedrijf} onChange={e => setForm(f => ({ ...f, bedrijf: e.target.value }))} /></FormField>
            <FormField label="Email"><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Telefoon"><input className="input" value={form.telefoon} onChange={e => setForm(f => ({ ...f, telefoon: e.target.value }))} /></FormField>
          </FormGrid>
          <FormField label="Adres"><input className="input" value={form.adres} onChange={e => setForm(f => ({ ...f, adres: e.target.value }))} /></FormField>
          <FormField label="BTW-nummer"><input className="input" value={form.btw_nummer} onChange={e => setForm(f => ({ ...f, btw_nummer: e.target.value }))} /></FormField>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteKlant(deleteId)}
        title="Klant verwijderen?" description="Klussen blijven bestaan maar verliezen de klantkoppeling." danger />
    </AppShell>
  )
}
