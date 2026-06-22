import type { ExpiryStatus } from './index'

// ─── Filtro de validade ───────────────────────────────────────────
// 'all' = sem filtro; os restantes reutilizam ExpiryStatus de index.ts
export type ExpiryFilterValue = 'all' | ExpiryStatus

// ─── Ordenação ───────────────────────────────────────────────────
export type SortField =
  | 'name'
  | 'expiry'
  | 'purchase_date'
  | 'quantity'
  | 'price'
  | 'location'

export type SortDirection = 'asc' | 'desc'

// ─── Período de compra ───────────────────────────────────────────
export type PurchasePeriod = 'all' | 'week' | 'month' | 'quarter'

// ─── Estado dos filtros ──────────────────────────────────────────
export interface FilterState {
  locations: number[]           // IDs das localizações selecionadas
  expiryStatus: ExpiryFilterValue
  categories: number[]          // IDs das categorias selecionadas
  purchasePeriod: PurchasePeriod
}

// ─── Estado da ordenação ─────────────────────────────────────────
export interface SortState {
  field: SortField
  direction: SortDirection
}

// ─── Valores por omissão ─────────────────────────────────────────
export const DEFAULT_FILTERS: FilterState = {
  locations: [],
  expiryStatus: 'all',
  categories: [],
  purchasePeriod: 'all',
}

export const DEFAULT_SORT: SortState = {
  field: 'expiry',
  direction: 'asc',
}

// ─── Opções dinâmicas ────────────────────────────────────────────
// Uma opção num filtro multi-select com a contagem de itens que a têm
export interface FilterOption {
  id: number
  name: string
  count: number
}

// Todas as opções calculadas a partir dos dados reais em stock
export interface FilterOptions {
  locations: FilterOption[]
  categories: FilterOption[]
}