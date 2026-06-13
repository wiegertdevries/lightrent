'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { eur, fmt } from '@/lib/utils'
import { PageHeader, Modal, FormField, FormGrid, OwnerBadge, Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui'
import { Plus, Truck } from 'lucide-react'
import type { Bus, KmLog } from '@/lib/types'

type KlusBasic = { id: string; naam: string }

export default function TransportPage() {
  const [bussen, setBussen] = useState<Bus[]>([])
  const [logs, setLogs] = useState<KmLog[]>([])
  const [klussen, setKlussen] = useState<KlusBasic[]>([])
  const [busModal, setBusModal] = useState(false)
  const [kmModal, setKmModal] = useState(false)
  const [editBusId, setEditBusId] = useState<string | null>(null)
  const [busForm, setBusForm] = useState({ naam: '', kenteken: '', eigenaar: '', km_stand: 0, kosten_per_km: 0.45, dagprijs: 0 })
  const [kmForm, setKmForm] = useState({ bus_id: '', datum: '', klus_id: '', km_van: 0, km_tot: 0 })
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: b }, { data: l }, { data: k }] = await Promise.all([
      supabase.from('bussen').select('*'),
      supabase.from('km_log').select('*').order('datum', { ascending: false }),
      supabase.from('klussen').select('id, naam').order('naam'),
    ])
    setBussen(b || [])
    setLogs(l || [])
    setKlussen(k || [])
  }

  async function saveBus() {
    if (!busForm.naam) return
    setSaving(true)
    const data = { naam: busForm.naam, kenteken: busForm.kenteken || null, eigenaar: busForm.eigenaar || null, km_stand: busForm.km_stand, kosten_per_km: busForm.kosten_per_km, dagprijs: busForm.dagprijs }
    if (editBusId) await supabase.from('bussen').update(data).eq('id', editBusId)
    else await supabase.from('bussen').insert(data)
    await loadAll(); setBusModal(false); setSaving(false)
  }

  async function saveKm() {
    if (!kmForm.bus_id || !kmForm.datum) return
    setSaving(true)
    await supabase.from('km_log').insert({ bus_id: kmForm.bus_id, datum: kmForm.datum, klus_id: kmForm.klus_id || null, km_van: kmForm.km_van, km_tot: kmForm.km_tot })
    // Update km_stand
    await supabase.from('bussen').update({ km_stand: kmForm.km_tot }).eq('id', kmForm.bus_id)
    await loadAll(); setKmModal(false); setSaving(false)
  }

  function openEditBus(b: Bus) {
    setEditBusId(b.id)
    setBusForm({ naam: b.naam, kenteken: b.kenteken || '', eigenaar: b.eigenaar || '', km_stand: b.km_stand, kosten_per_km: b.kosten_per_km, dagprijs: b.dagprijs })
    setBusModal(true)
  }

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader
          title="Transport"
          subtitle="Bussen en kilometerregistratie"
          actions={
            <div className="flex gap-2">
              <button className="btn" onClick={() => {
                setKmForm({ bus_id: bussen[0]?.id || '', datum: today, klus_id: '', km_van: bussen[0]?.km_stand || 0, km_tot: 0 })
                setKmModal(true)
              }}>
                <Plus size={15} /> KM registreren
              </button>
              <button className="btn btn-primary" onClick={() => {
                setEditBusId(null)
                setBusForm({ naam: '', kenteken: '', eigenaar: '', km_stand: 0, kosten_per_km: 0.45, dagprijs: 0 })
                setBusModal(true)
              }}>
                <Plus size={15} /> Bus toevoegen
              </button>
            </div>
          }
        />

        {/* Bus cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {bussen.map(b => {
            const busLogs = logs.filter(l => l.bus_id === b.id)
            const totalKm = busLogs.reduce((s, l) => s + (l.gereden || 0), 0)
            return (
              <div key={b.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <Truck size={20} className="text-purple-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-ink-800">{b.naam}</div>
                      <div className="text-xs text-ink-400 flex items-center gap-2">
                        {b.kenteken && <span className="font-mono">{b.kenteken}</span>}
                        {b.eigenaar && <OwnerBadge owner={b.eigenaar} />}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm text-xs" onClick={() => openEditBus(b)}>Bewerken</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-ink-50 rounded-lg p-3">
                    <div className="text-xs text-ink-400 mb-1">KM-stand</div>
                    <div className="font-semibold text-ink-800">{b.km_stand.toLocaleString('nl')}</div>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-3">
                    <div className="text-xs text-ink-400 mb-1">Gereden (log)</div>
                    <div className="font-semibold text-ink-800">{totalKm.toLocaleString('nl')} km</div>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-3">
                    <div className="text-xs text-ink-400 mb-1">Dagprijs</div>
                    <div className="font-semibold text-ink-800">{eur(b.dagprijs)}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-ink-400">€{b.kosten_per_km}/km</div>
              </div>
            )
          })}
        </div>

        {/* KM log */}
        <h2 className="text-lg font-semibold text-ink-700 mb-3">Kilometerlog</h2>
        <Table>
          <Thead>
            <Th>Bus</Th><Th>Klus</Th><Th>Datum</Th><Th>KM van</Th><Th>KM tot</Th><Th>Gereden</Th><Th>Kosten</Th>
          </Thead>
          <Tbody>
            {logs.length === 0 ? (
              <Tr><Td className="text-ink-400 text-center" colSpan={7 as any}>Nog geen ritten geregistreerd</Td></Tr>
            ) : logs.map(l => {
              const bus = bussen.find(b => b.id === l.bus_id)
              const klus = klussen.find(k => k.id === l.klus_id)
              const gereden = l.km_tot - l.km_van
              return (
                <Tr key={l.id}>
                  <Td className="font-medium">{bus?.naam || '—'}</Td>
                  <Td>{klus?.naam || '—'}</Td>
                  <Td>{fmt(l.datum, 'd MMM yyyy')}</Td>
                  <Td className="font-mono">{l.km_van.toLocaleString('nl')}</Td>
                  <Td className="font-mono">{l.km_tot.toLocaleString('nl')}</Td>
                  <Td className="font-mono font-medium">{gereden.toLocaleString('nl')} km</Td>
                  <Td className="font-mono">{eur(gereden * (bus?.kosten_per_km || 0.45))}</Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
      </div>

      {/* Bus modal */}
      <Modal open={busModal} onClose={() => setBusModal(false)}
        title={editBusId ? 'Bus bewerken' : 'Bus toevoegen'}
        footer={
          <>
            <button className="btn" onClick={() => setBusModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={saveBus} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          </>
        }>
        <div className="space-y-3">
          <FormGrid>
            <FormField label="Naam"><input className="input" value={busForm.naam} onChange={e => setBusForm(f => ({ ...f, naam: e.target.value }))} placeholder="Mercedes Atego 12 ton" /></FormField>
            <FormField label="Kenteken"><input className="input" value={busForm.kenteken} onChange={e => setBusForm(f => ({ ...f, kenteken: e.target.value }))} placeholder="AB-123-CD" /></FormField>
            <FormField label="Eigenaar">
              <select className="input" value={busForm.eigenaar} onChange={e => setBusForm(f => ({ ...f, eigenaar: e.target.value }))}>
                <option value="">—</option><option>Wiegert</option><option>Gideon</option><option>Julian</option>
              </select>
            </FormField>
            <FormField label="Huidige KM-stand"><input type="number" className="input" value={busForm.km_stand} onChange={e => setBusForm(f => ({ ...f, km_stand: +e.target.value }))} /></FormField>
            <FormField label="Kosten per km (€)"><input type="number" step="0.01" className="input" value={busForm.kosten_per_km} onChange={e => setBusForm(f => ({ ...f, kosten_per_km: +e.target.value }))} /></FormField>
            <FormField label="Dagprijs verhuur (€)"><input type="number" className="input" value={busForm.dagprijs} onChange={e => setBusForm(f => ({ ...f, dagprijs: +e.target.value }))} /></FormField>
          </FormGrid>
        </div>
      </Modal>

      {/* KM modal */}
      <Modal open={kmModal} onClose={() => setKmModal(false)}
        title="Rit registreren"
        footer={
          <>
            <button className="btn" onClick={() => setKmModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={saveKm} disabled={saving}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
          </>
        }>
        <div className="space-y-3">
          <FormGrid>
            <FormField label="Bus">
              <select className="input" value={kmForm.bus_id} onChange={e => {
                const bus = bussen.find(b => b.id === e.target.value)
                setKmForm(f => ({ ...f, bus_id: e.target.value, km_van: bus?.km_stand || 0 }))
              }}>
                {bussen.map(b => <option key={b.id} value={b.id}>{b.naam}</option>)}
              </select>
            </FormField>
            <FormField label="Datum"><input type="date" className="input" value={kmForm.datum} onChange={e => setKmForm(f => ({ ...f, datum: e.target.value }))} /></FormField>
            <FormField label="KM van"><input type="number" className="input" value={kmForm.km_van} onChange={e => setKmForm(f => ({ ...f, km_van: +e.target.value }))} /></FormField>
            <FormField label="KM tot"><input type="number" className="input" value={kmForm.km_tot} onChange={e => setKmForm(f => ({ ...f, km_tot: +e.target.value }))} /></FormField>
          </FormGrid>
          {kmForm.km_tot > kmForm.km_van && (
            <div className="bg-ink-50 rounded-lg px-3 py-2 text-sm text-ink-600">
              Gereden: <strong>{(kmForm.km_tot - kmForm.km_van).toLocaleString('nl')} km</strong>
              {' '}· kosten: <strong>{eur((kmForm.km_tot - kmForm.km_van) * (bussen.find(b => b.id === kmForm.bus_id)?.kosten_per_km || 0.45))}</strong>
            </div>
          )}
          <FormField label="Klus">
            <select className="input" value={kmForm.klus_id} onChange={e => setKmForm(f => ({ ...f, klus_id: e.target.value }))}>
              <option value="">— geen —</option>
              {klussen.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </FormField>
        </div>
      </Modal>
    </AppShell>
  )
}
