// Caring Companions Core — Source Library API
// -----------------------------------------------------------------------------
// Governs what Core has been GIVEN. Separate from knowledge-api, which governs
// what Core may SAY. Indexing a manual here approves nothing.
//
// DEPLOY: supabase functions deploy source-api --project-ref zngsgedlsxinbygwmxwn
//
// A document is either a REFERENCE, which Core may derive verified knowledge
// from, or an ASSET, which the company hands out and which Core checks against
// verified knowledge. An onboarding packet is an asset: it states a pay rate, a
// pay cycle, training requirements. Those are claims, and claims go stale. If
// the packet and the verified record disagree, the packet is wrong. The
// database refuses to let an asset become a citation; this file never asks it
// to.
//
// ACTIONS
//   preview       { url }                    fetch + parse, return findings, SAVE NOTHING
//   add_pub       { publication }            create a publication
//   add_doc       { publication_id, ... }    save a previewed page, or an uploaded file
//   list          {}                         library rows, indexed vs verified kept apart
//   detail        { document_id }            one document with its chunks + tracked claims
//   recheck       { document_id }            re-fetch and compare hashes
//   scan_asset    { document_id }            SUGGEST claims an asset appears to make. Writes nothing.
//   track_claim   { claim }                  record that an asset states a fact
//   untrack_claim { dependency_id }          remove one
//   resolve_claim { dependency_id, ... }     mark reviewed against the fact's current version
//   claims        { document_id | kb_item_id | status }   tracked claims
//   asset_health  {}                         one row per asset: contradicting, drifted, unverified
//   fact_impact   { kb_item_id? }            change this fact, and these things state it
// -----------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { compareClaim } from '../_shared/asset-claims.js'
import { requireCoreUser, actorOf } from '../_shared/require-core.js'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)


/** Never let an error collapse to "[object Object]". */
function errText(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>
    const parts = ['message', 'details', 'hint', 'code']
      .map((k) => (o[k] ? `${k}: ${o[k]}` : null)).filter(Boolean)
    return parts.length ? parts.join(' | ') : JSON.stringify(e).slice(0, 800)
  }
  return String(e)
}


/**
 * Strip what Postgres `text` cannot hold.
 *
 * PDF extraction routinely emits NUL (\u0000) and stray control characters,
 * especially from documents produced by older publishing tools. Postgres
 * rejects the whole insert with 22P05, so one invisible byte anywhere in a
 * 200-page manual loses the entire document. Cleaned server-side rather than in
 * the browser, because any caller can send text and all of them would hit it.
 */
function pgSafe(s: string): string {
  return String(s ?? '')
    .replace(/\u0000/g, '')                        // NUL, the actual blocker
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')  // other controls, keep \t \n \r
    .replace(/\uFFFE|\uFFFF/g, '')                  // non-characters
    .replace(/[ \t]{2,}/g, ' ')
}

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const clean = (x: string) =>
  pgSafe(x).replace(/<[^>]+>/g, ' ')
   .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;|&#39;/g, "'")
   .replace(/&quot;/g, '"').replace(/&#\d+;|&\w+;/g, ' ')
   .replace(/\s+/g, ' ').trim()

/**
 * Parse HTML into citable chunks.
 *
 * Accordion Q&A first: government policy pages are frequently built this way,
 * and each question is a natural citation handle. Falls back to headings, then
 * to paragraph blocks. A chunk without a heading cannot be cited precisely, so
 * every strategy tries to keep one.
 */
function parseHtml(html: string) {
  const h = html.replace(/<div class="arrow-glyph"><\/div>/g, '')
                .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  const chunks: { heading: string; text: string }[] = []

  // 1. accordion question/answer pairs
  const titles = new Map<string, string>()
  for (const m of h.matchAll(/id="accordion-item-title-(\d+)"[^>]*>([\s\S]*?)<\/div>/gi))
    titles.set(m[1], clean(m[2]))
  for (const m of h.matchAll(/aria-labelledby="accordion-item-title-(\d+)"[^>]*>([\s\S]*?)(?=<div class="accordion-item"|<footer|<\/main)/gi)) {
    const q = titles.get(m[1]) ?? ''
    const a = clean(m[2])
    if (q.length > 12 && a.length > 40) chunks.push({ heading: q, text: a })
  }
  if (chunks.length) return { chunks, strategy: 'accordion' }

  // 2. headings
  const main = h.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? h
  const parts = main.split(/(?=<h[1-4]\b)/i)
  for (const p of parts) {
    const hd = p.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i)
    const heading = hd ? clean(hd[1]) : ''
    const body = clean(p.replace(/<h[1-4][^>]*>[\s\S]*?<\/h[1-4]>/i, ''))
    if (heading && body.length > 120) chunks.push({ heading, text: body.slice(0, 6000) })
  }
  if (chunks.length) return { chunks, strategy: 'headings' }

  // 3. whole page, last resort, explicitly weak
  const all = clean(main)
  if (all.length > 200) return { chunks: [{ heading: 'Full page', text: all.slice(0, 20000) }], strategy: 'wholepage' }
  return { chunks: [], strategy: 'none' }
}

