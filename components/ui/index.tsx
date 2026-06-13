'use client'
import { X } from 'lucide-react'
import clsx from 'clsx'
import type { KlusStatus } from '@/lib/types'

// ── Modal ──────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
  footer?: React.ReactNode
}
export function Modal({ open, onClose, title, children, width = 'max-w-xl', footer }: ModalProps) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={clsx('modal-box w-full', width)}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-ink-800">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
            <X size={16} />
          </button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="mt-5 pt-4 border-t border-ink-100 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────────
export function FormField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

// ── Grid ──────────────────────────────────────────────────────
export function FormGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={clsx('grid gap-3', cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-1')}>
      {children}
    </div>
  )
}

// ── Status badges ─────────────────────────────────────────────
export function StatusBadge({ status }: { status: KlusStatus | string }) {
  const map: Record<string, string> = {
    gepland: 'badge badge-blue',
    actief: 'badge badge-green',
    afgerond: 'badge badge-gray',
    verzonden: 'badge badge-blue',
    omgezet: 'badge badge-gray',
    betaald: 'badge badge-green',
    onbetaald: 'badge badge-amber',
    concept: 'badge badge-gray',
  }
  return <span className={map[status] || 'badge badge-gray'}>{status}</span>
}

// ── Owner badge ───────────────────────────────────────────────
const ownerCls: Record<string, string> = {
  Wiegert: 'badge badge-blue',
  Gideon: 'badge badge-green',
  Julian: 'badge badge-amber',
}
export function OwnerBadge({ owner }: { owner?: string }) {
  if (!owner) return null
  return <span className={ownerCls[owner] || 'badge badge-gray'}>{owner}</span>
}

// ── Category badge ────────────────────────────────────────────
const catCls: Record<string, string> = {
  HMI: 'badge badge-purple',
  Tungsten: 'badge badge-orange',
  LED: 'badge badge-green',
  'Textile/Frame': 'badge badge-blue',
  Overig: 'badge badge-gray',
}
export function CatBadge({ cat }: { cat: string }) {
  return <span className={catCls[cat] || 'badge badge-gray'}>{cat}</span>
}

// ── Page header ───────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-800">{title}</h1>
        {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="text-xs text-ink-400 font-medium mb-1">{label}</div>
      <div className="text-2xl font-semibold text-ink-800">{value}</div>
      {sub && <div className="text-xs text-ink-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-3 text-ink-300">{icon}</div>}
      <h3 className="text-sm font-medium text-ink-600 mb-1">{title}</h3>
      {description && <p className="text-xs text-ink-400 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <table className="w-full">{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-ink-50 border-b border-ink-100"><tr>{children}</tr></thead>
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={clsx('th', className)}>{children}</th>
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-ink-100">{children}</tbody>
}

export function Tr({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr className={clsx('table-row', onClick && 'cursor-pointer', className)} onClick={onClick}>
      {children}
    </tr>
  )
}

export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td className={clsx('td', className)} colSpan={colSpan}>{children}</td>
}

// ── Section divider ───────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-2">{children}</div>
}

// ── Confirm dialog ────────────────────────────────────────────
export function ConfirmModal({ open, onClose, onConfirm, title, description, danger = false }: {
  open: boolean; onClose: () => void; onConfirm: () => void; title: string; description?: string; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <button className="btn" onClick={onClose}>Annuleren</button>
          <button className={clsx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>
            Bevestigen
          </button>
        </>
      }>
      {description && <p className="text-sm text-ink-500">{description}</p>}
    </Modal>
  )
}
