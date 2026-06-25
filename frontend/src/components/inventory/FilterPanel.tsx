import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X, ArrowUp, ArrowDown, Check, Star } from 'lucide-react'
import type {
  FilterState,
  FilterOptions,
  SortField,
  SortState,
  ExpiryFilterValue,
  PurchasePeriod,
} from '@/types/filters'

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'name',          label: 'Nome' },
  { field: 'expiry',        label: 'Validade' },
  { field: 'purchase_date', label: 'Data de compra' },
  { field: 'quantity',      label: 'Quantidade' },
  { field: 'price',         label: 'Preço' },
  { field: 'location',      label: 'Localização' },
]

const EXPIRY_OPTIONS: { value: ExpiryFilterValue; label: string; color: string }[] = [
  { value: 'expired',  label: 'Expirado', color: 'var(--color-nerv-danger)' },
  { value: 'critical', label: '≤ 2 dias', color: 'var(--color-nerv-danger)' },
  { value: 'warning',  label: '≤ 7 dias', color: 'var(--color-nerv-warning)' },
  { value: 'ok',       label: '> 7 dias', color: 'var(--color-nerv-success)' },
  { value: 'none',     label: 'Sem data', color: 'var(--color-nerv-muted)' },
]

const PERIOD_OPTIONS: { value: PurchasePeriod; label: string }[] = [
  { value: 'week',    label: 'Esta semana' },
  { value: 'month',   label: 'Este mês' },
  { value: 'quarter', label: 'Últimos 3 meses' },
]

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  sort: SortState
  filterOptions: FilterOptions
  activeFilterCount: number
  onToggleArrayFilter: (key: 'locations' | 'categories', id: number) => void
  onSetFilters: (filters: FilterState) => void
  onClearAllFilters: () => void
  onToggleSort: (field: SortField) => void
}

