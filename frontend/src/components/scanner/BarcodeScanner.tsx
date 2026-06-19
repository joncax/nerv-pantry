import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { X, Camera } from 'lucide-react'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
      if (result) {
        onDetected(result.getText())
      }
      if (err && !(err.name === 'NotFoundException')) {
        setError('Erro ao aceder à câmara. Verifica as permissões.')
      }
    }).catch(() => {
      setError('Câmara não disponível.')
    })

    return () => {
      BrowserMultiFormatReader.releaseAllStreams()
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="relative w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera size={16} style={{ color: 'var(--color-nerv-accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-nerv-text)' }}>
              Aponta para o código de barras
            </span>
          </div>
          <button onClick={onClose}
            className="p-1 rounded"
            style={{ color: 'var(--color-nerv-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative rounded-lg overflow-hidden"
          style={{ backgroundColor: '#000', aspectRatio: '4/3' }}>
          <video ref={videoRef} className="w-full h-full object-cover" />

          {/* Scan line overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-32 relative">
              {/* Corners */}
              {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2',
                'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 ${cls}`}
                  style={{ borderColor: 'var(--color-nerv-accent)' }} />
              ))}
              {/* Animated scan line */}
              <div className="absolute left-2 right-2 h-0.5 animate-bounce"
                style={{ top: '50%', backgroundColor: 'var(--color-nerv-accent)', opacity: 0.8 }} />
            </div>
          </div>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'var(--color-nerv-danger)' }}>
              {error}
            </div>
          )}
        </div>

        <p className="text-xs text-center mt-2" style={{ color: 'var(--color-nerv-muted)' }}>
          EAN-13 · EAN-8 · UPC
        </p>
      </div>
    </div>
  )
}
