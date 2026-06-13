'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase, logAudit, getCurrentProfiel } from '@/lib/supabase'
import { eur, fmt, calcDoc, dagsBetween } from '@/lib/utils'
import { PageHeader, StatusBadge, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, EmptyState, ConfirmModal } from '@/components/ui'
import { Plus, Eye, Check, Receipt, Trash2, Copy, Bell, AlertCircle, FileText, ExternalLink, UserPlus } from 'lucide-react'
import type { Factuur, Klant, Gear, Accessory, Profiel } from '@/lib/types'

export default function FacturenPage() {
  const searchParams = useSearchParams()
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [klussen, setKlussen] = useState<any[]>([])
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [modal, setModal] = useState(false)
  const [viewDoc, setViewDoc] = useState<Factuur | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [nieuweKlantModal, setNieuweKlantModal] = useState(false)
  const [nieuweKlantForm, setNieuweKlantForm] = useState({ naam: '', bedrijf: '', email: '', telefoon: '' })
  const [filterStatus, setFilterStatus] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    klant_id: '', klus_id: '', start_datum: today, eind_datum: today,
    bus_dagprijs: 0, generator_dagprijs: 0, korting_pct: 0,
    vervaldatum: '', notities: '', onderwerp: '', intro_tekst: '', footer_tekst: '',
    algemene_voorwaarden_url: '', referentie: '',
    gear_ids: [] as string[], accessory_ids: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  // Auto-open from ?nieuw=1&klus=xxx (coming from klus detail page)
  useEffect(() => {
    const nieuw = searchParams?.get('nieuw')
    const klusId = searchParams?.get('klus')
    if (nieuw === '1' && klusId) {
      setForm(f => ({ ...f, klus_id: klusId }))
      setModal(true)
    }
  }, [searchParams])

  async function loadAll() {
    const [{ data: f }, { data: k }, { data: g }, { data: a }, { data: kl }] = await Promise.all([
      supabase.from('facturen').select('*, klant:klanten(naam, bedrijf, adres, btw_nummer)').order('datum', { ascending: false }),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('gear').select('*').order('categorie').order('naam'),
      supabase.from('accessories').select('*'),
      supabase.from('klussen').select('id, naam').order('naam'),
    ])
    setFacturen(f || [])
    setKlanten(k || [])
    setGear(g || [])
    setAccessories(a || [])
    setKlussen(kl || [])
    const p = await getCurrentProfiel()
    setProfiel(p)
    const { data: avData } = await supabase.from('instellingen').select('waarde').eq('sleutel', 'algemene_voorwaarden_url').single()
    if (avData?.waarde) setForm(fv => ({ ...fv, algemene_voorwaarden_url: String(avData.waarde).replace(/"/g, '') }))
  }

  async function save() {
    setSaving(true)
    const nr = 'FAC-' + String(facturen.length + 1).padStart(4, '0')
    const calc = calcDoc(form.gear_ids, form.accessory_ids, gear, accessories, form.start_datum, form.eind_datum, form.bus_dagprijs, form.generator_dagprijs, form.korting_pct)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: res } = await supabase.from('facturen').insert({
      nummer: nr, klant_id: form.klant_id || null, klus_id: form.klus_id || null,
      start_datum: form.start_datum, eind_atum: form.eind_datum,
      bus_dagprijs: form.bus_dagprijs, generator_dagprijs: form.generator_dagprijs,
      korting_pct: form.korting_pct, vervaldatum: form.vervaldatum || null,
      notities: form.notities, onderwerp: form.onderwerp || 'Factuur verhuur lichtapparatuur',
      footer_tekst: form.footer_tekst, algemene_voorwaarden_url: form.algemene_voorwaarden_url || null,
      referentie: form.referentie || null,
      totaal_excl: calc.excl, status: 'onbetaald',
      gear_ids: form.gear_ids, accessory_ids: form.accessory_ids,
      aangemaakt_door: user?.id,
      bedrijfsnaam: profiel?.bedrijfsnaam, bedrijfsadres: profiel?.bedrijfsadres, bedrijfsbtw: profiel?.btw_nummer,
    }).select('*, klant:klanten(*)').single()
    if (res) {
      await logAudit('aangemaakt', 'facturen', res.id, `Factuur ${nr} aangemaakt`)
      setModal(false)
      setViewDoc(res)
    }
    await loadAll()
    setSaving(false)
  }

  async function markBetaald(id: string) {
    await supabase.from('facturen').update({ status: 'betaald', betaald_op: today }).eq('id', id)
    await logAudit('gewijzigd', 'facturen', id, 'Factuur gemarkeerd als betaald')
    await loadAll()
  }

  async function markOnbetaald(id: string) {
    await supabase.from('facturen').update({ status: 'onbetaald', betaald_op: null }).eq('id', id)
    await loadAll()
  }

  async function deleteFac(id: string) {
    const f = facturen.find(x => x.id === id)
    await supabase.from('facturen').delete().eq('id', id)
    if (f) await logAudit('verwijderd', 'facturen', id, `Factuur ${f.nummer} verwijderd`)
    setDeleteId(null); await loadAll()
  }

  async function maakNieuweKlant() {
    if (!nieuweKlantForm.naam) return
    const { data } = await supabase.from('klanten').insert(nieuweKlantForm).select().single()
    if (data) { await loadAll(); setForm(f => ({ ...f, klant_id: data.id })) }
    setNieuweKlantModal(false)
    setNieuweKlantForm({ naam: '', bedrijf: '', email: '', telefoon: '' })
  }

  function toggleGear(id: string) { setForm(f => ({ ...f, gear_ids: f.gear_ids.includes(id) ? f.gear_ids.filter(x => x !== id) : [...f.gear_ids, id] })) }
  function toggleAcc(id: string) { setForm(f => ({ ...f, accessory_ids: f.accessory_ids.includes(id) ? f.accessory_ids.filter(x => x !== id) : [...f.accessory_ids, id] })) }

  const totaalOpen = facturen.filter(f => f.status === 'onbetaald').reduce((s, f) => s + f.totaal_excl, 0)
  const totaalBetaald = facturen.filter(f => f.status === 'betaald').reduce((s, f) => s + f.totaal_excl, 0)
  const verlopen = facturen.filter(f => f.status === 'onbetaald' && f.vervaldatum && f.vervaldatum < today)

  const filtered = filterStatus ? facturen.filter(f => f.status === filterStatus) : facturen
  const calc = form.start_datum && form.eind_datum
    ? calcDoc(form.gear_ids, form.accessory_ids, gear, accessories, form.start_datum, form.eind_datum, form.bus_dagprijs, form.generator_dagprijs, form.korting_pct)
    : null

  return (
    <AppShell>
      <div className="p-8 page-enter">
        {verlopen.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
            <AlertCircle size={15} />
            <span><strong>{verlopen.length} factuur{verlopen.length > 1 ? 'en' : ''}</strong> zijn verlopen zonder betaling — {eur(verlopen.reduce((s, f) => s + f.totaal_excl, 0))} openstaand</span>
          </div>
        )}

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink-800">Facturen</h1>
            <div className="flex gap-4 mt-1 text-sm text-ink-400">
              <span>Open: <strong className="text-amber-600">{eur(totaalOpen)}</strong></span>
              <span>Betaald: <strong className="text-green-600">{eur(totaalBetaald)}</strong></span>
            </div>
          </div>
          <div className="flex gap-2">
            <select className="input text-sm py-1.5" style={{ width: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Alle</option>
              <option value="onbetaald">Onbetaald</option>
              <option value="betaald">Betaald</option>
            </select>
            <button className="btn btn-primary" onClick={() => { setForm(f => ({ ...f, start_datum: today, eind_datum: today, gear_ids: [], accessory_ids: [] })); setModal(true) }}>
              <Plus size={14} /> Nieuwe factuur
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={<Receipt size={40} />} title="Nog geen facturen" />
        ) : (
          <Table>
            <Thead>
              <Th>Nummer</Th><Th>Klant</Th><Th>Datum</Th><Th>Vervalt</Th><Th>Referentie</Th><Th>Totaal excl.</Th><Th>Door</Th><Th>Status</Th><Th />
            </Thead>
            <Tbody>
              {filtered.map(f => {
                const verlopen = f.status === 'onbetaald' && f.vervaldatum && f.vervaldatum < today
                return (
                  <Tr key={f.id}>
                    <Td className="font-mono font-medium">{f.nummer}</Td>
                    <Td>{(f.klant as any)?.naam || '—'}</Td>
                    <Td>{fmt(f.datum, 'd MMM yyyy')}</Td>
                    <Td>
                      {f.vervaldatum
                        ? <span className={verlopen ? 'text-red-500 font-medium text-sm' : 'text-sm'}>{fmt(f.vervaldatum, 'd MMM yyyy')}</span>
                        : '—'}
                    </Td>
                    <Td className="text-xs text-ink-400">{f.referentie || '—'}</Td>
                    <Td className="font-mono font-semibold">{eur(f.totaal_excl)}</Td>
                    <Td className="text-xs text-ink-400">{f.aangemaakt_door_naam || '—'}</Td>
                    <Td><StatusBadge status={f.status} /></Td>
                    <Td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => setViewDoc(f)}><Eye size={12} /></button>
                        {f.status === 'onbetaald'
                          ? <button className="btn btn-ghost btn-sm text-green-600 hover:bg-green-50" title="Markeer betaald" onClick={() => markBetaald(f.id)}><Check size={12} /></button>
                          : <button className="btn btn-ghost btn-sm text-ink-400" title="Markeer onbetaald" onClick={() => markOnbetaald(f.id)}><Receipt size={12} /></button>
                        }
                        <button className="btn btn-ghost btn-sm text-red-400 hover:bg-red-50" onClick={() => setDeleteId(f.id)}><Trash2 size={12} /></button>
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nieuwe factuur" width="max-w-5xl"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            {calc && <div className="text-sm text-ink-500 mx-4">Totaal: <strong>{eur(calc.excl)}</strong> excl. BTW</div>}
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan & bekijken'}</button>
          </>
        }>
        <div className="grid grid-cols-5 gap-5">
          <div className="col-span-3 space-y-4">
            <FormField label="Onderwerp">
              <input className="input" value={form.onderwerp} onChange={e => setForm(f => ({ ...f, onderwerp: e.target.value }))} placeholder="Factuur verhuur lichtapparatuur" />
            </FormField>
            <FormGrid>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Klant</label>
                  <button className="text-[10px] text-brand-500 hover:underline flex items-center gap-0.5" onClick={() => setNieuweKlantModal(true)}><UserPlus size={10} /> nieuwe klant</button>
                </div>
                <select className="input" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value }))}>
                  <option value="">— geen —</option>
                  {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}{k.bedrijf ? ` (${k.bedrijf})` : ''}</option>)}
                </select>
              </div>
              <FormField label="Klus">
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
              <FormField label="Korting (%)">
                <input type="number" className="input" value={form.korting_pct} onChange={e => setForm(f => ({ ...f, korting_pct: +e.target.value }))} />
              </FormField>
              <FormField label="Vervaldatum">
                <input type="date" className="input" min={today} value={form.vervaldatum}
                  onChange={e => setForm(f => ({ ...f, vervaldatum: e.target.value }))} />
              </FormField>
              <FormField label="Referentie / PO">
                <input className="input" value={form.referentie} onChange={e => setForm(f => ({ ...f, referentie: e.target.value }))} />
              </FormField>
            </FormGrid>
            <FormField label="Notities"><textarea className="input h-14 resize-none text-xs" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} /></FormField>
          </div>
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
                          <div className={`flex items-center gap-2 px-3 py-2 border-b border-ink-100 cursor-pointer hover:bg-brand-50 ${added ? 'bg-brand-50' : ''}`} onClick={() => toggleGear(g.id)}>
                            <input type="checkbox" readOnly checked={added} className="flex-shrink-0" />
                            <span className="flex-1 text-xs text-ink-700 truncate">{g.naam}</span>
                            <span className="text-xs text-ink-400 font-mono">{eur(g.dagprijs)}</span>
                          </div>
                          {added && gAccs.map(ac => (
                            <div key={ac.id} className="flex items-center gap-2 px-3 py-1.5 bg-ink-50 border-b border-ink-100 cursor-pointer hover:bg-brand-50 pl-8" onClick={() => toggleAcc(ac.id)}>
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
                {calc.kortingBedrag > 0 && <div className="flex justify-between text-green-600"><span>Korting</span><span>-{eur(calc.kortingBedrag)}</span></div>}
                <div className="flex justify-between font-semibold text-ink-700 text-sm"><span>Excl. BTW</span><span>{eur(calc.excl)}</span></div>
                <div className="flex justify-between text-ink-400"><span>BTW 21%</span><span>{eur(calc.btw)}</span></div>
                <div className="flex justify-between font-bold text-ink-800 text-sm pt-1 border-t border-ink-200"><span>Incl. BTW</span><span>{eur(calc.totaal)}</span></div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={`Factuur ${viewDoc.nummer}`} width="max-w-3xl"
          footer={
            <>
              <button className="btn" onClick={() => window.print()}>🖨️ Afdrukken / PDF</button>
              {viewDoc.algemene_voorwaarden_url && <a href={viewDoc.algemene_voorwaarden_url} target="_blank" className="btn"><FileText size={13} /> AV</a>}
              {viewDoc.status === 'onbetaald' && <button className="btn btn-success" onClick={() => { markBetaald(viewDoc.id); setViewDoc(null) }}><Check size={13} /> Betaald</button>}
              <button className="btn" onClick={() => setViewDoc(null)}>Sluiten</button>
            </>
          }>
          <FacDocPreview doc={viewDoc} gear={gear} accessories={accessories} profiel={profiel} />
        </Modal>
      )}

      <Modal open={nieuweKlantModal} onClose={() => setNieuweKlantModal(false)} title="Nieuwe klant toevoegen"
        footer={<><button className="btn" onClick={() => setNieuweKlantModal(false)}>Annuleren</button><button className="btn btn-primary" onClick={maakNieuweKlant}>Toevoegen</button></>}>
        <FormGrid>
          <FormField label="Naam *"><input className="input" value={nieuweKlantForm.naam} onChange={e => setNieuweKlantForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
          <FormField label="Bedrijf"><input className="input" value={nieuweKlantForm.bedrijf} onChange={e => setNieuweKlantForm(f => ({ ...f, bedrijf: e.target.value }))} /></FormField>
          <FormField label="Email"><input type="email" className="input" value={nieuweKlantForm.email} onChange={e => setNieuweKlantForm(f => ({ ...f, email: e.target.value }))} /></FormField>
          <FormField label="Telefoon"><input className="input" value={nieuweKlantForm.telefoon} onChange={e => setNieuweKlantForm(f => ({ ...f, telefoon: e.target.value }))} /></FormField>
        </FormGrid>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteId && deleteFac(deleteId)} title="Factuur verwijderen?" danger />
    </AppShell>
  )
}

