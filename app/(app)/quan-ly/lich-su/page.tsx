import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { gioVN, ngayVN } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

export default async function LichSu({ searchParams }: { searchParams: Promise<{ hd?: string; q?: string }> }) {
  await canQuanLy()
  const sp = await searchParams
  const hd = ['Mượn', 'Trả', 'Chuyển chi nhánh'].includes(sp.hd ?? '') ? sp.hd! : ''
  const tim = (sp.q ?? '').trim().replace(/[%,()]/g, '')
  const sb = await supabaseServer()
  let q = sb.from('giao_dich').select('*').order('thoi_diem', { ascending: false }).limit(300)
  if (hd) q = q.eq('hanh_dong', hd)
  if (tim) q = q.or(`ma_thiet_bi.ilike.%${tim}%,nguoi_ten.ilike.%${tim}%`)
  const { data } = await q
  const link = (v: string) => `/quan-ly/lich-su?${new URLSearchParams({ ...(v ? { hd: v } : {}), ...(tim ? { q: tim } : {}) })}`

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Lịch sử mượn trả</h1>
      <form className="row" style={{ margin: '16px 0 10px' }}>
        {hd && <input type="hidden" name="hd" value={hd} />}
        <input name="q" defaultValue={tim} className="input" style={{ flex: 1, minWidth: 0 }} placeholder="Tìm mã thiết bị hoặc tên người" aria-label="Tìm" />
        <button className="btn">Tìm</button>
      </form>
      <div className="filters" style={{ marginBottom: 14 }}>
        {['', 'Mượn', 'Trả', 'Chuyển chi nhánh'].map((v) => <Link key={v} href={link(v)} className={hd === v ? 'on' : ''}>{v || 'Tất cả'}</Link>)}
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Thời điểm</th><th>Việc</th><th>Mã</th><th>Người</th><th>Chi tiết</th><th>Cảnh báo</th></tr></thead>
          <tbody>
            {(data ?? []).map((g) => (
              <tr key={g.id}>
                <td className="nowrap">{gioVN(g.thoi_diem)}</td>
                <td>{g.hanh_dong}</td>
                <td className="nowrap"><Link href={`/quan-ly/thiet-bi/${encodeURIComponent(g.ma_thiet_bi)}`}>{g.ma_thiet_bi}</Link></td>
                <td>{g.nguoi_ten}</td>
                <td className="small">
                  {g.hanh_dong === 'Mượn' && `Hạn ${ngayVN(g.han_tra)}`}
                  {g.hanh_dong === 'Trả' && g.tinh_trang}
                  {g.hanh_dong === 'Chuyển chi nhánh' && `${g.chi_nhanh} · nhận: ${g.nguoi_nhan}`}
                  {g.ghi_chu && <div className="muted">{g.ghi_chu}</div>}
                </td>
                <td className="small" style={{ color: 'var(--dat)' }}>{g.canh_bao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