export function FilterPanel({
  isOpen,
  onClose,
  filters,
  sort,
  filterOptions,
  activeFilterCount,
  onToggleArrayFilter,
  onSetFilters,
  onClearAllFilters,
  onToggleSort,
}: FilterPanelProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const panelStyle = isMobile
    ? {
        position: 'fixed' as const,
        bottom: 0, left: 0, right: 0,
        maxHeight: '85vh',
        borderRadius: '12px 12px 0 0',
        borderTop: '1px solid var(--color-nerv-border)',
      }
    : {
        position: 'fixed' as const,
        top: 0, right: 0, bottom: 0,
        width: '320px',
        borderLeft: '1px solid var(--color-nerv-border)',
      }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />
      <div style={{
        ...panelStyle,
        background: 'var(--color-nerv-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-nerv-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--color-nerv-text)', fontWeight: 500 }}>Filtros</span>
            {activeFilterCount > 0 && (
              <span style={{
                background: 'var(--color-nerv-accent)', color: '#fff',
                fontSize: '11px', fontWeight: 500, padding: '1px 7px', borderRadius: '20px',
              }}>
                {activeFilterCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeFilterCount > 0 && (
              <button onClick={onClearAllFilters}
                style={{ color: 'var(--color-nerv-accent)', fontSize: '13px' }}>
                Limpar tudo
              </button>
            )}
            <button onClick={onClose} style={{ color: 'var(--color-nerv-muted)', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Ordenar por */}
          <FilterSection title="Ordenar por">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {SORT_OPTIONS.map(opt => {
                const isActive = sort.field === opt.field
                return (
                  <button key={opt.field} onClick={() => onToggleSort(opt.field)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: '6px', fontSize: '12px',
                      background: isActive ? 'var(--color-nerv-border)' : 'var(--color-nerv-bg)',
                      color: isActive ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)',
                      border: `1px solid ${isActive ? 'var(--color-nerv-accent)' : 'var(--color-nerv-border)'}`,
                      cursor: 'pointer',
                    }}>
                    {opt.label}
                    {isActive && (
                      sort.direction === 'asc'
                        ? <ArrowUp size={11} style={{ color: 'var(--color-nerv-accent)', flexShrink: 0 }} />
                        : <ArrowDown size={11} style={{ color: 'var(--color-nerv-accent)', flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>
          </FilterSection>

          {/* U5-C — Favoritos */}
          <FilterSection
            title="Favoritos"
            hasActiveFilter={filters.favoritesOnly}
            onClear={() => onSetFilters({ ...filters, favoritesOnly: false })}
          >
            <button
              onClick={() => onSetFilters({ ...filters, favoritesOnly: !filters.favoritesOnly })}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: '7px 10px', borderRadius: '6px', fontSize: '12px',
                background: filters.favoritesOnly ? 'var(--color-nerv-border)' : 'var(--color-nerv-bg)',
                color: filters.favoritesOnly ? '#d29922' : 'var(--color-nerv-muted)',
                border: `1px solid ${filters.favoritesOnly ? '#d29922' : 'var(--color-nerv-border)'}`,
                cursor: 'pointer',
              }}>
              <Star size={13} fill={filters.favoritesOnly ? '#d29922' : 'none'}
                style={{ color: '#d29922', flexShrink: 0 }} />
              Mostrar só favoritos
            </button>
          </FilterSection>

          {/* Prazo de validade */}
          <FilterSection
            title="Prazo de validade"
            hasActiveFilter={filters.expiryStatus !== 'all'}
            onClear={() => onSetFilters({ ...filters, expiryStatus: 'all' })}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EXPIRY_OPTIONS.map(opt => {
                const isActive = filters.expiryStatus === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => onSetFilters({ ...filters, expiryStatus: isActive ? 'all' : opt.value })}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                      background: isActive ? 'var(--color-nerv-border)' : 'var(--color-nerv-bg)',
                      color: isActive ? opt.color : 'var(--color-nerv-muted)',
                      border: `1px solid ${isActive ? opt.color : 'var(--color-nerv-border)'}`,
                      cursor: 'pointer',
                    }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </FilterSection>

          {/* Localização */}
          {filterOptions.locations.length > 0 && (
            <FilterSection
              title="Localização"
              hasActiveFilter={filters.locations.length > 0}
              onClear={() => onSetFilters({ ...filters, locations: [] })}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filterOptions.locations.map(opt => (
                  <CheckboxRow key={opt.id} label={opt.name} count={opt.count}
                    checked={filters.locations.includes(opt.id)}
                    onChange={() => onToggleArrayFilter('locations', opt.id)} />
                ))}
              </div>
            </FilterSection>
          )}

          {/* Categoria */}
          {filterOptions.categories.length > 0 && (
            <FilterSection
              title="Categoria"
              hasActiveFilter={filters.categories.length > 0}
              onClear={() => onSetFilters({ ...filters, categories: [] })}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filterOptions.categories.map(opt => (
                  <CheckboxRow key={opt.id} label={opt.name} count={opt.count}
                    checked={filters.categories.includes(opt.id)}
                    onChange={() => onToggleArrayFilter('categories', opt.id)} />
                ))}
              </div>
            </FilterSection>
          )}

          {/* Data de compra */}
          <FilterSection
            title="Data de compra"
            hasActiveFilter={filters.purchasePeriod !== 'all'}
            onClear={() => onSetFilters({ ...filters, purchasePeriod: 'all' })}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {PERIOD_OPTIONS.map(opt => {
                const isActive = filters.purchasePeriod === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => onSetFilters({ ...filters, purchasePeriod: isActive ? 'all' : opt.value })}
                    style={{
                      padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                      background: isActive ? 'var(--color-nerv-border)' : 'var(--color-nerv-bg)',
                      color: isActive ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)',
                      border: `1px solid ${isActive ? 'var(--color-nerv-accent)' : 'var(--color-nerv-border)'}`,
                      cursor: 'pointer',
                    }}>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </FilterSection>

        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, children, hasActiveFilter, onClear }: {
  title: string; children: ReactNode; hasActiveFilter?: boolean; onClear?: () => void
}) {
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-nerv-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--color-nerv-muted)',
        }}>
          {title}
        </span>
        {hasActiveFilter && onClear && (
          <button onClick={onClear}
            style={{ fontSize: '12px', color: 'var(--color-nerv-accent)', cursor: 'pointer' }}>
            Limpar
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function CheckboxRow({ label, count, checked, onChange }: {
  label: string; count: number; checked: boolean; onChange: () => void
}) {
  return (
    <button onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '7px 8px', borderRadius: '6px',
        background: checked ? 'var(--color-nerv-border)' : 'transparent',
        cursor: 'pointer', border: 'none',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '16px', height: '16px', flexShrink: 0, borderRadius: '4px',
          border: `1px solid ${checked ? 'var(--color-nerv-accent)' : 'var(--color-nerv-border)'}`,
          background: checked ? 'var(--color-nerv-accent)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {checked && <Check size={10} style={{ color: '#fff' }} />}
        </div>
        <span style={{ fontSize: '13px', color: checked ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--color-nerv-muted)' }}>{count}</span>
    </button>
  )
}