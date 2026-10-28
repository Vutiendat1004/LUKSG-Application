import Link from 'next/link'
import { canNhom } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase/server'
import { homNay } from '@/lib/ngay'
import { DeviceAction, type TB, type HanhDong } from './DeviceAction'

export const dynamic = 'force-dynamic'

export default async function ThietBi({ searchParams }: { searchParams: Promise<{ ma?: string; hd?: string }> }) {
  const nv = await canNhom('media')
  const sp = await searchParams
  const sb = await supabaseServer()
  const [tb, ch, ds] = await Promise.all([
    sb.from('thiet_bi').select('ma, ten, trang_thai, nguoi_giu_id, nguoi_giu_ten, han_tra').order('ma'),
    sb.from('cau_hinh').select('gia_tri').eq('khoa', 'han_muon_mac_dinh_ngay').maybeSingle(),
    nv.vai_tro === 'quan_ly'
      ? sb.from('nhan_vien').select('id, ho_ten, nhom').eq('dang_lam', true).order('ho_ten')
      : Promise.resolve({ data: [] as { id: string; ho_ten: string; nhom: string[] }[] }),
  ])
  const ngay = Number(ch.data?.gia_tri ?? 3) || 3
  const hd: HanhDong = sp.hd === 'tra' ? 'tra' : sp.hd === 'chuyen' ? 'chuyen' : 'muon'

  return (
    <main className="page">
      <Link href="/" className="back">‹ Trang chủ</Link>
      <h1>Thiết bị</h1>
      <DeviceAction
        thietBi={(tb.data ?? []) as TB[]}
        toi={{ id: nv.id, ho_ten: nv.ho_ten }}
        hanMacDinh={homNay(ngay)}
        homNay={homNay()}
        hdBanDau={hd}
        maBanDau={sp.ma ? sp.ma.split(',') : []}
        nguoiMuonHo={nv.vai_tro === 'quan_ly' ? (ds.data ?? []).map((x) => ({ id: x.id, ho_ten: x.ho_ten })) : null}
      />
    </main>
  )
}
