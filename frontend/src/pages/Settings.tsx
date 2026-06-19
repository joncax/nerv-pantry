import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Definições
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          Localizações, categorias e configurações da app
        </p>
      </div>
      <div className="rounded-lg border p-12 text-center"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <SettingsIcon size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>Em construção — Fase 2</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
          Localizações personalizáveis, categorias, unidades e tipos de refeição.
        </p>
      </div>
    </div>
  )
}
