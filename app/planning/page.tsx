'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { supabase } from '@/lib/supabase'
import { StatusBadge, OwnerBadge } from '@/components/ui'
import { ChevronLeft, ChevronRight, Truck, Zap, Plus } from 'lucide-react'
import type { Klus, Bus } from '@/lib/types'
import { format, addDays, addWeeks, addMonths, addYears, startOfWeek, startOfMonth, startOfYear, endOfMonth, endOfWeek, isSameDay, isSameMonth, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'
import { nl } from 'date-fns/locale'
import clsx from 'clsx'
import Link from 'next/link'

type View = 'dag' | 'week' | 'maand' | 'jaar'

export default function PlanningPage() {
  const router = useRouter()
  const [klussen, setKlussen] = useState<Klus[]>([])
  const [bussen, setBussen] = useState<Bus[]>([])
  const [view, setView] = useState<View>('maand')
  const [current, setCurrent] = useState(new Date())

  useEffect(() => {
    async function load() {
      const [{ data: k }, { data: b }] = await Promise.all([
        supabase.from('klussen').select('*, klant:klanten(naam)').order('start_datum'),
        supabase.from('bussen').select('*'),
      ])
      setKlussen(k || [])
      setBussen(b || [])
    }
    load()
  }, [])

  function navigate(dir: 1 | -1) {
    setCurrent(c => {
      if (view === 'dag') return addDays(c, dir)
      if (view === 'week') return addWeeks(c, dir)
      if (view === 'maand') return addMonths(c, dir)
      return addYears(c, dir)
    })
  }

  function goToday() { setCurrent(new Date()) }

  function getKlussenForDay(day: Date) {
    return klussen.filter(k => {
      if (!k.start_datum) return false
      const start = parseISO(k.start_datum)
      const end = k.eind_datum ? parseISO(k.eind_datum) : start
      return day >= start && day <= end
    })
  }

  const today = new Date()

  function KlusChip({ k, compact = false }: { k: Klus; compact?: boolean }) {
    const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
    const colors: Record<string, string> = {
      gepland: 'bg-blue-100 text-blue-800 border-blue-200',
      actief: 'bg-green-100 text-green-800 border-green-200',
      afgerond: 'bg-ink-100 text-ink-500 border-ink-200',
    }
    return (
      <button
        className={clsx('w-full text-left rounded-lg border px-2 py-1 hover:opacity-80 transition-opacity', colors[k.status])}
        onClick={() => router.push(`/klussen/${k.id}`)}>
        <div className={clsx('font-medium truncate', compact ? 'text-[10px]' : 'text-xs')}>{k.naam}</div>
        {!compact && (k.klant as any)?.naam && (
          <div className="text-[10px] opacity-70 truncate">{(k.klant as any).naam}</div>
        )}
        {!compact && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {busList.map(b => (
              <span key={b.id} className="text-[9px] opacity-60 flex items-center gap-0.5">
                <Truck size={7} />{b.naam.split(' ').pop()}
              </span>
            ))}
            {(k.generator_info || []).length > 0 && (
              <span className="text-[9px] opacity-60 flex items-center gap-0.5"><Zap size={7} />gen</span>
            )}
          </div>
        )}
      </button>
    )
  }

  // DAG VIEW
  function DagView() {
    const dagKlussen = getKlussenForDay(current)
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-ink-800 mb-4">
          {format(current, 'EEEE d MMMM yyyy', { locale: nl })}
        </h2>
        {dagKlussen.length === 0 ? (
          <div className="py-12 text-center text-ink-400 text-sm">Geen klussen op deze dag.</div>
        ) : (
          <div className="space-y-3">
            {dagKlussen.map(k => {
              const busList = bussen.filter(b => (k.bus_ids || []).includes(b.id))
              return (
                <div key={k.id} className="flex items-start gap-4 p-4 rounded-xl border border-ink-100 hover:border-brand-200 hover:bg-brand-50 transition-all cursor-pointer"
                  onClick={() => router.push(`/klussen/${k.id}`)}>
                  <div className="w-1 self-stretch rounded-full bg-brand-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-ink-800">{k.naam}</span>
                      <StatusBadge status={k.status} />
                      {k.verantwoordelijke && <OwnerBadge owner={k.verantwoordelijke} />}
                    </div>
                    {(k.klant as any) && <div className="text-sm text-ink-500">{(k.klant as any).naam}</div>}
                    {k.locatie && <div className="text-sm text-ink-400">📍 {k.locatie}</div>}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {busList.map(b => <span key={b.id} className="badge badge-purple text-xs"><Truck size={10} className="mr-1" />{b.naam}</span>)}
                      {(k.generator_info || []).map((g, i) => <span key={i} className="badge badge-amber text-xs"><Zap size={10} className="mr-1" />{g.chauffeur}</span>)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // WEEK VIEW
  function WeekView() {
    const weekStart = startOfWeek(current, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today)
          const dayKlussen = getKlussenForDay(day)
          return (
            <div key={idx} className={clsx('rounded-2xl border p-3 min-h-[140px]',
              isToday ? 'border-brand-300 bg-brand-50' : 'border-ink-100 bg-white')}>
              <div className="mb-2">
                <div className={clsx('text-xs font-semibold', isToday ? 'text-brand-600' : 'text-ink-400')}>{DAYS_NL[idx]}</div>
                <div className={clsx('text-lg font-semibold leading-none', isToday ? 'text-brand-600' : 'text-ink-700')}>{format(day, 'd')}</div>
              </div>
              <div className="space-y-1">
                {dayKlussen.map(k => <KlusChip key={k.id} k={k} />)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // MAAND VIEW
  function MaandView() {
    const monthStart = startOfMonth(current)
    const monthEnd = endOfMonth(current)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: calStart, end: calEnd })
    const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

    return (
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 bg-ink-50 border-b border-ink-100">
          {DAYS_NL.map(d => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-ink-400">{d}</div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isThisMonth = isSameMonth(day, current)
            const isToday = isSameDay(day, today)
            const dayKlussen = getKlussenForDay(day)
            return (
              <div key={i} className={clsx(
                'min-h-[110px] border-b border-r border-ink-100 p-1.5',
                !isThisMonth && 'bg-ink-50',
                isToday && 'bg-brand-50',
                i % 7 === 6 && 'border-r-0'
              )}>
                <div className={clsx('text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-brand-500 text-white' : isThisMonth ? 'text-ink-700' : 'text-ink-300'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayKlussen.slice(0, 3).map(k => <KlusChip key={k.id} k={k} compact />)}
                  {dayKlussen.length > 3 && (
                    <div className="text-[10px] text-ink-400 pl-1">+{dayKlussen.length - 3} meer</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // JAAR VIEW
  function JaarView() {
    const months = Array.from({ length: 12 }, (_, i) => new Date(current.getFullYear(), i, 1))
    return (
      <div className="grid grid-cols-4 gap-4">
        {months.map((month, mi) => {
          const monthStart = startOfMonth(month)
          const monthEnd = endOfMonth(month)
          const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
          const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
          const days = eachDayOfInterval({ start: calStart, end: calEnd })
          const isCurrentMonth = isSameMonth(month, today)
          // Count klussen this month
          const maandKlussen = klussen.filter(k => {
            if (!k.start_datum) return false
            const s = parseISO(k.start_datum)
            const e = k.eind_datum ? parseISO(k.eind_datum) : s
            return s <= monthEnd && e >= monthStart
          })

          return (
            <div key={mi} className={clsx('card p-3 cursor-pointer hover:shadow-md transition-all', isCurrentMonth && 'border-brand-300')}
              onClick={() => { setCurrent(month); setView('maand') }}>
              <div className="flex items-center justify-between mb-2">
                <div className={clsx('text-sm font-semibold', isCurrentMonth ? 'text-brand-600' : 'text-ink-700')}>
                  {format(month, 'MMMM', { locale: nl })}
                </div>
                {maandKlussen.length > 0 && (
                  <span className="badge badge-blue text-[10px]">{maandKlussen.length}</span>
                )}
              </div>
              {/* Mini calendar */}
              <div className="grid grid-cols-7 gap-px">
                {['M','D','W','D','V','Z','Z'].map((d, i) => (
                  <div key={i} className="text-center text-[8px] text-ink-300 font-medium">{d}</div>
                ))}
                {days.map((day, i) => {
                  const inMonth = isSameMonth(day, month)
                  const isToday = isSameDay(day, today)
                  const hasKlus = getKlussenForDay(day).length > 0
                  return (
                    <div key={i} className={clsx(
                      'text-center text-[9px] rounded w-4 h-4 mx-auto flex items-center justify-center',
                      !inMonth && 'opacity-20',
                      isToday && 'bg-brand-500 text-white font-bold',
                      hasKlus && inMonth && !isToday && 'bg-brand-100 text-brand-700 font-semibold'
                    )}>
                      {format(day, 'd')}
                    </div>
                  )
                })}
              </div>
              {maandKlussen.length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {maandKlussen.slice(0, 2).map(k => (
                    <div key={k.id} className="text-[10px] text-ink-500 truncate">· {k.naam}</div>
                  ))}
                  {maandKlussen.length > 2 && <div className="text-[10px] text-ink-400">+{maandKlussen.length - 2} meer</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function getTitle() {
    if (view === 'dag') return format(current, 'EEEE d MMMM yyyy', { locale: nl })
    if (view === 'week') {
      const ws = startOfWeek(current, { weekStartsOn: 1 })
      const we = endOfWeek(current, { weekStartsOn: 1 })
      return `${format(ws, 'd MMM', { locale: nl })} – ${format(we, 'd MMM yyyy', { locale: nl })}`
    }
    if (view === 'maand') return format(current, 'MMMM yyyy', { locale: nl })
    return String(current.getFullYear())
  }

  return (
    <AppShell>
      <div className="p-8 page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-ink-800 capitalize">{getTitle()}</h1>
          <div className="flex items-center gap-2">
            {/* View switcher */}
            <div className="flex border border-ink-200 rounded-lg overflow-hidden">
              {(['dag', 'week', 'maand', 'jaar'] as View[]).map(v => (
                <button key={v} className={clsx('px-3 py-1.5 text-sm font-medium transition-colors capitalize',
                  view === v ? 'bg-ink-800 text-white' : 'text-ink-500 hover:bg-ink-50'
                )} onClick={() => setView(v)}>{v}</button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ChevronLeft size={16} /></button>
            <button className="btn btn-sm" onClick={goToday}>Vandaag</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(1)}><ChevronRight size={16} /></button>
            <Link href="/klussen" className="btn btn-primary btn-sm"><Plus size={14} /> Nieuwe klus</Link>
          </div>
        </div>

        {view === 'dag' && <DagView />}
        {view === 'week' && <WeekView />}
        {view === 'maand' && <MaandView />}
        {view === 'jaar' && <JaarView />}
      </div>
    </AppShell>
  )
}
