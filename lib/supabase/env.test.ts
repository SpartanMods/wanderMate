import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { getSupabaseEnv, requireSupabaseEnv } from "@/lib/supabase/env";

const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
});

test("getSupabaseEnv returns null when the URL is missing", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "key";
  assert.equal(getSupabaseEnv(), null);
});

test("getSupabaseEnv returns null when the anon key is empty", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
  assert.equal(getSupabaseEnv(), null);
});

test("getSupabaseEnv returns both values when set", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "key";
  assert.deepEqual(getSupabaseEnv(), { url: "https://example.supabase.co", anonKey: "key" });
});

test("requireSupabaseEnv throws a descriptive error when unset", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.throws(() => requireSupabaseEnv(), /Supabase is not configured/);
});
