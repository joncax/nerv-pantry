import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Upload, Camera, X, Check, Loader2, ScanLine,
  AlertTriangle, Clock, ChevronRight,
} from 'lucide-react'
import { receiptsApi } from '@/services/api'

interface ScanModalProps {
  isOpen: boolean
  onClose: () => void
  /** Chamado quando o utilizador quer confirmar agora — passa o receiptId para o split view (U1-G) */
  onConfirmNow: (receiptId: number) => void
}

type ModalStep = 'upload' | 'processing' | 'result'

interface UploadResult {
  receipt_id: number
  detected_store: string | null
  total_items: number
}

export default function ScanModal({ isOpen, onClose, onConfirmNow }: ScanModalProps) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<ModalStep>('upload')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleFile(file: File) {
    if (!file) return
    setError(null)
    setPreview(URL.createObjectURL(file))
    setStep('processing')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await receiptsApi.upload(form)
      const data = res.data as unknown as UploadResult
      setResult(data)
      setStep('result')
      // Atualizar lista de talões em background
      queryClient.invalidateQueries({ queryKey: ['receipts'] })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Erro ao processar talão.'
      setError(msg)
      setStep('upload')
    }
  }

  function reset() {
    setStep('upload')
    setPreview(null)
    setResult(null)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleConfirmLater() {
    // Talão já está guardado como pending — fechar e mostrar na lista
    reset()
    onClose()
  }

  function handleConfirmNow() {
    if (!result) return
    reset()
    onConfirmNow(result.receipt_id)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        onClick={step === 'processing' ? undefined : handleClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--color-nerv-surface)',
          border: '1px solid var(--color-nerv-border)',
          // Desktop: centrado, 560px
          // Mobile: full-screen bottom
          top: 'clamp(5vh, 10vh, 10vh)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(560px, 96vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="relative flex items-center justify-center px-5 py-4 border-b"
          style={{ borderColor: 'var(--color-nerv-border)' }}>
          <div className="flex items-center gap-2 justify-center">
            <ScanLine size={18} style={{ color: 'var(--color-nerv-accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--color-nerv-text)' }}>
              Novo Talão
            </span>
          </div>
          {step !== 'processing' && (
            <button onClick={handleClose}
              className="absolute right-4 p-1 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-nerv-muted)' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border text-sm"
              style={{ borderColor: 'var(--color-nerv-danger)', color: 'var(--color-nerv-danger)', backgroundColor: 'rgba(248,81,73,0.1)' }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors"
                style={{ borderColor: 'var(--color-nerv-border)', backgroundColor: 'var(--color-nerv-bg)' }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              >
                <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-nerv-muted)' }} />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-nerv-text)' }}>
                  Arrasta um talão ou clica para selecionar
                </p>
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                  JPG, PNG ou WebP · máximo 10MB
                </p>
              </div>

              {/* Botão câmara separado (mais visível no mobile) */}
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-opacity hover:opacity-80"
                style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-text)', backgroundColor: 'var(--color-nerv-bg)' }}
              >
                <Camera size={16} />
                Tirar foto com a câmara
              </button>

              {/* Inputs ocultos */}
              <input ref={fileRef} type="file" accept="image/*"
                className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === 'processing' && (
            <div className="py-8 text-center space-y-4">
              {preview && (
                <img src={preview} alt="Talão"
                  className="max-h-36 mx-auto rounded-lg object-contain"
                  style={{ border: '1px solid var(--color-nerv-border)' }} />
              )}
              <div className="space-y-2">
                <Loader2 size={28} className="mx-auto animate-spin" style={{ color: 'var(--color-nerv-accent)' }} />
                <p className="text-sm" style={{ color: 'var(--color-nerv-muted)' }}>
                  A processar OCR... pode demorar alguns segundos
                </p>
              </div>
            </div>
          )}

          {/* ── RESULTADO ── */}
          {step === 'result' && result && (
            <div className="space-y-5">
              {/* Preview da imagem */}
              {preview && (
                <img src={preview} alt="Talão"
                  className="max-h-40 mx-auto rounded-lg object-contain"
                  style={{ border: '1px solid var(--color-nerv-border)' }} />
              )}

              {/* Resumo */}
              <div className="rounded-lg p-4 text-center space-y-1"
                style={{ backgroundColor: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)' }}>
                <div className="flex items-center justify-center gap-2">
                  <Check size={18} style={{ color: 'var(--color-nerv-success)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-nerv-success)' }}>
                    Talão guardado com sucesso
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                  {result.detected_store ? `Loja: ${result.detected_store} · ` : ''}
                  {result.total_items} {result.total_items === 1 ? 'produto detetado' : 'produtos detetados'}
                </p>
              </div>

              {/* Opções */}
              <div className="space-y-2">
                <button
                  onClick={handleConfirmNow}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--color-nerv-accent)' }}
                >
                  <span>Confirmar agora</span>
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={handleConfirmLater}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-opacity hover:opacity-80"
                  style={{ borderColor: 'var(--color-nerv-border)', color: 'var(--color-nerv-muted)', backgroundColor: 'var(--color-nerv-bg)' }}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Clock size={14} style={{ color: 'var(--color-nerv-warning)' }} />
                    <span>Confirmar mais tarde</span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--color-nerv-muted)' }}>
                    Fica nos pendentes
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}