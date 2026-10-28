export type MucKey = 'trai_cay' | 'nvl_kho' | 've_sinh'

export const MUC: Record<MucKey, { ten: string; lich: string; khoaThu?: string; moTa: string }> = {
  trai_cay: { ten: 'Trái cây', lich: 'Đếm mỗi ngày', moTa: 'Dưa lưới, chanh, xoài, cam, thơm, dưa hấu' },
  nvl_kho: { ten: 'NVL khô', lich: 'Đếm mỗi tuần', khoaThu: 'thu_kiem_nl', moTa: 'Cà phê, sữa, syrup, bột, trà' },
  ve_sinh: { ten: 'Vệ sinh & Logistic', lich: 'Đếm mỗi tuần', khoaThu: 'thu_kiem_vl', moTa: 'Ly, nắp, ống hút, khăn, hoá chất' },
}

export const MUC_KEYS = Object.keys(MUC) as MucKey[]

export function laMuc(x: string): x is MucKey {
  return x in MUC
}

export const LOAI_THEO_MUC: Record<MucKey, string[]> = {
  trai_cay: ['Fruit'],
  nvl_kho: ['Ingredient'],
  ve_sinh: ['Hygiene', 'Logistic'],
}

export const TRANG_THAI_DAT = ['KHẨN', 'ĐẶT NGAY', 'Sắp tới ngưỡng', 'Chưa kiểm kho', 'Chưa có lượng dùng', 'Đủ hàng'] as const

export function lopTrangThaiDat(t: string) {
  switch (t) {
    case 'KHẨN': return 'pill khan'
    case 'ĐẶT NGAY': return 'pill dat'
    case 'Sắp tới ngưỡng': return 'pill sap'
    case 'Đủ hàng': return 'pill du'
    default: return 'pill xam'
  }
}

export const TRANG_THAI_TB = ['Trong kho', 'Đang mượn', 'Cần kiểm tra', 'Cần sửa chữa', 'Đã chuyển HN', 'Đã chuyển ĐN'] as const

export function lopTrangThaiTB(t: string) {
  switch (t) {
    case 'Trong kho': return 'pill du'
    case 'Đang mượn': return 'pill media'
    case 'Cần kiểm tra': return 'pill dat'
    case 'Cần sửa chữa': return 'pill khan'
    default: return 'pill xam'
  }
}

export type DongDeXuat = {
  id: number
  ma: string
  ten: string
  loai: string
  muc: MucKey
  don_vi: string
  ncc_id: number | null
  ten_ncc: string | null
  zalo_ncc: string | null
  sdt_ncc: string | null
  don_gia: number | null
  ton_dem: number | null
  lan_dem: string | null
  nguon_dung: string | null
  dung_ngay: number | null
  ton_uoc_tinh: number | null
  dang_ve: number
  diem_dat: number | null
  ton_toi_da: number | null
  trang_thai: string
  muc_do: number
  goi_y_dat: number | null
  ngay_dat_cham_nhat: string | null
  du_dung_ngay: number | null
  ngay_giao: number
  thu_tu: number
}
