import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Check, Loader2, ChevronDown, ChevronUp,
  Plus, Trash2, Save, AlertTriangle, ImageOff,
} from 'lucide-react'
import { receiptsApi, configApi, type ReceiptItem } from '@/services/api'

interface ReceiptReviewProps {
  receiptId: number
  onClose: () => void
  onConfirmed: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// Construct image URL from stored path
function getImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  const filename = imagePath.split('/').pop()
  return filename ? `/api/images/${filename}` : null
}

function formatDate(d: string | null): string {
  if (!d) return ''
  return d.substring(0, 10) // YYYY-MM-DD
}

export default function ReceiptReview({ receiptId, onClose, onConfirmed }: ReceiptReviewProps) {
  const queryClient = useQueryClient()
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const [imageOpen, setImageOpen] = useState(false) // mobile: collapsed by default
  const [storeId, setStoreId] = useState<number | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<string>('')
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', qty: '1', price: '', barcode: '' })
  const [metaSaving, setMetaSaving] = useState(false)
  const metaTimer = useRef<ReturnType<typeof setTimeout>>()

  // Data queries
  const { data: receipt, isLoading: receiptLoading } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: () => receiptsApi.getById(receiptId).then(r => r.data),
  })

  const { data: receiptItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['receipt-items', receiptId],
    queryFn: () => receiptsApi.getItems(receiptId).then(r => r.data as ReceiptItem[]),
  })

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => configApi.getStores().then(r => r.data as { id: number; name: string }[]),
  })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => configApi.getLocations().then(r => r.data as { id: number; name: string }[]),
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => configApi.getUnits().then(r => r.data as { id: number; abbreviation: string; name: string }[]),
  })

  // Sync items from API to local state
  useEffect(() => {
    if (receiptItems) setItems(receiptItems)
  }, [receiptItems])

  // Sync receipt metadata
  useEffect(() => {
    if (receipt) {
      setStoreId(receipt.store_id)
      setPurchaseDate(formatDate(receipt.purchase_date))
    }
  }, [receipt])

  // Auto-save metadata (store + date)
  function saveMetadata(newStoreId: number | null, newDate: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    setMetaSaving(true)
    metaTimer.current = setTimeout(async () => {
      try {
        await receiptsApi.update(receiptId, {
          store_id: newStoreId,
          purchase_date: newDate || null,
        })
      } finally {
        setMetaSaving(false)
      }
    }, 500)
  }

  // Auto-save item field
  function updateItem(itemId: number, field: string, value: unknown) {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: value } : i))

    if (saveTimers.current[itemId]) clearTimeout(saveTimers.current[itemId])
    setSavingIds(prev => new Set([...prev, itemId]))

    saveTimers.current[itemId] = setTimeout(async () => {
      try {
        await receiptsApi.updateItem(receiptId, itemId, { [field]: value })
        setSavingIds(prev => { const s = new Set(prev); s.delete(itemId); return s })
        setSavedIds(prev => new Set([...prev, itemId]))
        setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(itemId); return s }), 1500)
      } catch {
        setSavingIds(prev => { const s = new Set(prev); s.delete(itemId); return s })
      }
    }, 500)
  }

  async function handleDeleteItem(itemId: number) {
    await receiptsApi.deleteItem(receiptId, itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  async function handleAddItem() {
    if (!newItem.name.trim()) return
    const defaultUnit = units.find(u => u.abbreviation === 'un')
    const defaultLocation = locations[0]

    const created = await receiptsApi.addItem(receiptId, {
      parsed_name: newItem.name.trim(),
      parsed_quantity: parseFloat(newItem.qty) || 1,
      effective_price: parseFloat(newItem.price) || undefined,
      unit_id: defaultUnit?.id,
      location_id: defaultLocation?.id,
      barcode: newItem.barcode || undefined,
      add_to_inventory: true,
    })
    setItems(prev => [...prev, created.data as ReceiptItem])
    setNewItem({ name: '', qty: '1', price: '', barcode: '' })
    setShowAddForm(false)
  }

  async function handleConfirm() {
    setError(null)
    setConfirming(true)
    try {
      await receiptsApi.confirm(receiptId, {
        store_id: storeId,
        purchase_date: purchaseDate || null,
      })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      onConfirmed()
    } catch {
      setError('Erro ao confirmar talão. Tenta novamente.')
    } finally {
      setConfirming(false)
    }
  }

  const activeItems = items.filter(i => !i.is_discount_line)
  const discountCount = items.filter(i => i.is_discount_line).length
  const imageUrl = getImageUrl(receipt?.image_path)
  const isLoading = receiptLoading || itemsLoading
  const anySaving = savingIds.size > 0 || metaSaving

  const inputStyle = {
    backgroundColor: 'transparent',
    borderColor: 'var(--color-nerv-border)',
    color: 'var(--color-nerv-text)',
  }

  const selectStyle = {
    backgroundColor: 'var(--color-nerv-surface)',
    borderColor: 'var(--color-nerv-border)',
    color: 'var(--color-nerv-text)',
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} />

      {/* Full-screen panel */}
      <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--color-nerv-bg)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm" style={{ color: 'var(--color-nerv-text)' }}>
              Confirmar Talão #{receiptId}
            </span>
            {anySaving && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                <Loader2 size={11} className="animate-spin" /> A guardar...
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded transition-opacity hover:opacity-70"
            style={{ color: 'var(--color-nerv-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--color-nerv-danger)', color: 'var(--color-nerv-danger)', backgroundColor: 'rgba(248,81,73,0.1)' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-nerv-accent)' }} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

            {/* ── LEFT: Image panel ── */}
            <div className="md:w-2/5 md:border-r shrink-0"
              style={{ borderColor: 'var(--color-nerv-border)' }}>
              {/* Mobile toggle */}
              <button
                className="md:hidden w-full flex items-center justify-between px-4 py-2.5 border-b text-sm"
                style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)', backgroundColor: 'var(--color-nerv-surface)' }}
                onClick={() => setImageOpen(o => !o)}
              >
                <span>🖼️ {imageOpen ? 'Ocultar imagem' : 'Ver imagem do talão'}</span>
                {imageOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <div className={`overflow-auto h-full ${!imageOpen ? 'hidden md:block' : 'block'}`}
                style={{ backgroundColor: 'var(--color-nerv-bg)' }}>
                {imageUrl ? (
                  <img src={imageUrl} alt="Talão"
                    className="w-full object-contain max-h-screen md:max-h-full"
                    style={{ maxHeight: imageOpen ? '40vh' : undefined }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 md:h-full gap-2"
                    style={{ color: 'var(--color-nerv-muted)' }}>
                    <ImageOff size={32} />
                    <span className="text-xs">Imagem não disponível</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: Items panel ── */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-4 space-y-4">

                {/* Metadata: loja + data */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-32">
                    <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Loja</label>
                    <select
                      value={storeId ?? ''}
                      onChange={e => {
                        const v = e.target.value ? Number(e.target.value) : null
                        setStoreId(v)
                        saveMetadata(v, purchaseDate)
                      }}
                      className="text-sm px-2 py-1.5 rounded border"
                      style={selectStyle}
                    >
                      <option value="">— Selecionar loja —</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-32">
                    <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Data de compra</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={e => {
                        setPurchaseDate(e.target.value)
                        saveMetadata(storeId, e.target.value)
                      }}
                      className="text-sm px-2 py-1.5 rounded border"
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t" style={{ borderColor: 'var(--color-nerv-border)' }} />

                {/* Items list */}
                <div className="space-y-3">
                  {activeItems.map(item => {
                    const isSaving = savingIds.has(item.id)
                    const isSaved = savedIds.has(item.id)
                    const inactive = !item.add_to_inventory

                    return (
                      <div key={item.id}
                        className="rounded-lg border p-3 space-y-2 transition-opacity"
                        style={{
                          borderColor: 'var(--color-nerv-border)',
                          backgroundColor: 'var(--color-nerv-surface)',
                          opacity: inactive ? 0.5 : 1,
                        }}>
                        {/* Row 1: checkbox + name + save indicator + delete */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItem(item.id, 'add_to_inventory', !item.add_to_inventory)}
                            className="w-4 h-4 rounded border shrink-0 flex items-center justify-center"
                            style={{
                              borderColor: item.add_to_inventory ? 'var(--color-nerv-success)' : 'var(--color-nerv-border)',
                              backgroundColor: item.add_to_inventory ? 'var(--color-nerv-success)' : 'transparent',
                            }}>
                            {item.add_to_inventory && <Check size={10} color="white" />}
                          </button>
                          <input
                            value={item.parsed_name ?? ''}
                            onChange={e => updateItem(item.id, 'parsed_name', e.target.value)}
                            className="flex-1 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-current"
                            style={{
                              color: 'var(--color-nerv-text)',
                              textDecoration: inactive ? 'line-through' : 'none',
                            }}
                            placeholder="Nome do produto"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            {isSaving && <Loader2 size={11} className="animate-spin" style={{ color: 'var(--color-nerv-muted)' }} />}
                            {isSaved && !isSaving && <Save size={11} style={{ color: 'var(--color-nerv-success)' }} />}
                            <button onClick={() => handleDeleteItem(item.id)}
                              className="p-0.5 transition-opacity hover:opacity-70"
                              style={{ color: 'var(--color-nerv-muted)' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Row 2: qty + unit + price */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span style={{ color: 'var(--color-nerv-muted)' }}>Qtd:</span>
                            <input
                              type="number" step="0.01" min="0"
                              value={item.parsed_quantity ?? 1}
                              onChange={e => updateItem(item.id, 'parsed_quantity', parseFloat(e.target.value) || 1)}
                              className="w-14 bg-transparent border-b outline-none text-center"
                              style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                            />
                            <select
                              value={item.parsed_unit_id ?? ''}
                              onChange={e => updateItem(item.id, 'unit_id', e.target.value ? Number(e.target.value) : null)}
                              className="bg-transparent text-xs outline-none"
                              style={{ color: 'var(--color-nerv-text)' }}>
                              <option value="">un</option>
                              {units.map(u => (
                                <option key={u.id} value={u.id} style={{ backgroundColor: 'var(--color-nerv-surface)' }}>
                                  {u.abbreviation}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-1">
                            <span style={{ color: 'var(--color-nerv-muted)' }}>Preço:</span>
                            <input
                              type="number" step="0.01" min="0"
                              value={item.effective_price ?? item.original_price ?? ''}
                              onChange={e => updateItem(item.id, 'effective_price', parseFloat(e.target.value) || null)}
                              className="w-16 bg-transparent border-b outline-none text-center"
                              style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                            />
                            <span style={{ color: 'var(--color-nerv-muted)' }}>€</span>
                          </div>
                        </div>

                        {/* Row 3: location + expiry + barcode */}
                        {item.add_to_inventory && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <span style={{ color: 'var(--color-nerv-muted)' }}>Local:</span>
                              <select
                                value={item.location_id ?? ''}
                                onChange={e => updateItem(item.id, 'location_id', e.target.value ? Number(e.target.value) : null)}
                                className="bg-transparent text-xs outline-none"
                                style={{ color: 'var(--color-nerv-text)' }}>
                                <option value="">—</option>
                                {locations.map(l => (
                                  <option key={l.id} value={l.id} style={{ backgroundColor: 'var(--color-nerv-surface)' }}>
                                    {l.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-1">
                              <span style={{ color: 'var(--color-nerv-muted)' }}>Validade:</span>
                              <input
                                type="date"
                                value={item.expiry_date ? formatDate(item.expiry_date) : ''}
                                onChange={e => updateItem(item.id, 'expiry_date', e.target.value || null)}
                                className="bg-transparent border-b outline-none text-xs"
                                style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span style={{ color: 'var(--color-nerv-muted)' }}>EAN:</span>
                              <input
                                type="text"
                                value={item.barcode ?? ''}
                                onChange={e => updateItem(item.id, 'barcode', e.target.value || null)}
                                placeholder="opcional"
                                className="w-24 bg-transparent border-b outline-none text-xs"
                                style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Discount lines info */}
                {discountCount > 0 && (
                  <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                    {discountCount} linha(s) de desconto ignorada(s)
                  </p>
                )}

                {/* Add item form */}
                {showAddForm ? (
                  <div className="rounded-lg border p-3 space-y-2"
                    style={{ borderColor: 'var(--color-nerv-border)', backgroundColor: 'var(--color-nerv-surface)' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--color-nerv-muted)' }}>
                      Adicionar produto manual
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Nome do produto"
                        value={newItem.name}
                        onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                        className="flex-1 min-w-32 text-sm px-2 py-1 rounded border outline-none"
                        style={inputStyle}
                      />
                      <input
                        type="number" placeholder="Qtd" value={newItem.qty}
                        onChange={e => setNewItem(p => ({ ...p, qty: e.target.value }))}
                        className="w-16 text-sm px-2 py-1 rounded border outline-none"
                        style={inputStyle}
                      />
                      <input
                        type="number" placeholder="Preço €" value={newItem.price}
                        onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                        className="w-20 text-sm px-2 py-1 rounded border outline-none"
                        style={inputStyle}
                      />
                      <input
                        type="text" placeholder="EAN (opcional)" value={newItem.barcode}
                        onChange={e => setNewItem(p => ({ ...p, barcode: e.target.value }))}
                        className="w-28 text-sm px-2 py-1 rounded border outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddItem}
                        className="px-3 py-1.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
                        Adicionar
                      </button>
                      <button onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 rounded text-xs"
                        style={{ color: 'var(--color-nerv-muted)' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                    style={{ color: 'var(--color-nerv-muted)' }}>
                    <Plus size={13} />
                    Adicionar produto em falta
                  </button>
                )}
              </div>

              {/* Confirm button — sticky at bottom */}
              <div className="sticky bottom-0 p-4 border-t mt-auto"
                style={{ backgroundColor: 'var(--color-nerv-bg)', borderColor: 'var(--color-nerv-border)' }}>
                <button
                  onClick={handleConfirm}
                  disabled={confirming || anySaving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
                  {confirming
                    ? <><Loader2 size={16} className="animate-spin" /> A confirmar...</>
                    : <><Check size={16} /> Confirmar e entrar em stock</>}
                </button>
                {anySaving && (
                  <p className="text-xs text-center mt-1.5" style={{ color: 'var(--color-nerv-muted)' }}>
                    Aguarda o auto-save antes de confirmar...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}