'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { StatusBadge, OwnerBadge } from '@/components/ui'
import { ChevronLeft, ChevronRight, Truck, Zap } from 'lucide-react'
import type { Klus, Bus, Generator } from '@/lib/types'
import { format, addDays, startOfWeek, isSameDay, parseISO, isWithinInterval } from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'

export default function PlanningPage() {
  const router = useRouter()
  const [klussen, setKlussen] = useState<Klus[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [generators, setGenerators] = useState<Generator[]>([])
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    async function load() {
      const [{ data: k }, { data: b }, { data: g }] = await Promise.all([
        supabase.from('klussen').select('*, klant:klanten(naam)').order('start_datum'),
        supabase.from('bussen').select('*'),
        supabase.from('generators').select('*'),
      ])
      setKlussen(k || [])
      setBussen(b || [])
      setGenerators(g || [])
    }
    load()
  }, [])

  const today = new Date()
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function getKlussenForDay(day: Date) {
    return klussen.filter(k => {
      if (!k.start_datum) return false
      const start = parseISO(k.start_datum)
      const end = k.eind_datum ? parseISO(k.eind_datum) : start
      return day >= start && day <= end
    })
  }

  const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  return (
    <AppShell>
      <div className="p-8 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink-800">Weekplanning</h1>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-ink-700 min-w-[180px] text-center">
              {format(weekStart, 'd MMM', { locale: nl })} – {format(days[6], 'd MMM yyyy', { locale: nl })}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o + 1)}>
              <ChevronRight size={16} />
            </button>
            <button className="btn btn-sm" onClick={() => setWeekOffset(0)}>Vandaag</button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const isToday = isSameDay(day, today)
            const dayKlussen = getKlussenForDay(day)
            return (
              <div key={idx} className={clsx(
                'rounded-2xl border p-3 min-h-[140px]',
                isToday ? 'border-brand-300 bg-brand-50' : 'border-ink-100 bg-white'
              )}>
                <div className="mb-2">
                  <div className={clsx('text-xs font-semibold', isToday ? 'text-brand-600' : 'text-ink-400')}>
                    {DAYS_NL[idx]}
                  </div>
                  <div className={clsx('text-lg font-semibold leading-none', isToday ? 'text-brand-600' : 'text-ink-700')}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayKlussen.map(k => {
                    const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
                    const hasGen = (k.generator_info || []).length > 0
                    return (
                      <button key={k.id}
                        className="w-full text-left p-1.5 rounded-lg bg-white border border-ink-100 hover:border-brand-300 hover:shadow-sm transition-all group"
                        onClick={() => router.push(`/klussen/${k.id}`)}>
                        <div className="font-medium text-xs text-ink-800 truncate group-hover:text-brand-600">{k.naam}</div>
                        {(k.klant as any)?.naam && (
                          <div className="text-[10px] text-ink-400 truncate">{(k.klant as any).naam}</div>
                        )}
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {busList.map(b => (
                            <span key={b.id} className="inline-flex items-center gap-0.5 text-[9px] bg-purple-50 text-purple-600 rounded px-1 py-0.5">
                              <Truck size={8} /> {b.naam.split(' ').pop()}
                            </span>
                          ))}
                          {hasGen && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-50 text-amber-600 rounded px-1 py-0.5">
                              <Zap size={8} /> gen
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
