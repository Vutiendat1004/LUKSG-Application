/**
 * Kết nối Supabase của project LUKSG-Application.
 * URL và anon key là giá trị công khai (trình duyệt nào cũng thấy), nên để thẳng trong code
 * để app chạy ngay mà không cần khai báo trên Vercel.
 */
export const SUPABASE_URL = 'https://rgtlypusmvlovadugtdi.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndGx5cHVzbXZsb3ZhZHVndGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTYxNzEsImV4cCI6MjEwODc3MjE3MX0.ceelZfK7c3nF4aeurzTRPDj8LtgOu-GKDW6-AUfAlhw'

const REF = 'rgtlypusmvlovadugtdi'

/** Khoá service_role (bí mật) lấy từ biến môi trường SUPABASE_SERVICE_ROLE_KEY trên Vercel.
 *  Bỏ qua nếu khoá đó thuộc một project Supabase khác. */
export function serviceRoleKey(): string | null {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!k) return null
  if (k.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.ref !== REF || payload.role !== 'service_role') return null
    } catch {
      return null
    }
  }
  return k
}

/** Link app: NEXT_PUBLIC_APP_URL nếu có, không thì tên miền chính Vercel tự cấp */
export function appUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  return u.replace(/\/$/, '')
}
