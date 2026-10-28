import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { MUC, MUC_KEYS, laMuc, lopTrangThaiDat, type DongDeXuat } from '@/lib/muc'
import { gomTheoNcc, tinNhanDatHang, linkZalo } from '@/lib/dat-hang'
import { so, ngayVN, truoc } from '@/lib/ngay'
import { CopyButton } from '@/components/CopyButton'
import { ghiNhanDaDat, capNhatDon } from '../actions'

export const dynamic = 'force-dynamic'

export default async function DatHang({ searchParams }: { searchParams: Promise<{ muc?: string; ok?: string }> }) {
  await canQuanLy()
  const sp = await searchParams
  const muc = sp.muc && laMuc(sp.muc) ? sp.muc : null
  const sb = await supabaseServer()
  let q = sb.from('v_de_xuat_dat_hang').select('*').order('muc_do').order('thu_tu').order('ten')
  if (muc) q = q.eq('muc', muc)
  const [{ data }, { data: ch }, { data: dangVe }] = await Promise.all([
    q,
    sb.from('cau_hinh').select('gia_tri').eq('khoa', 'ten_quan').maybeSingle(),
    sb.from('dat_hang').select('id, so_luong, ngay_dat, ngay_du_kien, mat_hang(ten, don_vi), nha_cung_cap(ten)').eq('trang_thai', 'dang_ve').order('ngay_dat'),
  ])
  const rows = (data ?? []) as DongDeXuat[]
  const nhom = gomTheoNcc(rows)
  const tenQuan = ch?.gia_tri || 'LUK Inn SG'

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Đặt hàng</h1>
      {sp.ok && <div className="alert ok" style={{ marginTop: 12 }}>{sp.ok}</div>}

      <div className="filters" style={{ margin: '16px 0' }}>
        <Link href="/quan-ly/dat-hang" className={!muc ? 'on' : ''}>Tất cả</Link>
        {MUC_KEYS.map((m) => <Link key={m} href={`/quan-ly/dat-hang?muc=${m}`} className={muc === m ? 'on' : ''}>{MUC[m].ten}</Link>)}
      </div>

      <div className="section-head"><h2>Tin nhắn đặt hàng</h2><span className="tag">{nhom.length ? `${nhom.length} nhà cung cấp` : 'Chưa có món cần đặt'}</span></div>
      <div className="stack">
        {nhom.map((n) => {
          const tin = tinNhanDatHang(tenQuan, n)
          const zalo = linkZalo(n.zalo)
          return (
            <form key={n.ncc} action={ghiNhanDaDat} className="card order-group stack">
              <div className="row">
                <h3>{n.ncc}</h3>
                {n.zalo && <span className="small muted">Zalo {n.zalo}</span>}
                <span className="spacer" />
                <CopyButton text={tin} label="Chép tin nhắn" />
                {zalo && <a className="btn sm" href={zalo} target="_blank" rel="noreferrer">Mở Zalo</a>}
              </div>
              <div className="msg">{tin}</div>
              <div className="table-wrap">
                <table className="t">
                  <thead><tr><th>Món</th><th>Trạng thái</th><th className="num">Tồn ước tính</th><th className="num">Số đặt</th></tr></thead>
                  <tbody>
                    {n.dong.map((d) => (
                      <tr key={d.id}>
                        <td>{d.ten}</td>
                        <td><span className={lopTrangThaiDat(d.trang_thai)}>{d.trang_thai}</span></td>
                        <td className="num">{so(d.ton_uoc_tinh)} {d.don_vi}</td>
                        <td className="num">
                          <input name={`sl_${d.id}`} defaultValue={String(d.goi_y_dat ?? '')} className="input sm tabnum" style={{ width: 90, textAlign: 'right' }} inputMode="decimal" /> {d.don_vi}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <input type="hidden" name="ncc" value={n.dong[0].ncc_id ?? ''} />
              <input type="hidden" name="quay_lai" value={muc ? `/quan-ly/dat-hang?muc=${muc}` : '/quan-ly/dat-hang'} />
              <div className="row">
                <span className="small muted">Sau khi đã nhắn NCC, bấm để tính số này là “đang về”.</span>
                <span className="spacer" />
                <button className="btn inn sm" type="submit">Ghi nhận đã đặt</button>
              </div>
            </form>
          )
        })}
      </div>

      {(dangVe ?? []).length > 0 && (
        <>
          <div className="section-head"><h2>Đang về</h2><span className="tag">Tự chuyển “đã nhận” khi nhân viên ghi nhập hàng</span></div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Món</th><th>NCC</th><th className="num">Số lượng</th><th>Ngày đặt</th><th></th></tr></thead>
              <tbody>
                {(dangVe ?? []).map((d) => {
                  const m = d.mat_hang as unknown as { ten: string; don_vi: string } | null
                  const n = d.nha_cung_cap as unknown as { ten: string } | null
                  return (
                    <tr key={d.id}>
                      <td>{m?.ten}</td>
                      <td>{n?.ten}</td>
                      <td className="num">{so(d.so_luong)} {m?.don_vi}</td>
                      <td>{ngayVN(d.ngay_dat)}</td>
                      <td>
                        <form action={capNhatDon} className="row">
                          <input type="hidden" name="id" value={d.id} />
                          <button name="trang_thai" value="da_nhan" className="btn sm">Đã nhận</button>
                          <button name="trang_thai" value="huy" className="btn sm ghost">Huỷ</button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-head"><h2>Tất cả mặt hàng</h2></div>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Món</th><th>Trạng thái</th><th className="num">Dùng/ngày</th><th className="num">Tồn ước tính</th>
              <th className="num">Đang về</th><th className="num">Điểm đặt</th><th className="num">Gợi ý đặt</th><th>Đặt chậm nhất</th><th>Đếm lần cuối</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/quan-ly/danh-muc/${r.id}`}>{r.ten}</Link><div className="small muted">{MUC[r.muc].ten}</div></td>
                <td><span className={lopTrangThaiDat(r.trang_thai)}>{r.trang_thai}</span></td>
                <td className="num">{so(r.dung_ngay)}<div className="small muted">{r.nguon_dung}</div></td>
                <td className="num">{r.ton_uoc_tinh === null ? '' : `${so(r.ton_uoc_tinh)} ${r.don_vi}`}</td>
                <td className="num">{r.dang_ve ? so(r.dang_ve) : ''}</td>
                <td className="num">{so(r.diem_dat)}</td>
                <td className="num"><b>{r.goi_y_dat ? so(r.goi_y_dat) : ''}</b></td>
                <td>{ngayVN(r.ngay_dat_cham_nhat)}</td>
                <td className="small">{r.lan_dem ? truoc(r.lan_dem) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