function FacDocPreview({ doc, gear, accessories, profiel }: { doc: Factuur; gear: Gear[]; accessories: Accessory[]; profiel: Profiel | null }) {
  const klant = doc.klant as any
  const calc = calcDoc(doc.gear_ids || [], doc.accessory_ids || [], gear, accessories, doc.start_datum || '', doc.eind_datum || '', doc.bus_dagprijs, doc.generator_dagprijs, doc.korting_pct)
  const bedrijfsnaam = doc.bedrijfsnaam || profiel?.bedrijfsnaam || 'LightRent Pro'
  const bedrijfsadres = doc.bedrijfsadres || profiel?.bedrijfsadres || ''
  const bedrijfsbtw = doc.bedrijfsbtw || profiel?.btw_nummer || ''
  const iban = profiel?.iban || ''
  const today = new Date().toISOString().slice(0, 10)
  const verlopen = doc.status === 'onbetaald' && doc.vervaldatum && doc.vervaldatum < today

  return (
    <div className="text-sm">
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-ink-200">
        <div>
          <div className="font-bold text-xl text-ink-800">{bedrijfsnaam}</div>
          {bedrijfsadres && <div className="text-ink-500 text-xs mt-0.5">{bedrijfsadres}</div>}
          {bedrijfsbtw && <div className="text-ink-400 text-xs">BTW: {bedrijfsbtw}</div>}
          {iban && <div className="text-ink-400 text-xs">IBAN: {iban}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-ink-800">FACTUUR</div>
          <div className="font-semibold text-ink-700">{doc.nummer}</div>
          <div className="text-ink-400 text-xs mt-0.5">Datum: {fmt(doc.datum)}</div>
          {doc.vervaldatum && (
            <div className={`text-xs font-medium mt-0.5 ${verlopen ? 'text-red-500' : 'text-ink-400'}`}>
              Betalen voor: {fmt(doc.vervaldatum)}
            </div>
          )}
          {doc.referentie && <div className="text-ink-400 text-xs">Ref: {doc.referentie}</div>}
        </div>
      </div>

      {klant && (
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">Aan</div>
          <div className="font-semibold">{klant.naam}</div>
          {klant.bedrijf && <div>{klant.bedrijf}</div>}
          {klant.adres && <div className="text-ink-500 text-xs">{klant.adres}</div>}
          {klant.btw_nummer && <div className="text-ink-400 text-xs">BTW: {klant.btw_nummer}</div>}
        </div>
      )}

      {doc.onderwerp && <div className="font-semibold text-ink-700 mb-2">{doc.onderwerp}</div>}
      <div className="text-xs text-ink-400 mb-3">Verhuurperiode: {fmt(doc.start_datum)} – {fmt(doc.eind_datum || doc.start_datum)} ({calc.dagen} dag{calc.dagen !== 1 ? 'en' : ''})</div>

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
          {calc.kortingPct > 0 && <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">Korting ({calc.kortingPct}%)</td><td className="text-right py-1.5 font-mono text-green-600">−{eur(calc.kortingBedrag)}</td></tr>}
          <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">Subtotaal excl. BTW</td><td className="text-right py-1.5 font-mono">{eur(calc.excl)}</td></tr>
          <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">BTW 21%</td><td className="text-right py-1.5 font-mono">{eur(calc.btw)}</td></tr>
          <tr className="border-t-2 border-ink-800"><td colSpan={3} className="text-right py-2 font-bold text-base">Totaal incl. BTW</td><td className="text-right py-2 font-bold text-base font-mono">{eur(calc.totaal)}</td></tr>
        </tfoot>
      </table>

      {doc.notities && <div className="mb-3 p-3 bg-ink-50 rounded-lg text-xs text-ink-500">{doc.notities}</div>}
      {iban && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 mb-3">Betalen op IBAN <strong>{iban}</strong> t.n.v. {bedrijfsnaam} o.v.v. {doc.nummer}</div>}
      {doc.footer_tekst && <div className="text-xs text-ink-400 italic">{doc.footer_tekst}</div>}
      {doc.algemene_voorwaarden_url && (
        <div className="text-xs text-ink-400 border-t border-ink-100 pt-3 mt-3">
          Op deze factuur zijn onze algemene voorwaarden van toepassing.
          <a href={doc.algemene_voorwaarden_url} target="_blank" className="text-brand-500 hover:underline ml-1">Download <ExternalLink size={10} className="inline" /></a>
        </div>
      )}
    </div>
  )
}
