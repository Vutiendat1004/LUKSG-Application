'use client'
import { useMemo, useState, useTransition } from 'react'
import { ghiNhapHang } from './actions'

type Mon = { id: number; ten: string; don_vi: string; nhom: string }

function boDau(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

export function NhapForm({ mon }: { mon: Mon[] }) {
  const [tim, setTim] = useState('')
  const [gt, setGt] = useState<Record<number, string>>({})
  const [ghiChu, setGhiChu] = useState('')
  const [tb, setTb] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const loc = useMemo(() => {
    const q = boDau(tim.trim())
    return q ? mon.filter((m) => boDau(m.ten).includes(q)) : mon
  }, [tim, mon])
  const daDien = Object.entries(gt).filter(([, v]) => v.trim() !== '')

  function gui() {
    start(async () => {
      const r = await ghiNhapHang(daDien.map(([id, v]) => ({ id: Number(id), so_luong: v })), ghiChu)
      if (r.ok) {
        setGt({})
        setGhiChu('')
        setTim('')
        setTb({ ok: true, text: `Đã ghi nhập ${r.so_mon} món.` })
      } else setTb({ ok: false, text: r.loi })
    })
  }

  return (
    <div className="stack">
      {tb && <div className={`alert ${tb.ok ? 'ok' : 'err'}`} role="status">{tb.text}</div>}
      <input className="input" placeholder="Tìm món…" value={tim} onChange={(e) => setTim(e.target.value)} aria-label="Tìm món" />
      <ul className="count-list">
        {loc.map((m) => {
          const v = gt[m.id] ?? ''
          return (
            <li key={m.id} className="count-row">
              <label htmlFor={`n${m.id}`}>
                <div className="name">{m.ten}</div>
                <div className="prev">{m.nhom}</div>
              </label>
              <div className="count-input">
                <input
                  id={`n${m.id}`}
                  inputMode="decimal"
                  autoComplete="off"
                  className={v.trim() ? 'filled' : ''}
                  value={v}
                  onChange={(e) => setGt({ ...gt, [m.id]: e.target.value.replace(/[^\d.,]/g, '') })}
                />
                <span className="unit">{m.don_vi}</span>
              </div>
            </li>
          )
        })}
        {loc.length === 0 && <li className="count-row muted">Không thấy món nào khớp “{tim}”.</li>}
      </ul>
      <div className="field">
        <label htmlFor="gc">Ghi chú (không bắt buộc)</label>
        <input id="gc" className="input" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Vd: thiếu 1 thùng, hẹn giao bù" />
      </div>
      <div className="sticky-submit">
        <button className="btn inn block" disabled={pending || daDien.length === 0} onClick={gui}>
          {pending ? 'Đang lưu…' : daDien.length ? `Ghi nhập ${daDien.length} món` : 'Điền số lượng để ghi'}
        </button>
      </div>
    </div>
  )
}
