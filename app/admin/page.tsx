'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/utils'
import { PageHeader, Modal, FormField, FormGrid, Table, Thead, Th, Tbody, Tr, Td, StatusBadge } from '@/components/ui'
import { Plus, Shield, Users, Clock, Settings, Trash2, Key } from 'lucide-react'
import type { Profiel, AuditLog } from '@/lib/types'

export default function AdminPage() {
  const [profielen, setProfielen] = useState<Profiel[]>([])
  const [auditLog, setAuditLog] = useState<AuditLog[]>([])
  const [currentProfiel, setCurrentProfiel] = useState<Profiel | null>(null)
  const [tab, setTab] = useState<'gebruikers' | 'log' | 'instellingen'>('gebruikers')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ email: '', naam: '', wachtwoord: '', rol: 'medewerker' })
  const [instellingen, setInstellingen] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [fout, setFout] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profielen').select('*').eq('id', user.id).single()
      setCurrentProfiel(p)
    }
    const [{ data: pr }, { data: al }, { data: inst }] = await Promise.all([
      supabase.from('profielen').select('*').order('naam'),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('instellingen').select('*'),
    ])
    setProfielen(pr || [])
    setAuditLog(al || [])
    const instMap: Record<string, string> = {}
    ;(inst || []).forEach((i: any) => { instMap[i.sleutel] = typeof i.waarde === 'string' ? i.waarde.replace(/"/g, '') : String(i.waarde) })
    setInstellingen(instMap)
  }

  async function maakGebruiker() {
    setSaving(true)
    setFout('')
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.wachtwoord,
        email_confirm: true,
      })
      if (error) throw error
      if (data.user) {
        await supabase.from('profielen').insert({
          id: data.user.id,
          naam: form.naam,
          email: form.email,
          rol: form.rol,
        })
      }
      await loadAll()
      setModal(false)
      setForm({ email: '', naam: '', wachtwoord: '', rol: 'medewerker' })
    } catch (e: any) {
      setFout(e.message || 'Fout bij aanmaken gebruiker. Admin API vereist service role key.')
    }
    setSaving(false)
  }

  async function slaInstOp(sleutel: string, waarde: string) {
    await supabase.from('instellingen').upsert({ sleutel, waarde: JSON.stringify(waarde) }, { onConflict: 'sleutel' })
  }

  const isAdmin = currentProfiel?.rol === 'admin'

  return (
    <AppShell>
      <div className="p-8 page-enter">
        <PageHeader title="Admin" subtitle="Gebruikersbeheer, audit log en instellingen"
          actions={
            <div className="flex gap-2">
              {(['gebruikers', 'log', 'instellingen'] as const).map(t => (
                <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>
                  {t === 'gebruikers' ? <><Users size={13} /> Gebruikers</> : t === 'log' ? <><Clock size={13} /> Audit log</> : <><Settings size={13} /> Instellingen</>}
                </button>
              ))}
            </div>
          }
        />

        {/* GEBRUIKERS */}
        {tab === 'gebruikers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-ink-500">{profielen.length} gebruikers</p>
              {isAdmin && (
                <button className="btn btn-primary" onClick={() => setModal(true)}>
                  <Plus size={14} /> Gebruiker toevoegen
                </button>
              )}
            </div>
            <Table>
              <Thead>
                <Th>Naam</Th><Th>Email</Th><Th>Rol</Th><Th>Bedrijf</Th><Th>BTW</Th>
              </Thead>
              <Tbody>
                {profielen.map(p => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-xs">
                          {p.naam?.charAt(0)}
                        </div>
                        <span className="font-medium">{p.naam}</span>
                      </div>
                    </Td>
                    <Td>{p.email || '—'}</Td>
                    <Td>
                      <span className={`badge ${p.rol === 'admin' ? 'badge-purple' : 'badge-gray'}`}>
                        {p.rol === 'admin' ? <Shield size={10} className="mr-1" /> : null}
                        {p.rol}
                      </span>
                    </Td>
                    <Td>{p.bedrijfsnaam || '—'}</Td>
                    <Td className="font-mono text-xs">{p.btw_nummer || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            {!isAdmin && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <Shield size={14} className="inline mr-1" />
                Je hebt geen admin-rechten. Neem contact op met de beheerder om gebruikers te beheren.
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <strong>💡 Gebruikers aanmaken:</strong> Ga naar <strong>Supabase → Authentication → Users → Add user</strong> om nieuwe gebruikers aan te maken. Vul daarna hun profiel in via de Gear-pagina of vraag hen in te loggen en hun profiel zelf in te vullen.
            </div>
          </div>
        )}

        {/* AUDIT LOG */}
        {tab === 'log' && (
          <div>
            <Table>
              <Thead>
                <Th>Tijdstip</Th><Th>Gebruiker</Th><Th>Actie</Th><Th>Onderdeel</Th><Th>Omschrijving</Th>
              </Thead>
              <Tbody>
                {auditLog.length === 0 ? (
                  <Tr><Td colSpan={5} className="text-center text-ink-400">Nog geen activiteit geregistreerd</Td></Tr>
                ) : auditLog.map(log => (
                  <Tr key={log.id}>
                    <Td className="text-ink-400 text-xs whitespace-nowrap">{fmt(log.created_at, 'd MMM HH:mm')}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-[9px] font-bold">
                          {log.user_naam?.charAt(0) || '?'}
                        </div>
                        <span className="text-xs">{log.user_naam || '—'}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className={`badge text-[10px] ${
                        log.actie === 'aangemaakt' ? 'badge-green' :
                        log.actie === 'gewijzigd' ? 'badge-blue' : 'badge-red'
                      }`}>{log.actie}</span>
                    </Td>
                    <Td className="text-xs text-ink-500">{log.tabel}</Td>
                    <Td className="text-xs">{log.omschrijving || '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}

        {/* INSTELLINGEN */}
        {tab === 'instellingen' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold text-ink-700 mb-4">Factuur instellingen</h3>
              <div className="space-y-3">
                {[
                  { key: 'factuur_prefix', label: 'Factuur prefix (bijv. FAC)' },
                  { key: 'offerte_prefix', label: 'Offerte prefix (bijv. OFF)' },
                  { key: 'btw_tarief', label: 'BTW tarief (%)' },
                  { key: 'betalingstermijn_dagen', label: 'Betalingstermijn (dagen)' },
                  { key: 'offerte_geldigheid_dagen', label: 'Offerte geldig (dagen)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className="input" value={instellingen[key] || ''}
                      onChange={e => setInstellingen(s => ({ ...s, [key]: e.target.value }))}
                      onBlur={e => slaInstOp(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-ink-700 mb-4">Teksten</h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Offerte intro tekst</label>
                  <textarea className="input h-20 resize-none" value={instellingen['offerte_intro'] || ''}
                    onChange={e => setInstellingen(s => ({ ...s, offerte_intro: e.target.value }))}
                    onBlur={e => slaInstOp('offerte_intro', e.target.value)} />
                </div>
                <div>
                  <label className="label">Factuur footer tekst</label>
                  <textarea className="input h-20 resize-none" value={instellingen['factuur_footer'] || ''}
                    onChange={e => setInstellingen(s => ({ ...s, factuur_footer: e.target.value }))}
                    onBlur={e => slaInstOp('factuur_footer', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nieuwe gebruiker aanmaken"
        footer={
          <>
            <button className="btn" onClick={() => setModal(false)}>Annuleren</button>
            <button className="btn btn-primary" onClick={maakGebruiker} disabled={saving}>
              {saving ? 'Aanmaken…' : 'Aanmaken'}
            </button>
          </>
        }>
        <div className="space-y-3">
          {fout && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">{fout}</div>}
          <FormGrid>
            <FormField label="Naam"><input className="input" value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))} /></FormField>
            <FormField label="E-mailadres"><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
            <FormField label="Wachtwoord"><input type="password" className="input" value={form.wachtwoord} onChange={e => setForm(f => ({ ...f, wachtwoord: e.target.value }))} /></FormField>
            <FormField label="Rol">
              <select className="input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                <option value="medewerker">Medewerker</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
          </FormGrid>
        </div>
      </Modal>
    </AppShell>
  )
}
