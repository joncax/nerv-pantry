import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ArrowDown, Star, X } from 'lucide-react'
import { favoritesApi, inventoryApi } from '@/services/api'
import type { FavoriteProduct } from '@/services/api'
import { FavoriteProductModal } from './FavoriteProductModal'
import { getPriceTrend } from '@/utils/sparkline'

type SortKey = 'name' | 'stock' | 'min' | 'last_price' | 'avg_price'
type SortDir = 'asc' | 'desc'

// ─── Sub-componentes ──────────────────────────────────────────────

function SortHeader({
  label, sortK, active, dir, onToggle,
}: {
  label: string
  sortK: SortKey
  active: boolean
  dir: SortDir
  onToggle: (k: SortKey) => void
}) {
  return (
    <button
      onClick={() => onToggle(sortK)}
      className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide"
      style={{ color: active ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)' }}>
      {label}
      {active && (dir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
    </button>
  )
}

function StockCell({ current, min, unit }: {
  current: number; min?: number | null; unit: string
}) {
  const color =
    current === 0                   ? 'var(--color-nerv-danger)'  :
    (min && current < min)          ? 'var(--color-nerv-warning)' :
                                      'var(--color-nerv-success)'
  return <span style={{ color }}>{current} {unit}</span>
}

function TrendArrow({ lastPrice, avgPrice }: {
  lastPrice?: number | null; avgPrice?: number | null
}) {
  const trend = getPriceTrend(lastPrice, avgPrice)
  if (!trend) return null
  if (trend === 'up')   return <ArrowUp size={11} style={{ color: 'var(--color-nerv-danger)', display: 'inline', flexShrink: 0 }} />
  if (trend === 'down') return <ArrowDown size={11} style={{ color: 'var(--color-nerv-success)', display: 'inline', flexShrink: 0 }} />
  return <span style={{ color: 'var(--color-nerv-muted)', fontSize: '11px', flexShrink: 0 }}>→</span>
}

// ─── Tabela principal ─────────────────────────────────────────────

export function FavoritesTable() {
  const qc = useQueryClient()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<FavoriteProduct | null>(null)
  const [pendingMin, setPendingMin] = useState<Record<number, string>>({})

  const { data: favorites = [], isLoading } = useQuery<FavoriteProduct[]>({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.getAll().then(r => r.data),
  })

  const updateMinMutation = useMutation({
    mutationFn: ({ productId, min }: { productId: number; min: number }) =>
      favoritesApi.updateMinStock(productId, min),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const removeFavoriteMutation = useMutation({  // U6-F
    mutationFn: (productId: number) => inventoryApi.toggleFavorite(productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...favorites].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'name':       return dir * a.name.localeCompare(b.name, 'pt')
      case 'stock':      return dir * (a.current_stock - b.current_stock)
      case 'min':        return dir * ((a.min_stock_quantity ?? 0) - (b.min_stock_quantity ?? 0))
      case 'last_price': return dir * ((a.last_price ?? 0) - (b.last_price ?? 0))
      case 'avg_price':  return dir * ((a.avg_price ?? 0) - (b.avg_price ?? 0))
      default:           return 0
    }
  })

  const headerProps = (k: SortKey, label: string) => ({
    label, sortK: k, active: sortKey === k, dir: sortDir, onToggle: toggleSort,
  })

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
        A carregar...
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="py-12 text-center">
        <Star size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
          Sem produtos favoritos
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
          Clica na estrela ⭐ em qualquer produto do inventário para o adicionar aqui.
        </p>
      </div>
    )
  }

  return (
    <>
      {selected && (
        <FavoriteProductModal product={selected} onClose={() => setSelected(null)} />
      )}

      <div className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>

        {/* Cabeçalhos */}
        <div className="grid px-4 py-2 border-b"
          style={{
            borderColor: 'var(--color-nerv-border)',
            gridTemplateColumns: '2fr 1fr 80px 1fr 1fr 32px',
            gap: '8px',
          }}>
          <SortHeader {...headerProps('name',       'Produto')} />
          <SortHeader {...headerProps('stock',      'Stock')} />
          <SortHeader {...headerProps('min',        'Mínimo')} />
          <SortHeader {...headerProps('last_price', 'Último')} />
          <SortHeader {...headerProps('avg_price',  'Médio')} />
          <div />
        </div>

        {/* Linhas */}
        {sorted.map((product, idx) => (
          <div
            key={product.id}
            className="grid px-4 py-3 items-center transition-colors group"
            style={{
              gridTemplateColumns: '2fr 1fr 80px 1fr 1fr 32px',
              gap: '8px',
              borderBottom: idx < sorted.length - 1 ? '1px solid var(--color-nerv-border)' : 'none',
              cursor: 'pointer',
            }}
            onClick={() => setSelected(product)}>

            {/* Produto */}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--color-nerv-text)' }}>
                {product.name}
              </p>
              {product.brand && (
                <p className="text-xs truncate" style={{ color: 'var(--color-nerv-muted)' }}>
                  {product.brand}
                </p>
              )}
            </div>

            {/* Stock */}
            <div className="text-sm">
              <StockCell
                current={product.current_stock}
                min={product.min_stock_quantity}
                unit={product.unit_abbreviation}
              />
            </div>

            {/* Mínimo — editável inline */}
            <div onClick={e => e.stopPropagation()}>
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="—"
                value={pendingMin[product.id] ?? (product.min_stock_quantity ?? '')}
                onChange={e => setPendingMin(prev => ({ ...prev, [product.id]: e.target.value }))}
                onBlur={e => {
                  const val = parseFloat(e.target.value)
                  if (!isNaN(val) && val !== product.min_stock_quantity) {
                    updateMinMutation.mutate({ productId: product.id, min: val })
                  }
                  setPendingMin(prev => {
                    const n = { ...prev }
                    delete n[product.id]
                    return n
                  })
                }}
                className="bg-transparent border rounded px-1.5 py-0.5 text-sm outline-none w-full"
                style={{
                  borderColor: 'var(--color-nerv-border)',
                  color: 'var(--color-nerv-text)',
                }}
              />
            </div>

            {/* Último preço + tendência */}
            <div className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--color-nerv-text)' }}>
              {product.last_price != null ? `€${product.last_price.toFixed(2)}` : '—'}
              <TrendArrow lastPrice={product.last_price} avgPrice={product.avg_price} />
            </div>

            {/* Preço médio */}
            <div className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
              {product.avg_price != null ? `€${product.avg_price.toFixed(2)}` : '—'}
            </div>

            {/* U6-F: remover dos favoritos */}
            <div className="flex justify-end" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => removeFavoriteMutation.mutate(product.id)}
                disabled={removeFavoriteMutation.isPending}
                title="Remover dos favoritos"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded disabled:opacity-30"
                style={{ color: 'var(--color-nerv-danger)' }}>
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}