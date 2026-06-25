import type { ExpiryStatus } from './index'

export type ExpiryFilterValue = 'all' | ExpiryStatus

export type SortField =
  | 'name'
  | 'expiry'
  | 'purchase_date'
  | 'quantity'
  | 'price'
  | 'location'

export type SortDirection = 'asc' | 'desc'

export type PurchasePeriod = 'all' | 'week' | 'month' | 'quarter'

export interface FilterState {
  locations: number[]
  expiryStatus: ExpiryFilterValue
  categories: number[]
  purchasePeriod: PurchasePeriod
  // U5-C
  favoritesOnly: boolean
}

export interface SortState {
  field: SortField
  direction: SortDirection
}

export const DEFAULT_FILTERS: FilterState = {
  locations: [],
  expiryStatus: 'all',
  categories: [],
  purchasePeriod: 'all',
  // U5-C
  favoritesOnly: false,
}

export const DEFAULT_SORT: SortState = {
  field: 'expiry',
  direction: 'asc',
}

export interface FilterOption {
  id: number
  name: string
  count: number
}

export interface FilterOptions {
  locations: FilterOption[]
  categories: FilterOption[]
}