'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { PageHeader, FormField, FormGrid } from '@/components/ui'
import { Save, User } from 'lucide-react'
import type { Profiel } from '@/lib/types'

export default function ProfielPage() {
  const [profiel, setProfiel] = useState<Partial<Profiel>>({})
  const [saving, setSaving] = useState(false)
  const [opgeslagen, setOpgeslagen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profielen').select('*').eq('id', user.id).single()
      if (data) setProfiel(data)
      else setProfiel({ id: user.id, email: user.email || '', rol: 'medewerker' })
    }
    load()
  }, [])

  async function slaOp() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profielen').upsert({ ...profiel, id: user.id })
    setSaving(false)
    setOpgeslagen(true)
    setTimeout(() => setOpgeslagen(false), 2000)
  }

  function set(key: string, val: string) { setProfiel(p => ({ ...p, [key]: val })) }

  return (
    <AppShell>
      <div className="p-8 page-enter max-w-2xl">
        <PageHeader title="Mijn profiel" subtitle="Je persoonlijke gegevens en bedrijfsinformatie voor op offertes en facturen" />

        <div className="card p-6 space-y-6">
          <div>
            <div className="section-title">Persoonlijke gegevens</div>
            <FormGrid>
              <FormField label="Naam *">
                <input className="input" value={profiel.naam || ''} onChange={e => set('naam', e.target.value)} />
              </FormField>
              <FormField label="Telefoon">
                <input className="input" value={profiel.telefoon || ''} onChange={e => set('telefoon', e.target.value)} />
              </FormField>
            </FormGrid>
          </div>

          <div className="border-t border-ink-100 pt-5">
            <div className="section-title">Bedrijfsgegevens (verschijnen op offertes & facturen)</div>
            <div className="space-y-3">
              <FormField label="Bedrijfsnaam">
                <input className="input" value={profiel.bedrijfsnaam || ''} onChange={e => set('bedrijfsnaam', e.target.value)} placeholder="bijv. Wiegert de Vries Lichtproducties" />
              </FormField>
              <FormField label="Adres">
                <input className="input" value={profiel.bedrijfsadres || ''} onChange={e => set('bedrijfsadres', e.target.value)} placeholder="Straatnaam 12" />
              </FormField>
              <FormGrid>
                <FormField label="Postcode">
                  <input className="input" value={profiel.bedrijfspostcode || ''} onChange={e => set('bedrijfspostcode', e.target.value)} placeholder="1234 AB" />
                </FormField>
                <FormField label="Plaats">
                  <input className="input" value={profiel.bedrijfsplaats || ''} onChange={e => set('bedrijfsplaats', e.target.value)} placeholder="Amsterdam" />
                </FormField>
                <FormField label="KVK-nummer">
                  <input className="input" value={profiel.kvk_nummer || ''} onChange={e => set('kvk_nummer', e.target.value)} placeholder="12345678" />
                </FormField>
                <FormField label="BTW-nummer">
                  <input className="input" value={profiel.btw_nummer || ''} onChange={e => set('btw_nummer', e.target.value)} placeholder="NL123456789B01" />
                </FormField>
                <FormField label="IBAN">
                  <input className="input" value={profiel.iban || ''} onChange={e => set('iban', e.target.value)} placeholder="NL00 BANK 0000 0000 00" />
                </FormField>
                <FormField label="Huisstijl kleur">
                  <div className="flex gap-2">
                    <input type="color" className="h-9 w-12 rounded border border-ink-200 cursor-pointer p-0.5"
                      value={profiel.kleur_primair || '#F97316'} onChange={e => set('kleur_primair', e.target.value)} />
                    <input className="input flex-1" value={profiel.kleur_primair || '#F97316'}
                      onChange={e => set('kleur_primair', e.target.value)} />
                  </div>
                </FormField>
              </FormGrid>
            </div>
          </div>

          <div className="border-t border-ink-100 pt-5 flex justify-end">
            <button className={`btn ${opgeslagen ? 'btn-success' : 'btn-primary'}`} onClick={slaOp} disabled={saving}>
              <Save size={14} /> {saving ? 'Opslaan…' : opgeslagen ? '✓ Opgeslagen!' : 'Profiel opslaan'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
