'use client'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, CalendarDays, Wrench, Truck, Zap,
  CalendarClock, Users, FileText, Receipt, ChevronRight,
  Flame
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, section: null },
  { label: 'Weekplanning', href: '/planning', icon: CalendarDays, section: null },
  { label: 'Gear', href: '/gear', icon: Wrench, section: 'Inventaris' },
  { label: 'Transport', href: '/transport', icon: Truck, section: 'Inventaris' },
  { label: 'Generators', href: '/generator', icon: Zap, section: 'Inventaris' },
  { label: 'Klussen', href: '/klussen', icon: CalendarClock, section: 'Klussen' },
  { label: 'Klanten', href: '/klanten', icon: Users, section: 'Klussen' },
  { label: 'Offertes', href: '/offertes', icon: FileText, section: 'Financieel' },
  { label: 'Facturen', href: '/facturen', icon: Receipt, section: 'Financieel' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const sections: { label: string | null; items: typeof NAV }[] = []
  let currentSection: string | null | undefined = undefined
  NAV.forEach(item => {
    if (item.section !== currentSection) {
      currentSection = item.section
      sections.push({ label: item.section, items: [item] })
    } else {
      sections[sections.length - 1].items.push(item)
    }
  })

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-ink-100">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-ink-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <Flame size={16} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-ink-800 leading-none">LightRent</div>
              <div className="text-[10px] text-ink-400 mt-0.5">Pro</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {sections.map(section => (
            <div key={section.label || 'top'}>
              {section.label && (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-300">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)
                  return (
                    <Link key={item.href} href={item.href}
                      className={clsx('nav-link', active && 'active')}>
                      <item.icon size={16} className="flex-shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-ink-100">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-ink-500">
            <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-medium text-[10px]">
              LR
            </div>
            <span>LightRent Pro</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
