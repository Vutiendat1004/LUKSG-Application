import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { ThongBao, type SP } from '@/components/ThongBao'
import { luuCauHinh } from '../actions'

export const dynamic = 'force-dynamic'

const NHOM: { ten: string; khoa: string[] }[] = [
  { ten: 'LUK Inn', khoa: ['ten_quan', 'email_quan_ly_inn', 'nhac_23h_gui_nhan_vien', 'thu_kiem_nl', 'thu_kiem_vl', 'he_so_mua_vu', 'so_ngay_hoc', 'ngay_hoc_toi_thieu'] },
  { ten: 'Media SG', khoa: ['email_team_media', 'email_quan_ly_media', 'email_cap_tren', 'han_muon_mac_dinh_ngay', 'tu_dong_khoa_muon', 'so_ngay_khoa_muon', 'so_ngay_tinh_vi_pham'] },
]

export default async function CauHinh({ searchParams }: { searchParams: SP }) {
  await canQuanLy()
  const sp = await searchParams
  const sb = await supabaseServer()
  const { data } = await sb.from('cau_hinh').select('*')
  const map = new Map((data ?? []).map((r) => [r.khoa as string, r]))
  const khac = (data ?? []).filter((r) => !NHOM.some((n) => n.khoa.includes(r.khoa)))

  const o = (k: string) => {
    const r = map.get(k)
    if (!r) return null
    const lua = k.startsWith('thu_kiem') ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] : ['nhac_23h_gui_nhan_vien', 'tu_dong_khoa_muon'].includes(k) ? ['co', 'khong'] : null
    return (
      <div key={k} className="field">
        <label htmlFor={k}>{k.replace(/_/g, ' ')}</label>
        {lua ? (
          <select id={k} name={`ch_${k}`} defaultValue={r.gia_tri ?? ''} className="input">
            {lua.map((x) => <option key={x} value={x}>{x === 'co' ? 'Có' : x === 'khong' ? 'Không' : x}</option>)}
          </select>
        ) : (
          <input id={k} name={`ch_${k}`} defaultValue={r.gia_tri ?? ''} className="input" />
        )}
        <span className="hint">{r.mo_ta}</span>
      </div>
    )
  }

  return (
    <main className="page">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Cấu hình</h1>
      <ThongBao ok={sp.ok} loi={sp.loi} />
      <form action={luuCauHinh} className="stack-lg" style={{ marginTop: 16 }}>
        {NHOM.map((n) => (
          <section key={n.ten} className="stack">
            <h2>{n.ten}</h2>
            {n.khoa.map(o)}
          </section>
        ))}
        {khac.length > 0 && <section className="stack"><h2>Khác</h2>{khac.map((r) => o(r.khoa))}</section>}
        <div className="sticky-submit"><button className="btn primary block">Lưu cấu hình</button></div>
      </form>
    </main>
  )
}
