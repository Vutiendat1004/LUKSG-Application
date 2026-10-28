/** Đọc số người dùng gõ: "1,5" và "1.5" đều là 1,5; "1.000" là 1000. Trống hoặc sai → null */
export function docSo(s: unknown): number | null {
  const t = String(s ?? '').trim().replace(/\s/g, '')
  if (!t) return null
  const chuan = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t.replace(',', '.')
  const n = Number(chuan)
  return Number.isFinite(n) && n >= 0 ? n : null
}