/** Version metadata only when the publisher actually states it. Never inferred. */
function findVersion(text: string) {
  const rev = text.match(/\b(?:revised|revision|rev\.?|updated)\s*[:\-]?\s*(\d{1,2}\/\d{2,4})/i)
                ?? text.match(/\b(\d{2}\/\d{2})\s+HOME AND COMMUNITY/i)
  const eff = text.match(/\beffective\s*(?:date)?\s*[:\-]?\s*([A-Z][a-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i)
  return { publisher_revision: rev?.[1] ?? null, effective_text: eff?.[1] ?? null }
}

/** Marker so callers can tell "this is not a web page" from "the fetch failed".
 *  It is a routing signal, never something a person should read, so every path
 *  that returns a message to the caller strips it with `human()`. */
const NOT_A_PAGE = 'NOT_A_WEB_PAGE: '
const human = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e)
  return m.startsWith(NOT_A_PAGE) ? m.slice(NOT_A_PAGE.length) : m
}

async function fetchAndParse(url: string) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'caring-companions-core/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching the page`)

  // REFUSE ANYTHING THAT IS NOT A WEB PAGE.
  //
  // A .pdf link fetched here used to be read with res.text(), which returns the
  // file's raw bytes. The tag stripper turned that into gibberish, the
  // whole-page fallback stored the first 20,000 characters of it, and the
  // document was saved as 'indexed'. Thirty of them entered the library that
  // way before anyone noticed, each one showing a section count and a green
  // status while containing '%PDF-1.6' and compressed streams.
  //
  // Garbage that looks indexed is worse than a refusal, because the library is
  // the screen that answers "what does Core have". So this refuses, and says
  // what to do instead. PDFs are read in the browser with pdf.js, where there
  // is an actual PDF engine, and added as files.
  const ctype = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  const pageish = !ctype || /^(text\/html|application\/xhtml\+xml|text\/plain|application\/xml|text\/xml)$/.test(ctype)
  if (!pageish) {
    const kind = ctype === 'application/pdf' ? 'a PDF'
               : ctype.startsWith('image/') ? 'an image'
               : `a ${ctype} file`
    throw new Error(
      `${NOT_A_PAGE}That address is ${kind}, not a web page. Core cannot read it by fetching it. `
      + `Download the file, then add it with "Upload a file" or include it in a batch, `
      + `which reads PDFs properly in your browser.`)
  }

  const html = await res.text()

  // Belt and braces: some servers send the wrong content-type. A PDF always
  // starts with %PDF, and a zip-based format (docx, xlsx) with PK.
  const head = html.slice(0, 1024)
  if (/^\s*%PDF-/.test(head))
    throw new Error(`${NOT_A_PAGE}That address returns a PDF, whatever the server calls it. `
      + `Download it and add it as a file so it can be read properly.`)
  if (/^PK\x03\x04/.test(head))
    throw new Error(`${NOT_A_PAGE}That address returns a Word or Excel file, not a web page. `
      + `Export it to PDF and add it as a file.`)
  const { chunks, strategy } = parseHtml(html)
  const joined = chunks.map((c) => `${c.heading}\n${c.text}`).join('\n\n')
  return {
    canonical_url: res.url,
    redirected: res.url !== url,
    title: clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').slice(0, 200),
    chunks, strategy,
    char_count: joined.length,
    content_hash: await sha256(joined),
    ...findVersion(clean(html).slice(0, 4000)),
  }
}


/**
 * Split pasted or extracted document text into citable sections.
 *
 * Replaces a naive blank-line split that produced three separate failures on a
 * real manual: sections named "Section 8" instead of "Consumer-Directed
 * Services Provider Compliance", blocks of exactly 20,000 characters where the
 * cap had silently eaten the rest, and a table of contents ingested as content.
 *
 * Two rules it must never break:
 *   - a heading is taken from the document, never invented
 *   - text is never discarded. Oversized sections are split further and
 *     labelled "(part 2 of 3)", so nothing vanishes without saying so.
 */
const MAX_CHUNK = 12000

