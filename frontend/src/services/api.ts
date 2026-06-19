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
export const receiptsApi = {
  // Sem Content-Type manual — axios gere o boundary do multipart automaticamente
  upload: (formData: FormData) => api.post('/receipts/upload', formData, {
    headers: { 'Content-Type': undefined },
    timeout: 60000,
  }),
  confirm: (receiptId: number, data: object) =>
    api.post(`/receipts/${receiptId}/confirm`, data),
  getAll: () => api.get('/receipts'),
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

export default api
