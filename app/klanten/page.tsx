'use client'
import { useEffect, useState, useRef } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit } from '@/lib/supabase'
import { PageHeader, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, EmptyState, ConfirmModal } from '@/components/ui'
import { Plus, Users, Pencil, Trash2, Search, Building2, Loader2 } from 'lucide-react'
import type { Klant } from '@/lib/types'

// Official KVK test API key (free, from developers.kvk.nl)
const KVK_TEST_KEY = 'l7xx1f2691f2520d487b902f4e0b57a0b197'
const KVK_API_BASE = 'https://api.kvk.nl/test/api/v2'

export default function KlantenPage() {
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klusCount, setKlusCount] = useState<Record<string, number>>({})
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [kvkZoek, setKvkZoek] = useState('')
  const [kvkResultaten, setKvkResultaten] = useState<any[]>([])
  const [kvkLoading, setKvkLoading] = useState(false)
  const [kvkFout, setKvkFout] = useState('')
  const kvkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // Debounced KVK suggest search
  async function zoekKvkSuggest(naam: string) {
    if (naam.length < 2) { setKvkResultaten([]); return }
    setKvkLoading(true)
    setKvkFout('')
    try {
      // Use official KVK test API
      const resp = await fetch(
        `${KVK_API_BASE}/zoeken?handelsnaam=${encodeURIComponent(naam)}&resultatenPerPagina=5`,
        { headers: { 'apikey': KVK_TEST_KEY } }
      )
      if (resp.ok) {
        const json = await resp.json()
        setKvkResultaten(json.resultaten || [])
        if ((json.resultaten || []).length === 0) setKvkFout('Geen bedrijven gevonden.')
      } else {
        throw new Error('API fout')
      }
    } catch {
      // Fallback naar openkvk.nl (geen key nodig)
      try {
        const resp2 = await fetch(`https://api.openkvk.nl/json/bedrijf/${encodeURIComponent(naam)}/1/5/`)
        if (resp2.ok) {
          const json2 = await resp2.json()
          const resultaten = (json2.RESULT || []).map((r: any) => ({
            naam: r.HANDELSNAAM,
            kvkNummer: r.KVKNUMMER,
            adres: r.ADRES,
            postcode: r.POSTCODE,
            stad: r.PLAATS,
          }))
          setKvkResultaten(resultaten)
          if (resultaten.length === 0) setKvkFout('Geen bedrijven gevonden via openKVK. Vul handmatig in.')
        } else throw new Error()
      } catch {
        setKvkFout('KVK-lookup niet beschikbaar. Vul handmatig in.')
      }
    }
    setKvkLoading(false)
  }

  function handleKvkInput(val: string) {
    setKvkZoek(val)
    if (kvkTimeout.current) clearTimeout(kvkTimeout.current)
    kvkTimeout.current = setTimeout(() => zoekKvkSuggest(val), 400)
  }

  async function selecteerKvkBedrijf(bedrijf: any) {
    // KVK official API result shape
    const naam = bedrijf.naam || bedrijf.handelsnaam || bedrijf.naam || ''
    const kvknr = bedrijf.kvkNummer || bedrijf.kvkNummer || ''
    const adres = bedrijf.adres || ''
    const postcode = bedrijf.postcode || ''
    const stad = bedrijf.stad || bedrijf.plaats || bedrijf.plaatsnaam || ''

    setForm(f => ({
      ...f,
      bedrijf: naam,
      naam: f.naam || naam,
      adres: adres || f.adres,
      postcode: postcode || f.postcode,
      stad: stad || f.stad,
      kvk_nummer: kvknr || f.kvk_nummer,
    }))
    setKvkResultaten([])
    setKvkZoek(naam)
  }

  function openNew() {
    setEditId(null)
    setForm({ naam: '', bedrijf: '', email: '', telefoon: '', adres: '', btw_nummer: '', kvk_nummer: '', postcode: '', stad: '', website: '', notities: '' })
    setKvkZoek(''); setKvkResultaten([]); setKvkFout('')
    setModal(true)
  }

  function openEdit(k: Klant) {
    setEditId(k.id)
    setForm({ naam: k.naam, bedrijf: k.bedrijf || '', email: k.email || '', telefoon: k.telefoon || '', adres: k.adres || '', btw_nummer: k.btw_nummer || '', kvk_nummer: k.kvk_nummer || '', postcode: k.postcode || '', stad: k.stad || '', website: k.website || '', notities: k.notities || '' })
    setKvkZoek(''); setKvkResultaten([]); setKvkFout('')
    setModal(true)
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
            <Thead><Th>Naam</Th><Th>Bedrijf</Th><Th>Email</Th><Th>Tel</Th><Th>KVK</Th><Th>BTW</Th><Th>Klussen</Th><Th /></Thead>
            <Tbody>
              {filtered.map(k => (
                <Tr key={k.id}>
                  <Td className="font-medium">{k.naam}</Td>
                  <Td>{k.bedrijf ? <div className="flex items-center gap-1.5"><Building2 size={11} className="text-ink-300" />{k.bedrijf}</div> : '—'}</Td>
                  <Td>{k.email ? <a href={`mailto:${k.email}`} className="text-brand-500 hover:underline text-sm">{k.email}</a> : '—'}</Td>
                  <Td>{k.telefoon || '—'}</Td>
                  <Td><span className="font-mono text-xs text-ink-500">{k.kvk_nummer || '—'}</span></Td>
                  <Td><span className="font-mono text-xs text-ink-500">{k.btw_nummer || '—'}</span></Td>
                  <Td><span className="badge badge-blue">{klusCount[k.id] || 0}</span></Td>
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
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <Building2 size={12} /> Snel invullen via KVK — typ de bedrijfsnaam
            </div>
            <div className="relative">
              <input className="input pr-8" value={kvkZoek}
                onChange={e => handleKvkInput(e.target.value)}
                placeholder="Typ bedrijfsnaam… (bijv. Nike, Heineken)" />
              {kvkLoading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 animate-spin" />}
            </div>
            {kvkFout && <div className="text-xs text-amber-600 mt-1.5">{kvkFout}</div>}
            {kvkResultaten.length > 0 && (
              <div className="mt-2 border border-blue-200 rounded-lg overflow-hidden bg-white">
                {kvkResultaten.map((b, i) => (
                  <button key={i} className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-ink-100 last:border-0 transition-colors"
                    onClick={() => selecteerKvkBedrijf(b)}>
                    <div className="font-medium text-ink-800">{b.naam || b.handelsnaam}</div>
                    <div className="text-xs text-ink-400">
                      {b.kvkNummer && `KVK: ${b.kvkNummer}`}
                      {b.postcode && ` · ${b.postcode} ${b.stad || b.plaatsnaam || ''}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <FormGrid>
            <FormField label="Naam contactpersoon *"><input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
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
