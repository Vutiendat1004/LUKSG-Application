'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ghiKiemKho, type KetQuaDem } from './actions'
import type { MucKey } from '@/lib/muc'

export type MonDem = { id: number; ten: string; don_vi: string; lan_truoc: string | null }

export function CountForm({ muc, mon }: { muc: MucKey; mon: MonDem[] }) {
  const [gt, setGt] = useState<Record<number, string>>({})
  const [kq, setKq] = useState<KetQuaDem | null>(null)
  const [pending, start] = useTransition()
  const daDien = Object.values(gt).filter((v) => v.trim() !== '').length

  function gui() {
    const dong = Object.entries(gt)
      .filter(([, v]) => v.trim() !== '')
      .map(([id, v]) => ({ id: Number(id), so_luong: v }))
    start(async () => {
      const r = await ghiKiemKho(muc, dong)
      setKq(r)
      if (r.ok) {
        setGt({})
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  if (kq?.ok) {
    return (
      <div className="stack">
        <div className="alert ok" role="status">Đã lưu số kiểm kho {kq.so_mon} món. Cảm ơn bạn!</div>
        {kq.can_dat.length > 0 && (
          <div className="card stack">
            <h3>Đã báo quản lý {kq.can_dat.length} món cần đặt</h3>
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              {kq.can_dat.map((c) => (
                <li key={c.ten}>{c.ten}: <b>{c.trang_thai}</b></li>
              ))}
            </ul>
          </div>
        )}
        <div className="row">
          <button className="btn" onClick={() => setKq(null)}>Đếm tiếp</button>
          <Link href="/" className="btn primary">Về trang chủ</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <ul className="count-list">
        {mon.map((m) => {
          const v = gt[m.id] ?? ''
          return (
            <li key={m.id} className="count-row">
              <label htmlFor={`m${m.id}`}>
                <div className="name">{m.ten}</div>
                <div className="prev">{m.lan_truoc ? `Lần trước: ${m.lan_truoc}` : 'Chưa đếm lần nào'}</div>
              </label>
              <div className="count-input">
                <input
                  id={`m${m.id}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  className={v.trim() ? 'filled' : ''}
                  value={v}
                  onChange={(e) => setGt({ ...gt, [m.id]: e.target.value.replace(/[^\d.,]/g, '') })}
                  aria-label={`Số lượng ${m.ten} (${m.don_vi})`}
                />
                <span className="unit">{m.don_vi}</span>
              </div>
            </li>
          )
        })}
      </ul>
      {kq && !kq.ok && <div className="alert err" role="alert" style={{ marginTop: 12 }}>{kq.loi}</div>}
      <div className="sticky-submit">
        <button className="btn inn block" disabled={pending || daDien === 0} onClick={gui}>
          {pending ? 'Đang lưu…' : daDien ? `Lưu kiểm kho · ${daDien}/${mon.length} món` : 'Điền số lượng để lưu'}
        </button>
      </div>
    </>
  )
}
