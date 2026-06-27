// ─── Configuration ───────────────────────────────────────────────
export interface Location {
  id: number
  name: string
  icon?: string
  color?: string
}

export interface Category {
  id: number
  name: string
  icon?: string
  color?: string
}

export interface Unit {
  id: number
  name: string
  abbreviation: string
  type: 'unidade' | 'peso' | 'volume'
}

export interface Store {
  id: number
  name: string
  parser_config?: string
}

export interface MealType {
  id: number
  name: string
  default_time?: string
  icon?: string
  order: number
}

// ─── Products ────────────────────────────────────────────────────
export interface Product {
  id: number
  name: string
  brand?: string
  barcode?: string
  category_id?: number
  category?: Category
  default_location_id?: number
  default_location?: Location
  default_unit_id?: number
  default_unit?: Unit
  default_quantity?: number
  consumption_type: 'single_use' | 'partial' | 'fresh_perishable'
  perishable_days?: number
  alert_days_before: number
  min_stock_quantity?: number
  // U5-A
  is_favorite: boolean
  created_at: string
}

// ─── Inventory ───────────────────────────────────────────────────
export interface InventoryItem {
  id: number
  product_id: number
  product?: Product
  location_id: number
  location?: Location
  quantity: number
  unit_id: number
  unit?: Unit
  expiry_date?: string
  purchase_date?: string
  purchase_price?: number
  notes?: string
  // U5-A
  product_is_favorite: boolean
  // U6-E
  store?: Store | null
  created_at: string
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'ok' | 'none'

// ─── Receipts ────────────────────────────────────────────────────
export interface Receipt {
  id: number
  store_id?: number
  store?: Store
  purchase_date?: string
  total_amount?: number
  total_savings?: number
  image_path?: string
  status: 'pending' | 'confirmed' | 'error'
  processed_at?: string
  created_at: string
}

export interface ReceiptItem {
  id: number
  receipt_id: number
  raw_text?: string
  parsed_name?: string
  parsed_quantity?: number
  original_price?: number
  discount_amount?: number
  discount_type?: 'cartao' | 'promocao' | 'pack' | 'outro'
  effective_price?: number
  product_id?: number
  product?: Product
  is_discount_line: boolean
  confirmed: boolean
}

// ─── Meals ───────────────────────────────────────────────────────
export interface Meal {
  id: number
  meal_type_id: number
  meal_type?: MealType
  date: string
  time?: string
  notes?: string
  items?: MealItem[]
}

export interface MealItem {
  id: number
  meal_id: number
  product_id: number
  product?: Product
  quantity: number
  unit_id: number
  unit?: Unit
  wasted: boolean
}

// ─── Shopping ────────────────────────────────────────────────────
export interface ShoppingListItem {
  id: number
  product_id?: number | null
  product?: Product
  name?: string | null
  quantity_needed?: number | null
  unit_id?: number | null
  unit?: Unit
  priority: 'high' | 'medium' | 'low'
  added_automatically: boolean
  trigger_type?: string | null
  estimated_price?: number | null
  checked: boolean
  completed: boolean
  completed_at?: string | null
  created_at: string
}

// U5-B: resposta agrupada do GET /shopping
export interface ShoppingListGrouped {
  auto: ShoppingListItem[]
  manual: ShoppingListItem[]
}

// ─── API ─────────────────────────────────────────────────────────
export interface HealthResponse {
  status: string
  app: string
  version: string
  db: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}