// The most sections stored for one document. Documents larger than this are
// truncated, and `sections_found` records the true count so the library can
// say so. A cap nobody is told about reads as coverage.
const MAX_SECTIONS = 600

function looksLikeHeading(line: string): boolean {
  const t = line.trim()
  if (t.length < 4 || t.length > 110) return false
  if (/[.;:,]$/.test(t)) return false                      // sentences end in punctuation
  if (/^\d+(\.\d+)*\s+\S/.test(t)) return true            // 1.1 Fee Schedule
  if (/^(section|chapter|appendix|part)\s+\d/i.test(t)) return true
  if (t === t.toUpperCase() && /[A-Z]{4}/.test(t)) return true
  // Title Case with no terminal punctuation, e.g. Electronic Visit Verification
  const words = t.split(/\s+/)
  if (words.length <= 12 && words.filter((w) => /^[A-Z]/.test(w)).length >= Math.ceil(words.length * 0.6)) return true
  return false
}

function splitText(raw: string): { heading: string; text: string }[] {
  const text = pgSafe(raw).replace(/\r\n?/g, '\n')
  const lines = text.split('\n')

  // Drop a leading table of contents. It is navigation, not policy, and it
  // matches every query weakly because it contains every heading in the manual.
  let start = 0
  const tocAt = lines.findIndex((l) => /^\s*table of contents\s*$/i.test(l))
  if (tocAt >= 0 && tocAt < 40) {
    const after = lines.findIndex((l, i) => i > tocAt + 2 && looksLikeHeading(l) && !/\.{3,}|\t\d+\s*$/.test(l))
    if (after > 0) start = after
  }

  const out: { heading: string; text: string }[] = []
  let heading = 'Opening'
  let buf: string[] = []
  const flush = () => {
    const body = buf.join('\n').trim()
    buf = []
    if (body.length < 40) return
    if (body.length <= MAX_CHUNK) { out.push({ heading, text: body }); return }
    // Too long: split on paragraph boundaries and SAY so, rather than truncate.
    const paras = body.split(/\n{2,}/)
    const parts: string[] = []
    let cur = ''
    for (const para of paras) {
      if ((cur + '\n\n' + para).length > MAX_CHUNK && cur) { parts.push(cur); cur = para }
      else cur = cur ? cur + '\n\n' + para : para
    }
    if (cur) parts.push(cur)
    parts.forEach((t, i) =>
      out.push({ heading: parts.length > 1 ? `${heading} (part ${i + 1} of ${parts.length})` : heading, text: t }))
  }

  for (let i = start; i < lines.length; i++) {
    const line = lines[i]
    if (looksLikeHeading(line) && buf.join('').trim().length > 0) { flush(); heading = line.trim() }
    else if (looksLikeHeading(line) && !buf.join('').trim()) { heading = line.trim() }
    else buf.push(line)
  }
  flush()
  return out.filter((c) => c.text.length > 40)
}

/**
 * reference | asset | null, and null means "inherit the publication".
 *
 * Anything unrecognised inherits rather than defaulting to 'reference'. A typo
 * should not quietly promote a company form into something Core can cite.
 */
function docRole(d: Record<string, any>): string | null {
  const r = String(d.doc_role ?? '').trim()
  return r === 'asset' || r === 'reference' ? r : null
}


