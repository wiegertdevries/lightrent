'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit, getCurrentProfiel } from '@/lib/supabase'
import { eur, fmt, calcDoc, dagsBetween } from '@/lib/utils'
import { PageHeader, StatusBadge, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, EmptyState, ConfirmModal } from '@/components/ui'
import { Plus, Eye, Receipt, FileText, Copy, Trash2, CheckCircle, Upload, Download, ExternalLink, Search, Building2 } from 'lucide-react'
import type { Offerte, Klant, Gear, Accessory, Profiel } from '@/lib/types'

export default function OffertesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-400 text-sm">Laden…</div>}>
      <OffertesInner />
    </Suspense>
  )
}

function OffertesInner() {
  const searchParams = useSearchParams()
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [klussen, setKlussen] = useState<any[]>([])
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [modal, setModal] = useState(false)
  const [viewDoc, setViewDoc] = useState<Offerte | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [avFile, setAvFile] = useState<File | null>(null)
  const [avUrl, setAvUrl] = useState('')
  const [uploadingAv, setUploadingAv] = useState(false)
  const [nieuweKlantModal, setNieuweKlantModal] = useState(false)
  const [nieuweKlantForm, setNieuweKlantForm] = useState({ naam: '', bedrijf: '', email: '', telefoon: '' })
  const avRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    klant_id: '', klus_id: '', start_datum: today, eind_datum: today,
    bus_dagprijs: 0, generator_dagprijs: 0, korting_pct: 0,
    geldig_tot: '', notities: '', onderwerp: '', intro_tekst: '', footer_tekst: '',
    algemene_voorwaarden_url: '',
    gear_ids: [] as string[], accessory_ids: [] as string[],
    kortingPerRegel: {} as Record<string, number>
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  // Auto-open new offerte modal if ?nieuw=1&klus=xxx
  useEffect(() => {
    const nieuw = searchParams?.get('nieuw')
    const klusId = searchParams?.get('klus')
    if (nieuw === '1' && klusId) {
      const today = new Date().toISOString().slice(0, 10)
      setForm(f => ({ ...f, klus_id: klusId, start_datum: today, eind_datum: today }))
      setModal(true)
    }
  }, [searchParams])

  async function loadAll() {
    const [{ data: o }, { data: k }, { data: g }, { data: a }, { data: kl }, { data: inst }] = await Promise.all([
      supabase.from('offertes').select('*, klant:klanten(naam, bedrijf, adres, btw_nummer)').order('datum', { ascending: false }),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('klussen').select('id, naam').order('naam'),
      supabase.from('instellingen').select('*'),
    ])
    setOffertes(o || [])
    setKlanten(k || [])
    setGear(g || [])
    setAccessories(a || [])
    setKlussen(kl || [])
    const p = await getCurrentProfiel()
    setProfiel(p)

    // Set default texts from settings
    const instMap: Record<string, string> = {}
    ;(inst || []).forEach((i: any) => { instMap[i.sleutel] = typeof i.waarde === 'string' ? i.waarde.replace(/"/g, '') : String(i.waarde) })
    setForm(f => ({ ...f, intro_tekst: instMap['offerte_intro'] || f.intro_tekst, footer_tekst: instMap['factuur_footer'] || f.footer_tekst }))

    // Get saved AV url
    const { data: avData } = await supabase.from('instellingen').select('waarde').eq('sleutel', 'algemene_voorwaarden_url').single()
    if (avData?.waarde) setAvUrl(String(avData.waarde).replace(/"/g, ''))
  }

  async function uploadAv(file: File) {
    if (!file) return
    setUploadingAv(true)
    const filename = `algemene-voorwaarden-${Date.now()}.pdf`
    const { data, error } = await supabase.storage
      .from('algemene-voorwaarden')
      .upload(filename, file, { contentType: 'application/pdf', upsert: true })
    if (error) {
      alert(`Upload mislukt: ${error.message}. Controleer of de bucket 'algemene-voorwaarden' bestaat in Supabase Storage.`)
      setUploadingAv(false)
      return
    }
    const { data: urlData } = supabase.storage.from('algemene-voorwaarden').getPublicUrl(filename)
    const url = urlData.publicUrl
    setAvUrl(url)
    await supabase.from('instellingen').upsert(
      { sleutel: 'algemene_voorwaarden_url', waarde: JSON.stringify(url) },
      { onConflict: 'sleutel' }
    )
    setForm(f => ({ ...f, algemene_voorwaarden_url: url }))
    setUploadingAv(false)
  }

  async function maakNieuweKlant() {
    if (!nieuweKlantForm.naam) return
    const { data } = await supabase.from('klanten').insert(nieuweKlantForm).select().single()
    if (data) {
      await loadAll()
      setForm(f => ({ ...f, klant_id: data.id }))
    }
    setNieuweKlantModal(false)
    setNieuweKlantForm({ naam: '', bedrijf: '', email: '', telefoon: '' })
  }

  function openNew() {
    setForm({
      klant_id: '', klus_id: '', start_datum: today, eind_datum: today,
      bus_dagprijs: 0, generator_dagprijs: 0, korting_pct: 0,
      geldig_tot: '', notities: '', onderwerp: 'Offerte verhuur lichtapparatuur',
      intro_tekst: 'Graag doen wij u een offerte toekomen voor de huur van onderstaande apparatuur.',
      footer_tekst: 'Bedankt voor uw interesse. Wij hopen u hiermee een passend aanbod te hebben gedaan.',
      algemene_voorwaarden_url: avUrl,
      gear_ids: [], accessory_ids: [], kortingPerRegel: {}
    })
    setModal(true)
  }

  async function dupliceer(o: Offerte) {
    const nr = 'OFF-' + String(offertes.length + 1).padStart(4, '0')
    const { data } = await supabase.from('offertes').insert({
      ...o, id: undefined, nummer: nr, datum: today, status: 'concept',
      geaccepteerd_op: null, geaccepteerd_door: null,
      online_acceptatie_token: undefined
    }).select().single()
    if (data) await logAudit('aangemaakt', 'offertes', data.id, `Offerte ${nr} gedupliceerd van ${o.nummer}`)
    await loadAll()
  }

  async function save() {
    setSaving(true)
    const nr = 'OFF-' + String(offertes.length + 1).padStart(4, '0')
    const calc = calcDoc(form.gear_ids, form.accessory_ids, gear, accessories, form.start_datum, form.eind_datum, form.bus_dagprijs, form.generator_dagprijs, form.korting_pct, form.kortingPerRegel)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: res } = await supabase.from('offertes').insert({
      nummer: nr, klant_id: form.klant_id || null, klus_id: form.klus_id || null,
      start_datum: form.start_datum, eind_datum: form.eind_datum,
      bus_dagprijs: form.bus_dagprijs, generator_dagprijs: form.generator_dagprijs,
      korting_pct: form.korting_pct, geldig_tot: form.geldig_tot || null,
      notities: form.notities, onderwerp: form.onderwerp, intro_tekst: form.intro_tekst,
      footer_tekst: form.footer_tekst, algemene_voorwaarden_url: form.algemene_voorwaarden_url || null,
      totaal_excl: calc.excl, status: 'concept',
      gear_ids: form.gear_ids, accessory_ids: form.accessory_ids,
      aangemaakt_door: user?.id,
      bedrijfsnaam: profiel?.bedrijfsnaam, bedrijfsadres: profiel?.bedrijfsadres,
      bedrijfsbtw: profiel?.btw_nummer, logo_url: profiel?.logo_url,
    }).select('*, klant:klanten(*)').single()
    if (res) {
      await logAudit('aangemaakt', 'offertes', res.id, `Offerte ${nr} aangemaakt`)
      setModal(false)
      setViewDoc(res)
    }
    await loadAll()
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('offertes').update({ status }).eq('id', id)
    await loadAll()
  }

  async function convertToFactuur(o: Offerte) {
    const nr = 'FAC-' + String(Date.now()).slice(-4)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('facturen').insert({
      nummer: nr, klant_id: o.klant_id, offerte_id: o.id, klus_id: o.klus_id,
      start_datum: o.start_datum, eind_datum: o.eind_datum,
      bus_dagprijs: o.bus_dagprijs, generator_dagprijs: o.generator_dagprijs,
      korting_pct: o.korting_pct, totaal_excl: o.totaal_excl, status: 'onbetaald',
      gear_ids: o.gear_ids, accessory_ids: o.accessory_ids,
      onderwerp: o.onderwerp, footer_tekst: o.footer_tekst,
      algemene_voorwaarden_url: o.algemene_voorwaarden_url,
      aangemaakt_door: user?.id,
      bedrijfsnaam: o.bedrijfsnaam, bedrijfsadres: o.bedrijfsadres, bedrijfsbtw: o.bedrijfsbtw,
    }).select().single()
    await supabase.from('offertes').update({ status: 'omgezet' }).eq('id', o.id)
    if (data) await logAudit('aangemaakt', 'facturen', data.id, `Factuur ${nr} aangemaakt van offerte ${o.nummer}`)
    await loadAll()
  }

  async function deleteOfferte(id: string) {
    const o = offertes.find(x => x.id === id)
    await supabase.from('offertes').delete().eq('id', id)
    if (o) await logAudit('verwijderd', 'offertes', id, `Offerte ${o.nummer} verwijderd`)
    setDeleteId(null)
    await loadAll()
  }

  function toggleGear(id: string) {
    setForm(f => ({
      ...f,
      gear_ids: f.gear_ids.includes(id) ? f.gear_ids.filter(x => x !== id) : [...f.gear_ids, id]
    }))
  }
  function toggleAcc(id: string) {
    setForm(f => ({
      ...f,
      accessory_ids: f.accessory_ids.includes(id) ? f.accessory_ids.filter(x => x !== id) : [...f.accessory_ids, id]
    }))
  }

  const calc = form.start_datum && form.eind_datum
    ? calcDoc(form.gear_ids, form.accessory_ids, gear, accessories, form.start_datum, form.eind_datum, form.bus_dagprijs, form.generator_dagprijs, form.korting_pct, form.kortingPerRegel)
    : null

  return (
    <AppShell>
      <div className="p-8 page-enter">
        {/* AV Upload banner */}
        {!avUrl && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm text-amber-700">
            <Upload size={14} />
            <span>Upload je algemene voorwaarden PDF zodat je die automatisch kunt meesturen bij offertes.</span>
            <label className="btn btn-sm ml-auto cursor-pointer">
              <Upload size={12} /> Upload AV
              <input type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAv(f) }} />
            </label>
          </div>
        )}

        <PageHeader title="Offertes" subtitle={`${offertes.length} offertes`}
          actions={
            <div className="flex gap-2">
              {avUrl && (
                <a href={avUrl} target="_blank" className="btn btn-sm text-xs">
                  <FileText size={12} /> Algemene voorwaarden
                </a>
              )}
              <label className="btn btn-sm cursor-pointer text-xs">
                <Upload size={12} /> {uploadingAv ? 'Uploaden…' : 'AV uploaden'}
                <input type="file" accept=".pdf" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAv(f) }} />
              </label>
              <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nieuwe offerte</button>
            </div>
          }
        />

        {offertes.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title="Nog geen offertes"
            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nieuwe offerte</button>} />
        ) : (
          <Table>
            <Thead>
              <Th>Nummer</Th><Th>Onderwerp</Th><Th>Klant</Th><Th>Datum</Th><Th>Periode</Th><Th>Totaal excl.</Th><Th>Status</Th><Th>Door</Th><Th />
            </Thead>
            <Tbody>
              {offertes.map(o => (
                <Tr key={o.id}>
                  <Td className="font-mono font-medium">{o.nummer}</Td>
                  <Td className="max-w-40 truncate">{o.onderwerp || '—'}</Td>
                  <Td>{(o.klant as any)?.naam || '—'}</Td>
                  <Td>{fmt(o.datum, 'd MMM yyyy')}</Td>
                  <Td className="text-xs text-ink-500">{fmt(o.start_datum, 'd MMM')} – {fmt(o.eind_datum, 'd MMM')}</Td>
                  <Td className="font-mono font-medium">{eur(o.totaal_excl)}</Td>
                  <Td>
                    <select className="text-xs border-none bg-transparent cursor-pointer font-medium"
                      value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}>
                      <option value="concept">concept</option>
                      <option value="verzonden">verzonden</option>
                      <option value="geaccepteerd">geaccepteerd</option>
                      <option value="verlopen">verlopen</option>
                      <option value="afgewezen">afgewezen</option>
                      <option value="omgezet">omgezet</option>
                    </select>
                  </Td>
                  <Td className="text-xs text-ink-400">{o.aangemaakt_door_naam || '—'}</Td>
                  <Td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" title="Bekijken" onClick={() => setViewDoc(o)}><Eye size={12} /></button>
                      <button className="btn btn-ghost btn-sm" title="Dupliceren" onClick={() => dupliceer(o)}><Copy size={12} /></button>
                      {o.status !== 'omgezet' && (
                        <button className="btn btn-ghost btn-sm" title="Omzetten naar factuur" onClick={() => convertToFactuur(o)}><Receipt size={12} /></button>
                      )}
                      <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" title="Verwijderen" onClick={() => setDeleteId(o.id)}><Trash2 size={12} /></button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* NIEUWE OFFERTE MODAL */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nieuwe offerte" width="max-w-5xl"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <div className="text-sm text-ink-500 mx-4">
              {calc ? <span>Totaal: <strong>{eur(calc.excl)}</strong> excl. BTW</span> : ''}
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan & bekijken'}</button>
          </>
        }>
        <div className="grid grid-cols-5 gap-5">
          {/* LEFT: form */}
          <div className="col-span-3 space-y-4">
            <FormField label="Onderwerp">
              <input className="input" value={form.onderwerp} onChange={e => setForm(f => ({ ...f, onderwerp: e.target.value }))} />
            </FormField>
            <FormGrid>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Klant</label>
                  <button className="text-[10px] text-brand-500 hover:underline" onClick={() => setNieuweKlantModal(true)}>+ nieuwe klant</button>
                </div>
                <select className="input" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value }))}>
                  <option value="">— geen —</option>
                  {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}{k.bedrijf ? ` (${k.bedrijf})` : ''}</option>)}
                </select>
              </div>
              <FormField label="Klus (optioneel)">
                <select className="input" value={form.klus_id} onChange={e => setForm(f => ({ ...f, klus_id: e.target.value }))}>
                  <option value="">— geen —</option>
                  {klussen.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                </select>
              </FormField>
              <FormField label="Van">
                <input type="date" className="input" value={form.start_datum}
                  onChange={e => setForm(f => ({ ...f, start_datum: e.target.value, eind_datum: f.eind_datum < e.target.value ? e.target.value : f.eind_datum }))} />
              </FormField>
              <FormField label="Tot">
                <input type="date" className="input" min={form.start_datum} value={form.eind_datum}
                  onChange={e => setForm(f => ({ ...f, eind_datum: e.target.value }))} />
              </FormField>
              <FormField label="Bus dagprijs (€)">
                <input type="number" className="input" value={form.bus_dagprijs} onChange={e => setForm(f => ({ ...f, bus_dagprijs: +e.target.value }))} />
              </FormField>
              <FormField label="Generator dagprijs (€)">
                <input type="number" className="input" value={form.generator_dagprijs} onChange={e => setForm(f => ({ ...f, generator_dagprijs: +e.target.value }))} />
              </FormField>
              <FormField label="Totaalkorting (%)">
                <input type="number" className="input" value={form.korting_pct} onChange={e => setForm(f => ({ ...f, korting_pct: +e.target.value }))} />
              </FormField>
              <FormField label="Geldig tot">
                <input type="date" className="input" value={form.geldig_tot} onChange={e => setForm(f => ({ ...f, geldig_tot: e.target.value }))} />
              </FormField>
            </FormGrid>
            <FormField label="Intro tekst">
              <textarea className="input h-14 resize-none text-xs" value={form.intro_tekst} onChange={e => setForm(f => ({ ...f, intro_tekst: e.target.value }))} />
            </FormField>
            <FormField label="Notities / bijzonderheden">
              <textarea className="input h-14 resize-none text-xs" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} />
            </FormField>
            <div className="flex items-center gap-2 text-xs text-ink-500 bg-ink-50 rounded-lg p-2">
              <FileText size={12} />
              {avUrl ? (
                <><span>Algemene voorwaarden meesturen:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={!!form.algemene_voorwaarden_url}
                    onChange={e => setForm(f => ({ ...f, algemene_voorwaarden_url: e.target.checked ? avUrl : '' }))} />
                  <a href={avUrl} target="_blank" className="text-brand-500 hover:underline">Bekijk PDF</a>
                </label></>
              ) : <span className="text-ink-400">Upload eerst je algemene voorwaarden (zie boven)</span>}
            </div>
          </div>

          {/* RIGHT: gear selectie */}
          <div className="col-span-2">
            <div className="section-title">Gear selecteren</div>
            <div className="border border-ink-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              {['HMI', 'Tungsten', 'LED', 'Textile/Frame', 'Overig'].map(cat => {
                const catGear = gear.filter(g => g.categorie === cat)
                if (catGear.length === 0) return null
                return (
                  <div key={cat}>
                    <div className="px-3 py-1.5 bg-ink-50 text-[10px] font-bold uppercase tracking-wider text-ink-400 sticky top-0">{cat}</div>
                    {catGear.map(g => {
                      const added = form.gear_ids.includes(g.id)
                      const gAccs = accessories.filter(a => a.gear_id === g.id)
                      return (
                        <div key={g.id}>
                          <div className={`flex items-center gap-2 px-3 py-2 border-b border-ink-100 cursor-pointer hover:bg-brand-50 ${added ? 'bg-brand-50' : ''}`}
                            onClick={() => toggleGear(g.id)}>
                            <input type="checkbox" readOnly checked={added} className="flex-shrink-0" />
                            <span className="flex-1 text-xs text-ink-700 truncate">{g.naam}</span>
                            <span className="text-xs text-ink-400 font-mono">{eur(g.dagprijs)}</span>
                          </div>
                          {added && gAccs.map(ac => (
                            <div key={ac.id} className="flex items-center gap-2 px-3 py-1.5 bg-ink-50 border-b border-ink-100 cursor-pointer hover:bg-brand-50 pl-8"
                              onClick={() => toggleAcc(ac.id)}>
                              <input type="checkbox" readOnly checked={form.accessory_ids.includes(ac.id)} className="flex-shrink-0" />
                              <span className="flex-1 text-[11px] text-ink-500 truncate">↳ {ac.naam}</span>
                              <span className="text-[11px] text-ink-400 font-mono">{eur(ac.dagprijs)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {calc && (
              <div className="mt-3 bg-ink-50 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between text-ink-500"><span>{dagsBetween(form.start_datum, form.eind_datum)} dagen · {form.gear_ids.length} items</span></div>
                {calc.kortingBedrag > 0 && <div className="flex justify-between text-green-600"><span>Korting ({form.korting_pct}%)</span><span>-{eur(calc.kortingBedrag)}</span></div>}
                <div className="flex justify-between font-semibold text-ink-700 pt-1 border-t border-ink-200 text-sm"><span>Totaal excl. BTW</span><span>{eur(calc.excl)}</span></div>
                <div className="flex justify-between text-ink-400"><span>BTW 21%</span><span>{eur(calc.btw)}</span></div>
                <div className="flex justify-between font-bold text-ink-800 text-sm"><span>Totaal incl. BTW</span><span>{eur(calc.totaal)}</span></div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* VIEW DOCUMENT */}
      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={`Offerte ${viewDoc.nummer}`} width="max-w-3xl"
          footer={
            <>
              <button className="btn" onClick={() => window.print()}>🖨️ Afdrukken / PDF</button>
              {viewDoc.algemene_voorwaarden_url && (
                <a href={viewDoc.algemene_voorwaarden_url} target="_blank" className="btn">
                  <FileText size={13} /> Algemene voorwaarden
                </a>
              )}
              <button className="btn" onClick={() => setViewDoc(null)}>Sluiten</button>
            </>
          }>
          <DocPreview doc={viewDoc} gear={gear} accessories={accessories} profiel={profiel} />
        </Modal>
      )}

      {/* NIEUWE KLANT INLINE */}
      <Modal open={nieuweKlantModal} onClose={() => setNieuweKlantModal(false)} title="Snel klant toevoegen"
        footer={
          <>
            <button className="btn" onClick={() => setNieuweKlantModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={maakNieuweKlant}>Toevoegen</button>
          </>
        }>
        <FormGrid>
          <FormField label="Naam *"><input className="input" value={nieuweKlantForm.naam} onChange={e => setNieuweKlantForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
          <FormField label="Bedrijf"><input className="input" value={nieuweKlantForm.bedrijf} onChange={e => setNieuweKlantForm(f => ({ ...f, bedrijf: e.target.value }))} /></FormField>
          <FormField label="Email"><input type="email" className="input" value={nieuweKlantForm.email} onChange={e => setNieuweKlantForm(f => ({ ...f, email: e.target.value }))} /></FormField>
          <FormField label="Telefoon"><input className="input" value={nieuweKlantForm.telefoon} onChange={e => setNieuweKlantForm(f => ({ ...f, telefoon: e.target.value }))} /></FormField>
        </FormGrid>
        <p className="text-xs text-ink-400 mt-3">Meer gegevens kun je later toevoegen via de Klanten pagina.</p>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteOfferte(deleteId)}
        title="Offerte verwijderen?" danger />
    </AppShell>
  )
}

function DocPreview({ doc, gear, accessories, profiel }: { doc: Offerte; gear: Gear[]; accessories: Accessory[]; profiel: Profiel | null }) {
  const klant = doc.klant as any
  const calc = calcDoc(doc.gear_ids || [], doc.accessory_ids || [], gear, accessories, doc.start_datum || '', doc.eind_datum || '', doc.bus_dagprijs, doc.generator_dagprijs, doc.korting_pct)
  const bedrijfsnaam = doc.bedrijfsnaam || profiel?.bedrijfsnaam || 'LightRent Pro'
  const bedrijfsadres = doc.bedrijfsadres || profiel?.bedrijfsadres || ''
  const bedrijfsbtw = doc.bedrijfsbtw || profiel?.btw_nummer || ''
  const iban = profiel?.iban || ''

  return (
    <div className="text-sm font-sans print:text-[11px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-ink-200">
        <div>
          <div className="font-bold text-xl text-ink-800">{bedrijfsnaam}</div>
          {bedrijfsadres && <div className="text-ink-500 text-xs mt-0.5">{bedrijfsadres}</div>}
          {bedrijfsbtw && <div className="text-ink-400 text-xs">BTW: {bedrijfsbtw}</div>}
          {iban && <div className="text-ink-400 text-xs">IBAN: {iban}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-brand-500">OFFERTE</div>
          <div className="font-semibold text-ink-700">{doc.nummer}</div>
          <div className="text-ink-400 text-xs mt-0.5">Datum: {fmt(doc.datum)}</div>
          {doc.geldig_tot && <div className="text-ink-400 text-xs">Geldig tot: {fmt(doc.geldig_tot)}</div>}
        </div>
      </div>

      {/* Klant */}
      {klant && (
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">Aan</div>
          <div className="font-semibold">{klant.naam}</div>
          {klant.bedrijf && <div className="text-ink-500">{klant.bedrijf}</div>}
          {klant.adres && <div className="text-ink-500 text-xs">{klant.adres}</div>}
          {klant.btw_nummer && <div className="text-ink-400 text-xs">BTW: {klant.btw_nummer}</div>}
        </div>
      )}

      {/* Onderwerp en intro */}
      {doc.onderwerp && <div className="font-semibold text-ink-700 mb-2">{doc.onderwerp}</div>}
      {doc.intro_tekst && <div className="text-ink-500 text-xs mb-4">{doc.intro_tekst}</div>}

      <div className="text-xs text-ink-400 mb-3">Verhuurperiode: {fmt(doc.start_datum)} – {fmt(doc.eind_datum || doc.start_datum)} ({calc.dagen} dag{calc.dagen !== 1 ? 'en' : ''})</div>

      {/* Regeloverzicht */}
      <table className="w-full text-xs mb-4 border-collapse">
        <thead>
          <tr className="border-b-2 border-ink-200">
            <th className="text-left py-2 font-semibold text-ink-600">Omschrijving</th>
            <th className="text-right py-2 font-semibold text-ink-600">Dagprijs</th>
            <th className="text-right py-2 font-semibold text-ink-600">Dagen</th>
            <th className="text-right py-2 font-semibold text-ink-600">Subtotaal</th>
          </tr>
        </thead>
        <tbody>
          {calc.regels.map((r, i) => (
            <tr key={i} className="border-b border-ink-100">
              <td className={`py-1.5 ${r.isAcc ? 'pl-4 text-ink-400 italic' : 'font-medium'}`}>{r.naam}</td>
              <td className="text-right py-1.5 font-mono">{eur(r.dp)}</td>
              <td className="text-right py-1.5">{r.dagen}</td>
              <td className="text-right py-1.5 font-mono">{eur(r.sub)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-ink-200">
          {calc.kortingPct > 0 && (
            <tr>
              <td colSpan={3} className="text-right py-1.5 text-ink-500">Korting ({calc.kortingPct}%)</td>
              <td className="text-right py-1.5 font-mono text-green-600">−{eur(calc.kortingBedrag)}</td>
            </tr>
          )}
          <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">Subtotaal excl. BTW</td><td className="text-right py-1.5 font-mono">{eur(calc.excl)}</td></tr>
          <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">BTW 21%</td><td className="text-right py-1.5 font-mono">{eur(calc.btw)}</td></tr>
          <tr className="border-t-2 border-ink-800">
            <td colSpan={3} className="text-right py-2 font-bold text-base">Totaal incl. BTW</td>
            <td className="text-right py-2 font-bold text-base font-mono">{eur(calc.totaal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      {doc.notities && <div className="mb-3 p-3 bg-ink-50 rounded-lg text-xs text-ink-500">{doc.notities}</div>}
      {doc.footer_tekst && <div className="text-xs text-ink-400 italic mb-3">{doc.footer_tekst}</div>}
      {doc.algemene_voorwaarden_url && (
        <div className="text-xs text-ink-400 border-t border-ink-100 pt-3">
          Op al onze offertes en overeenkomsten zijn onze algemene voorwaarden van toepassing.
          <a href={doc.algemene_voorwaarden_url} target="_blank" className="text-brand-500 hover:underline ml-1">
            Download algemene voorwaarden <ExternalLink size={10} className="inline" />
          </a>
        </div>
      )}
    </div>
  )
}
