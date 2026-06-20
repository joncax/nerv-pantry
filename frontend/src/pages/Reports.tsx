import { useQuery } from '@tanstack/react-query'
import { BarChart2, TrendingDown, Receipt, Leaf, ShoppingBag } from 'lucide-react'
import { reportsApi } from '@/services/api'

interface Summary {
  month: string
  waste: { count: number; expired_items: number; expired_value_estimate: number }
  costs: { total_spent: number; total_saved: number; receipts_count: number }
  top_consumed: { name: string; quantity: number }[]
  top_wasted: { name: string; count: number }[]
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="rounded-lg p-4 border"
      style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-nerv-muted)' }}>{label}</span>
        <span style={{ color: accent ?? 'var(--color-nerv-muted)' }}>{icon}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-nerv-text)' }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>{sub}</div>}
    </div>
  )
}

function HorizontalBar({ name, value, max, color }: { name: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate max-w-40" style={{ color: 'var(--color-nerv-text)' }}>{name}</span>
        <span style={{ color: 'var(--color-nerv-muted)' }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-nerv-border)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function Reports() {
  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ['reports-summary'],
    queryFn: () => reportsApi.getSummary().then(r => r.data),
    refetchInterval: 60_000,
  })

  const monthLabel = summary
    ? new Date(summary.month + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
    : '—'

  if (isLoading) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
        A carregar relatórios...
      </div>
    )
  }

  const maxConsumed = Math.max(...(summary?.top_consumed.map(i => i.quantity) ?? [1]))
  const maxWasted = Math.max(...(summary?.top_wasted.map(i => i.count) ?? [1]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>Relatórios</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>{monthLabel}</p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Receipt size={16} />}
          label="Talões"
          value={summary?.costs.receipts_count ?? 0}
          sub="processados"
        />
        <StatCard
          icon={<ShoppingBag size={16} />}
          label="Gasto"
          value={`€${(summary?.costs.total_spent ?? 0).toFixed(2)}`}
          sub="este mês"
        />
        <StatCard
          icon={<Leaf size={16} />}
          label="Poupado"
          value={`€${(summary?.costs.total_saved ?? 0).toFixed(2)}`}
          sub="em descontos"
          accent="var(--color-nerv-success)"
        />
        <StatCard
          icon={<TrendingDown size={16} />}
          label="Desperdício"
          value={summary?.waste.count ?? 0}
          sub={`${summary?.waste.expired_items ?? 0} expirados`}
          accent={(summary?.waste.count ?? 0) > 0 ? 'var(--color-nerv-warning)' : undefined}
        />
      </div>

      {/* Valor expirado */}
      {(summary?.waste.expired_value_estimate ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border text-sm"
          style={{ borderColor: 'var(--color-nerv-warning)', backgroundColor: 'rgba(210,153,34,0.1)', color: 'var(--color-nerv-warning)' }}>
          <TrendingDown size={14} />
          Valor estimado expirado no inventário: €{summary!.waste.expired_value_estimate.toFixed(2)}
        </div>
      )}

      {/* Gráficos */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Mais consumidos */}
        <div className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-nerv-text)' }}>
            <BarChart2 size={14} style={{ color: 'var(--color-nerv-accent)' }} />
            Mais consumidos este mês
          </h2>
          {(summary?.top_consumed.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
              Regista refeições para ver dados de consumo.
            </p>
          ) : (
            <div className="space-y-3">
              {summary!.top_consumed.map(item => (
                <HorizontalBar
                  key={item.name}
                  name={item.name}
                  value={Math.round(item.quantity * 10) / 10}
                  max={maxConsumed}
                  color="var(--color-nerv-accent)"
                />
              ))}
            </div>
          )}
        </div>

        {/* Mais desperdiçados */}
        <div className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2"
            style={{ color: 'var(--color-nerv-text)' }}>
            <TrendingDown size={14} style={{ color: 'var(--color-nerv-warning)' }} />
            Mais desperdiçados (histórico)
          </h2>
          {(summary?.top_wasted.length ?? 0) === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-nerv-success)' }}>
              ✓ Sem desperdício registado. Excelente!
            </p>
          ) : (
            <div className="space-y-3">
              {summary!.top_wasted.map(item => (
                <HorizontalBar
                  key={item.name}
                  name={item.name}
                  value={item.count}
                  max={maxWasted}
                  color="var(--color-nerv-warning)"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dicas */}
      <div className="rounded-lg border p-4"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <h2 className="text-sm font-medium mb-2" style={{ color: 'var(--color-nerv-text)' }}>
          💡 Dicas para reduzir desperdício
        </h2>
        <ul className="space-y-1 text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
          <li>• Verifica os alertas de validade diariamente no Dashboard</li>
          <li>• Usa o scanner de talões para registar compras automaticamente</li>
          <li>• Define stock mínimo nos produtos para gerar a lista de compras automaticamente</li>
          <li>• Regista as refeições para acompanhar o consumo real</li>
        </ul>
      </div>
    </div>
  )
}
