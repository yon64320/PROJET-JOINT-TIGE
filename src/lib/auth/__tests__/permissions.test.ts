import { describe, it, expect, vi } from "vitest";
import { checkIsAdmin, getCurrentUser, resolveAdmin } from "../permissions";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Construit un mock minimal de SupabaseClient suffisant pour tester
 * checkIsAdmin / getCurrentUser / resolveAdmin.
 */
function makeMockSupabase(opts: {
  authUser?: { id: string; email?: string } | null;
  profileRow?: { is_admin: boolean } | null;
  profileError?: { message: string } | null;
}): SupabaseClient {
  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.profileRow ?? null,
    error: opts.profileError ?? null,
  });
  const profileEq = vi.fn().mockReturnValue({ maybeSingle: profileMaybeSingle });
  const profileSelect = vi.fn().mockReturnValue({ eq: profileEq });
  const from = vi.fn().mockReturnValue({ select: profileSelect });

  const getUser = vi.fn().mockResolvedValue({
    data: { user: opts.authUser ?? null },
  });

  return {
    from,
    auth: { getUser },
  } as unknown as SupabaseClient;
}

describe("checkIsAdmin", () => {
  it("retourne true quand profile.is_admin = true", async () => {
    const supabase = makeMockSupabase({ profileRow: { is_admin: true } });
    const result = await checkIsAdmin(supabase, "user-1");
    expect(result).toBe(true);
  });

  it("retourne false quand profile.is_admin = false", async () => {
    const supabase = makeMockSupabase({ profileRow: { is_admin: false } });
    const result = await checkIsAdmin(supabase, "user-2");
    expect(result).toBe(false);
  });

  it("retourne false quand profile manquant", async () => {
    const supabase = makeMockSupabase({ profileRow: null });
    const result = await checkIsAdmin(supabase, "user-unknown");
    expect(result).toBe(false);
  });

  it("retourne false en cas d'erreur DB", async () => {
    const supabase = makeMockSupabase({
      profileRow: null,
      profileError: { message: "boom" },
    });
    const result = await checkIsAdmin(supabase, "user-3");
    expect(result).toBe(false);
  });
});

describe("getCurrentUser", () => {
  it("retourne null si non authentifié", async () => {
    const supabase = makeMockSupabase({ authUser: null });
    const result = await getCurrentUser(supabase);
    expect(result).toBeNull();
  });

  it("retourne {id, email, isAdmin: true} si admin", async () => {
    const supabase = makeMockSupabase({
      authUser: { id: "u1", email: "a@b.c" },
      profileRow: { is_admin: true },
    });
    const result = await getCurrentUser(supabase);
    expect(result).toEqual({ id: "u1", email: "a@b.c", isAdmin: true });
  });

  it("retourne {isAdmin: false} pour un user sans profile", async () => {
    const supabase = makeMockSupabase({
      authUser: { id: "u2", email: null as unknown as string },
      profileRow: null,
    });
    const result = await getCurrentUser(supabase);
    expect(result).toEqual({ id: "u2", email: null, isAdmin: false });
  });
});

describe("resolveAdmin", () => {
  it("enrichit un User déjà résolu avec son flag is_admin", async () => {
    const supabase = makeMockSupabase({ profileRow: { is_admin: true } });
    const user = { id: "u3", email: "x@y.z" } as unknown as User;
    const result = await resolveAdmin(supabase, user);
    expect(result).toEqual({ id: "u3", email: "x@y.z", isAdmin: true });
  });
});
