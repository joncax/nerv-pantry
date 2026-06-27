import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { inventoryApi, productsApi, configApi } from '@/services/api'
import type { InventoryItem } from '@/types'

interface Props {
  item: InventoryItem
  onClose: () => void
}

export function InventoryEditModal({ item, onClose }: Props) {
  const qc = useQueryClient()

  // Estado dos campos editáveis
  const [productName, setProductName] = useState(item.product?.name ?? '')
  const [categoryId, setCategoryId]   = useState<number | ''>(item.product?.category_id ?? '')
  const [quantity, setQuantity]       = useState(item.quantity)
  const [locationId, setLocationId]   = useState<number | ''>(item.location_id ?? '')
  const [expiryDate, setExpiryDate]   = useState(item.expiry_date ?? '')

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => configApi.getLocations().then(r => r.data),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => configApi.getCategories().then(r => r.data),
  })

  // Mutação do produto (nome + categoria — cascada a toda a BD)
  const productMutation = useMutation({
    mutationFn: () => productsApi.patch(item.product_id, {
      name: productName.trim() || undefined,
      category_id: categoryId !== '' ? categoryId : undefined,
    }),
  })

  // Mutação do item de inventário (qty, localização, validade)
  const inventoryMutation = useMutation({
    mutationFn: () => inventoryApi.patch(item.id, {
      quantity,
      location_id: locationId !== '' ? locationId : undefined,
      expiry_date: expiryDate || undefined,
    }),
  })

  async function handleSave() {
    await Promise.all([productMutation.mutateAsync(), inventoryMutation.mutateAsync()])
    qc.invalidateQueries({ queryKey: ['inventory'] })
    onClose()
  }

  const isPending = productMutation.isPending || inventoryMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="rounded-lg border w-80 overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}
        onClick={e => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
            Editar produto
          </span>
          <button onClick={onClose} style={{ color: 'var(--color-nerv-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">

          {/* Nome — edição cascada a toda a BD */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
              Nome <span style={{ color: 'var(--color-nerv-warning)', fontSize: '10px' }}>
                (altera em todo o histórico)
              </span>
            </label>
            <input
              value={productName}
              onChange={e => setProductName(e.target.value)}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Categoria</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value !== '' ? parseInt(e.target.value) : '')}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{
                borderColor: 'var(--color-nerv-border)',
                color: 'var(--color-nerv-text)',
                backgroundColor: 'var(--color-nerv-surface)',
              }}>
              <option value="">— Sem categoria —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Quantidade */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Quantidade</label>
            <input
              type="number" step="0.1" min="0"
              value={quantity}
              onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
            />
          </div>

          {/* Localização */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Localização</label>
            <select
              value={locationId}
              onChange={e => setLocationId(e.target.value !== '' ? parseInt(e.target.value) : '')}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{
                borderColor: 'var(--color-nerv-border)',
                color: 'var(--color-nerv-text)',
                backgroundColor: 'var(--color-nerv-surface)',
              }}>
              <option value="">— Sem localização —</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Validade */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Validade</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
            />
          </div>

          {/* Dados de leitura — separador */}
          <div className="pt-1 border-t space-y-2" style={{ borderColor: 'var(--color-nerv-border)' }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-nerv-muted)' }}>
              Informação de compra
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Data</p>
                <p className="text-sm" style={{ color: 'var(--color-nerv-text)' }}>
                  {item.purchase_date ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Preço</p>
                <p className="text-sm" style={{ color: 'var(--color-nerv-text)' }}>
                  {item.purchase_price != null ? `€${item.purchase_price.toFixed(2)}` : '—'}
                </p>
              </div>
              {/* U6-E: loja onde foi comprado */}
              <div className="col-span-2">
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Loja</p>
                <p className="text-sm" style={{ color: 'var(--color-nerv-text)' }}>
                  {item.store?.name ?? '—'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose}
            className="flex-1 py-1.5 rounded text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="flex-1 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            {isPending ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}