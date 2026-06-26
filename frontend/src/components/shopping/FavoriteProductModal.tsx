import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { buildSparkline, getPriceTrend } from '@/utils/sparkline'
import type { FavoriteProduct } from '@/services/api'

function TrendBadge({ trend, lastPrice, avgPrice }: {
  trend: 'up' | 'down' | 'stable' | null
  lastPrice?: number | null
  avgPrice?: number | null
}) {
  if (!trend || !lastPrice || !avgPrice) return null

  const diff = ((lastPrice - avgPrice) / avgPrice * 100)
  const label =
    trend === 'up'     ? `↑ ${diff.toFixed(0)}% acima da média` :
    trend === 'down'   ? `↓ ${Math.abs(diff).toFixed(0)}% abaixo da média` :
                         'Na média histórica'

  const color =
    trend === 'up'   ? 'var(--color-nerv-danger)'  :
    trend === 'down' ? 'var(--color-nerv-success)' :
                       'var(--color-nerv-muted)'

  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
      style={{ color, backgroundColor: `${color}22` }}>
      {trend === 'up'   && <TrendingUp size={11} />}
      {trend === 'down' && <TrendingDown size={11} />}
      {trend === 'stable' && <Minus size={11} />}
      {label}
    </span>
  )
}

interface Props {
  product: FavoriteProduct
  onClose: () => void
}

export function FavoriteProductModal({ product, onClose }: Props) {
  const trend = getPriceTrend(product.last_price, product.avg_price)

  const sparklineColor =
    trend === 'up'   ? 'var(--color-nerv-danger)'  :
    trend === 'down' ? 'var(--color-nerv-success)' :
                       'var(--color-nerv-accent)'

  const sparkline = buildSparkline(product.price_history, 240, 52)

  const stockStatus =
    product.current_stock === 0                                                  ? 'empty' :
    product.min_stock_quantity && product.current_stock < product.min_stock_quantity ? 'low'   :
                                                                                   'ok'

  const stockColor =
    stockStatus === 'empty' ? 'var(--color-nerv-danger)'  :
    stockStatus === 'low'   ? 'var(--color-nerv-warning)' :
                              'var(--color-nerv-success)'

  const minPrice = product.price_history.length > 0 ? Math.min(...product.price_history) : null
  const maxPrice = product.price_history.length > 0 ? Math.max(...product.price_history) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="rounded-lg border w-80 overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className="flex items-start justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
              ⭐ {product.name}
            </p>
            {product.brand && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
                {product.brand}
              </p>
            )}
          </div>
          <button onClick={onClose}
            style={{ color: 'var(--color-nerv-muted)', display: 'flex', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* Stock atual */}
          <div>
            <p className="text-xs uppercase tracking-wide mb-1"
              style={{ color: 'var(--color-nerv-muted)' }}>Stock atual</p>
            <p className="text-2xl font-semibold" style={{ color: stockColor }}>
              {product.current_stock} {product.unit_abbreviation}
            </p>
            {product.min_stock_quantity != null && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
                Mínimo: {product.min_stock_quantity} {product.unit_abbreviation}
              </p>
            )}
          </div>

          {/* Sparkline + stats */}
          {sparkline ? (
            <div>
              <p className="text-xs uppercase tracking-wide mb-2"
                style={{ color: 'var(--color-nerv-muted)' }}>Histórico de preço</p>
              <svg width={240} height={52} style={{ display: 'block' }}>
                <polyline
                  points={sparkline.points}
                  fill="none"
                  stroke={sparklineColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={sparkline.lastX} cy={sparkline.lastY} r={3} fill={sparklineColor} />
              </svg>

              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { label: 'Médio',  value: product.avg_price },
                  { label: 'Mínimo', value: minPrice },
                  { label: 'Máximo', value: maxPrice },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                      {stat.label}
                    </p>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
                      {stat.value != null ? `€${stat.value.toFixed(2)}` : '—'}
                    </p>
                  </div>
                ))}
              </div>

              {trend && (
                <div className="mt-2">
                  <TrendBadge
                    trend={trend}
                    lastPrice={product.last_price}
                    avgPrice={product.avg_price}
                  />
                </div>
              )}
            </div>
          ) : product.last_price != null && (
            <div>
              <p className="text-xs uppercase tracking-wide mb-1"
                style={{ color: 'var(--color-nerv-muted)' }}>Último preço</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
                €{product.last_price.toFixed(2)}
              </p>
            </div>
          )}

          {/* Última compra + frequência */}
          {(product.last_purchase_date || product.avg_frequency_days != null) && (
            <div className="border-t pt-3 space-y-1.5"
              style={{ borderColor: 'var(--color-nerv-border)' }}>
              {product.last_purchase_date && (
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                  Última compra:{' '}
                  <span style={{ color: 'var(--color-nerv-text)' }}>
                    {product.last_purchase_date}
                    {product.last_purchase_store && ` · ${product.last_purchase_store}`}
                  </span>
                </p>
              )}
              {product.avg_frequency_days != null && (
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                  Frequência de compra:{' '}
                  <span style={{ color: 'var(--color-nerv-text)' }}>
                    a cada ~{product.avg_frequency_days} dias
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}