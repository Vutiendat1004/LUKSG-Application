import Link from 'next/link'
import { canQuanLy } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { gioVN, so } from '@/lib/ngay'

export const dynamic = 'force-dynamic'

export default async function NhatKyKho({ searchParams }: { searchParams: Promise<{ loai?: string }> }) {
  await canQuanLy()
  const sp = await searchParams
  const nhap = sp.loai === 'nhap'
  const sb = await supabaseServer()
  const { data } = await sb
    .from(nhap ? 'nhap_hang' : 'kiem_kho')
    .select('id, so_luong, thoi_diem, nguoi_ten, ghi_chu, mat_hang(ten, don_vi)')
    .order('thoi_diem', { ascending: false })
    .limit(300)

  return (
    <main className="page wide">
      <Link href="/quan-ly" className="back">‹ Bảng quản lý</Link>
      <h1>Nhật ký kho</h1>
      <div className="filters" style={{ margin: '16px 0' }}>
        <Link href="/quan-ly/kiem-kho" className={!nhap ? 'on' : ''}>Kiểm kho</Link>
        <Link href="/quan-ly/kiem-kho?loai=nhap" className={nhap ? 'on' : ''}>Nhập hàng</Link>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Thời điểm</th><th>Món</th><th className="num">Số lượng</th><th>Người</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {(data ?? []).map((r) => {
              const m = r.mat_hang as unknown as { ten: string; don_vi: string } | null
              return (
                <tr key={r.id}>
                  <td className="nowrap">{gioVN(r.thoi_diem)}</td>
                  <td>{m?.ten}</td>
                  <td className="num">{so(r.so_luong)} {m?.don_vi}</td>
                  <td>{r.nguoi_ten}</td>
                  <td>{r.ghi_chu}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>Hiện 300 dòng gần nhất. Cần sửa số đã nhập sai thì sửa trong Supabase → Table Editor.</p>
    </main>
  )
}
