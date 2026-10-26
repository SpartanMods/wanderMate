import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

let warnedMissingEnv = false;

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    // Without Supabase there is no session to refresh. Pass through so public
    // pages still load instead of every route returning 500 (#30).
    if (!warnedMissingEnv) {
      console.warn("Supabase env vars missing; skipping session refresh in middleware.");
      warnedMissingEnv = true;
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session so it stays alive — do not remove
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
