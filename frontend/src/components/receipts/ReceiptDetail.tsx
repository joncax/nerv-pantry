import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Pencil, Trash2, Loader2, Check,
  AlertTriangle, Save, CheckCircle,
} from 'lucide-react'
import { receiptsApi, configApi, type ReceiptItem } from '@/services/api'

interface ReceiptDetailProps {
  receiptId: number
  onClose: () => void
  onDeleted: () => void
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatDateInput(d: string | null | undefined): string {
  if (!d) return ''
  return d.substring(0, 10)
}

export default function ReceiptDetail({ receiptId, onClose, onDeleted }: ReceiptDetailProps) {
  const queryClient = useQueryClient()
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const [editMode, setEditMode] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [storeId, setStoreId] = useState<number | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const metaTimer = useRef<ReturnType<typeof setTimeout>>()

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
    queryFn: () => configApi.getUnits().then(r => r.data as { id: number; abbreviation: string }[]),
  })

  useEffect(() => {
    if (receiptItems) setItems(receiptItems)
  }, [receiptItems])

  useEffect(() => {
    if (receipt) {
      setStoreId(receipt.store_id)
      setPurchaseDate(formatDateInput(receipt.purchase_date))
    }
  }, [receipt])

  function saveMetadata(newStoreId: number | null, newDate: string) {
    if (metaTimer.current) clearTimeout(metaTimer.current)
    metaTimer.current = setTimeout(async () => {
      await receiptsApi.update(receiptId, {
        store_id: newStoreId,
        purchase_date: newDate || null,
      })
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    }, 500)
  }

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

  async function handleDelete() {
    setDeleting(true)
    try {
      await receiptsApi.delete(receiptId)
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] })
      onDeleted()
    } catch {
      setError('Erro ao apagar o talão.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const isLoading = receiptLoading || itemsLoading
  const activeItems = items.filter(i => !i.is_discount_line)
  const storeName = stores.find(s => s.id === receipt?.store_id)?.name ?? '—'

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
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 z-50
        md:-translate-x-1/2 md:-translate-y-1/2 flex flex-col rounded-t-2xl md:rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'var(--color-nerv-surface)',
          border: '1px solid var(--color-nerv-border)',
          width: 'min(680px, 98vw)',
          maxHeight: '90vh',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} style={{ color: 'var(--color-nerv-success)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-nerv-text)' }}>
              Talão #{receiptId}
            </span>
            {savingIds.size > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-nerv-muted)' }}>
                <Loader2 size={11} className="animate-spin" /> A guardar...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showDeleteConfirm && (
              <>
                <button
                  onClick={() => setEditMode(e => !e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: editMode ? 'var(--color-nerv-border)' : 'transparent',
                    border: `1px solid var(--color-nerv-border)`,
                    color: editMode ? 'var(--color-nerv-text)' : 'var(--color-nerv-muted)',
                  }}>
                  <Pencil size={12} />
                  {editMode ? 'Sair da edição' : 'Editar'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 rounded transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-nerv-danger)' }}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-nerv-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mx-5 mt-3 flex items-center gap-2 px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--color-nerv-danger)', color: 'var(--color-nerv-danger)', backgroundColor: 'rgba(248,81,73,0.1)' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Confirmação de apagar */}
        {showDeleteConfirm && (
          <div className="mx-5 mt-4 p-4 rounded-lg border space-y-3"
            style={{ borderColor: 'var(--color-nerv-danger)', backgroundColor: 'rgba(248,81,73,0.06)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
              Apagar talão #{receiptId}?
            </p>
            <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
              O registo histórico será removido. O stock <strong>não é afetado</strong>.
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-nerv-danger)' }}>
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleting ? 'A apagar...' : 'Apagar talão'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded text-xs"
                style={{ color: 'var(--color-nerv-muted)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-nerv-accent)' }} />
            </div>
          ) : (
            <>
              {/* Metadados */}
              {editMode ? (
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-32">
                    <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Loja</label>
                    <select value={storeId ?? ''} onChange={e => {
                      const v = e.target.value ? Number(e.target.value) : null
                      setStoreId(v); saveMetadata(v, purchaseDate)
                    }} className="text-sm px-2 py-1.5 rounded border" style={selectStyle}>
                      <option value="">— Selecionar —</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-32">
                    <label className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Data de compra</label>
                    <input type="date" value={purchaseDate} onChange={e => {
                      setPurchaseDate(e.target.value); saveMetadata(storeId, e.target.value)
                    }} className="text-sm px-2 py-1.5 rounded border" style={inputStyle} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span style={{ color: 'var(--color-nerv-muted)' }}>
                    Loja: <span style={{ color: 'var(--color-nerv-text)' }}>{storeName}</span>
                  </span>
                  <span style={{ color: 'var(--color-nerv-muted)' }}>
                    Data: <span style={{ color: 'var(--color-nerv-text)' }}>{formatDate(receipt?.purchase_date)}</span>
                  </span>
                  {receipt?.total_amount != null && receipt.total_amount > 0 && (
                    <span style={{ color: 'var(--color-nerv-muted)' }}>
                      Total: <span style={{ color: 'var(--color-nerv-text)' }}>{receipt.total_amount.toFixed(2)}€</span>
                    </span>
                  )}
                  {receipt?.total_savings != null && receipt.total_savings > 0 && (
                    <span style={{ color: 'var(--color-nerv-success)' }}>
                      Poupança: {receipt.total_savings.toFixed(2)}€
                    </span>
                  )}
                </div>
              )}

              {editMode && (
                <p className="text-xs px-3 py-2 rounded"
                  style={{ backgroundColor: 'rgba(210,153,34,0.08)', color: 'var(--color-nerv-warning)' }}>
                  ✏️ Modo edição — alterações guardadas automaticamente. O stock não é afetado.
                </p>
              )}

              <div className="border-t" style={{ borderColor: 'var(--color-nerv-border)' }} />

              {/* Items */}
              <div className="space-y-2">
                {activeItems.map(item => {
                  const inactive = !item.add_to_inventory
                  const isSaving = savingIds.has(item.id)
                  const isSaved = savedIds.has(item.id)
                  const locName = locations.find(l => l.id === item.location_id)?.name ?? '—'
                  const unitAbbr = units.find(u => u.id === item.parsed_unit_id)?.abbreviation ?? 'un'

                  return (
                    <div key={item.id}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-nerv-bg)',
                        opacity: inactive ? 0.45 : 1,
                      }}>
                      <div className="flex-1 space-y-1">
                        {editMode ? (
                          <>
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
                                style={{ color: 'var(--color-nerv-text)' }}
                              />
                              {isSaving && <Loader2 size={11} className="animate-spin" style={{ color: 'var(--color-nerv-muted)' }} />}
                              {isSaved && !isSaving && <Save size={11} style={{ color: 'var(--color-nerv-success)' }} />}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs ml-6">
                              <div className="flex items-center gap-1">
                                <span style={{ color: 'var(--color-nerv-muted)' }}>Qtd:</span>
                                <input type="number" step="0.01" min="0"
                                  value={item.parsed_quantity ?? 1}
                                  onChange={e => updateItem(item.id, 'parsed_quantity', parseFloat(e.target.value) || 1)}
                                  className="w-14 bg-transparent border-b outline-none text-center"
                                  style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                                />
                                <select value={item.parsed_unit_id ?? ''} onChange={e => updateItem(item.id, 'unit_id', e.target.value ? Number(e.target.value) : null)}
                                  className="bg-transparent text-xs outline-none" style={{ color: 'var(--color-nerv-text)' }}>
                                  {units.map(u => <option key={u.id} value={u.id} style={{ backgroundColor: 'var(--color-nerv-surface)' }}>{u.abbreviation}</option>)}
                                </select>
                              </div>
                              <div className="flex items-center gap-1">
                                <span style={{ color: 'var(--color-nerv-muted)' }}>Preço:</span>
                                <input type="number" step="0.01"
                                  value={item.effective_price ?? ''}
                                  onChange={e => updateItem(item.id, 'effective_price', parseFloat(e.target.value) || null)}
                                  className="w-16 bg-transparent border-b outline-none text-center"
                                  style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                                />€
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium"
                              style={{
                                color: 'var(--color-nerv-text)',
                                textDecoration: inactive ? 'line-through' : 'none',
                              }}>
                              {item.parsed_name ?? '—'}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                              {item.parsed_quantity ?? 1} {unitAbbr}
                              {item.effective_price != null ? ` · ${item.effective_price.toFixed(2)}€` : ''}
                              {locName !== '—' ? ` · ${locName}` : ''}
                              {item.expiry_date ? ` · val. ${formatDate(item.expiry_date)}` : ''}
                              {inactive ? ' · não adicionado' : ''}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}