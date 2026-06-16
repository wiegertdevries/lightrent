'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Calendar, Wrench, Truck, Zap,
  CalendarClock, Users, FileText, Receipt, Flame,
  ClipboardList, Shield, LogOut, User, Menu, X, UserCheck
} from 'lucide-react'
import clsx from 'clsx'
import type { Profiel } from '@/lib/types'

const NAV = [
  { label: 'Dashboard',   href: '/',          icon: LayoutDashboard, section: null },
  { label: 'Agenda',      href: '/planning',   icon: Calendar,        section: null },
  { label: 'Paklijst',    href: '/paklijst',   icon: ClipboardList,   section: null },
  { label: 'Gear',        href: '/gear',       icon: Wrench,          section: 'Inventaris' },
  { label: 'Transport',   href: '/transport',  icon: Truck,           section: 'Inventaris' },
  { label: 'Generators',  href: '/generator',  icon: Zap,             section: 'Inventaris' },
  { label: 'Klussen',     href: '/klussen',    icon: CalendarClock,   section: 'Klussen' },
  { label: 'Offertes',    href: '/offertes',   icon: FileText,        section: 'Klussen' },
  { label: 'Facturen',    href: '/facturen',   icon: Receipt,         section: 'Klussen' },
  { label: 'Klanten',     href: '/klanten',    icon: Users,           section: 'Klussen' },
  { label: 'Gaffers',     href: '/gaffers',    icon: UserCheck,       section: 'Klussen' },
  { label: 'Admin',       href: '/admin',      icon: Shield,          section: 'Beheer' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [profiel, setProfiel] = useState<Profiel | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profielen').select('*').eq('id', user.id).single().then(({ data }) => setProfiel(data))
    })
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const sections: { label: string | null; items: typeof NAV }[] = []
  let cur: string | null | undefined = undefined
  NAV.forEach(item => {
    if (item.section !== cur) { cur = item.section; sections.push({ label: item.section, items: [item] }) }
    else sections[sections.length - 1].items.push(item)
  })

  const NavContent = () => (
    <>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {sections.map(section => (
          <div key={section.label || 'top'}>
            {section.label && <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-300">{section.label}</div>}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} className={clsx('nav-link', active && 'active')}>
                    <item.icon size={15} className="flex-shrink-0" />{item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-ink-100 space-y-1">
        {profiel && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-xs flex-shrink-0">
              {profiel.naam?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-ink-700 truncate">{profiel.naam}</div>
              <div className="text-[10px] text-ink-400">{profiel.rol}</div>
            </div>
          </div>
        )}
        <Link href="/admin/profiel" className="nav-link text-xs py-1.5"><User size={13} /> Mijn profiel</Link>
        <button onClick={handleLogout} className="nav-link text-xs py-1.5 w-full text-left text-red-400 hover:bg-red-50 hover:text-red-600">
          <LogOut size={13} /> Uitloggen
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-white border-r border-ink-100">
        <div className="px-4 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0"><Flame size={15} className="text-white" /></div>
            <div><div className="font-semibold text-sm text-ink-800 leading-none">LightRent</div><div className="text-[10px] text-ink-400 mt-0.5">Pro v2.1</div></div>
          </div>
        </div>
        <NavContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-ink-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center"><Flame size={13} className="text-white" /></div>
          <span className="font-semibold text-sm text-ink-800">LightRent Pro</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-ink-100">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-white flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-4 border-b border-ink-100 mt-14"><span className="text-xs text-ink-400">Menu</span></div>
            <NavContent />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto md:mt-0 mt-14">{children}</main>
    </div>
  )
}
