'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { eur, fmt } from '@/lib/utils'
import { PageHeader, StatCard, Table, Thead, Th, Tbody, Tr, Td, Modal, FormField, FormGrid, OwnerBadge } from '@/components/ui'
import { Plus, Zap } from 'lucide-react'
import type { Generator, GeneratorLog } from '@/lib/types'

type KlusBasic = { id: string; naam: string }

export default function GeneratorPage() {
  const [generators, setGenerators] = useState<Generator[]>([])
  const [logs, setLogs] = useState<GeneratorLog[]>([])
  const [klussen, setKlussen] = useState<KlusBasic[]>([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ generator_id: '', datum: '', klus_id: '', chauffeur: '', liters: 0, draaiuren: 0, prijs_per_liter: 1.65, notitie: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: g }, { data: l }, { data: k }] = await Promise.all([
      supabase.from('generators').select('*'),
      supabase.from('generator_log').select('*').order('datum', { ascending: false }),
      supabase.from('klussen').select('id, naam').order('naam'),
    ])
    setGenerators(g || [])
    setLogs(l || [])
    setKlussen(k || [])
  }

  async function save() {
    if (!form.generator_id || !form.datum) return
    setSaving(true)
    await supabase.from('generator_log').insert({
      generator_id: form.generator_id, datum: form.datum,
      klus_id: form.klus_id || null, chauffeur: form.chauffeur || null,
      liters: form.liters, draaiuren: form.draaiuren,
      prijs_per_liter: form.prijs_per_liter, notitie: form.notitie || null
    })
    await loadAll(); setModal(false); setSaving(false)
  }

  // Stats per generator
  function genStats(genId: string) {
    const genLogs = logs.filter(l => l.generator_id === genId)
    return {
      liters: genLogs.reduce((s, l) => s + l.liters, 0),
      uren: genLogs.reduce((s, l) => s + l.draaiuren, 0),
      kosten: genLogs.reduce((s, l) => s + (l.liters * l.prijs_per_liter), 0),
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader
          title="Generators"
          subtitle="Verbruik & draaiuren registreren"
          actions={
            <button className="btn btn-primary" onClick={() => {
              setForm({ generator_id: generators[0]?.id || '', datum: today, klus_id: '', chauffeur: '', liters: 0, draaiuren: 0, prijs_per_liter: 1.65, notitie: '' })
              setModal(true)
            }}>
              <Plus size={15} /> Verbruik registreren
            </button>
          }
        />

        {/* Generator cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {generators.map(g => {
            const s = genStats(g.id)
            return (
              <div key={g.id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Zap size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-ink-800">{g.naam}</div>
                    <div className="text-xs text-ink-400">{g.type}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-ink-50 rounded-lg p-3">
                    <div className="text-xs text-ink-400 mb-1">Totaal liters</div>
                    <div className="font-semibold text-ink-800">{s.liters.toFixed(1)} L</div>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-3">
                    <div className="text-xs text-ink-400 mb-1">Draaiuren</div>
                    <div className="font-semibold text-ink-800">{s.uren.toFixed(1)} u</div>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-3">
                    <div className="text-xs text-ink-400 mb-1">Kosten</div>
                    <div className="font-semibold text-ink-800">{eur(s.kosten)}</div>
                  </div>
                </div>
                {s.uren > 0 && (
                  <div className="mt-2 text-xs text-ink-400">
                    Gemiddeld {(s.liters / s.uren).toFixed(2)} L/uur
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Log */}
        <h2 className="text-lg font-semibold text-ink-700 mb-3">Verbruikslog</h2>
        <Table>
          <Thead>
            <Th>Datum</Th><Th>Generator</Th><Th>Klus</Th><Th>Chauffeur</Th>
            <Th>Liters</Th><Th>Uren</Th><Th>€/L</Th><Th>Kosten</Th><Th>Notitie</Th>
          </Thead>
          <Tbody>
            {logs.length === 0 ? (
              <Tr><Td className="text-ink-400 text-center" colSpan={9 as any}>Nog geen verbruik geregistreerd</Td></Tr>
            ) : logs.map(l => {
              const gen = generators.find(g => g.id === l.generator_id)
              const klus = klussen.find(k => k.id === l.klus_id)
              return (
                <Tr key={l.id}>
                  <Td>{fmt(l.datum, 'd MMM yyyy')}</Td>
                  <Td><span className="font-medium">{gen?.naam || '—'}</span></Td>
                  <Td>{klus?.naam || '—'}</Td>
                  <Td>{l.chauffeur ? <OwnerBadge owner={l.chauffeur} /> : '—'}</Td>
                  <Td className="font-mono">{l.liters.toFixed(1)} L</Td>
                  <Td className="font-mono">{l.draaiuren} u</Td>
                  <Td className="font-mono">€{l.prijs_per_liter.toFixed(3)}</Td>
                  <Td className="font-mono font-medium">{eur(l.liters * l.prijs_per_liter)}</Td>
                  <Td className="text-ink-400">{l.notitie || '—'}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title="Verbruik registreren"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
          </>
        }>
        <div className="space-y-3">
          <FormGrid>
            <FormField label="Generator">
              <select className="input" value={form.generator_id} onChange={e => setForm(f => ({ ...f, generator_id: e.target.value }))}>
                {generators.map(g => <option key={g.id} value={g.id}>{g.naam}</option>)}
              </select>
            </FormField>
            <FormField label="Datum">
              <input type="date" className="input" value={form.datum} onChange={e => setForm(f => ({ ...f, datum: e.target.value }))} />
            </FormField>
            <FormField label="Klus">
              <select className="input" value={form.klus_id} onChange={e => setForm(f => ({ ...f, klus_id: e.target.value }))}>
                <option value="">— geen —</option>
                {klussen.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
              </select>
            </FormField>
            <FormField label="Meegenomen door">
              <select className="input" value={form.chauffeur} onChange={e => setForm(f => ({ ...f, chauffeur: e.target.value }))}>
                <option value="">—</option>
                <option>Wiegert</option><option>Gideon</option><option>Julian</option>
              </select>
            </FormField>
            <FormField label="Liters">
              <input type="number" step="0.1" className="input" value={form.liters} onChange={e => setForm(f => ({ ...f, liters: +e.target.value }))} />
            </FormField>
            <FormField label="Draaiuren">
              <input type="number" step="0.5" className="input" value={form.draaiuren} onChange={e => setForm(f => ({ ...f, draaiuren: +e.target.value }))} />
            </FormField>
            <FormField label="Prijs per liter (€)">
              <input type="number" step="0.001" className="input" value={form.prijs_per_liter} onChange={e => setForm(f => ({ ...f, prijs_per_liter: +e.target.value }))} />
            </FormField>
          </FormGrid>
          {form.liters > 0 && (
            <div className="bg-ink-50 rounded-lg px-3 py-2 text-sm text-ink-600">
              Geschatte kosten: <strong>{eur(form.liters * form.prijs_per_liter)}</strong>
              {form.draaiuren > 0 && <> · {(form.liters / form.draaiuren).toFixed(2)} L/uur</>}
            </div>
          )}
          <FormField label="Notitie">
            <input className="input" value={form.notitie} onChange={e => setForm(f => ({ ...f, notitie: e.target.value }))} placeholder="bijv. Lowlands dag 1" />
          </FormField>
        </div>
      </Modal>
    </AppShell>
  )
}
