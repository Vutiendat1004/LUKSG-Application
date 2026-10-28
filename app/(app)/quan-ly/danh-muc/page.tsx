import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, MUC_KEYS, type MucKey } from '@/lib/muc'
import { so, tien } from '@/lib/ngay'
import { ThongBao, type SP } from '@/components/ThongBao'
import { luuNcc } from '../actions'

export const dynamic = 'force-dynamic'

export default async function DanhMuc({ searchParams }: { searchParams: SP }) {
  await canQuanLy()
  const sp = await searchParams
  const sb = await supabaseServer()
  const [{ data: mh }, { data: ncc }] = await Promise.all([
    sb.from('mat_hang').select('*, nha_cung_cap(ten)').order('thu_tu').order('ten'),
    sb.from('nha_cung_cap').select('*').order('ten'),
  ])

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <div className="row"><h1>Danh mục</h1><span className="spacer" /><Link href="/quan-ly/danh-muc/moi" className="btn inn sm">Thêm mặt hàng</Link></div>
      <ThongBao ok={sp.ok} loi={sp.loi} />

      {MUC_KEYS.map((m: MucKey) => {
        const ds = (mh ?? []).filter((x) => x.muc === m)
        return (
          <section key={m}>
            <div className="section-head"><h2>{MUC[m].ten}</h2><span className="tag">{ds.length} món · {MUC[m].lich.toLowerCase()}</span></div>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr><th>Mã</th><th>Tên</th><th>Đơn vị</th><th>NCC</th><th className="num">Dùng/tháng</th><th className="num">Dùng/ngày</th><th className="num">Giao · Chu kỳ · An toàn (ngày)</th><th className="num">Bội số</th><th className="num">Đơn giá</th><th></th></tr>
                </thead>
                <tbody>
                  {ds.map((x) => (
                    <tr key={x.id} style={x.dang_dung ? undefined : { opacity: 0.5 }}>
                      <td className="nowrap">{x.ma}</td>
                      <td><Link href={`/quan-ly/danh-muc/${x.id}`}>{x.ten}</Link>{!x.dang_dung && <div className="small muted">Ngừng dùng</div>}</td>
                      <td>{x.don_vi}</td>
                      <td>{(x.nha_cung_cap as { ten: string } | null)?.ten}</td>
                      <td className="num">{so(x.sl_dung_thang)}</td>
                      <td className="num">{so(x.sl_dung_ngay)}</td>
                      <td className="num">{so(x.ngay_giao)} · {so(x.chu_ky_dat)} · {so(x.ton_an_toan)}</td>
                      <td className="num">{so(x.boi_so)}</td>
                      <td className="num">{tien(x.don_gia)}</td>
                      <td><Link href={`/quan-ly/danh-muc/${x.id}`} className="btn sm">Sửa</Link></td>
                    </tr>
                  ))}
                  {ds.length === 0 && <tr><td colSpan={10} className="muted">Chưa có mặt hàng.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}

      <div className="section-head"><h2>Nhà cung cấp</h2></div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Tên</th><th>Zalo</th><th>Điện thoại</th><th>Ghi chú</th><th></th></tr></thead>
          <tbody>
            {(ncc ?? []).map((x) => (
              <tr key={x.id}>
                <td colSpan={5}>
                  <form action={luuNcc} className="row">
                    <input type="hidden" name="id" value={x.id} />
                    <input name="ten" defaultValue={x.ten} className="input sm" style={{ flex: 2, minWidth: 160 }} aria-label="Tên" />
                    <input name="zalo" defaultValue={x.zalo ?? ''} className="input sm" style={{ flex: 1, minWidth: 110 }} placeholder="Zalo" aria-label="Zalo" />
                    <input name="sdt" defaultValue={x.sdt ?? ''} className="input sm" style={{ flex: 1, minWidth: 110 }} placeholder="Điện thoại" aria-label="Điện thoại" />
                    <input name="ghi_chu" defaultValue={x.ghi_chu ?? ''} className="input sm" style={{ flex: 2, minWidth: 140 }} placeholder="Ghi chú" aria-label="Ghi chú" />
                    <button className="btn sm">Lưu</button>
                  </form>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={5}>
                <form action={luuNcc} className="row">
                  <input name="ten" className="input sm" style={{ flex: 2, minWidth: 160 }} placeholder="Tên nhà cung cấp mới" aria-label="Tên nhà cung cấp mới" />
                  <input name="zalo" className="input sm" style={{ flex: 1, minWidth: 110 }} placeholder="Zalo" />
                  <input name="sdt" className="input sm" style={{ flex: 1, minWidth: 110 }} placeholder="Điện thoại" />
                  <input name="ghi_chu" className="input sm" style={{ flex: 2, minWidth: 140 }} placeholder="Ghi chú" />
                  <button className="btn inn sm">Thêm</button>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  )
}
