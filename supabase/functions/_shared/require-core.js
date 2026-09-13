// Caring Companions Core — server-side access gate
// -----------------------------------------------------------------------------
// Core is hosted on a public URL, like the other hubs. The login screen in the
// browser is a convenience, not a boundary: anyone can open the page, read the
// anon key out of it, and call these functions directly. So the gate has to be
// here, on the server, where it cannot be skipped.
//
// TWO THINGS ARE CHECKED, and both are required:
//
//   1. The caller presents a real USER session, not the anon key. The anon key
//      is a valid JWT and would otherwise sail through any check that only asks
//      "is this token well formed".
//
//   2. That user has 'core' in app_metadata.hub_access.
//
// FAILS CLOSED. The existing hubs use:
//
//     if (Array.isArray(hubAccess) && !hubAccess.includes('care_coordinator'))
//
// which grants access when hub_access is ABSENT, because the guard only runs if
// the field is an array. That was flagged as a P1 in the adversarial audit: a
// convenience default that quietly became a permission. A missing list here
// means no access, never all access.
//
// app_metadata is used rather than user_metadata deliberately. A user can edit
// their own user_metadata; only the service role can write app_metadata.
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const HUB = 'core'

/**
 * Returns { user } when the caller may use Core, or { error, status } when not.
 * Never throws, so a caller cannot fail open by forgetting a try/catch.
 */
export async function requireCoreUser(req) {
  const authz = req.headers.get('Authorization') ?? ''
  if (!authz.toLowerCase().startsWith('bearer ')) {
    return { error: 'Sign in to Core first.', status: 401 }
  }

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) {
    // Refuse rather than guess. A missing key must never mean "skip the check".
    return { error: 'Core cannot verify sign-ins right now. Nothing was changed.', status: 503 }
  }

  // A client carrying the CALLER's token. getUser() validates it against
  // Supabase, so a forged or expired token returns nothing, and the bare anon
  // key returns no user at all.
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: authz } } })

  let user = null
  try {
    const { data, error } = await asCaller.auth.getUser()
    if (error || !data?.user) {
      return { error: 'Your session has expired. Sign in to Core again.', status: 401 }
    }
    user = data.user
  } catch {
    return { error: 'Could not verify your sign-in. Nothing was changed.', status: 401 }
  }

  const access = user.app_metadata?.hub_access
  if (!Array.isArray(access) || !access.includes(HUB)) {
    return {
      error: 'Your account does not have Core access. Ask Samantha to add it.',
      status: 403,
    }
  }

  return { user }
}

/** The email to record against anything this caller creates or changes. */
export const actorOf = (user) => user?.email ?? user?.id ?? 'unknown'

/**
 * For functions that serve BOTH Cara (server to server) and a signed-in person.
 *
 * knowledge-api had no check of any kind. Deployed without --no-verify-jwt it
 * accepts any valid JWT, and the anon key IS a valid JWT — the same anon key
 * printed in the public website and in Core's own page. So anyone could call
 * `get` and read internal-only records, and `search` let the caller choose
 * audience: 'internal' for itself. Verified as exploitable against the live
 * project before this was written.
 *
 * Returns { trusted:'service' } for Cara, { trusted:'user', user } for a person
 * with Core access, or { error, status } for everyone else.
 */
export async function requireServiceOrCore(req) {
  const authz = req.headers.get('Authorization') ?? ''
  const token = authz.replace(/^[Bb]earer\s+/, '').trim()
  if (!token) return { error: 'Not authorised.', status: 401 }

  // Cara calls with the service role key. That key is a secret and never
  // reaches a browser, so presenting it is proof enough of being the server.
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (service && token === service) return { trusted: 'service' }

  // Otherwise it must be a real person who has Core.
  const gate = await requireCoreUser(req)
  if (gate.error) return { error: 'Not authorised.', status: gate.status }
  return { trusted: 'user', user: gate.user }
}
