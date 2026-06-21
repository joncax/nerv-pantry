import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Clock, CheckCircle, FileText, ChevronRight, ScanLine } from 'lucide-react'
import { receiptsApi, configApi, type Receipt } from '@/services/api'
import ScanModal from '@/components/receipts/ScanModal'
import ReceiptReview from '@/components/receipts/ReceiptReview'

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function formatMonth(isoMonth: string): string {
  const [year, month] = isoMonth.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const PAGE_SIZE = 20

export default function Taloes() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [reviewReceiptId, setReviewReceiptId] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('current')
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptsApi.getAll().then(r => r.data as Receipt[]),
    refetchInterval: 30_000,
  })

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => configApi.getStores().then(r => r.data as { id: number; name: string }[]),
  })

  const pending = receipts.filter(r => r.status === 'pending')
  const confirmed = receipts.filter(r => r.status === 'confirmed')

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const availableMonths = useMemo(() => {
    const map = new Map<string, number>()
    confirmed.forEach(r => {
      const d = new Date(r.purchase_date ?? r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [confirmed])

  const activeMonth = selectedMonth === 'current' ? currentMonthKey : selectedMonth

  const filteredConfirmed = useMemo(() => {
    return confirmed.filter(r => {
      const d = new Date(r.purchase_date ?? r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthOk = selectedMonth === 'all' || key === activeMonth
      const storeOk = selectedStoreId === 'all' || r.store_id === selectedStoreId
      return monthOk && storeOk
    })
  }, [confirmed, selectedMonth, activeMonth, selectedStoreId])

  const totalPages = Math.ceil(filteredConfirmed.length / PAGE_SIZE)
  const paginatedConfirmed = filteredConfirmed.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function getStoreName(storeId: number | null): string {
    if (!storeId) return '—'
    return stores.find(s => s.id === storeId)?.name ?? '—'
  }

  function handleConfirmNow(receiptId: number) {
    setScanModalOpen(false)
    setReviewReceiptId(receiptId)
    queryClient.invalidateQueries({ queryKey: ['receipts'] })
  }

  function handleScanModalClose() {
    setScanModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['receipts'] })
  }

  const rowStyle = (i: number, total: number) => ({
    backgroundColor: 'var(--color-nerv-surface)',
    borderBottom: i < total - 1 ? '1px solid var(--color-nerv-border)' : 'none',
  })

  return (
    <>
      <ScanModal
        isOpen={scanModalOpen}
        onClose={handleScanModalClose}
        onConfirmNow={handleConfirmNow}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
              Talões
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
              Histórico de compras e talões por confirmar
            </p>
          </div>
          <button
            onClick={() => setScanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}
          >
            <ScanLine size={16} />
            Novo Talão
          </button>
        </div>

        {/* ReceiptReview — split view para confirmar pending */}
        {reviewReceiptId && (
          <ReceiptReview
            receiptId={reviewReceiptId}
            onClose={() => setReviewReceiptId(null)}
            onConfirmed={() => {
              setReviewReceiptId(null)
              queryClient.invalidateQueries({ queryKey: ['receipts'] })
            }}
          />
        )}

        {/* ── PENDENTES ── */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-nerv-muted)' }}>
              Pendentes ({pending.length})
            </h2>
            <div className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--color-nerv-border)' }}>
              {pending.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                  style={rowStyle(i, pending.length)}
                  onClick={() => setReviewReceiptId(r.id)}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={16} style={{ color: 'var(--color-nerv-warning)', flexShrink: 0 }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
                        {getStoreName(r.store_id)} · {formatDate(r.purchase_date ?? r.created_at)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                        Aguarda confirmação
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(210,153,34,0.15)', color: 'var(--color-nerv-warning)' }}>
                      Pendente
                    </span>
                    <ChevronRight size={14} style={{ color: 'var(--color-nerv-muted)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-nerv-muted)' }}>
              Histórico
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1) }}
                className="text-xs px-2 py-1.5 rounded border"
                style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
              >
                <option value="current">{formatMonth(currentMonthKey)}</option>
                {availableMonths
                  .filter(([key]) => key !== currentMonthKey)
                  .map(([key, count]) => (
                    <option key={key} value={key}>{formatMonth(key)} ({count})</option>
                  ))}
                <option value="all">Todos os meses</option>
              </select>

              <select
                value={selectedStoreId}
                onChange={e => { setSelectedStoreId(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1) }}
                className="text-xs px-2 py-1.5 rounded border"
                style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}
              >
                <option value="all">Todas as lojas</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>A carregar...</p>
          ) : paginatedConfirmed.length === 0 ? (
            <div className="rounded-lg border p-8 text-center"
              style={{ borderColor: 'var(--color-nerv-border)', backgroundColor: 'var(--color-nerv-surface)' }}>
              <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--color-nerv-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
                Sem talões confirmados{selectedMonth !== 'all' ? ` em ${formatMonth(activeMonth)}` : ''}.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--color-nerv-border)' }}>
              {paginatedConfirmed.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                  style={rowStyle(i, paginatedConfirmed.length)}
                  onClick={() => navigate(`/taloes/${r.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle size={16} style={{ color: 'var(--color-nerv-success)', flexShrink: 0 }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
                        {getStoreName(r.store_id)} · {formatDate(r.purchase_date ?? r.created_at)}
                      </p>
                      {r.total_amount != null && r.total_amount > 0 && (
                        <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                          {r.total_amount.toFixed(2)}€
                          {r.total_savings && r.total_savings > 0
                            ? ` · poupou ${r.total_savings.toFixed(2)}€` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--color-nerv-muted)' }} />
                </div>
              ))}
            </div>
          )}

          {selectedMonth === 'all' && totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="text-xs px-3 py-1.5 rounded border disabled:opacity-40"
                style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)', backgroundColor: 'var(--color-nerv-surface)' }}
              >← Anterior</button>
              <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="text-xs px-3 py-1.5 rounded border disabled:opacity-40"
                style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)', backgroundColor: 'var(--color-nerv-surface)' }}
              >Seguinte →</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}