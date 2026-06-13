'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { PageHeader, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, EmptyState, ConfirmModal } from '@/components/ui'
import { Plus, Users, Pencil, Trash2, Search, Building2, ExternalLink } from 'lucide-react'
import type { Klant } from '@/lib/types'

export default function KlantenPage() {
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klusCount, setKlusCount] = useState<Record<string, number>>({})
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kvkZoek, setKvkZoek] = useState('')
  const [kvkLoading, setKvkLoading] = useState(false)
  const [kvkFout, setKvkFout] = useState('')
  const [form, setForm] = useState({
    naam: '', bedrijf: '', email: '', telefoon: '', adres: '',
    btw_nummer: '', kvk_nummer: '', postcode: '', stad: '', website: '', notities: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: k }, { data: kl }] = await Promise.all([
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('klussen').select('klant_id'),
    ])
    setKlanten(k || [])
    const counts: Record<string, number> = {}
    ;(kl || []).forEach((k: any) => { if (k.klant_id) counts[k.klant_id] = (counts[k.klant_id] || 0) + 1 })
    setKlusCount(counts)
  }

  function openNew() {
    setEditId(null)
    setForm({ naam: '', bedrijf: '', email: '', telefoon: '', adres: '', btw_nummer: '', kvk_nummer: '', postcode: '', stad: '', website: '', notities: '' })
    setKvkZoek('')
    setKvkFout('')
    setModal(true)
  }

  function openEdit(k: Klant) {
    setEditId(k.id)
    setForm({
      naam: k.naam, bedrijf: k.bedrijf || '', email: k.email || '',
      telefoon: k.telefoon || '', adres: k.adres || '', btw_nummer: k.btw_nummer || '',
      kvk_nummer: k.kvk_nummer || '', postcode: k.postcode || '', stad: k.stad || '',
      website: k.website || '', notities: k.notities || ''
    })
    setKvkZoek('')
    setKvkFout('')
    setModal(true)
  }

  // KVK lookup via Netherlands Chamber of Commerce open API
  async function zoekKvk() {
    if (!kvkZoek.trim()) return
    setKvkLoading(true)
    setKvkFout('')
    try {
      // Use the open RSIN/KVK search via overheid.io (free, no key needed for basic use)
      const resp = await fetch(`https://zoeken.overheid.nl/api/v1/odata/Kvk?%24filter=contains(Naam,'${encodeURIComponent(kvkZoek)}')&%24top=5`)
      if (resp.ok) {
        const json = await resp.json()
        if (json.value && json.value.length > 0) {
          const eerste = json.value[0]
          setForm(f => ({
            ...f,
            bedrijf: eerste.Naam || f.bedrijf,
            naam: f.naam || eerste.Naam || '',
            adres: eerste.Straatnaam ? `${eerste.Straatnaam} ${eerste.Huisnummer || ''}`.trim() : f.adres,
            postcode: eerste.Postcode || f.postcode,
            stad: eerste.Vestigingsplaats || f.stad,
            kvk_nummer: eerste.KvkNummer || f.kvk_nummer,
          }))
        } else {
          setKvkFout('Geen bedrijf gevonden. Vul de gegevens handmatig in.')
        }
      } else {
        throw new Error('API niet beschikbaar')
      }
    } catch {
      // Fallback: just fill the name
      setForm(f => ({ ...f, bedrijf: kvkZoek, naam: f.naam || kvkZoek }))
      setKvkFout('KVK-lookup niet beschikbaar. Vul gegevens handmatig in.')
    }
    setKvkLoading(false)
  }

  async function save() {
    if (!form.naam) return
    setSaving(true)
    const data = {
      naam: form.naam, bedrijf: form.bedrijf || null, email: form.email || null,
      telefoon: form.telefoon || null, adres: form.adres || null, btw_nummer: form.btw_nummer || null,
      kvk_nummer: form.kvk_nummer || null, postcode: form.postcode || null, stad: form.stad || null,
      website: form.website || null, notities: form.notities || null
    }
    if (editId) {
      await supabase.from('klanten').update(data).eq('id', editId)
      await logAudit('gewijzigd', 'klanten', editId, `${form.naam} bijgewerkt`)
    } else {
      const { data: res } = await supabase.from('klanten').insert(data).select().single()
      if (res) await logAudit('aangemaakt', 'klanten', res.id, `${form.naam} toegevoegd`)
    }
    await loadAll(); setModal(false); setSaving(false)
  }

  async function deleteKlant(id: string) {
    const k = klanten.find(x => x.id === id)
    await supabase.from('klanten').delete().eq('id', id)
    if (k) await logAudit('verwijderd', 'klanten', id, `${k.naam} verwijderd`)
    setDeleteId(null); await loadAll()
  }

  const filtered = klanten.filter(k =>
    !search || k.naam.toLowerCase().includes(search.toLowerCase()) ||
    k.bedrijf?.toLowerCase().includes(search.toLowerCase()) ||
    k.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader title="Klanten" subtitle={`${klanten.length} klanten`}
          actions={
            <div className="flex gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                <input className="input pl-8 text-sm" style={{ width: 200 }} placeholder="Zoeken…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Klant toevoegen</button>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title={search ? 'Geen klanten gevonden' : 'Nog geen klanten'}
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Klant toevoegen</button>} />
        ) : (
          <Table>
            <Thead>
              <Th>Naam</Th><Th>Bedrijf</Th><Th>Email</Th><Th>Tel</Th><Th>KVK</Th><Th>BTW</Th><Th>Klussen</Th><Th />
            </Thead>
            <Tbody>
              {filtered.map(k => (
                <Tr key={k.id}>
                  <Td className="font-medium">{k.naam}</Td>
                  <Td>
                    {k.bedrijf ? (
                      <div className="flex items-center gap-1.5">
                        <Building2 size={11} className="text-ink-300" />
                        <span>{k.bedrijf}</span>
                      </div>
                    ) : '—'}
                  </Td>
                  <Td>
                    {k.email ? <a href={`mailto:${k.email}`} className="text-brand-500 hover:underline text-sm">{k.email}</a> : '—'}
                  </Td>
                  <Td>{k.telefoon || '—'}</Td>
                  <Td><span className="font-mono text-xs text-ink-500">{k.kvk_nummer || '—'}</span></Td>
                  <Td><span className="font-mono text-xs text-ink-500">{k.btw_nummer || '—'}</span></Td>
                  <Td>
                    <span className="badge badge-blue">{klusCount[k.id] || 0}</span>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(k)}><Pencil size={12} /></button>
                      <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(k.id)}><Trash2 size={12} /></button>
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
        width="max-w-2xl"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          </>
        }>
        <div className="space-y-4">
          {/* KVK zoeken */}
          {!editId && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1.5">
                <Building2 size={12} /> Snel invullen via bedrijfsnaam
              </div>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" value={kvkZoek}
                  onChange={e => setKvkZoek(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && zoekKvk()}
                  placeholder="Typ bedrijfsnaam en druk Enter…" />
                <button className="btn btn-sm" onClick={zoekKvk} disabled={kvkLoading}>
                  {kvkLoading ? 'Zoeken…' : 'Zoeken'}
                </button>
              </div>
              {kvkFout && <div className="text-xs text-amber-600 mt-1.5">{kvkFout}</div>}
            </div>
          )}

          <FormGrid>
            <FormField label="Naam *"><input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} placeholder="Contactpersoon" /></FormField>
            <FormField label="Bedrijfsnaam"><input className="input" value={form.bedrijf} onChange={e => setForm(f => ({ ...f, bedrijf: e.target.value }))} /></FormField>
            <FormField label="Email"><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Telefoon"><input className="input" value={form.telefoon} onChange={e => setForm(f => ({ ...f, telefoon: e.target.value }))} /></FormField>
          </FormGrid>
          <FormField label="Adres"><input className="input" value={form.adres} onChange={e => setForm(f => ({ ...f, adres: e.target.value }))} /></FormField>
          <FormGrid>
            <FormField label="Postcode"><input className="input" value={form.postcode} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} /></FormField>
            <FormField label="Stad"><input className="input" value={form.stad} onChange={e => setForm(f => ({ ...f, stad: e.target.value }))} /></FormField>
            <FormField label="KVK-nummer"><input className="input" value={form.kvk_nummer} onChange={e => setForm(f => ({ ...f, kvk_nummer: e.target.value }))} placeholder="12345678" /></FormField>
            <FormField label="BTW-nummer"><input className="input" value={form.btw_nummer} onChange={e => setForm(f => ({ ...f, btw_nummer: e.target.value }))} placeholder="NL123456789B01" /></FormField>
            <FormField label="Website"><input className="input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="www.bedrijf.nl" /></FormField>
          </FormGrid>
          <FormField label="Interne notities"><textarea className="input h-14 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} /></FormField>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteKlant(deleteId)}
        title="Klant verwijderen?" description="Klussen blijven bestaan maar verliezen de klantkoppeling." danger />
    </AppShell>
  )
}
