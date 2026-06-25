export type ExpiryColor = 'danger' | 'warning' | 'ok' | 'none'

export interface ExpiryFormat {
  label: string
  color: ExpiryColor
}

export function formatExpiry(expiryDate?: string): ExpiryFormat {
  if (!expiryDate) return { label: 'Sem validade', color: 'none' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000)

  if (days < 0)  return { label: 'Expirado', color: 'danger' }
  if (days === 0) return { label: 'Hoje!',    color: 'danger' }
  if (days === 1) return { label: '1 dia',    color: 'danger' }
  if (days <= 7)  return { label: `${days} dias`, color: 'warning' }

  const months = Math.round(days / 30)
  if (days <= 30) return { label: `${days} dias`, color: 'ok' }
  return { label: `${months} ${months === 1 ? 'mês' : 'meses'}`, color: 'ok' }
}

export const EXPIRY_COLOR_MAP: Record<ExpiryColor, string> = {
  danger:  'var(--color-nerv-danger)',
  warning: 'var(--color-nerv-warning)',
  ok:      'var(--color-nerv-muted)',
  none:    'transparent',
}