'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { eur, fmt, calcDoc } from '@/lib/utils'
import { PageHeader, StatusBadge, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, EmptyState } from '@/components/ui'
import { Plus, Eye, Check, Receipt } from 'lucide-react'
import type { Factuur, Klant, Gear, Accessory } from '@/lib/types'

export default function FacturenPage() {
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [modal, setModal] = useState(false)
  const [viewDoc, setViewDoc] = useState<Factuur | null>(null)
  const [form, setForm] = useState({ klant_id: '', start_datum: '', eind_datum: '', bus_dagprijs: 0, generator_dagprijs: 0, korting_pct: 0, vervaldatum: '', notities: '' })
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: f }, { data: k }, { data: g }, { data: a }] = await Promise.all([
      supabase.from('facturen').select('*, klant:klanten(*)').order('datum', { ascending: false }),
      supabase.from('klanten').select('*').order('naam'),
      supabase.from('gear').select('*'),
      supabase.from('accessories').select('*'),
    ])
    setFacturen(f || [])
    setKlanten(k || [])
    setGear(g || [])
    setAccessories(a || [])
  }

  async function save() {
    setSaving(true)
    const nr = 'FAC-' + String((facturen.length + 1)).padStart(4, '0')
    const calc = calcDoc([], [], gear, accessories, form.start_datum, form.eind_datum, form.bus_dagprijs, form.generator_dagprijs, form.korting_pct)
    await supabase.from('facturen').insert({
      nummer: nr, klant_id: form.klant_id || null,
      start_datum: form.start_datum, eind_datum: form.eind_datum,
      bus_dagprijs: form.bus_dagprijs, generator_dagprijs: form.generator_dagprijs,
      korting_pct: form.korting_pct, vervaldatum: form.vervaldatum || null,
      notities: form.notities, totaal_excl: calc.excl, status: 'onbetaald',
      gear_ids: [], accessory_ids: []
    })
    await loadAll(); setModal(false); setSaving(false)
  }

  async function markBetaald(id: string) {
    await supabase.from('facturen').update({ status: 'betaald' }).eq('id', id)
    await loadAll()
  }

  const totaalOpen = facturen.filter(f => f.status === 'onbetaald').reduce((s, f) => s + f.totaal_excl, 0)
  const totaalBetaald = facturen.filter(f => f.status === 'betaald').reduce((s, f) => s + f.totaal_excl, 0)

  function DocPreview({ doc }: { doc: Factuur }) {
    const klant = doc.klant as any
    const calc = calcDoc(doc.gear_ids || [], doc.accessory_ids || [], gear, accessories, doc.start_datum || '', doc.eind_datum || '', doc.bus_dagprijs, doc.generator_dagprijs, doc.korting_pct)
    return (
      <div className="text-sm">
        <div className="flex justify-between mb-4">
          <div><div className="font-bold text-lg">LightRent Pro</div><div className="text-ink-400 text-xs">Zeist, Nederland</div></div>
          <div className="text-right">
            <div className="font-semibold">{doc.nummer}</div>
            <div className="text-ink-400 text-xs">{fmt(doc.datum)}</div>
            {doc.vervaldatum && <div className="text-amber-500 text-xs font-medium">Vervalt {fmt(doc.vervaldatum)}</div>}
          </div>
        </div>
        {klant && <div className="bg-ink-50 rounded-lg p-3 mb-4"><div className="font-medium">{klant.naam}</div>{klant.bedrijf && <div className="text-ink-500 text-xs">{klant.bedrijf}</div>}{klant.btw_nummer && <div className="text-ink-400 text-xs">BTW: {klant.btw_nummer}</div>}</div>}
        <div className="text-xs text-ink-400 mb-3">Periode: {fmt(doc.start_datum)} – {fmt(doc.eind_datum || doc.start_datum)} ({calc.dagen} dag{calc.dagen !== 1 ? 'en' : ''})</div>
        <table className="w-full text-xs mb-4">
          <thead><tr className="border-b border-ink-200"><th className="text-left py-1.5">Omschrijving</th><th className="text-right py-1.5">Dagprijs</th><th className="text-right py-1.5">Dagen</th><th className="text-right py-1.5">Subtotaal</th></tr></thead>
          <tbody>{calc.regels.map((r, i) => <tr key={i} className="border-b border-ink-100"><td className={`py-1.5 ${r.isAcc ? 'pl-4 text-ink-500 italic' : ''}`}>{r.naam}</td><td className="text-right py-1.5 font-mono">{eur(r.dp)}</td><td className="text-right py-1.5">{r.dagen}</td><td className="text-right py-1.5 font-mono">{eur(r.sub)}</td></tr>)}</tbody>
          <tfoot>
            {calc.kortingPct > 0 && <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">Korting ({calc.kortingPct}%)</td><td className="text-right py-1.5 font-mono text-green-600">−{eur(calc.kortingBedrag)}</td></tr>}
            <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">Subtotaal excl. BTW</td><td className="text-right py-1.5 font-mono">{eur(calc.excl)}</td></tr>
            <tr><td colSpan={3} className="text-right py-1.5 text-ink-500">BTW 21%</td><td className="text-right py-1.5 font-mono">{eur(calc.btw)}</td></tr>
            <tr className="border-t border-ink-200 font-semibold text-sm"><td colSpan={3} className="text-right py-2">Totaal incl. BTW</td><td className="text-right py-2 font-mono">{eur(calc.totaal)}</td></tr>
          </tfoot>
        </table>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink-800">Facturen</h1>
            <div className="flex gap-4 mt-1 text-sm text-ink-400">
              <span>Open: <strong className="text-amber-600">{eur(totaalOpen)}</strong></span>
              <span>Betaald: <strong className="text-green-600">{eur(totaalBetaald)}</strong></span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ klant_id: '', start_datum: today, eind_datum: today, bus_dagprijs: 0, generator_dagprijs: 0, korting_pct: 0, vervaldatum: '', notities: '' }); setModal(true) }}>
            <Plus size={15} /> Nieuwe factuur
          </button>
        </div>

        {facturen.length === 0 ? (
          <EmptyState icon={<Receipt size={40} />} title="Nog geen facturen" />
        ) : (
          <Table>
            <Thead><Th>Nummer</Th><Th>Klant</Th><Th>Datum</Th><Th>Vervalt</Th><Th>Totaal excl.</Th><Th>Status</Th><Th /></Thead>
            <Tbody>
              {facturen.map(f => (
                <Tr key={f.id}>
                  <Td className="font-mono font-medium">{f.nummer}</Td>
                  <Td>{(f.klant as any)?.naam || '—'}</Td>
                  <Td>{fmt(f.datum, 'd MMM yyyy')}</Td>
                  <Td>{f.vervaldatum ? <span className={f.vervaldatum < today && f.status === 'onbetaald' ? 'text-red-500 font-medium' : ''}>{fmt(f.vervaldatum, 'd MMM yyyy')}</span> : '—'}</Td>
                  <Td className="font-mono font-medium">{eur(f.totaal_excl)}</Td>
                  <Td><StatusBadge status={f.status} /></Td>
                  <Td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewDoc(f)}><Eye size={13} /></button>
                      {f.status === 'onbetaald' && <button className="btn btn-ghost btn-sm text-green-600 hover:bg-green-50" title="Markeer als betaald" onClick={() => markBetaald(f.id)}><Check size={13} /></button>}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nieuwe factuur"
        footer={<><button className="btn" onClick={() => setModal(false)}>Annuleren</button><button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button></>}>
        <div className="space-y-3">
          <FormField label="Klant"><select className="input" value={form.klant_id} onChange={e => setForm(f => ({ ...f, klant_id: e.target.value }))}><option value="">— geen —</option>{klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}</select></FormField>
          <FormGrid>
            <FormField label="Van"><input type="date" className="input" value={form.start_datum} onChange={e => setForm(f => ({ ...f, start_datum: e.target.value, eind_datum: f.eind_datum < e.target.value ? e.target.value : f.eind_datum }))} /></FormField>
            <FormField label="Tot"><input type="date" className="input" min={form.start_datum} value={form.eind_datum} onChange={e => setForm(f => ({ ...f, eind_datum: e.target.value }))} /></FormField>
            <FormField label="Bus dagprijs (€)"><input type="number" className="input" value={form.bus_dagprijs} onChange={e => setForm(f => ({ ...f, bus_dagprijs: +e.target.value }))} /></FormField>
            <FormField label="Generator dagprijs (€)"><input type="number" className="input" value={form.generator_dagprijs} onChange={e => setForm(f => ({ ...f, generator_dagprijs: +e.target.value }))} /></FormField>
            <FormField label="Korting (%)"><input type="number" className="input" value={form.korting_pct} onChange={e => setForm(f => ({ ...f, korting_pct: +e.target.value }))} /></FormField>
            <FormField label="Vervaldatum"><input type="date" className="input" value={form.vervaldatum} onChange={e => setForm(f => ({ ...f, vervaldatum: e.target.value }))} /></FormField>
          </FormGrid>
          <FormField label="Notities"><textarea className="input h-16 resize-none" value={form.notities} onChange={e => setForm(f => ({ ...f, notities: e.target.value }))} /></FormField>
        </div>
      </Modal>

      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={`Factuur ${viewDoc.nummer}`} width="max-w-2xl"
          footer={<><button className="btn" onClick={() => window.print()}>Afdrukken</button><button className="btn" onClick={() => setViewDoc(null)}>Sluiten</button></>}>
          <DocPreview doc={viewDoc} />
        </Modal>
      )}
    </AppShell>
  )
}
