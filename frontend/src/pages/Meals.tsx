import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UtensilsCrossed, Loader2, X, Check } from 'lucide-react'
import { mealsApi, mealTypesApi, inventoryApi, configApi } from '@/services/api'

interface MealType { id: number; name: string; default_time: string; icon: string; order: number }
interface InventoryItem { id: number; product?: { id: number; name: string }; quantity: number; unit?: { abbreviation: string } }

function AddMealModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [selectedType, setSelectedType] = useState<number | null>(null)
  const [date, setDate] = useState(today)
  const [selectedItems, setSelectedItems] = useState<{ id: number; name: string; quantity: number; unit_id: number; unit_abbr: string }[]>([])
  const [search, setSearch] = useState('')

  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['meal-types'],
    queryFn: () => mealTypesApi.getAll().then(r => r.data),
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => configApi.getUnits().then(r => r.data),
  })

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
  })

  const filtered = inventory.filter(i =>
    i.product?.name?.toLowerCase().includes(search.toLowerCase()) &&
    !selectedItems.find(s => s.id === i.product?.id)
  )

  function addItem(inv: InventoryItem) {
    if (!inv.product) return
    const unit = units.find(u => u.abbreviation === inv.unit?.abbreviation)
    setSelectedItems(prev => [...prev, {
      id: inv.product!.id,
      name: inv.product!.name,
      quantity: 1,
      unit_id: unit?.id ?? 1,
      unit_abbr: inv.unit?.abbreviation ?? 'un',
    }])
    setSearch('')
  }

  const mutation = useMutation({
    mutationFn: () => mealsApi.create({
      meal_type_id: selectedType,
      date,
      items: selectedItems.map(i => ({
        product_id: i.id,
        quantity: i.quantity,
        unit_id: i.unit_id,
        wasted: false,
      })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals-today'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg border w-full max-w-md mx-4 overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-nerv-text)' }}>
            Registar refeição
          </h3>
          <button onClick={onClose} style={{ color: 'var(--color-nerv-muted)' }}><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Meal type */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--color-nerv-muted)' }}>Tipo de refeição</p>
            <div className="grid grid-cols-3 gap-2">
              {mealTypes.map(mt => (
                <button key={mt.id} onClick={() => setSelectedType(mt.id)}
                  className="py-2 px-1 rounded border text-xs text-center"
                  style={{
                    borderColor: selectedType === mt.id ? 'var(--color-nerv-accent)' : 'var(--color-nerv-border)',
                    backgroundColor: selectedType === mt.id ? 'rgba(239,68,68,0.1)' : 'transparent',
                    color: selectedType === mt.id ? 'var(--color-nerv-accent)' : 'var(--color-nerv-muted)',
                  }}>
                  {mt.icon} {mt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-nerv-muted)' }}>Data</p>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
          </div>

          {/* Product search */}
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--color-nerv-muted)' }}>
              Produtos consumidos ({selectedItems.length})
            </p>
            <input placeholder="Pesquisar no inventário..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none mb-2"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />

            {/* Search results */}
            {search && (
              <div className="rounded border overflow-hidden max-h-32 overflow-y-auto mb-2"
                style={{ borderColor: 'var(--color-nerv-border)' }}>
                {filtered.slice(0, 6).map(inv => (
                  <button key={inv.id} onClick={() => addItem(inv)}
                    className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:brightness-110"
                    style={{ backgroundColor: 'var(--color-nerv-bg)', color: 'var(--color-nerv-text)' }}>
                    <span>{inv.product?.name}</span>
                    <span style={{ color: 'var(--color-nerv-muted)' }}>{inv.quantity} {inv.unit?.abbreviation}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                    Sem resultados no inventário
                  </p>
                )}
              </div>
            )}

            {/* Selected items */}
            {selectedItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 py-1.5 border-b"
                style={{ borderColor: 'var(--color-nerv-border)' }}>
                <span className="flex-1 text-xs truncate" style={{ color: 'var(--color-nerv-text)' }}>
                  {item.name}
                </span>
                <input type="number" step="0.1" min="0.1" value={item.quantity}
                  onChange={e => setSelectedItems(prev => prev.map((s, i) =>
                    i === idx ? { ...s, quantity: parseFloat(e.target.value) } : s
                  ))}
                  className="w-14 bg-transparent border rounded px-1 py-0.5 text-xs text-center outline-none"
                  style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
                <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>{item.unit_abbr}</span>
                <button onClick={() => setSelectedItems(prev => prev.filter((_, i) => i !== idx))}
                  style={{ color: 'var(--color-nerv-muted)' }}><X size={12} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <button onClick={onClose} className="flex-1 py-1.5 rounded text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()}
            disabled={!selectedType || selectedItems.length === 0 || mutation.isPending}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            {mutation.isPending ? <><Loader2 size={13} className="animate-spin" /> A guardar...</> : <><Check size={13} /> Registar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Meals() {
  const [showAdd, setShowAdd] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const { data: mealTypes = [] } = useQuery<MealType[]>({
    queryKey: ['meal-types'],
    queryFn: () => mealTypesApi.getAll().then(r => r.data),
  })

  const { data: todayMeals = [], isLoading } = useQuery({
    queryKey: ['meals-today'],
    queryFn: () => mealsApi.getToday().then(r => r.data),
    refetchInterval: 30_000,
  })

  const mealsByType = mealTypes.map(mt => ({
    ...mt,
    meals: (todayMeals as { meal_type_id: number; items: unknown[] }[]).filter(m => m.meal_type_id === mt.id),
  }))

  return (
    <div className="space-y-4">
      {showAdd && <AddMealModal onClose={() => setShowAdd(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>Refeições</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
            Hoje, {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
          <Plus size={14} /> Registar
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--color-nerv-muted)' }}>A carregar...</div>
      ) : (
        <div className="space-y-3">
          {mealsByType.map(mt => (
            <div key={mt.id} className="rounded-lg border overflow-hidden"
              style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: 'var(--color-nerv-border)' }}>
                <div className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: mt.meals.length > 0 ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)' }}>
                  <span>{mt.icon}</span>
                  <span>{mt.name}</span>
                  <span className="text-xs font-normal" style={{ color: 'var(--color-nerv-muted)' }}>
                    {mt.default_time}
                  </span>
                </div>
                {mt.meals.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(63,185,80,0.15)', color: 'var(--color-nerv-success)' }}>
                    {(mt.meals[0] as { items: unknown[] }).items.length} item(s)
                  </span>
                )}
              </div>
              {mt.meals.length === 0 ? (
                <div className="px-4 py-3 text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                  Ainda não registado
                </div>
              ) : (
                (mt.meals[0] as { items: { id: number; product_id: number; quantity: number }[] }).items.map(item => (
                  <div key={item.id} className="px-4 py-2 border-t flex items-center justify-between text-sm"
                    style={{ borderColor: 'var(--color-nerv-border)' }}>
                    <span style={{ color: 'var(--color-nerv-text)' }}>Produto #{item.product_id}</span>
                    <span style={{ color: 'var(--color-nerv-muted)' }}>{item.quantity}</span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {todayMeals.length === 0 && !isLoading && (
        <div className="text-center py-6">
          <UtensilsCrossed size={32} className="mx-auto mb-2" style={{ color: 'var(--color-nerv-border)' }} />
          <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
            Nenhuma refeição registada hoje.
          </p>
        </div>
      )}
    </div>
  )
}
