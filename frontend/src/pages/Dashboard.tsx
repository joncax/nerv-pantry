import { useQuery } from '@tanstack/react-query'
import { Package, AlertTriangle, ShoppingCart, TrendingDown, Refrigerator, Clock } from 'lucide-react'
import { healthApi } from '@/services/api'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: string
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className="rounded-lg p-4 border"
      style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-nerv-muted)' }}>
          {label}
        </span>
        <span style={{ color: accent ?? 'var(--color-nerv-muted)' }}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-nerv-text)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check().then(r => r.data),
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          Visão geral do teu inventário
        </p>
      </div>

      {/* API status */}
      {health && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded border w-fit"
          style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)', backgroundColor: 'var(--color-nerv-surface)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ backgroundColor: health.db === 'connected' ? 'var(--color-nerv-success)' : 'var(--color-nerv-danger)' }} />
          API {health.status} · BD {health.db} · v{health.version}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<Package size={16} />}
          label="Total Produtos"
          value="—"
          sub="no inventário"
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="A Expirar"
          value="—"
          sub="próximos 7 dias"
          accent="var(--color-nerv-warning)"
        />
        <StatCard
          icon={<TrendingDown size={16} />}
          label="Stock Baixo"
          value="—"
          sub="abaixo do mínimo"
          accent="var(--color-nerv-danger)"
        />
        <StatCard
          icon={<ShoppingCart size={16} />}
          label="Lista Compras"
          value="—"
          sub="itens pendentes"
        />
        <StatCard
          icon={<Refrigerator size={16} />}
          label="Localizações"
          value="—"
          sub="configuradas"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="Refeições Hoje"
          value="—"
          sub="registadas"
        />
      </div>

      {/* Placeholder sections */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Expiring soon */}
        <div className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-nerv-text)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-nerv-warning)' }} />
            A expirar em breve
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
            Nenhum alerta de validade — adiciona produtos ao inventário para começar.
          </p>
        </div>

        {/* Shopping list */}
        <div className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-nerv-text)' }}>
            <ShoppingCart size={14} />
            Lista de compras
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
            A lista está vazia — o inventário irá gerar sugestões automaticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
