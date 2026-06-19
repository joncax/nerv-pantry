import { useQuery } from '@tanstack/react-query'
import { Package, AlertTriangle, ShoppingCart, TrendingDown, Refrigerator, Clock } from 'lucide-react'
import { healthApi, statsApi, configApi } from '@/services/api'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: string
  loading?: boolean
}

function StatCard({ icon, label, value, sub, accent, loading }: StatCardProps) {
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
        {loading ? <span style={{ color: 'var(--color-nerv-border)' }}>—</span> : value}
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => statsApi.getInventory().then(r => r.data),
    refetchInterval: 60_000,
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => configApi.getLocations().then(r => r.data),
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
          value={stats?.total ?? 0}
          sub="no inventário"
          loading={statsLoading}
        />
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="A Expirar"
          value={stats?.expiring_soon ?? 0}
          sub="próximos 7 dias"
          accent={stats?.expiring_soon ? 'var(--color-nerv-warning)' : undefined}
          loading={statsLoading}
        />
        <StatCard
          icon={<TrendingDown size={16} />}
          label="Expirados"
          value={stats?.expired ?? 0}
          sub="remover do stock"
          accent={stats?.expired ? 'var(--color-nerv-danger)' : undefined}
          loading={statsLoading}
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
          value={locations?.length ?? 0}
          sub="configuradas"
        />
        <StatCard
          icon={<Clock size={16} />}
          label="Refeições Hoje"
          value="—"
          sub="registadas"
        />
      </div>

      {/* Alertas */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-nerv-text)' }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-nerv-warning)' }} />
            A expirar em breve
          </h2>
          {stats?.expiring_soon === 0 || !stats ? (
            <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
              Nenhum alerta de validade — tudo em ordem!
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-nerv-warning)' }}>
              {stats.expiring_soon} {stats.expiring_soon === 1 ? 'produto expira' : 'produtos expiram'} nos próximos 7 dias.
            </p>
          )}
        </div>

        <div className="rounded-lg border p-4"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2"
            style={{ color: 'var(--color-nerv-text)' }}>
            <ShoppingCart size={14} />
            Lista de compras
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
            A lista dinâmica será gerada na Fase 5.
          </p>
        </div>
      </div>
    </div>
  )
}
