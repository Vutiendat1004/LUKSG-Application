'use client'
import { useEffect, useRef, useState } from 'react'

/** Lấy mã thiết bị từ nội dung QR: link ".../tb/EQ013-02" hoặc chữ "EQ013-02" */
export function maTuQR(text: string): string {
  const t = text.trim()
  const m = t.match(/\/tb\/([^/?#\s]+)/i)
  return decodeURIComponent(m ? m[1] : t).toUpperCase()
}

export function Scanner({ onCode, onClose }: { onCode: (ma: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loi, setLoi] = useState('')
  const last = useRef<{ ma: string; t: number }>({ ma: '', t: 0 })
  const cb = useRef(onCode)
  cb.current = onCode

  useEffect(() => {
    let stop: (() => void) | undefined
    let huy = false
    ;(async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 })
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoRef.current!,
          (result) => {
            if (!result) return
            const ma = maTuQR(result.getText())
            const now = Date.now()
            if (ma === last.current.ma && now - last.current.t < 2500) return
            last.current = { ma, t: now }
            if (navigator.vibrate) navigator.vibrate(60)
            cb.current(ma)
          },
        )
        if (huy) controls.stop()
        else stop = () => controls.stop()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setLoi(
          /Permission|NotAllowed/i.test(msg)
            ? 'Chưa cho phép dùng camera. Vào cài đặt trình duyệt, cho phép camera cho trang này rồi thử lại.'
            : 'Không mở được camera. Bạn có thể gõ mã thiết bị bên dưới.',
        )
      }
    })()
    return () => {
      huy = true
      stop?.()
    }
  }, [])

  return (
    <div className="stack">
      {loi ? (
        <div className="alert warn">{loi}</div>
      ) : (
        <div className="scanner">
          <video ref={videoRef} muted playsInline />
          <div className="frame" aria-hidden />
        </div>
      )}
      <button type="button" className="btn block" onClick={onClose}>Tắt camera</button>
    </div>
  )
}
