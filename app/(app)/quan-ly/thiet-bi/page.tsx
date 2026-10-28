import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { TRANG_THAI_TB, lopTrangThaiTB } from '@/lib/muc'
import { ngayVN, tien, homNay } from '@/lib/ngay'
import { ThongBao, type SP } from '@/components/ThongBao'

export const dynamic = 'force-dynamic'

export default async function DSThietBi({ searchParams }: { searchParams: SP }) {
  await canQuanLy()
  const sp = await searchParams
  const tt = sp.tt && (TRANG_THAI_TB as readonly string[]).includes(sp.tt) ? sp.tt : sp.tt === 'qua-han' ? 'qua-han' : ''
  const tim = (sp.q ?? '').trim()
  const sb = await supabaseServer()
  let q = sb.from('thiet_bi').select('ma, ten, trang_thai, nguoi_giu_ten, han_tra, gia_tri, ghi_chu').order('ma')
  if (tt === 'qua-han') q = q.eq('trang_thai', 'Đang mượn').lt('han_tra', homNay())
  else if (tt) q = q.eq('trang_thai', tt)
  if (tim) q = q.or(`ma.ilike.%${tim.replace(/[%,()]/g, '')}%,ten.ilike.%${tim.replace(/[%,()]/g, '')}%`)
  const { data } = await q
  const ds = data ?? []
  const tong = ds.reduce((s, r) => s + (Number(r.gia_tri) || 0), 0)
  const link = (v: string) => `/quan-ly/thiet-bi?${new URLSearchParams({ ...(v ? { tt: v } : {}), ...(tim ? { q: tim } : {}) })}`

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <div className="row"><h1>Thiết bị</h1><span className="spacer" /><Link href="/quan-ly/thiet-bi/moi" className="btn media sm">Thêm thiết bị</Link></div>
      <ThongBao ok={sp.ok} loi={sp.loi} />
      <form className="row" style={{ margin: '16px 0 10px' }}>
        {tt && <input type="hidden" name="tt" value={tt} />}
        <input name="q" defaultValue={tim} className="input" style={{ flex: 1, minWidth: 0 }} placeholder="Tìm mã hoặc tên" aria-label="Tìm thiết bị" />
        <button className="btn">Tìm</button>
      </form>
      <div className="filters" style={{ marginBottom: 14 }}>
        <Link href={link('')} className={!tt ? 'on' : ''}>Tất cả</Link>
        <Link href={link('qua-han')} className={tt === 'qua-han' ? 'on' : ''}>Quá hạn</Link>
        {TRANG_THAI_TB.map((t) => <Link key={t} href={link(t)} className={tt === t ? 'on' : ''}>{t}</Link>)}
      </div>
      <p className="small muted" style={{ marginBottom: 8 }}>{ds.length} thiết bị{tong ? ` · tổng giá trị ${tien(tong)}` : ''}</p>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Mã</th><th>Tên</th><th>Trạng thái</th><th>Người giữ</th><th>Hạn trả</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {ds.map((r) => (
              <tr key={r.ma}>
                <td className="nowrap"><Link href={`/quan-ly/thiet-bi/${encodeURIComponent(r.ma)}`}>{r.ma}</Link></td>
                <td>{r.ten}</td>
                <td><span className={lopTrangThaiTB(r.trang_thai)}>{r.trang_thai}</span></td>
                <td>{r.nguoi_giu_ten}</td>
                <td className="nowrap" style={r.han_tra && r.han_tra < homNay() ? { color: 'var(--khan)', fontWeight: 600 } : undefined}>{ngayVN(r.han_tra)}</td>
                <td className="small">{r.ghi_chu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
