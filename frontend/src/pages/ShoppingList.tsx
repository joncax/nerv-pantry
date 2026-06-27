import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingCart, Plus, Trash2, Star, AlertCircle, X, Send, Pencil,
} from 'lucide-react'
import { shoppingListApi, productsApi } from '@/services/api'
import { FavoritesTable } from '@/components/shopping/FavoritesTable'
import type { ShoppingListGrouped } from '@/types'

// ─── Utilitários ──────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  if (priority !== 'high') return null
  return (
    <span className="text-xs px-1.5 py-0.5 rounded"
      style={{ backgroundColor: 'rgba(248,81,73,0.15)', color: 'var(--color-nerv-danger)' }}>
      urgente
    </span>
  )
}

function TriggerBadge({ trigger }: { trigger?: string | null }) {
  if (trigger === 'favorite') {
    return (
      <span className="flex items-center gap-0.5 text-xs" style={{ color: '#d29922' }}>
        <Star size={10} fill="#d29922" /> favorito
      </span>
    )
  }
  if (trigger === 'min_stock') {
    return (
      <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
        stock mínimo
      </span>
    )
  }
  return null
}

// ─── Modal de adição manual ───────────────────────────────────────

function AddManualModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'text' | 'product'>('text')
  const [text, setText] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{ id: number; name: string } | null>(null)

  const { data: rawProducts = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['products-search', productSearch],
    queryFn: () => productsApi.getAll({ search: productSearch }).then(r => r.data),
    enabled: productSearch.length > 1,
  })

  // U6-A: deduplicate — o OCR pode criar múltiplas entradas com o mesmo nome
  // Remove duplicados por id (JOINs no backend) e por nome normalizado (re-scans)
  const products = useMemo(() => {
    const seenIds = new Set<number>()
    const seenNames = new Set<string>()
    return rawProducts.filter(p => {
      if (seenIds.has(p.id)) return false
      const nameKey = p.name.trim().toLowerCase()
      if (seenNames.has(nameKey)) return false
      seenIds.add(p.id)
      seenNames.add(nameKey)
      return true
    })
  }, [rawProducts])

  const mutation = useMutation({
    mutationFn: () => shoppingListApi.add(
      mode === 'product' && selectedProduct
        ? { product_id: selectedProduct.id, name: selectedProduct.name }
        : { name: text.trim() }
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shopping'] }); onClose() },
  })

  const canSubmit = mode === 'text' ? text.trim().length > 0 : selectedProduct !== null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}>
      <div className="rounded-lg border w-80 overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
            Adicionar à lista
          </span>
          <button onClick={onClose} style={{ color: 'var(--color-nerv-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex rounded overflow-hidden border"
            style={{ borderColor: 'var(--color-nerv-border)' }}>
            {(['text', 'product'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: mode === m ? 'var(--color-nerv-border)' : 'transparent',
                  color: mode === m ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)',
                }}>
                {m === 'text' ? 'Texto livre' : 'Produto existente'}
              </button>
            ))}
          </div>

          {mode === 'text' ? (
            <input
              autoFocus
              placeholder="Ex: Detergente roupa..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && canSubmit) mutation.mutate() }}
              className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
            />
          ) : (
            <div>
              {!selectedProduct ? (
                <>
                  <input
                    autoFocus
                    placeholder="Pesquisar produto..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
                    style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
                  />
                  {products.length > 0 && (
                    <div className="mt-1 rounded border overflow-hidden max-h-36 overflow-y-auto"
                      style={{ borderColor: 'var(--color-nerv-border)' }}>
                      {products.map(p => (
                        <button key={p.id} onClick={() => setSelectedProduct(p)}
                          className="w-full px-3 py-2 text-left text-sm"
                          style={{ backgroundColor: 'var(--color-nerv-bg)', color: 'var(--color-nerv-text)' }}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between px-2 py-1.5 rounded border"
                  style={{ borderColor: 'var(--color-nerv-border)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-nerv-text)' }}>
                    {selectedProduct.name}
                  </span>
                  <button onClick={() => setSelectedProduct(null)}
                    style={{ color: 'var(--color-nerv-muted)', display: 'flex' }}>
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-4">
          <button onClick={onClose} className="flex-1 py-1.5 rounded text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            className="flex-1 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            {mutation.isPending ? 'A guardar...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 1 — Lista inteligente ────────────────────────────────────

function ListaTab() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [quickText, setQuickText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)  // U6-C
  const [editingName, setEditingName] = useState('')                        // U6-C

  const { data, isLoading } = useQuery<ShoppingListGrouped>({
    queryKey: ['shopping'],
    queryFn: () => shoppingListApi.getAll().then(r => r.data),
  })

  const auto   = data?.auto   ?? []
  const manual = data?.manual ?? []
  const total  = auto.length + manual.length

  const quickAddMutation = useMutation({
    mutationFn: (name: string) => shoppingListApi.add({ name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopping'] })
      setQuickText('')
      inputRef.current?.focus()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shoppingListApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })

  // U6-C: edição inline do nome
  const patchMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      shoppingListApi.patch(id, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopping'] })
      setEditingItemId(null)
    },
  })

  function handleStartEdit(id: number, currentName: string) {
    setEditingItemId(id)
    setEditingName(currentName)
  }

  function handleSaveEdit(id: number) {
    const trimmed = editingName.trim()
    if (trimmed) {
      patchMutation.mutate({ id, name: trimmed })
    } else {
      setEditingItemId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
        A carregar...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showAdd && <AddManualModal onClose={() => setShowAdd(false)} />}

      {/* Quick add */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Adicionar item rápido..."
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && quickText.trim()) quickAddMutation.mutate(quickText.trim()) }}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-nerv-text)' }}
          />
          {quickText && (
            <button onClick={() => setQuickText('')}
              style={{ display: 'flex', color: 'var(--color-nerv-muted)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={() => quickAddMutation.mutate(quickText.trim())}
          disabled={!quickText.trim() || quickAddMutation.isPending}
          className="px-3 py-2 rounded border disabled:opacity-40"
          style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}>
          <Send size={14} />
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-2 rounded text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
          <Plus size={14} />
        </button>
      </div>

      {/* Lista vazia */}
      {total === 0 && (
        <div className="rounded-lg border py-12 text-center"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <ShoppingCart size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-border)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>Lista vazia</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
            Os itens aparecem automaticamente quando um favorito desce abaixo do mínimo de stock.
          </p>
        </div>
      )}

      {/* Auto-gerados */}
      {auto.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-nerv-muted)' }}>
            Auto-gerados ({auto.length})
          </p>
          <div className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
            {auto.map((item, idx) => (
              <div key={item.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: idx < auto.length - 1 ? '1px solid var(--color-nerv-border)' : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                  backgroundColor: item.priority === 'high'
                    ? 'var(--color-nerv-danger)' : 'var(--color-nerv-warning)',
                }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-nerv-text)' }}>
                    {item.name ?? item.product?.name ?? `Produto #${item.product_id}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <TriggerBadge trigger={item.trigger_type} />
                    <PriorityBadge priority={item.priority} />
                  </div>
                </div>
                {item.estimated_price != null && (
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-nerv-muted)' }}>
                    ~€{item.estimated_price.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs mt-1.5 flex items-center gap-1"
            style={{ color: 'var(--color-nerv-muted)' }}>
            <AlertCircle size={10} />
            Removidos automaticamente ao confirmar um talão com este produto.
          </p>
        </div>
      )}

      {/* Manuais */}
      {manual.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2"
            style={{ color: 'var(--color-nerv-muted)' }}>
            Adições manuais ({manual.length})
          </p>
          <div className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
            {manual.map((item, idx) => {
              const displayName = item.name ?? item.product?.name ?? `Produto #${item.product_id}`
              const isEditing = editingItemId === item.id
              const isSavingThis = patchMutation.isPending && editingItemId === item.id

              return (
              <div key={item.id}
                className="flex items-center gap-3 px-4 py-3 group"
                style={{ borderBottom: idx < manual.length - 1 ? '1px solid var(--color-nerv-border)' : 'none' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--color-nerv-border)' }} />

                {/* U6-C: toggle edição/visualização */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onBlur={() => handleSaveEdit(item.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveEdit(item.id)
                      if (e.key === 'Escape') setEditingItemId(null)
                    }}
                    disabled={isSavingThis}
                    className="flex-1 bg-transparent text-sm outline-none border-b disabled:opacity-50"
                    style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-accent)' }}
                  />
                ) : (
                  <p
                    className="flex-1 text-sm truncate cursor-pointer"
                    title="Clica para editar"
                    onClick={() => handleStartEdit(item.id, displayName)}
                    style={{ color: 'var(--color-nerv-text)' }}>
                    {displayName}
                  </p>
                )}

                {/* Botão editar (visível no hover, escondido quando a editar) */}
                {!isEditing && (
                  <button
                    onClick={() => handleStartEdit(item.id, displayName)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded shrink-0"
                    style={{ color: 'var(--color-nerv-muted)' }}>
                    <Pencil size={12} />
                  </button>
                )}

                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={isEditing}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded shrink-0 disabled:opacity-0"
                  style={{ color: 'var(--color-nerv-danger)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2 — Favoritos (U5-F) ─────────────────────────────────────

function FavoritosTab() {
  return <FavoritesTable />
}

// ─── Página principal ─────────────────────────────────────────────

export default function ShoppingList() {
  const [activeTab, setActiveTab] = useState<'lista' | 'favoritos'>('lista')

  const { data } = useQuery<ShoppingListGrouped>({
    queryKey: ['shopping'],
    queryFn: () => shoppingListApi.getAll().then(r => r.data),
  })

  const totalPending = (data?.auto.length ?? 0) + (data?.manual.length ?? 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Lista de Compras
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          {totalPending > 0
            ? `${totalPending} ${totalPending === 1 ? 'item' : 'itens'} pendente${totalPending === 1 ? '' : 's'}`
            : 'Lista vazia'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-nerv-border)' }}>
        {([
          { key: 'lista',     label: 'Lista' },
          { key: 'favoritos', label: 'Favoritos' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderBottomColor: activeTab === tab.key ? 'var(--color-nerv-accent)' : 'transparent',
              color: activeTab === tab.key ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)',
              marginBottom: '-1px',
            }}>
            {tab.label}
            {tab.key === 'lista' && totalPending > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--color-nerv-accent)', color: '#fff', fontSize: '10px' }}>
                {totalPending}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'lista' ? <ListaTab /> : <FavoritosTab />}
    </div>
  )
}