'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt, eur, klusDagwaarde } from '@/lib/utils'
import { StatCard, OwnerBadge, StatusBadge } from '@/components/ui'
import { CalendarDays, Truck, Zap, Package, TrendingUp, ArrowRight } from 'lucide-react'
import type { Klus, Gear, Accessory, Bus } from '@/lib/types'
import Link from 'next/link'
import { format, addDays, startOfWeek } from 'date-fns'
import { nl } from 'date-fns/locale'

export default function DashboardPage() {
  const [klussen, setKlussen] = useState<Klus[]>([])
  const [gear, setGear] = useState<Gear[]>([])
  const [accessories, setAccessories] = useState<Accessory[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [factuurStats, setFactuurStats] = useState({ open: 0, betaald: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: k }, { data: g }, { data: a }, { data: b }, { data: kg }, { data: f }] = await Promise.all([
        supabase.from('klussen').select('*, klant:klanten(naam, bedrijf)').order('start_datum'),
        supabase.from('gear').select('*'),
        supabase.from('accessories').select('*'),
        supabase.from('bussen').select('*'),
        supabase.from('klus_gear').select('klus_id, gear_id'),
        supabase.from('facturen').select('status, totaal_excl'),
      ])
      // map gear_ids onto klussen
      const klussenMapped = (k || []).map(kl => ({
        ...kl,
        gear_ids: (kg || []).filter(x => x.klus_id === kl.id).map(x => x.gear_id)
      }))
      setKlussen(klussenMapped)
      setGear(g || [])
      setAccessories(a || [])
      setBussen(b || [])
      const open = (f || []).filter(x => x.status === 'onbetaald').reduce((s, x) => s + x.totaal_excl, 0)
      const betaald = (f || []).filter(x => x.status === 'betaald').reduce((s, x) => s + x.totaal_excl, 0)
      setFactuurStats({ open, betaald })
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const weekEnd = addDays(today, 7)
  const komend = klussen.filter(k => {
    if (!k.start_datum) return false
    const s = new Date(k.start_datum), e = new Date(k.eind_datum || k.start_datum)
    return e >= today && s <= weekEnd
  })

  const ownerStats = ['Wiegert', 'Gideon', 'Julian'].map(o => ({
    naam: o,
    count: gear.filter(g => g.eigenaar === o).length,
    dagwaarde: gear.filter(g => g.eigenaar === o).reduce((s, g) => s + g.dagprijs, 0)
  }))

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-ink-400 text-sm">Laden…</div>
    </div>
  )

  return (
    <div className="p-8 page-enter">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-800">Dashboard</h1>
        <p className="text-sm text-ink-400 mt-0.5">
          {format(today, "EEEE d MMMM yyyy", { locale: nl })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Gear items" value={gear.length} sub={`${eur(gear.reduce((s,g)=>s+g.dagprijs,0))}/dag totaal`} />
        <StatCard label="Actieve klussen" value={klussen.filter(k=>k.status==='actief').length} sub={`${klussen.filter(k=>k.status==='gepland').length} gepland`} />
        <StatCard label="Open facturen" value={eur(factuurStats.open)} sub="excl. BTW" />
        <StatCard label="Betaald totaal" value={eur(factuurStats.betaald)} sub="excl. BTW" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Komende week */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <CalendarDays size={16} className="text-brand-500" />
              Komende 7 dagen
            </div>
            <Link href="/planning" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1">
              Weekplanning <ArrowRight size={12} />
            </Link>
          </div>
          {komend.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink-400">Geen klussen gepland de komende week.</div>
          ) : (
            <div className="space-y-2">
              {komend.map(k => {
                const dag = klusDagwaarde(k, gear, accessories)
                const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
                return (
                  <Link key={k.id} href={`/klussen/${k.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-ink-50 transition-colors group">
                    <div className="w-1 self-stretch rounded-full bg-brand-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-ink-800">{k.naam}</span>
                        <StatusBadge status={k.status} />
                      </div>
                      <div className="text-xs text-ink-400">
                        {fmt(k.start_datum)} – {fmt(k.eind_datum || k.start_datum)}
                        {k.klant && ` · ${k.klant.naam}`}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {busList.map(b => (
                          <span key={b.id} className="badge badge-purple text-[10px]">
                            <Truck size={9} className="mr-1" />{b.naam.split(' ').slice(-2).join(' ')}
                          </span>
                        ))}
                        {(k.generator_info || []).map((g, i) => (
                          <span key={i} className="badge badge-amber text-[10px]">
                            <Zap size={9} className="mr-1" />{g.chauffeur || 'Generator'}
                          </span>
                        ))}
                        {k.verantwoordelijke && <OwnerBadge owner={k.verantwoordelijke} />}
                        <span className="text-[10px] text-ink-400 ml-auto">{eur(dag)}/dag</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-ink-200 group-hover:text-brand-400 mt-0.5 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Bussen */}
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-700 mb-3">
              <Truck size={15} className="text-brand-500" /> Transport
            </div>
            {bussen.map(b => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                <span className="text-xs text-ink-700 font-medium">{b.naam}</span>
                <span className="text-xs text-ink-400">{b.km_stand.toLocaleString('nl')} km</span>
              </div>
            ))}
          </div>

          {/* Eigenaren */}
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-700 mb-3">
              <Package size={15} className="text-brand-500" /> Gear per eigenaar
            </div>
            {ownerStats.map(o => (
              <div key={o.naam} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                <OwnerBadge owner={o.naam} />
                <div className="text-right">
                  <div className="text-xs font-medium text-ink-700">{o.count} items</div>
                  <div className="text-[10px] text-ink-400">{eur(o.dagwaarde)}/dag</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
