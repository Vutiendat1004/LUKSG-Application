import { createServerClient } from '@supabase/ssr'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_ANON_KEY, serviceRoleKey } from './config'

/** Supabase theo phiên đăng nhập của người đang dùng (Row Level Security áp dụng). */
export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
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
  const key = serviceRoleKey()
  if (!key) throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY')
  return createPlainClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
