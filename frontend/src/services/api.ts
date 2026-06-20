import axios from 'axios'
import type { HealthResponse, InventoryItem, Product, Location, Category, Unit, ShoppingListItem } from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ─── Health ──────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get<HealthResponse>('/health'),
}

// ─── Inventory ───────────────────────────────────────────────────
export const inventoryApi = {
  getAll: (params?: { location_id?: number; category_id?: number; expiring_soon?: boolean }) =>
    api.get<InventoryItem[]>('/inventory', { params }),
  getById: (id: number) => api.get<InventoryItem>(`/inventory/${id}`),
  create: (data: Partial<InventoryItem>) => api.post<InventoryItem>('/inventory', data),
  update: (id: number, data: Partial<InventoryItem>) => api.put<InventoryItem>(`/inventory/${id}`, data),
  consume: (id: number, quantity: number, type: 'used' | 'finished' | 'wasted') =>
    api.post(`/inventory/${id}/consume`, { quantity, type }),
  delete: (id: number) => api.delete(`/inventory/${id}`),
}

// ─── Products ────────────────────────────────────────────────────
export const productsApi = {
  getAll: (params?: { search?: string; category_id?: number }) =>
    api.get<Product[]>('/products', { params }),
  getById: (id: number) => api.get<Product>(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get<Product>(`/products/barcode/${barcode}`),
  create: (data: Partial<Product>) => api.post<Product>('/products', data),
  update: (id: number, data: Partial<Product>) => api.put<Product>(`/products/${id}`, data),
}

// ─── Config ──────────────────────────────────────────────────────
export const configApi = {
  getLocations: () => api.get<Location[]>('/locations'),
  createLocation: (data: Partial<Location>) => api.post<Location>('/locations', data),
  updateLocation: (id: number, data: Partial<Location>) => api.put<Location>(`/locations/${id}`, data),
  deleteLocation: (id: number) => api.delete(`/locations/${id}`),
  getCategories: () => api.get<Category[]>('/categories'),
  createCategory: (data: Partial<Category>) => api.post<Category>('/categories', data),
  getUnits: () => api.get<Unit[]>('/units'),
}

// ─── Shopping ────────────────────────────────────────────────────
export const shoppingApi = {
  getList: () => api.get<ShoppingListItem[]>('/shopping'),
  addItem: (data: Partial<ShoppingListItem>) => api.post<ShoppingListItem>('/shopping', data),
  checkItem: (id: number, checked: boolean) => api.patch(`/shopping/${id}`, { checked }),
  completeItem: (id: number) => api.patch(`/shopping/${id}/complete`),
  deleteItem: (id: number) => api.delete(`/shopping/${id}`),
}

// ─── Stats ───────────────────────────────────────────────────────
export interface InventoryStats {
  total: number
  expiring_soon: number
  expired: number
}

export const statsApi = {
  getInventory: () => api.get<InventoryStats>('/inventory/stats'),
  getLocations: () => configApi.getLocations(),
}

// ─── Receipts ────────────────────────────────────────────────────

export interface Receipt {
  id: number
  store_id: number | null
  purchase_date: string | null
  total_amount: number | null
  total_savings: number | null
  image_path: string | null
  status: 'pending' | 'confirmed' | 'error'
  processed_at: string | null
  created_at: string
}

export interface ReceiptItem {
  id: number
  receipt_id: number
  raw_text: string | null
  parsed_name: string | null
  parsed_quantity: number | null
  parsed_unit_id: number | null
  unit_guess: string | null
  original_price: number | null
  discount_amount: number | null
  discount_type: string | null
  effective_price: number | null
  product_id: number | null
  is_discount_line: boolean
  confirmed: boolean
  add_to_inventory: boolean
  is_manual: boolean
  created_at: string
}

export const receiptsApi = {
  // Upload + OCR
  upload: (formData: FormData) => api.post<Receipt>('/receipts/upload', formData, {
    headers: { 'Content-Type': undefined },
    timeout: 60000,
  }),

  // Listar e obter talões
  getAll: () => api.get<Receipt[]>('/receipts'),
  getById: (id: number) => api.get<Receipt>(`/receipts/${id}`),

  // Confirmar talão (novo fluxo: sem items no body)
  confirm: (id: number, data: { store_id?: number | null; purchase_date?: string | null }) =>
    api.post<Receipt>(`/receipts/${id}/confirm`, data),

  // Editar e apagar talão (U1-B)
  update: (id: number, data: { store_id?: number | null; purchase_date?: string | null }) =>
    api.put<Receipt>(`/receipts/${id}`, data),
  delete: (id: number) => api.delete(`/receipts/${id}`),

  // Items do talão (U1-B)
  getItems: (id: number) => api.get<ReceiptItem[]>(`/receipts/${id}/items`),
  addItem: (id: number, data: {
    parsed_name: string
    parsed_quantity?: number
    unit_id?: number
    unit_guess?: string
    original_price?: number
    effective_price?: number
    add_to_inventory?: boolean
  }) => api.post<ReceiptItem>(`/receipts/${id}/items`, data),
  updateItem: (id: number, itemId: number, data: Partial<{
    parsed_name: string
    parsed_quantity: number
    unit_id: number
    unit_guess: string
    original_price: number
    effective_price: number
    add_to_inventory: boolean
    confirmed: boolean
  }>) => api.put<ReceiptItem>(`/receipts/${id}/items/${itemId}`, data),
  deleteItem: (id: number, itemId: number) =>
    api.delete(`/receipts/${id}/items/${itemId}`),
}

// ─── Barcode ─────────────────────────────────────────────────────
export const barcodeApi = {
  lookup: (barcode: string) => api.get(`/barcode/${barcode}`),
}

// ─── Meals ───────────────────────────────────────────────────────
export const mealsApi = {
  getToday: () => api.get('/meals/today'),
  getByDate: (date: string) => api.get(`/meals?meal_date=${date}`),
  create: (data: object) => api.post('/meals', data),
  delete: (id: number) => api.delete(`/meals/${id}`),
}

export const mealTypesApi = {
  getAll: () => api.get('/meal-types'),
}

// ─── Shopping List ────────────────────────────────────────────────
export const shoppingListApi = {
  getAll: () => api.get('/shopping'),
  add: (data: object) => api.post('/shopping', data),
  patch: (id: number, data: object) => api.patch(`/shopping/${id}`, data),
  delete: (id: number) => api.delete(`/shopping/${id}`),
  clearCompleted: () => api.delete('/shopping/completed/clear'),
  generate: () => api.post('/shopping/generate'),
}

// ─── Reports ─────────────────────────────────────────────────────
export const reportsApi = {
  getSummary: () => api.get('/reports/summary'),
  getCostHistory: (months?: number) => api.get(`/reports/costs${months ? `?months=${months}` : ''}`),
}

export default api