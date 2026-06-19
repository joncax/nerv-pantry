import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Upload, Camera, X, Check, ChevronDown, Loader2, ScanLine, AlertTriangle } from 'lucide-react'
import { receiptsApi, configApi } from '@/services/api'

type Step = 'upload' | 'processing' | 'review' | 'done'

interface ParsedItem {
  raw_text: string
  parsed_name: string | null
  parsed_quantity: number | null
  unit_guess: string | null
  original_price: number | null
  discount_amount: number | null
  effective_price: number | null
  is_discount_line: boolean
  confidence: number
  // editable
  confirmed: boolean
  add_to_inventory: boolean
  location_id: number | null
}

interface UploadResult {
  receipt_id: number
  detected_store: string | null
  items: ParsedItem[]
  total_items: number
}

export default function Scanner() {
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [items, setItems] = useState<ParsedItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => configApi.getLocations().then(r => r.data),
  })

  const defaultLocationId = locations[0]?.id ?? null

  async function handleFile(file: File) {
    if (!file) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setStep('processing')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await receiptsApi.upload(form)
      const data = res.data as UploadResult
      setResult(data)
      setItems(data.items.map(item => ({
        ...item,
        confirmed: !item.is_discount_line,
        add_to_inventory: !item.is_discount_line,
        location_id: defaultLocationId,
      })))
      setStep('review')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erro ao processar talão.'
      setError(msg)
      setStep('upload')
    }
  }

  async function handleConfirm() {
    if (!result) return
    setConfirming(true)
    try {
      await receiptsApi.confirm(result.receipt_id, {
        items: items.map(item => ({
          ...item,
          parsed_name: item.parsed_name,
          parsed_quantity: item.parsed_quantity || 1,
        })),
      })
      setStep('done')
    } catch {
      setError('Erro ao confirmar talão.')
    } finally {
      setConfirming(false)
    }
  }

  function reset() {
    setStep('upload')
    setPreview(null)
    setResult(null)
    setItems([])
    setError(null)
  }

  function updateItem(idx: number, field: keyof ParsedItem, value: unknown) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const activeItems = items.filter(i => !i.is_discount_line)
  const discountItems = items.filter(i => i.is_discount_line)

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-nerv-text)' }}>
          Scanner de Talões
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-nerv-muted)' }}>
          Fotografa ou carrega um talão para registar compras automaticamente
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border text-sm"
          style={{ borderColor: 'var(--color-nerv-danger)', color: 'var(--color-nerv-danger)', backgroundColor: 'rgba(248,81,73,0.1)' }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* STEP: Upload */}
      {step === 'upload' && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors"
          style={{ borderColor: 'var(--color-nerv-border)', backgroundColor: 'var(--color-nerv-surface)' }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
          <ScanLine size={36} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-muted)' }} />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-nerv-text)' }}>
            Arrasta um talão ou clica para selecionar
          </p>
          <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
            JPG, PNG ou WebP · máximo 10MB
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm"
              style={{ backgroundColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}>
              <Upload size={13} /> Carregar ficheiro
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm"
              style={{ backgroundColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)' }}>
              <Camera size={13} /> Câmara
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {/* STEP: Processing */}
      {step === 'processing' && (
        <div className="rounded-lg border p-8 text-center"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          {preview && <img src={preview} alt="Talão" className="max-h-40 mx-auto rounded mb-4 object-contain" />}
          <Loader2 size={24} className="mx-auto mb-2 animate-spin" style={{ color: 'var(--color-nerv-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
            A processar OCR... pode demorar alguns segundos
          </p>
        </div>
      )}

      {/* STEP: Review */}
      {step === 'review' && result && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center justify-between px-3 py-2 rounded border text-sm"
            style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
            <span style={{ color: 'var(--color-nerv-muted)' }}>
              {result.detected_store
                ? `Loja detetada: ${result.detected_store}`
                : 'Loja não detetada'}
              · {result.total_items} produtos encontrados
            </span>
            <button onClick={reset} style={{ color: 'var(--color-nerv-muted)' }}>
              <X size={14} />
            </button>
          </div>

          {/* Items */}
          <div className="rounded-lg border overflow-hidden"
            style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
            {activeItems.map((item, idx) => (
              <div key={idx} className="px-4 py-3 border-b"
                style={{ borderColor: 'var(--color-nerv-border)', opacity: item.confirmed ? 1 : 0.4 }}>
                <div className="flex items-start gap-2">
                  {/* Toggle confirm */}
                  <button onClick={() => updateItem(items.indexOf(item), 'confirmed', !item.confirmed)}
                    className="mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center"
                    style={{
                      borderColor: item.confirmed ? 'var(--color-nerv-success)' : 'var(--color-nerv-border)',
                      backgroundColor: item.confirmed ? 'var(--color-nerv-success)' : 'transparent',
                    }}>
                    {item.confirmed && <Check size={10} color="white" />}
                  </button>

                  <div className="flex-1 space-y-1.5">
                    {/* Name */}
                    <input
                      value={item.parsed_name ?? ''}
                      onChange={e => updateItem(items.indexOf(item), 'parsed_name', e.target.value)}
                      className="w-full bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-current"
                      style={{ color: 'var(--color-nerv-text)' }}
                    />
                    <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                      {item.raw_text}
                    </p>

                    {/* Quantity + Price + Location */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <span style={{ color: 'var(--color-nerv-muted)' }}>Qtd:</span>
                        <input
                          type="number"
                          value={item.parsed_quantity ?? 1}
                          onChange={e => updateItem(items.indexOf(item), 'parsed_quantity', parseFloat(e.target.value))}
                          className="w-16 bg-transparent border-b outline-none text-center"
                          style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                        />
                        <span style={{ color: 'var(--color-nerv-muted)' }}>{item.unit_guess ?? 'un'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span style={{ color: 'var(--color-nerv-muted)' }}>Preço:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.effective_price ?? item.original_price ?? ''}
                          onChange={e => updateItem(items.indexOf(item), 'effective_price', parseFloat(e.target.value))}
                          className="w-16 bg-transparent border-b outline-none text-center"
                          style={{ color: 'var(--color-nerv-text)', borderColor: 'var(--color-nerv-border)' }}
                        />
                        <span style={{ color: 'var(--color-nerv-muted)' }}>€</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span style={{ color: 'var(--color-nerv-muted)' }}>Local:</span>
                        <select
                          value={item.location_id ?? ''}
                          onChange={e => updateItem(items.indexOf(item), 'location_id', parseInt(e.target.value))}
                          className="bg-transparent text-xs outline-none"
                          style={{ color: 'var(--color-nerv-text)' }}>
                          {locations.map(l => (
                            <option key={l.id} value={l.id} style={{ backgroundColor: 'var(--color-nerv-surface)' }}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={10} style={{ color: 'var(--color-nerv-muted)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Confidence */}
                  <span className="text-xs shrink-0 mt-0.5"
                    style={{ color: item.confidence >= 70 ? 'var(--color-nerv-success)' : 'var(--color-nerv-warning)' }}>
                    {item.confidence}%
                  </span>
                </div>
              </div>
            ))}

            {discountItems.length > 0 && (
              <div className="px-4 py-2 text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                {discountItems.length} linha(s) de desconto ignorada(s)
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 justify-end">
            <button onClick={reset} className="px-3 py-1.5 rounded text-sm"
              style={{ color: 'var(--color-nerv-muted)' }}>
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={confirming}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
              {confirming
                ? <><Loader2 size={13} className="animate-spin" /> A guardar...</>
                : <><Check size={13} /> Confirmar e entrar em stock</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && (
        <div className="rounded-lg border p-8 text-center"
          style={{ backgroundColor: 'var(--color-nerv-surface)', borderColor: 'var(--color-nerv-border)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'rgba(63,185,80,0.15)' }}>
            <Check size={24} style={{ color: 'var(--color-nerv-success)' }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-nerv-text)' }}>
            Talão processado com sucesso!
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--color-nerv-muted)' }}>
            Os produtos foram adicionados ao inventário.
          </p>
          <button onClick={reset}
            className="px-4 py-1.5 rounded text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--color-nerv-accent)' }}>
            Processar outro talão
          </button>
        </div>
      )}
    </div>
  )
}
