import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, Plus, Check, Trash2, Sparkles, Copy, RefreshCw } from 'lucide-react'
import { shoppingListApi, productsApi, configApi } from '@/services/api'
import type { ShoppingListItem } from '@/types'

function AddItemModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null)
  const [qty, setQty] = useState(1)
  const [unitId, setUnitId] = useState(1)

  const { data: products = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['products', productSearch],
    queryFn: () => productsApi.getAll({ search: productSearch }).then(r => r.data),
    enabled: productSearch.length > 1,
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => configApi.getUnits().then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => shoppingListApi.add({
      product_id: selectedProduct!.id,
      quantity_needed: qty,
      unit_id: unitId,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg border p-5 w-80 space-y-3"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <h3 className="font-medium text-sm" style={{ color: 'var(--color-nerv-text)' }}>
          Adicionar à lista
        </h3>

        {!selectedProduct ? (
          <div>
            <input placeholder="Pesquisar produto..." value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
            {products.length > 0 && (
              <div className="mt-1 rounded border overflow-hidden max-h-40 overflow-y-auto"
                style={{ borderColor: 'var(--color-nerv-border)' }}>
                {products.map(p => (
                  <button key={p.id} onClick={() => setSelectedProduct(p)}
                    className="w-full px-3 py-2 text-left text-sm hover:brightness-110"
                    style={{ backgroundColor: 'var(--color-nerv-bg)', color: 'var(--color-nerv-text)' }}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 py-1.5 rounded border"
              style={{ borderColor: 'var(--color-nerv-border)' }}>
              <span className="text-sm" style={{ color: 'var(--color-nerv-text)' }}>{selectedProduct.name}</span>
              <button onClick={() => setSelectedProduct(null)}
                className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>✕</button>
            </div>
            <div className="flex gap-2">
              <input type="number" step="0.1" min="0.1" value={qty}
                onChange={e => setQty(parseFloat(e.target.value))}
                className="flex-1 bg-transparent border rounded px-2 py-1.5 text-sm text-center outline-none"
                style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
              <select value={unitId} onChange={e => setUnitId(parseInt(e.target.value))}
                className="flex-1 bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
                style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)', backgroundColor: 'var(--color-nerv-surface)' }}>
                {units.map((u: { id: number; name: string; abbreviation: string }) => (
                  <option key={u.id} value={u.id}>{u.abbreviation}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-1.5 rounded text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()}
            disabled={!selectedProduct || mutation.isPending}
            className="flex-1 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            {mutation.isPending ? 'A guardar...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ShoppingList() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: items = [], isLoading } = useQuery<ShoppingListItem[]>({
    queryKey: ['shopping'],
    queryFn: () => shoppingListApi.getAll().then(r => [...r.data.auto, ...r.data.manual]),
  })

  const checkMutation = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      shoppingListApi.patch(id, { checked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => shoppingListApi.patch(id, { completed: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shoppingListApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const generateMutation = useMutation({
    mutationFn: () => shoppingListApi.generate(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })

  const pending = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked && !i.completed)

  const estimatedTotal = items
    .filter(i => i.estimated_price)
    .reduce((sum, i) => sum + (i.estimated_price ?? 0) * (i.quantity_needed ?? 1), 0)

  function copyList() {
    const lines = ['🛒 Lista de Compras — nerv-pantry', '']
    pending.forEach(item => {
      const label = item.name ?? item.product?.name ?? `Produto #${item.product_id}`
      lines.push(`□ ${label} × ${item.quantity_needed ?? 1}`)
    })
    if (estimatedTotal > 0) lines.push(`\nEstimativa: ~€${estimatedTotal.toFixed(2)}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      {showAdd && <AddItemModal onClose={() => setShowAdd(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
            Lista de Compras
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
            {pending.length} pendente(s)
            {estimatedTotal > 0 && ` · ~€${estimatedTotal.toFixed(2)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border"
            style={{ borderColor: 'var(--color-nerv-border)', color: copied ? 'var(--color-nerv-success)' : 'var(--color-nerv-muted)' }}>
            <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border"
            style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}
            title="Gerar automaticamente">
            <Sparkles size={13} /> Gerar
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      {/* Mensagem geração */}
      {generateMutation.isSuccess && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded"
          style={{ backgroundColor: 'rgba(63,185,80,0.1)', color: 'var(--color-nerv-success)' }}>
          <RefreshCw size={13} />
          {(generateMutation.data?.data as { message?: string })?.message ?? 'Lista gerada'}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
          A carregar...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-12 text-center"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <ShoppingCart size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>Lista vazia</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--color-nerv-muted)' }}>
            Adiciona itens manualmente ou usa "Gerar" para criar automaticamente com base no stock.
          </p>
          <button onClick={() => generateMutation.mutate()}
            className="px-4 py-1.5 rounded text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            <Sparkles size={13} className="inline mr-1" /> Gerar lista
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pendentes */}
          {pending.length > 0 && (
            <div className="rounded-lg border overflow-hidden"
              style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
              {pending.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 px-4 py-3 border-b group"
                  style={{ borderColor: 'var(--color-nerv-border)' }}>
                  <button onClick={() => checkMutation.mutate({ id: item.id, checked: true })}
                    className="w-5 h-5 rounded border shrink-0 flex items-center justify-center"
                    style={{ borderColor: 'var(--color-nerv-border)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--color-nerv-text)' }}>
                      {item.name ?? item.product?.name ?? `Produto #${item.product_id}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                        × {item.quantity_needed ?? 1}
                      </span>
                      {item.added_automatically && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: 'rgba(88,166,255,0.15)', color: '#58a6ff' }}>
                          auto
                        </span>
                      )}
                      {item.priority === 'high' && (
                        <span className="text-xs" style={{ color: 'var(--color-nerv-danger)' }}>urgente</span>
                      )}
                    </div>
                  </div>
                  {item.estimated_price && (
                    <span className="text-xs shrink-0" style={{ color: 'var(--color-nerv-muted)' }}>
                      ~€{item.estimated_price.toFixed(2)}
                    </span>
                  )}
                  <button onClick={() => deleteMutation.mutate(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1"
                    style={{ color: 'var(--color-nerv-danger)' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Marcados */}
          {checked.length > 0 && (
            <div className="rounded-lg border overflow-hidden opacity-60"
              style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
              <div className="px-4 py-2 text-xs font-medium border-b flex items-center justify-between"
                style={{ color: 'var(--color-nerv-muted)', borderColor: 'var(--color-nerv-border)' }}>
                <span>No cesto ({checked.length})</span>
                <button onClick={() => checked.forEach(i => completeMutation.mutate(i.id))}
                  className="flex items-center gap-1 text-xs"
                  style={{ color: 'var(--color-nerv-success)' }}>
                  <Check size={11} /> Concluir todos
                </button>
              </div>
              {checked.map(item => (
                <div key={item.id}
                  className="flex items-center gap-3 px-4 py-3 border-b"
                  style={{ borderColor: 'var(--color-nerv-border)' }}>
                  <button onClick={() => checkMutation.mutate({ id: item.id, checked: false })}
                    className="w-5 h-5 rounded border flex items-center justify-center"
                    style={{ borderColor: 'var(--color-nerv-success)', backgroundColor: 'var(--color-nerv-success)' }}>
                    <Check size={11} color="white" />
                  </button>
                  <p className="flex-1 text-sm line-through" style={{ color: 'var(--color-nerv-muted)' }}>
                    {item.name ?? item.product?.name ?? `Produto #${item.product_id}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}