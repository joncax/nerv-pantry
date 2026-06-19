import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Search, Filter, Plus, AlertTriangle, Clock } from 'lucide-react'
import { inventoryApi } from '@/services/api'
import type { InventoryItem, ExpiryStatus } from '@/types'

function getExpiryStatus(expiryDate?: string): ExpiryStatus {
  if (!expiryDate) return 'none'
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 2) return 'critical'
  if (diffDays <= 7) return 'warning'
  return 'ok'
}

function ExpiryBadge({ date }: { date?: string }) {
  const status = getExpiryStatus(date)
  if (status === 'none') return null

  const config = {
    expired: { label: 'Expirado', color: 'var(--color-nerv-danger)' },
    critical: { label: date!, color: 'var(--color-nerv-danger)' },
    warning:  { label: date!, color: 'var(--color-nerv-warning)' },
    ok:       { label: date!, color: 'var(--color-nerv-muted)' },
  }[status]

  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: config.color }}>
      <Clock size={10} />
      {config.label}
    </span>
  )
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const status = getExpiryStatus(item.expiry_date)
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b transition-colors hover:brightness-110"
      style={{
        borderColor: 'var(--color-nerv-border)',
        backgroundColor: status === 'expired' || status === 'critical'
          ? 'rgba(248,81,73,0.05)' : 'transparent'
      }}>

      {/* Status dot */}
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
        backgroundColor:
          status === 'expired' || status === 'critical' ? 'var(--color-nerv-danger)'
          : status === 'warning' ? 'var(--color-nerv-warning)'
          : 'var(--color-nerv-success)'
      }} />

      {/* Product name */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-nerv-text)' }}>
          {item.product?.name ?? `Produto #${item.product_id}`}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
            {item.location?.name ?? '—'}
          </span>
          <ExpiryBadge date={item.expiry_date} />
        </div>
      </div>

      {/* Quantity */}
      <div className="text-sm font-medium shrink-0" style={{ color: 'var(--color-nerv-text)' }}>
        {item.quantity} {item.unit?.abbreviation ?? ''}
      </div>
    </div>
  )
}

export default function Inventory() {
  const [search, setSearch] = useState('')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
  })

  const filtered = items.filter(item =>
    item.product?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
            Inventário
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
            {items.length} {items.length === 1 ? 'artigo' : 'artigos'} em stock
          </p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
          <Plus size={14} />
          Adicionar
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <Search size={14} style={{ color: 'var(--color-nerv-muted)' }} />
          <input
            type="text"
            placeholder="Pesquisar produtos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-nerv-text)' }}
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded border text-sm"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}>
          <Filter size={14} />
          Filtros
        </button>
      </div>

      {/* List */}
      <div className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>

        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
            A carregar...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Package size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
              {search ? 'Nenhum resultado' : 'Inventário vazio'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
              {search ? 'Tenta pesquisar por outro nome.' : 'Adiciona o teu primeiro produto para começar.'}
            </p>
          </div>
        ) : (
          filtered.map(item => <InventoryRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