// Claim scanning itself lives in ../_shared/asset-claims.js, next to the other
// logic that has to be testable without a database. See that file for what it
// can and cannot find.


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let b: Record<string, any> = {}
  try { b = await req.json() } catch { return json({ error: 'bad_json' }, 400) }
  const action = String(b.action ?? '')

  // EVERY action requires a signed-in user with Core access. Placed before the
  // action switch so a new action added later is protected by default rather
  // than by the author remembering to add a check.
  const gate = await requireCoreUser(req)
  if (gate.error) return json({ error: gate.error }, gate.status)
  const actor = actorOf(gate.user)

  const sb = db()

  try {
    // ── preview: shows what would happen. Saves nothing. ──────────────────────
    if (action === 'preview') {
      const url = String(b.url ?? '').trim()
      if (!/^https?:\/\//i.test(url)) return json({ error: 'A full http(s) URL is required' }, 400)
      try {
        const p = await fetchAndParse(url)
        return json({
          ok: true, requested_url: url, ...p,
          chunk_count: p.chunks.length,
          sample: p.chunks.slice(0, 25).map((c) => c.heading),
          // Suggestions only. The caller confirms or corrects them.
          suggested: {
            publisher: /health\.mo\.gov/.test(p.canonical_url) ? 'Missouri DHSS'
                     : /mydss\.mo\.gov/.test(p.canonical_url) ? 'MO HealthNet'
                     : /mmac\.mo\.gov/.test(p.canonical_url) ? 'MMAC'
                     : /cms\.gov/.test(p.canonical_url) ? 'CMS'
                     : /va\.gov/.test(p.canonical_url) ? 'VA' : null,
            authority: /\.gov(\/|$)/.test(p.canonical_url) ? 'primary' : null,
            // Suggest every program the page appears to cover. A shared manual
            // belongs to all of them, and guessing one hides it from the others.
            programs: [
              /consumer[- ]directed|\bcds\b/i.test(p.title) ? 'CDS' : null,
              /in[- ]home|\bihs\b|personal care/i.test(p.title) ? 'IHS' : null,
              /\bguide\b/i.test(p.title) ? 'GUIDE' : null,
              /\bva\b|veteran/i.test(p.title) ? 'VA' : null,
            ].filter(Boolean),
            source_type: 'webpage',
          },
          warnings: [
            p.redirected ? `Redirected to ${p.canonical_url}` : null,
            p.publisher_revision ? null : 'Publisher states no revision date. It will be recorded as not provided.',
            p.strategy === 'wholepage' ? 'Could not find sections. The whole page will be one chunk, so citations will be page-level only.' : null,
            p.chunks.length === 0 ? 'Nothing readable was found on this page.' : null,
          ].filter(Boolean),
        })
      } catch (e) {
        return json({ ok: false, error: human(e) })
      }
    }

    // ── add_pub ───────────────────────────────────────────────────────────────
    if (action === 'add_pub') {
      const p = b.publication ?? {}
      const id = String(p.id ?? '').trim() ||
        String(p.title ?? 'pub').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-$/, '')
      const { error } = await sb.from('kb_publications').upsert({
        id, title: p.title, publisher: p.publisher, authority: p.authority ?? 'primary',
        doc_role: p.doc_role === 'asset' ? 'asset' : 'reference',
        programs: Array.isArray(p.programs) ? p.programs.filter(Boolean) : (p.program ? [p.program] : []),
        program: (Array.isArray(p.programs) && p.programs[0]) || p.program || null,
        jurisdiction: p.jurisdiction ?? null, home_url: p.home_url ?? null,
        source_type: p.source_type ?? 'manual', review_owner: p.review_owner ?? null,
        added_by: actor,
      })
      if (error) throw error
      return json({ ok: true, id })
    }

    // ── add_doc: a previewed page, or an uploaded file's extracted text ───────
    if (action === 'add_doc') {
      const d = b.document ?? {}
      let chunks: { heading: string; text: string }[] = []
      let meta: any = {}

      if (d.format === 'html' && d.canonical_url) {
        // Re-fetch at save time so the stored hash matches what is stored, not
        // what a stale preview saw.
        const p = await fetchAndParse(d.requested_url || d.canonical_url)
        chunks = p.chunks
        meta = { canonical_url: p.canonical_url, content_hash: p.content_hash, char_count: p.char_count,
                 publisher_revision: d.publisher_revision ?? p.publisher_revision }
      } else {
        // Uploaded file. Text is extracted client-side and sent here, because a
        // Deno edge function is the wrong place to run a PDF engine.
        const text = pgSafe(String(d.text ?? ''))
        if (!text.trim()) {
          const { data, error } = await sb.from('kb_source_documents').insert({
            publication_id: d.publication_id ?? null, title: d.title ?? 'Untitled',
            format: d.format ?? 'pdf', file_ref: d.file_ref ?? null, status: 'error',
            parse_error: 'No readable text could be extracted from this file. It may be a scanned image needing OCR.',
            programs: Array.isArray(d.programs) ? d.programs.filter(Boolean) : (d.program ? [d.program] : []),
            program: (Array.isArray(d.programs) && d.programs[0]) || d.program || null,
            authority: d.authority ?? null, source_type: d.source_type ?? null,
            doc_role: docRole(d), publisher: d.publisher ?? null,
            added_by: actor, retrieved_at: new Date().toISOString(),
          }).select('id').single()
          if (error) throw new Error('Saving the unreadable file failed. ' + errText(error))
          return json({ ok: true, id: data.id, status: 'error',
                        message: 'Saved, but nothing could be read from it.' })
        }
        // Cap the number of stored sections, and RECORD that it was capped.
        // Truncating quietly would show a 900-section manual as fully indexed.
        const allSections = splitText(text)
        chunks = allSections.slice(0, MAX_SECTIONS)
        meta = { content_hash: await sha256(text), char_count: text.length,
                 sections_found: allSections.length }
      }

      const { data, error } = await sb.from('kb_source_documents').insert({
        publication_id: d.publication_id ?? null,
        title: d.title ?? 'Untitled',
        canonical_url: meta.canonical_url ?? d.canonical_url ?? null,
        requested_url: d.requested_url ?? null,
        format: d.format ?? 'html',
        file_ref: d.file_ref ?? null,
        publisher_revision: meta.publisher_revision ?? d.publisher_revision ?? null,
        effective_on: d.effective_on ?? null,
        retrieved_at: new Date().toISOString(),
        content_hash: meta.content_hash ?? null,
        status: chunks.length ? 'indexed' : 'error',
        parse_error: chunks.length ? null : 'Parsed successfully but produced no readable sections.',
        chunk_count: chunks.length, char_count: meta.char_count ?? 0,
        sections_found: meta.sections_found ?? (d.format === 'html' ? chunks.length : null),
        programs: Array.isArray(d.programs) ? d.programs.filter(Boolean) : (d.program ? [d.program] : []),
        program: (Array.isArray(d.programs) && d.programs[0]) || d.program || null,
        authority: d.authority ?? null, source_type: d.source_type ?? null,
        doc_role: docRole(d),
        // Stored on the document, not only on the publication. A document added
        // without a publication used to lose its publisher entirely, however
        // carefully it was typed into the form: 59 of 60 rows ended up NULL.
        publisher: d.publisher ?? null,
        added_by: actor, last_checked: new Date().toISOString().slice(0, 10),
      }).select('id').single()
      if (error) throw new Error('Saving the document failed. ' + errText(error))

      if (chunks.length) {
        const rows = chunks.map((c, i) => ({ document_id: data.id, ordinal: i + 1,
                                             heading: pgSafe(c.heading).slice(0, 400),
                                             text: pgSafe(c.text).slice(0, 20000) }))
        const { error: ce } = await sb.from('kb_source_chunks').insert(rows)
        if (ce) {
          // The document row already claims a chunk count and 'indexed'. If the
          // sections did not save, that row is now lying: the library would show
          // "19 sections" for a document Core cannot read a word of. Correct it
          // before reporting, so a failure never looks like a success.
          await sb.from('kb_source_documents')
            .update({ status: 'error', chunk_count: 0,
                      parse_error: 'The document was saved but its sections could not be stored. ' + errText(ce) })
            .eq('id', data.id)
          throw new Error('Saving the sections failed, and the source has been marked as an error. ' + errText(ce))
        }
      }
      const found = meta.sections_found ?? chunks.length
      return json({
        ok: true, id: data.id, chunk_count: chunks.length,
        status: chunks.length ? 'indexed' : 'error',
        sections_found: found,
        truncated: found > chunks.length,
        // Said out loud rather than left for someone to notice in the numbers.
        warning: found > chunks.length
          ? `This document split into ${found} sections and only the first ${chunks.length} were stored. `
          + `The rest was not indexed and Core cannot search it. Consider adding the remainder as a separate document.`
          : null,
      })
    }

    // ── whoami: which identity is this function actually running as? ─────────
    // With RLS on and no policies, a SELECT as anon returns zero rows and looks
    // like an empty library, while every INSERT fails. That combination is
    // exactly what a missing service-role key looks like from the outside.
    if (action === 'whoami') {
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const url = Deno.env.get('SUPABASE_URL') ?? ''
      const probe = await sb.from('kb_source_documents')
        .insert({ title: '__probe__', format: 'txt' }).select('id').single()
      if (!probe.error && probe.data) await sb.from('kb_source_documents').delete().eq('id', probe.data.id)
      return json({
        service_key_present: !!key, service_key_len: key.length,
        supabase_url_present: !!url,
        write_test: probe.error ? errText(probe.error) : 'write succeeded',
      })
    }

    // ── delete_doc ───────────────────────────────────────────────────────────
    // Refuses if verified knowledge was approved from this source, unless the
    // caller explicitly confirms. Removing a source that a live answer cites
    // would leave that answer with no provenance, which is worse than clutter.
    if (action === 'delete_doc') {
      const id = Number(b.document_id)
      if (!id) return json({ error: 'document_id is required' }, 400)

      const { data: doc, error: de } = await sb.from('kb_source_library')
        .select('id, title, chunk_count, verified_count').eq('id', id).single()
      if (de) throw new Error('Could not find that source. ' + errText(de))

      if (Number(doc.verified_count) > 0 && !b.force) {
        return json({
          ok: false, needs_confirm: true,
          title: doc.title, verified_count: doc.verified_count,
          message: `${doc.verified_count} verified knowledge record(s) were approved from this source. `
                 + `Deleting it does not delete them, but they will lose the citation showing where they came from.`,
        })
      }

      // kb_source_chunks and kb_document_knowledge cascade on delete.
      const { error } = await sb.from('kb_source_documents').delete().eq('id', id)
      if (error) throw new Error('Deleting the source failed. ' + errText(error))
      return json({ ok: true, deleted: id, title: doc.title })
    }

    // ── delete_pub: only when nothing belongs to it ──────────────────────────
    if (action === 'delete_pub') {
      const pid = String(b.publication_id ?? '')
      const { data: kids } = await sb.from('kb_source_documents').select('id').eq('publication_id', pid).limit(1)
      if (kids?.length) return json({ ok: false, error: 'That publication still has documents. Delete those first.' })
      const { error } = await sb.from('kb_publications').delete().eq('id', pid)
      if (error) throw new Error('Deleting the publication failed. ' + errText(error))
      return json({ ok: true, deleted: pid })
    }

    // ── list ──────────────────────────────────────────────────────────────────
    if (action === 'list') {
      const { data: docs, error } = await sb.from('kb_source_library').select('*').order('created_at', { ascending: false })
      if (error) throw error
      const { data: pubs } = await sb.from('kb_publications').select('*').order('title')
      return json({ publications: pubs ?? [], documents: docs ?? [] })
    }

    // ── detail ────────────────────────────────────────────────────────────────
    if (action === 'detail') {
      const id = Number(b.document_id)
      const { data: doc, error } = await sb.from('kb_source_library').select('*').eq('id', id).single()
      if (error) throw error
      const { data: chunks } = await sb.from('kb_source_chunks').select('ordinal, heading, text')
        .eq('document_id', id).order('ordinal')
      const { data: verified } = await sb.from('kb_document_knowledge').select('kb_item_id, approved_at').eq('document_id', id)
      // Two different lists, never merged. `verified` is knowledge approved FROM
      // this document. `claims` is what this document SAYS, checked against
      // knowledge. A reference has the first, an asset has the second, and
      // showing them in one column would erase the distinction the whole
      // asset/reference split exists to hold.
      const { data: claims } = await sb.from('kb_dependency_check').select('*')
        .eq('document_id', id).order('id')
      return json({ document: doc, chunks: chunks ?? [], verified: verified ?? [], claims: claims ?? [] })
    }

    // ── recheck: has the official page changed since we indexed it? ───────────
    if (action === 'recheck') {
      const id = Number(b.document_id)
      const { data: doc, error } = await sb.from('kb_source_documents').select('*').eq('id', id).single()
      if (error) throw error
      if (!doc.canonical_url) return json({ ok: false, error: 'This source has no URL to re-check.' })
      const today = new Date().toISOString().slice(0, 10)
      try {
        const p = await fetchAndParse(doc.canonical_url)
        const changed = p.content_hash !== doc.content_hash
        const moved = p.canonical_url !== doc.canonical_url
        const status = moved ? 'moved' : changed ? 'changed' : 'indexed'
        await sb.from('kb_source_documents').update({ status, last_checked: today }).eq('id', id)
        // Detection is not correction. Nothing derived from this is edited or
        // invalidated here; the change is reported for a human to review.
        return json({ ok: true, status, changed, moved, new_url: moved ? p.canonical_url : null })
      } catch (e) {
        // 'gone' means the address stopped resolving. A PDF link resolves fine
        // and was never a page to begin with, so calling it gone would send
        // someone hunting for a dead link that is not dead.
        const raw = e instanceof Error ? e.message : String(e)
        const status = raw.startsWith(NOT_A_PAGE) ? 'error' : 'gone'
        await sb.from('kb_source_documents')
          .update({ status, last_checked: today, parse_error: human(e) }).eq('id', id)
        return json({ ok: true, status, error: human(e) })
      }
    }

    // ── scan_asset: what does this document appear to claim? ─────────────────
    // Suggestions only. Nothing is saved, nothing is flagged, and a person
    // confirms each one through track_claim. The scan is literal matching; it
    // finds a suspicious number, not a wrong policy.
    if (action === 'scan_asset') {
      const id = Number(b.document_id)
      if (!id) return json({ error: 'document_id is required' }, 400)

      const { data: doc, error: de } = await sb.from('kb_source_library')
        .select('id, title, doc_role, chunk_count').eq('id', id).single()
      if (de) throw new Error('Could not find that source. ' + errText(de))

      const { data: chunks } = await sb.from('kb_source_chunks')
        .select('id, ordinal, heading, text').eq('document_id', id).order('ordinal')
      const { data: items } = await sb.from('kb_items')
        .select('id, question, answer, topics, status, version')

      const already = new Set(
        ((await sb.from('kb_dependencies').select('kb_item_id, claim_location').eq('document_id', id)).data ?? [])
          .map((d: any) => `${d.kb_item_id}|${d.claim_location ?? ''}`))

      const suggestions: any[] = []
      for (const c of chunks ?? []) {
        for (const it of items ?? []) {
          const cmp = compareClaim(it, `${c.heading ?? ''}\n${c.text}`)
          if (!cmp) continue
          const location = c.heading || `Section ${c.ordinal}`
          if (already.has(`${it.id}|${location}`)) continue
          suggestions.push({
            kb_item_id: it.id, fact_question: it.question, fact_answer: it.answer,
            fact_status: it.status, fact_version: it.version,
            chunk_id: c.id, claim_location: location,
            excerpt: String(c.text).slice(0, 400),
            suggested_relationship: cmp.verdict === 'differs' ? 'contradicts' : 'states',
            ...cmp,
          })
        }
      }
      // Disagreements first. They are the reason to run this.
      const rank: Record<string, number> = { differs: 0, agrees: 1, mentions: 2 }
      suggestions.sort((a, b2) => (rank[a.verdict] ?? 3) - (rank[b2.verdict] ?? 3))

      return json({
        ok: true, document: doc,
        scanned_sections: (chunks ?? []).length, facts_compared: (items ?? []).length,
        suggestions,
        counts: {
          differs:  suggestions.filter((s) => s.verdict === 'differs').length,
          agrees:   suggestions.filter((s) => s.verdict === 'agrees').length,
          mentions: suggestions.filter((s) => s.verdict === 'mentions').length,
        },
        limits: [
          'This compares numbers, not meaning. It finds a pay rate or a day count that does not match a fact Core holds.',
          'A claim written in words with no figure in it will not be found.',
          'Nothing here has been saved. Confirm a suggestion with track_claim to start tracking it.',
          doc.doc_role === 'asset' ? null
            : 'This document is classified as a reference, not a company asset. Scanning it for claims may not be what you want.',
        ].filter(Boolean),
      })
    }

    // ── track_claim: record that something states a fact ─────────────────────
    if (action === 'track_claim') {
      const c = b.claim ?? {}
      const itemId = String(c.kb_item_id ?? '').trim()
      if (!itemId) return json({ error: 'kb_item_id is required' }, 400)

      const { data: item, error: ie } = await sb.from('kb_items')
        .select('id, version, status').eq('id', itemId).single()
      if (ie) return json({ error: `No knowledge record ${itemId}. ` + errText(ie) }, 400)

      const documentId = c.document_id ? Number(c.document_id) : null
      let docRow: any = null
      if (documentId) {
        const { data } = await sb.from('kb_source_library')
          .select('id, title, doc_role').eq('id', documentId).single()
        docRow = data
      }
      const assetRef = String(c.asset_ref ?? '').trim()
        || (documentId ? `kb_source_documents:${documentId}` : '')
      if (!assetRef) return json({ error: 'asset_ref or document_id is required' }, 400)

      const relationship = ['states', 'contradicts', 'references', 'derived_from']
        .includes(String(c.relationship)) ? String(c.relationship) : 'states'

      const { data, error } = await sb.from('kb_dependencies').upsert({
        kb_item_id: itemId,
        consumer: String(c.consumer ?? 'source_library'),
        asset_type: String(c.asset_type ?? (docRow ? 'document' : 'other')),
        asset_ref: assetRef,
        document_id: documentId,
        claim: c.claim_text ?? c.claim ?? null,
        claim_location: String(c.claim_location ?? ''),
        relationship,
        detected_by: ['human', 'extraction', 'recheck'].includes(String(c.detected_by))
          ? String(c.detected_by) : 'human',
        // Recorded as checked against the version in front of the person now.
        item_version_seen: item.version,
        last_synced: new Date().toISOString(),
        // A contradiction is a live problem the moment it is recorded. Anything
        // else starts current.
        status: relationship === 'contradicts' ? 'needs_review' : 'current',
        flagged_reason: relationship === 'contradicts'
          ? 'Recorded as contradicting this fact.' : null,
        flagged_at: relationship === 'contradicts' ? new Date().toISOString() : null,
        created_by: c.created_by ?? 'samantha',
        note: c.note ?? null,
      }, { onConflict: 'kb_item_id,consumer,asset_ref,claim_location' }).select('id').single()
      if (error) throw new Error('Saving the claim failed. ' + errText(error))

      return json({
        ok: true, id: data.id,
        warnings: [
          docRow && docRow.doc_role !== 'asset' && relationship !== 'derived_from'
            ? `${docRow.title} is classified as a reference, not a company asset. Claims are normally tracked against documents the company issues.`
            : null,
          item.status !== 'verified'
            ? `Knowledge record ${itemId} is ${item.status}, so this claim is being checked against something Core has not confirmed.`
            : null,
        ].filter(Boolean),
      })
    }

    // ── untrack_claim ────────────────────────────────────────────────────────
    if (action === 'untrack_claim') {
      const id = Number(b.dependency_id)
      if (!id) return json({ error: 'dependency_id is required' }, 400)
      const { error } = await sb.from('kb_dependencies').delete().eq('id', id)
      if (error) throw new Error('Removing the claim failed. ' + errText(error))
      return json({ ok: true, deleted: id })
    }

    // ── resolve_claim: a person looked, and says where it stands now ─────────
    // Resolving re-points the dependency at the fact's CURRENT version, which
    // is what clears `drifted`. Saying "reviewed" without that would leave the
    // row looking out of date forever.
    if (action === 'resolve_claim') {
      const id = Number(b.dependency_id)
      if (!id) return json({ error: 'dependency_id is required' }, 400)

      const { data: dep, error: dpe } = await sb.from('kb_dependencies')
        .select('id, kb_item_id').eq('id', id).single()
      if (dpe) throw new Error('Could not find that claim. ' + errText(dpe))
      const { data: item } = await sb.from('kb_items').select('version').eq('id', dep.kb_item_id).single()

      const outcome = ['current', 'dismissed', 'resolved'].includes(String(b.outcome))
        ? String(b.outcome) : 'current'
      // Only 'current' and 'resolved' mean the document was actually brought
      // into line. 'dismissed' means a person judged it not to matter, so the
      // relationship is left alone rather than rewritten to agreement.
      const patch: Record<string, unknown> = {
        status: outcome,
        reviewed_by: b.reviewed_by ?? 'samantha',
        reviewed_at: new Date().toISOString(),
        note: b.note ?? null,
        item_version_seen: item?.version ?? null,
        last_synced: new Date().toISOString(),
        flagged_reason: null, flagged_at: null,
      }
      if (outcome !== 'dismissed' && b.relationship) {
        patch.relationship = ['states', 'contradicts', 'references', 'derived_from']
          .includes(String(b.relationship)) ? String(b.relationship) : 'states'
      }

      const { error } = await sb.from('kb_dependencies').update(patch).eq('id', id)
      if (error) throw new Error('Updating the claim failed. ' + errText(error))
      return json({ ok: true, id, status: outcome })
    }

    // ── claims: tracked claims, filtered ─────────────────────────────────────
    if (action === 'claims') {
      let q = sb.from('kb_dependency_check').select('*')
      if (b.document_id) q = q.eq('document_id', Number(b.document_id))
      if (b.kb_item_id)  q = q.eq('kb_item_id', String(b.kb_item_id))
      if (b.consumer)    q = q.eq('consumer', String(b.consumer))
      if (b.status)      q = q.eq('status', String(b.status))
      const { data, error } = await q.order('flagged_at', { ascending: false, nullsFirst: false }).order('id')
      if (error) throw error
      const rows = data ?? []
      return json({
        claims: rows,
        counts: {
          total: rows.length,
          needs_review:  rows.filter((r: any) => r.status === 'needs_review').length,
          contradicting: rows.filter((r: any) => r.contradicts).length,
          drifted:       rows.filter((r: any) => r.drifted).length,
          on_unverified: rows.filter((r: any) => r.fact_unverified).length,
        },
      })
    }

    // ── asset_health: can I trust what the company is handing people? ────────
    if (action === 'asset_health') {
      let q = sb.from('kb_asset_health').select('*')
      if (b.consumer) q = q.eq('consumer', String(b.consumer))
      const { data, error } = await q.order('contradicting', { ascending: false })
      if (error) throw error
      return json({ assets: data ?? [] })
    }

    // ── fact_impact: change this, and these things state it ──────────────────
    if (action === 'fact_impact') {
      let q = sb.from('kb_fact_impact').select('*')
      if (b.kb_item_id) q = q.eq('kb_item_id', String(b.kb_item_id))
      const { data, error } = await q.order('dependents', { ascending: false })
      if (error) throw error
      return json({ facts: data ?? [] })
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (err) {
    console.error('source-api', action, err)
    return json({ error: 'source_api_failed', detail: human(errText(err)) }, 500)
  }
})
