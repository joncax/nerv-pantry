import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Search, Filter, Plus, Clock, Trash2, CheckCircle, ScanLine, X, Star } from 'lucide-react'
import { inventoryApi, configApi, productsApi } from '@/services/api'
import BarcodeScanner from '@/components/scanner/BarcodeScanner'
import { FilterPanel } from '@/components/inventory/FilterPanel'
import { InventoryEditModal } from '@/components/inventory/InventoryEditModal'
import { useInventoryFilters } from '@/hooks/useInventoryFilters'
import { formatExpiry, EXPIRY_COLOR_MAP } from '@/utils/expiry'
import type { InventoryItem } from '@/types'

// ─── ExpiryBadge ─────────────────────────────────────────────────

function ExpiryBadge({ date }: { date?: string }) {
  const { label, color } = formatExpiry(date)
  if (color === 'none') return null
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color: EXPIRY_COLOR_MAP[color] }}>
      <Clock size={10} /> {label}
    </span>
  )
}

// ─── ConsumeModal ─────────────────────────────────────────────────

function ConsumeModal({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [qty, setQty] = useState(item.quantity)
  const [type, setType] = useState<'used' | 'finished' | 'wasted'>('used')
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => inventoryApi.consume(item.id, qty, type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
      qc.invalidateQueries({ queryKey: ['shopping'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg border p-5 w-80 space-y-4"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <h3 className="font-medium text-sm" style={{ color: 'var(--color-nerv-text)' }}>
          Consumir — {item.product?.name}
        </h3>
        <div className="space-y-2">
          {[
            { value: 'used',     label: 'Usei parte',    icon: '🔽' },
            { value: 'finished', label: 'Terminei tudo', icon: '✅' },
            { value: 'wasted',   label: 'Desperdicei',   icon: '🗑️' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setType(opt.value as typeof type)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left"
              style={{
                backgroundColor: type === opt.value ? 'var(--color-nerv-border)' : 'transparent',
                color: 'var(--color-nerv-text)',
                border: `1px solid ${type === opt.value ? 'var(--color-nerv-accent)' : 'var(--color-nerv-border)'}`,
              }}>
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        {type === 'used' && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>Quantidade usada:</span>
            <input type="number" step="0.1" min="0.1" max={item.quantity}
              value={qty} onChange={e => setQty(parseFloat(e.target.value))}
              className="flex-1 bg-transparent border rounded px-2 py-1 text-sm text-center outline-none"
              style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
            <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
              {item.unit?.abbreviation}
            </span>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-1.5 rounded text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-1.5 rounded text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            {mutation.isPending ? 'A guardar...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AddProductModal ──────────────────────────────────────────────

function AddProductModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [showScanner, setShowScanner] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: 1, unit_id: 1, location_id: 1, expiry_date: '' })

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => configApi.getLocations().then(r => r.data),
  })
  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => configApi.getUnits().then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const product = await productsApi.create({ name: form.name, consumption_type: 'partial' })
      await inventoryApi.create({
        product_id: product.data.id,
        location_id: form.location_id,
        quantity: form.quantity,
        unit_id: form.unit_id,
        expiry_date: form.expiry_date || undefined,
      } as Parameters<typeof inventoryApi.create>[0])
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      {showScanner && (
        <BarcodeScanner
          onDetected={b => { setForm(f => ({ ...f, name: b })); setShowScanner(false) }}
          onClose={() => setShowScanner(false)} />
      )}
      <div className="rounded-lg border p-5 w-80 space-y-3"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        <h3 className="font-medium text-sm" style={{ color: 'var(--color-nerv-text)' }}>
          Adicionar produto
        </h3>
        <div className="flex gap-2">
          <input placeholder="Nome do produto" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="flex-1 bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
          <button onClick={() => setShowScanner(true)}
            className="p-1.5 rounded border" title="Scanner de barcode"
            style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}>
            <ScanLine size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" step="0.1" placeholder="Qtd" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) }))}
            className="bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
          <select value={form.unit_id}
            onChange={e => setForm(f => ({ ...f, unit_id: parseInt(e.target.value) }))}
            className="bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
            style={{
              borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)',
              backgroundColor: 'var(--color-nerv-surface)',
            }}>
            {units.map(u => <option key={u.id} value={u.id}>{u.abbreviation}</option>)}
          </select>
        </div>
        <select value={form.location_id}
          onChange={e => setForm(f => ({ ...f, location_id: parseInt(e.target.value) }))}
          className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
          style={{
            borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)',
            backgroundColor: 'var(--color-nerv-surface)',
          }}>
          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <input type="date" value={form.expiry_date}
          onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
          className="w-full bg-transparent border rounded px-2 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }} />
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-1.5 rounded text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}
            className="flex-1 py-1.5 rounded text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            {mutation.isPending ? 'A guardar...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── InventoryRow ─────────────────────────────────────────────────

function InventoryRow({ item, onConsume, onEdit }: {
  item: InventoryItem
  onConsume: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void  // U5-D
}) {
  const { color } = formatExpiry(item.expiry_date)
  const qc = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => inventoryApi.delete(item.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['inventory-stats'] })
    },
  })

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => inventoryApi.toggleFavorite(item.product_id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['inventory'] })
      const previous = qc.getQueryData<InventoryItem[]>(['inventory'])
      qc.setQueryData<InventoryItem[]>(['inventory'], (old = []) =>
        old.map(i =>
          i.product_id === item.product_id
            ? { ...i, product_is_favorite: !i.product_is_favorite }
            : i
        )
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['inventory'], context.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })

  const dotColor =
    color === 'danger'  ? 'var(--color-nerv-danger)'  :
    color === 'warning' ? 'var(--color-nerv-warning)'  :
                          'var(--color-nerv-success)'

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b group transition-colors"
      style={{
        borderColor: 'var(--color-nerv-border)',
        backgroundColor: color === 'danger' ? 'rgba(248,81,73,0.05)' : 'transparent',
        cursor: 'pointer',
      }}>

      {/* Ponto de validade */}
      <div className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }} />

      {/* Info — clicável para editar */}
      <div className="flex-1 min-w-0" onClick={() => onEdit(item)}>
        <div className="text-sm font-medium truncate" style={{ color: 'var(--color-nerv-text)' }}>
          {item.product?.name ?? `Produto #${item.product_id}`}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
            {item.location?.name ?? '—'}
          </span>
          <ExpiryBadge date={item.expiry_date} />
        </div>
      </div>

      {/* Quantidade — clicável para editar */}
      <div className="text-sm font-medium shrink-0" onClick={() => onEdit(item)}
        style={{ color: 'var(--color-nerv-text)' }}>
        {item.quantity} {item.unit?.abbreviation ?? ''}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1">
        {/* Estrela */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavoriteMutation.mutate() }}
          title={item.product_is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          disabled={toggleFavoriteMutation.isPending}
          className={`p-1 rounded transition-opacity ${
            item.product_is_favorite ? '' : 'opacity-0 group-hover:opacity-60'
          }`}
          style={{ color: item.product_is_favorite ? '#d29922' : 'var(--color-nerv-muted)' }}>
          <Star size={15} fill={item.product_is_favorite ? '#d29922' : 'none'} />
        </button>

        {/* Consumir + Eliminar */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onConsume(item) }} title="Consumir"
            className="p-1 rounded hover:brightness-125"
            style={{ color: 'var(--color-nerv-success)' }}>
            <CheckCircle size={15} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate() }} title="Eliminar"
            className="p-1 rounded hover:brightness-125"
            style={{ color: 'var(--color-nerv-danger)' }}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [consumeItem, setConsumeItem] = useState<InventoryItem | null>(null)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)  // U5-D

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll().then(r => r.data),
  })

  const {
    filters,
    setFilters,
    sort,
    filteredItems,
    filterOptions,
    activeFilterCount,
    clearAllFilters,
    toggleArrayFilter,
    toggleSort,
    totalItems,
  } = useInventoryFilters(items)

  const displayItems = filteredItems.filter(item =>
    item.product?.name?.toLowerCase().includes(search.toLowerCase())
  )

  const hasAnyFilter = activeFilterCount > 0 || search.length > 0

  const chips: { key: string; label: string; onRemove: () => void }[] = []

  if (filters.favoritesOnly) {
    chips.push({
      key: 'favorites',
      label: '⭐ Favoritos',
      onRemove: () => setFilters({ ...filters, favoritesOnly: false }),
    })
  }
  if (filters.expiryStatus !== 'all') {
    const labels: Record<string, string> = {
      expired: 'Expirado', critical: '≤ 2 dias',
      warning: '≤ 7 dias', ok: '> 7 dias', none: 'Sem data',
    }
    chips.push({
      key: 'expiry',
      label: labels[filters.expiryStatus] ?? filters.expiryStatus,
      onRemove: () => setFilters({ ...filters, expiryStatus: 'all' }),
    })
  }
  filters.locations.forEach(id => {
    const opt = filterOptions.locations.find(o => o.id === id)
    if (opt) chips.push({
      key: `loc-${id}`, label: opt.name,
      onRemove: () => toggleArrayFilter('locations', id),
    })
  })
  filters.categories.forEach(id => {
    const opt = filterOptions.categories.find(o => o.id === id)
    if (opt) chips.push({
      key: `cat-${id}`, label: opt.name,
      onRemove: () => toggleArrayFilter('categories', id),
    })
  })
  if (filters.purchasePeriod !== 'all') {
    const labels: Record<string, string> = {
      week: 'Esta semana', month: 'Este mês', quarter: 'Últimos 3 meses',
    }
    chips.push({
      key: 'period',
      label: labels[filters.purchasePeriod] ?? filters.purchasePeriod,
      onRemove: () => setFilters({ ...filters, purchasePeriod: 'all' }),
    })
  }

  return (
    <div className="space-y-4">
      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} />}
      {consumeItem && <ConsumeModal item={consumeItem} onClose={() => setConsumeItem(null)} />}
      {editItem && <InventoryEditModal item={editItem} onClose={() => setEditItem(null)} />}

      <FilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={filters}
        sort={sort}
        filterOptions={filterOptions}
        activeFilterCount={activeFilterCount}
        onToggleArrayFilter={toggleArrayFilter}
        onSetFilters={f => setFilters(f)}
        onClearAllFilters={clearAllFilters}
        onToggleSort={toggleSort}
      />

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
            Inventário
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
            {hasAnyFilter
              ? `${displayItems.length} de ${totalItems} artigos em stock`
              : `${totalItems} ${totalItems === 1 ? 'artigo' : 'artigos'} em stock`}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Pesquisa + filtros */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <Search size={14} style={{ color: 'var(--color-nerv-muted)' }} />
          <input type="text" placeholder="Pesquisar produtos..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-nerv-text)' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ display: 'flex', color: 'var(--color-nerv-muted)' }}>
              <X size={13} />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilterPanel(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded border text-sm"
          style={{
            backgroundColor: activeFilterCount > 0 ? 'rgba(239,68,68,0.1)' : 'var(--color-nerv-surface)',
            borderColor: activeFilterCount > 0 ? 'var(--color-nerv-accent)' : 'var(--color-nerv-border)',
            color: activeFilterCount > 0 ? 'var(--color-nerv-accent)' : 'var(--color-nerv-muted)',
          }}>
          <Filter size={14} />
          Filtros
          {activeFilterCount > 0 && (
            <span style={{
              background: 'var(--color-nerv-accent)', color: '#fff',
              fontSize: '10px', fontWeight: 600,
              padding: '1px 5px', borderRadius: '20px', lineHeight: '1.4',
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Chips */}
      {chips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map(chip => (
            <span key={chip.key}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ background: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}>
              {chip.label}
              <button onClick={chip.onRemove}
                style={{ display: 'flex', color: 'var(--color-nerv-muted)' }}>
                <X size={11} />
              </button>
            </span>
          ))}
          {chips.length > 1 && (
            <button onClick={() => { clearAllFilters(); setSearch('') }}
              className="text-xs" style={{ color: 'var(--color-nerv-accent)' }}>
              Limpar tudo
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm"
            style={{ color: 'var(--color-nerv-muted)' }}>A carregar...</div>
        ) : displayItems.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Package size={32} className="mx-auto mb-3"
              style={{ color: 'var(--color-nerv-border)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
              {hasAnyFilter ? 'Nenhum resultado para os filtros ativos' : 'Inventário vazio'}
            </p>
            {hasAnyFilter ? (
              <button onClick={() => { clearAllFilters(); setSearch('') }}
                className="text-xs mt-1" style={{ color: 'var(--color-nerv-accent)' }}>
                Limpar filtros
              </button>
            ) : (
              <p className="text-xs mt-1" style={{ color: 'var(--color-nerv-muted)' }}>
                Adiciona o teu primeiro produto para começar.
              </p>
            )}
          </div>
        ) : (
          displayItems.map(item =>
            <InventoryRow
              key={item.id}
              item={item}
              onConsume={setConsumeItem}
              onEdit={setEditItem}
            />
          )
        )}
      </div>
    </div>
  )
}