import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Package, AlertTriangle, ShoppingCart,
  TrendingDown, Clock, FileText, CheckCircle,
} from 'lucide-react'
import { healthApi, statsApi, receiptsApi, type Receipt } from '@/services/api'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent?: string
  loading?: boolean
  to?: string  // navegação ao clicar
}

function StatCard({ icon, label, value, sub, accent, loading, to }: StatCardProps) {
  const inner = (
    <div
      className="rounded-lg p-4 border h-full"
      style={{
        backgroundColor: 'var(--color-nerv-surface)',
        borderColor: to ? accent ?? 'var(--color-nerv-border)' : 'var(--color-nerv-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-nerv-muted)' }}>
          {label}
        </span>
        <span style={{ color: accent ?? 'var(--color-nerv-muted)' }}>
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: accent ?? 'var(--color-nerv-text)' }}>
        {loading ? <span style={{ color: 'var(--color-nerv-border)' }}>—</span> : value}
      </div>
      {sub && (
        <div className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block transition-opacity hover:opacity-80">
        {inner}
      </Link>
    )
  }
  return inner
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

  const { data: receipts } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.getAll().then(r => r.data),
    refetchInterval: 60_000,
  })

  const pendingCount = (receipts as Receipt[] | undefined)
    ?.filter(r => r.status === 'pending').length ?? 0

  // Cor e ícone do card de pendentes
  const pendingAccent = pendingCount > 0
    ? 'var(--color-nerv-warning)'
    : 'var(--color-nerv-success)'
  const pendingIcon = pendingCount > 0
    ? <FileText size={16} />
    : <CheckCircle size={16} />
  const pendingValue = pendingCount > 0 ? pendingCount : '✓'
  const pendingSub = pendingCount > 0
    ? `${pendingCount === 1 ? 'talão aguarda' : 'talões aguardam'} confirmação`
    : 'todos os talões confirmados'

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

      {/* Stats grid — ordem mobile-first: Pendentes, A Expirar, resto */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

        {/* 1º — Talões Pendentes (prioritário no mobile) */}
        <StatCard
          icon={pendingIcon}
          label="Talões Pendentes"
          value={pendingValue}
          sub={pendingSub}
          accent={pendingAccent}
          to="/taloes"
        />

        {/* 2º — A Expirar (prioritário no mobile) */}
        <StatCard
          icon={<AlertTriangle size={16} />}
          label="A Expirar"
          value={stats?.expiring_soon ?? 0}
          sub="próximos 7 dias"
          accent={stats?.expiring_soon ? 'var(--color-nerv-warning)' : undefined}
          loading={statsLoading}
        />

        {/* 3º — Total em Stock */}
        <StatCard
          icon={<Package size={16} />}
          label="Total em Stock"
          value={stats?.total ?? 0}
          sub="no inventário"
          loading={statsLoading}
        />

        {/* 4º — Expirados */}
        <StatCard
          icon={<TrendingDown size={16} />}
          label="Expirados"
          value={stats?.expired ?? 0}
          sub="remover do stock"
          accent={stats?.expired ? 'var(--color-nerv-danger)' : undefined}
          loading={statsLoading}
        />

        {/* 5º — Lista de Compras */}
        <StatCard
          icon={<ShoppingCart size={16} />}
          label="Lista Compras"
          value="—"
          sub="itens pendentes"
        />

        {/* 6º — Refeições Hoje */}
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
          {!stats || stats.expiring_soon === 0 ? (
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