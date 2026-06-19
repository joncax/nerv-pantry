import { BarChart2 } from 'lucide-react'

export default function Reports() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Relatórios
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          Desperdício, custos e tendências de consumo
        </p>
      </div>
      <div className="rounded-lg border p-12 text-center"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <BarChart2 size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>Em construção — Fase 5</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
          Painel de desperdício alimentar e controlo de custos mensais.
        </p>
      </div>
    </div>
  )
}
