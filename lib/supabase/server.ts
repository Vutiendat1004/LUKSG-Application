import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

/** Supabase theo phiên đăng nhập của người đang dùng (Row Level Security áp dụng). */
export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Gọi từ Server Component: middleware sẽ làm mới phiên.
          }
        },
      },
    },
  )
}

/** Supabase quyền quản trị (service_role). CHỈ dùng ở server: lịch tự động, tạo tài khoản, gửi email. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY')
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
