import Link from 'next/link'
import { canNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, type MucKey } from '@/lib/muc'
import { gioVN, so } from '@/lib/ngay'
import { NhapForm } from './NhapForm'

export const dynamic = 'force-dynamic'

export default async function NhapHang() {
  await canNhom('inn')
  const sb = await supabaseServer()
  const [mh, gan] = await Promise.all([
    sb.from('mat_hang').select('id, ten, don_vi, muc, dang_dung').eq('dang_dung', true).order('thu_tu').order('ten'),
    sb.from('nhap_hang').select('id, so_luong, thoi_diem, nguoi_ten, mat_hang(ten, don_vi)').order('thoi_diem', { ascending: false }).limit(10),
  ])
  const mon = (mh.data ?? []).map((m) => ({ id: m.id as number, ten: m.ten as string, don_vi: m.don_vi as string, nhom: MUC[m.muc as MucKey].ten }))

  return (
    <main className="page">
      <Link href="/" className="back">‹ Trang chủ</Link>
      <h1>Nhập hàng</h1>
      <p className="muted small" style={{ margin: '6px 0 16px' }}>
        Ghi số hàng vừa về kho. Đơn đặt của món đó sẽ tự chuyển sang “đã nhận”.
      </p>
      <NhapForm mon={mon} />

      <div className="section-head"><h2>Lần nhập gần đây</h2></div>
      {(gan.data ?? []).length === 0 ? (
        <p className="muted">Chưa có.</p>
      ) : (
        <ul className="list">
          {(gan.data ?? []).map((r) => {
            const m = r.mat_hang as unknown as { ten: string; don_vi: string } | null
            return (
              <li key={r.id} className="row">
                <span><b>{m?.ten}</b> · {so(r.so_luong)} {m?.don_vi}</span>
                <span className="spacer" />
                <span className="small muted">{r.nguoi_ten} · {gioVN(r.thoi_diem)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
