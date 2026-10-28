'use client'
import { useState } from 'react'

export function CopyButton({ text, label = 'Sao chép' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      className="btn sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setOk(true)
          setTimeout(() => setOk(false), 1600)
        } catch {
          window.prompt('Sao chép nội dung:', text)
        }
      }}
    >
      {ok ? 'Đã chép' : label}
    </button>
  )
}
