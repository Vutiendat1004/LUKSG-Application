import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, type MucKey } from '@/lib/muc'
import { so, ngayVN } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

export default async function DinhMuc() {
  await canQuanLy()
  const sb = await supabaseServer()
  const [{ data }, { data: thieu }, { data: ky }] = await Promise.all([
    sb.from('v_dinh_muc').select('*').order('muc').order('ten'),
    sb.from('v_dinh_muc_thieu').select('*'),
    sb.from('ban_hang').select('tu_ngay, den_ngay').order('tu_ngay').limit(1),
  ])
  const lech = (a: number | null, b: number | null) => (a && b ? Math.round(((a - b) / b) * 100) : null)

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Định mức</h1>
      <p className="muted" style={{ margin: '6px 0 16px' }}>
        Lượng dùng mỗi tháng theo ba nguồn: công thức × số ly bán{ky?.[0] ? ` (kỳ từ ${ngayVN(ky[0].tu_ngay)})` : ''}, số ước tính trong Danh mục, và số thực tế học từ kiểm kho.
        Công thức, quy đổi và số bán sửa trong Supabase → Table Editor (bảng cong_thuc, quy_doi, ban_hang).
      </p>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Món</th><th>Mục</th><th className="num">Theo công thức</th><th className="num">Danh mục</th><th className="num">Thực tế</th><th className="num">Công thức so với thực tế</th></tr></thead>
          <tbody>
            {(data ?? []).map((r) => {
              const l = lech(r.dung_thang_cong_thuc, r.dung_thang_thuc_te)
              return (
                <tr key={r.id}>
                  <td>{r.ten}</td>
                  <td className="small">{MUC[r.muc as MucKey]?.ten}</td>
                  <td className="num">{so(r.dung_thang_cong_thuc)}</td>
                  <td className="num">{so(r.dung_thang_danh_muc)}</td>
                  <td className="num">{so(r.dung_thang_thuc_te)}</td>
                  <td className="num">{l === null ? '' : <span className={`pill ${Math.abs(l) > 30 ? 'dat' : 'du'}`}>{l > 0 ? '+' : ''}{l}%</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {(thieu ?? []).length > 0 && (
        <>
          <div className="section-head"><h2>Còn thiếu để tính</h2></div>
          <ul className="list">
            {(thieu ?? []).map((t) => <li key={t.van_de + t.ten}><b>{t.ten}</b> · <span className="muted">{t.van_de}</span></li>)}
          </ul>
        </>
      )}
    </main>
  )
}
