import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Store as StoreIcon, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { configApi, type Store } from '@/services/api'

// ─── Secção: Lojas ───────────────────────────────────────────────
function StoresSection() {
  const queryClient = useQueryClient()

  const [editingId, setEditingId]     = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deletingId, setDeletingId]   = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName]         = useState('')

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => configApi.getStores().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) => configApi.createStore({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      setNewName('')
      setShowAddForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      configApi.updateStore(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      setEditingId(null)
      setEditingName('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => configApi.deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] })
      setDeletingId(null)
    },
  })

  const startEdit = (store: Store) => {
    setEditingId(store.id)
    setEditingName(store.name)
    setDeletingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      updateMutation.mutate({ id: editingId, name: editingName.trim() })
    }
  }

  const handleAdd = () => {
    if (newName.trim()) {
      createMutation.mutate(newName.trim())
    }
  }

  const cancelAdd = () => {
    setShowAddForm(false)
    setNewName('')
  }

  return (
    <div className="rounded-lg border overflow-hidden"
      style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>

      {/* Cabeçalho da secção */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--color-nerv-border)' }}>
        <div className="flex items-center gap-2">
          <StoreIcon size={15} style={{ color: 'var(--color-nerv-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
            Lojas
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}>
            {stores.length}
          </span>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); setDeletingId(null) }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--color-nerv-accent)', color: '#fff' }}>
          <Plus size={12} />
          Adicionar
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="px-4 py-8 text-center text-sm"
          style={{ color: 'var(--color-nerv-muted)' }}>
          A carregar...
        </div>
      ) : (
        <div>
          {stores.length === 0 && !showAddForm && (
            <div className="px-4 py-8 text-center text-sm"
              style={{ color: 'var(--color-nerv-muted)' }}>
              Nenhuma loja configurada. Clica em "Adicionar" para começar.
            </div>
          )}

          {stores.map((store, index) => (
            <div key={store.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderTop: index === 0 ? 'none' : `1px solid var(--color-nerv-border)`,
              }}>

              {/* Modo edição */}
              {editingId === store.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="flex-1 text-sm px-2 py-1 rounded border"
                    style={{
                      backgroundColor: 'var(--color-nerv-bg)',
                      borderColor: 'var(--color-nerv-accent)',
                      color: 'var(--color-nerv-text)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={saveEdit}
                    disabled={updateMutation.isPending || !editingName.trim()}
                    title="Guardar"
                    style={{ color: 'var(--color-nerv-success)' }}>
                    <Check size={16} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    title="Cancelar"
                    style={{ color: 'var(--color-nerv-muted)' }}>
                    <X size={16} />
                  </button>
                </>
              ) : deletingId === store.id ? (
                /* Confirmação de eliminação */
                <>
                  <span className="flex-1 text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
                    Eliminar{' '}
                    <strong style={{ color: 'var(--color-nerv-text)' }}>{store.name}</strong>?
                  </span>
                  <button
                    onClick={() => deleteMutation.mutate(store.id)}
                    disabled={deleteMutation.isPending}
                    className="text-xs px-2.5 py-1 rounded font-medium"
                    style={{ backgroundColor: 'var(--color-nerv-danger)', color: '#fff' }}>
                    Eliminar
                  </button>
                  <button
                    onClick={() => setDeletingId(null)}
                    className="text-xs px-2.5 py-1 rounded font-medium"
                    style={{ backgroundColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)' }}>
                    Cancelar
                  </button>
                </>
              ) : (
                /* Modo normal */
                <>
                  <span className="flex-1 text-sm" style={{ color: 'var(--color-nerv-text)' }}>
                    {store.name}
                  </span>
                  <button
                    onClick={() => startEdit(store)}
                    title="Editar"
                    className="transition-opacity hover:opacity-100 opacity-50"
                    style={{ color: 'var(--color-nerv-muted)' }}>
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { setDeletingId(store.id); setEditingId(null) }}
                    title="Eliminar"
                    className="transition-opacity hover:opacity-100 opacity-50"
                    style={{ color: 'var(--color-nerv-muted)' }}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Formulário de adição inline */}
          {showAddForm && (
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: `1px solid var(--color-nerv-border)` }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') cancelAdd()
                }}
                placeholder="Nome da loja"
                className="flex-1 text-sm px-2 py-1 rounded border"
                style={{
                  backgroundColor: 'var(--color-nerv-bg)',
                  borderColor: 'var(--color-nerv-accent)',
                  color: 'var(--color-nerv-text)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAdd}
                disabled={createMutation.isPending || !newName.trim()}
                title="Guardar"
                style={{ color: 'var(--color-nerv-success)' }}>
                <Check size={16} />
              </button>
              <button
                onClick={cancelAdd}
                title="Cancelar"
                style={{ color: 'var(--color-nerv-muted)' }}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


// ─── Página principal ────────────────────────────────────────────
export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Definições
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          Configurações e dados de referência da aplicação
        </p>
      </div>

      {/* Secções */}
      <StoresSection />

    </div>
  )
}