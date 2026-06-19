import { UtensilsCrossed } from 'lucide-react'

export default function Meals() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Refeições
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          Registo de consumo por refeição
        </p>
      </div>
      <div className="rounded-lg border p-12 text-center"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <UtensilsCrossed size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>Em construção — Fase 4</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
          Pequeno-almoço, Almoço, Lanche e Jantar — registo em tempo real ou fim do dia.
        </p>
      </div>
    </div>
  )
}
