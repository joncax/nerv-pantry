import { useState, useMemo } from 'react'
import type { InventoryItem } from '@/types'
import type {
  FilterState,
  FilterOptions,
  ExpiryFilterValue,
  SortField,
  SortState,
} from '@/types/filters'
import { DEFAULT_FILTERS, DEFAULT_SORT } from '@/types/filters'

// ─── Utilitários de validade ──────────────────────────────────────

function getExpiryDays(expiryDate?: string): number | null {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function matchesExpiryFilter(item: InventoryItem, filter: ExpiryFilterValue): boolean {
  if (filter === 'all') return true
  const days = getExpiryDays(item.expiry_date)
  if (filter === 'none') return days === null
  if (days === null) return false
  if (filter === 'expired') return days < 0
  if (filter === 'critical') return days >= 0 && days <= 2
  if (filter === 'warning') return days > 2 && days <= 7
  if (filter === 'ok') return days > 7
  return true
}

// ─── Utilitário de período de compra ─────────────────────────────

function matchesPurchasePeriod(item: InventoryItem, period: string): boolean {
  if (period === 'all') return true
  if (!item.purchase_date) return false
  const today = new Date()
  const purchase = new Date(item.purchase_date)
  const diffDays = Math.floor(
    (today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (period === 'week')    return diffDays <= 7
  if (period === 'month')   return diffDays <= 30
  if (period === 'quarter') return diffDays <= 90
  return true
}

// ─── Hook principal ───────────────────────────────────────────────

export function useInventoryFilters(items: InventoryItem[]) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [sort, setSort]       = useState<SortState>(DEFAULT_SORT)

  // Opções dinâmicas — só mostra localizações/categorias com itens em stock
  const filterOptions: FilterOptions = useMemo(() => {
    const locationMap = new Map<number, { name: string; count: number }>()
    const categoryMap = new Map<number, { name: string; count: number }>()

    for (const item of items) {
      if (item.location) {
        const entry = locationMap.get(item.location_id)
        if (entry) {
          entry.count++
        } else {
          locationMap.set(item.location_id, { name: item.location.name, count: 1 })
        }
      }

      if (item.product?.category_id != null && item.product.category) {
        const catId = item.product.category_id
        const entry = categoryMap.get(catId)
        if (entry) {
          entry.count++
        } else {
          categoryMap.set(catId, { name: item.product.category.name, count: 1 })
        }
      }
    }

    const toSorted = (map: Map<number, { name: string; count: number }>) =>
      [...map.entries()]
        .map(([id, { name, count }]) => ({ id, name, count }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt'))

    return {
      locations: toSorted(locationMap),
      categories: toSorted(categoryMap),
    }
  }, [items])

  // Filtragem + ordenação aplicadas
  const filteredItems = useMemo(() => {
    let result = [...items]

    if (filters.locations.length > 0) {
      result = result.filter(item => filters.locations.includes(item.location_id))
    }

    if (filters.expiryStatus !== 'all') {
      result = result.filter(item => matchesExpiryFilter(item, filters.expiryStatus))
    }

    if (filters.categories.length > 0) {
      result = result.filter(
        item =>
          item.product?.category_id != null &&
          filters.categories.includes(item.product.category_id)
      )
    }

    if (filters.purchasePeriod !== 'all') {
      result = result.filter(item => matchesPurchasePeriod(item, filters.purchasePeriod))
    }

    result.sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1

      switch (sort.field) {
        case 'name':
          return dir * (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'pt')

        case 'expiry': {
          const dA = getExpiryDays(a.expiry_date)
          const dB = getExpiryDays(b.expiry_date)
          if (dA === null && dB === null) return 0
          if (dA === null) return 1   // sem validade vai para o fundo
          if (dB === null) return -1
          return dir * (dA - dB)
        }

        case 'purchase_date': {
          const tA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0
          const tB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0
          return dir * (tA - tB)
        }

        case 'quantity':
          return dir * (a.quantity - b.quantity)

        case 'price': {
          const pA = a.purchase_price ?? 0
          const pB = b.purchase_price ?? 0
          return dir * (pA - pB)
        }

        case 'location':
          return dir * (a.location?.name ?? '').localeCompare(b.location?.name ?? '', 'pt')

        default:
          return 0
      }
    })

    return result
  }, [items, filters, sort])

  // Contagem de filtros ativos (para o badge no botão)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.locations.length > 0)  count++
    if (filters.expiryStatus !== 'all') count++
    if (filters.categories.length > 0) count++
    if (filters.purchasePeriod !== 'all') count++
    return count
  }, [filters])

  // ─── Funções de manipulação ───────────────────────────────────

  const toggleArrayFilter = (key: 'locations' | 'categories', id: number) => {
    setFilters(prev => {
      const current = prev[key]
      const next = current.includes(id)
        ? current.filter(v => v !== id)
        : [...current, id]
      return { ...prev, [key]: next }
    })
  }

  const clearFilter = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: DEFAULT_FILTERS[key] }))
  }

  const clearAllFilters = () => setFilters(DEFAULT_FILTERS)

  const toggleSort = (field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return {
    // Estado atual
    filters,
    setFilters,
    sort,
    // Dados calculados
    filteredItems,
    filterOptions,
    totalItems: items.length,
    activeFilterCount,
    // Ações
    toggleArrayFilter,
    clearFilter,
    clearAllFilters,
    toggleSort,
  }
}