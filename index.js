/**
 * Host half of the workspace file editor.
 *
 * The browser half cannot reach the filesystem, and the shipped
 * `workspaceFiles` Remote is read-only, so this plugin owns one private JSON
 * route for the editor:
 *
 *   POST /plugin/workspace-file-editor/rpc
 *   { op: 'list' | 'read' | 'write' | 'complete', sessionId, ... }
 *
 * The route requires an owner Peer. File operations resolve the Session's
 * workspace root from its saved header, resolve the requested path through the
 * composed `ctx.fs` backend, and reject targets outside that root. Writes run
 * under the Session's own resolved sandbox policy, so a read-only Session
 * cannot be written through this editor either.
 *
 * `complete` is the inline-completion endpoint: the client sends the code
 * around the cursor and this half asks the profile's default model for the
 * insertion text. Completion requests never touch the filesystem; they send
 * the supplied code window to the configured model provider.
 */

const ROUTE = '/plugin/workspace-file-editor/rpc'
/** Request ceiling; the client refuses to send more than this. */
const MAX_BODY_BYTES = 8 * 1024 * 1024
/** Largest file the editor will open. */
const MAX_READ_BYTES = 2 * 1024 * 1024
/** Completion context bounds and model call shape. */
const COMPLETION_PREFIX_LIMIT = 8000
const COMPLETION_SUFFIX_LIMIT = 4000
const COMPLETION_MAX_TOKENS = 320
const COMPLETION_TIMEOUT_MS = 15000
/** Bounded workspace search: no index, no unbounded walk. */
const SEARCH_MAX_RESULTS = 200
const SEARCH_MAX_DIRS = 2000
const SEARCH_MAX_FILES = 20000
const SEARCH_MAX_FILE_BYTES = 512 * 1024
const SEARCH_DEADLINE_MS = 8000
const SEARCH_SKIP_DIRS = new Set([
  '.git', '.svn', '.hg', 'node_modules', 'dist', 'build', 'out', 'target', 'vendor',
  'coverage', '.next', '.nuxt', '.cache', '__pycache__', '.idea', '.vscode',
])
const SEARCH_BINARY_EXT = /\.(?:png|jpe?g|gif|webp|ico|bmp|tiff?|pdf|zip|gz|tgz|bz2|xz|7z|rar|tar|mp3|mp4|mov|avi|mkv|wav|flac|ogg|woff2?|ttf|otf|eot|exe|dll|so|dylib|class|jar|pyc|o|a|lib|bin|dat|db|sqlite3?|wasm)$/i

export const name = 'workspace-file-editor'
export const inject = ['webServer', 'fs', 'sessions', 'sandboxPolicy', 'llm', 'agentDefaultModel']

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function fail(code, message) {
  return { ok: false, error: { code, message } }
}

/** A body over the ceiling is reported distinctly from malformed JSON. */
const BODY_TOO_LARGE = 'too-large'

async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.byteLength
    if (size > MAX_BODY_BYTES) {
      req.resume()
      return BODY_TOO_LARGE
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'))
  } catch {
    return null
  }
}

/** Split the file's dominant newline convention from its LF-normalized text. */
function decodeNewlines(text) {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const cr = (text.match(/\r(?!\n)/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length - crlf
  let eol = 'lf'
  if (crlf > lf && crlf >= cr) eol = 'crlf'
  else if (cr > lf && cr > crlf) eol = 'cr'
  return {
    eol,
    mixed: (crlf > 0 && (lf > 0 || cr > 0)) || (cr > 0 && lf > 0),
    text: text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
  }
}

function applyNewlines(text, eol) {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (eol === 'crlf') return normalized.replace(/\n/g, '\r\n')
  if (eol === 'cr') return normalized.replace(/\n/g, '\r')
  return normalized
}

/** Resolve a Session's workspace root; `undefined` when there is none. */
async function resolveWorkspace(ctx, sessionId) {
  const session = ctx.sessions.get(sessionId)
  if (session === undefined) return { unavailable: fail('session-not-found', `Session "${sessionId}" is not open`) }
  const cwd = session.header.cwd
  if (typeof cwd !== 'string' || cwd.length === 0) {
    return { unavailable: fail('no-workspace', 'This Session has no workspace directory') }
  }
  const root = await ctx.fs.resolve(cwd)
  return { session, cwd, root }
}

/** Resolve one request path and require containment under the workspace root. */
async function resolveTarget(ctx, workspace, path, cwd) {
  const requested = typeof path === 'string' && path.length > 0 ? path : cwd
  let target
  try {
    target = await ctx.fs.resolve(requested, { cwd })
  } catch (error) {
    return { error: fsFailure(error) }
  }
  if (!ctx.fs.contains(workspace.root, target)) {
    return { error: fail('outside-workspace', 'The path is outside this Session workspace') }
  }
  return { target }
}

function fsFailure(error) {
  return {
    code: typeof error?.code === 'string' ? error.code : 'fs-error',
    message: error instanceof Error ? error.message : String(error),
  }
}

function rank(entry) {
  if (entry.type === 'directory') return 0
  if (entry.type === 'file') return 1
  return 2
}

async function list(ctx, workspace, body) {
  const resolved = await resolveTarget(ctx, workspace, body.path, workspace.cwd)
  if (resolved.error !== undefined) return resolved.error
  const { target } = resolved
  const info = await ctx.fs.stat(target)
  if (info === undefined) return fail('FS_NOT_FOUND', 'The directory no longer exists')
  if (info.type !== 'directory') return fail('FS_NOT_DIRECTORY', 'The path is not a directory')
  const entries = await ctx.fs.listDir(target)
  return {
    ok: true,
    value: {
      path: target.displayPath,
      entries: entries
        .map(entry => ({
          name: entry.name,
          type: entry.type,
          path: entry.target.displayPath,
          ...(entry.size !== undefined ? { size: entry.size } : {}),
        }))
        .sort((left, right) => rank(left) - rank(right) || left.name.localeCompare(right.name)),
    },
  }
}

async function read(ctx, workspace, body) {
  if (typeof body.path !== 'string' || body.path.length === 0) return fail('bad-request', 'The request has no path')
  const resolved = await resolveTarget(ctx, workspace, body.path, workspace.cwd)
  if (resolved.error !== undefined) return resolved.error
  const { target } = resolved
  // A version is only trustworthy when it was read before and after the bytes
  // and stayed the same. A concurrent change makes the pair inconsistent, so
  // the read is retried a bounded number of times instead of returning text
  // from one generation with the version of another.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const before = await ctx.fs.stat(target)
    if (before === undefined) return fail('FS_NOT_FOUND', 'The file no longer exists')
    if (before.type !== 'file') return fail('FS_NOT_REGULAR_FILE', 'The path is not a regular file')
    if (before.size !== undefined && before.size > MAX_READ_BYTES) {
      return fail('FS_TOO_LARGE', `The file is larger than ${MAX_READ_BYTES} bytes`)
    }
    const raw = await ctx.fs.readBytes(target, undefined, MAX_READ_BYTES)
    const after = await ctx.fs.stat(target)
    if (after === undefined) return fail('FS_NOT_FOUND', 'The file was removed while it was read')
    if (after.type !== 'file') return fail('FS_NOT_REGULAR_FILE', 'The path is not a regular file')
    if (String(before.version) !== String(after.version)) continue
    let text
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(raw)
    } catch {
      return fail('FS_NOT_TEXT', 'The file is not valid UTF-8 text')
    }
    if (text.includes('\0')) return fail('FS_NOT_TEXT', 'The file is binary, not text')
    const decoded = decodeNewlines(text)
    return {
      ok: true,
      value: {
        path: target.displayPath,
        text: decoded.text,
        eol: decoded.eol,
        mixed: decoded.mixed,
        version: String(after.version),
        size: after.size ?? null,
      },
    }
  }
  return fail('FS_STALE_VERSION', 'The file changed while it was being read; try again')
}

async function write(ctx, workspace, body) {
  if (typeof body.text !== 'string') return fail('bad-request', 'The request has no text')
  if (typeof body.path !== 'string' || body.path.length === 0) return fail('bad-request', 'The request has no path')
  if (typeof body.version !== 'string' || body.version.length === 0) {
    return fail('bad-request', 'A version is required to save a file')
  }
  const resolved = await resolveTarget(ctx, workspace, body.path, workspace.cwd)
  if (resolved.error !== undefined) return resolved.error
  const { target } = resolved
  const info = await ctx.fs.stat(target)
  if (info === undefined) return fail('FS_NOT_FOUND', 'The file no longer exists')
  if (info.type !== 'file') return fail('FS_NOT_REGULAR_FILE', 'The path is not a regular file')
  const eol = body.eol === 'crlf' || body.eol === 'cr' ? body.eol : 'lf'
  const expected = { kind: 'replaceIfVersion', version: body.version }
  const policy = ctx.sandboxPolicy.resolve({ session: workspace.session })
  // Defense in depth beside the filesystem fence: a profile with a bare
  // backend still refuses to save while the Session is read-only.
  if (policy.mode === 'read-only') {
    return fail('FS_SANDBOX_DENIED', 'The Session sandbox is read-only')
  }
  const outcome = await ctx.fs.writeText(target, applyNewlines(body.text, eol), expected, undefined, policy)
  return {
    ok: true,
    value: {
      path: target.displayPath,
      version: String(outcome.version),
      eol,
    },
  }
}

const COMPLETION_SYSTEM = [
  'You are an inline code completion engine embedded in a code editor.',
  'The user message contains the file path, the language, and the code around the insertion point, which is marked by <CURSOR>.',
  'Predict ONLY the text that should be inserted exactly at <CURSOR> so the code continues naturally.',
  'Rules:',
  '- Return raw insertion text only: no explanation, no markdown fences, no surrounding quotes.',
  '- Use at most 6 lines. Prefer finishing the current expression, statement, or line when the intent is clear.',
  '- Match the surrounding indentation, naming, and style.',
  '- Never repeat text that already appears before the cursor.',
  '- If no low-risk, useful continuation is possible, return exactly <NO_COMPLETION>.',
].join('\n')

/** Compose the model request for one cursor position. */
function completionPrompt(path, language, prefix, suffix) {
  const name = typeof path === 'string' ? path.slice(0, 500) : ''
  const lang = typeof language === 'string' && language.length > 0 ? language.slice(0, 40) : 'text'
  return [
    `File: ${name}`,
    `Language: ${lang}`,
    '',
    'Continue the code at the insertion point:',
    '',
    prefix + '<CURSOR>' + suffix,
  ].join('\n')
}

/** Normalize model output into plain insertion text. */
function cleanCompletion(raw, suffix) {
  let text = String(raw ?? '').replace(/\r\n/g, '\n').replace(/<CURSOR>/g, '')
  const trimmed = text.trim()
  if (trimmed === '' || trimmed === '<NO_COMPLETION>' || trimmed === 'NO_COMPLETION') return ''
  const fenced = /^```[^\n]*\n([\s\S]*?)\n```$/.exec(trimmed)
  if (fenced !== null) text = fenced[1]
  if (text.length > 4000) text = text.slice(0, 4000)
  const lines = text.split('\n')
  if (lines.length > 12) text = lines.slice(0, 12).join('\n')
  if (text.endsWith('\n') && String(suffix ?? '').startsWith('\n')) text = text.slice(0, -1)
  return text
}

/**
 * Ask the profile's default model for one inline completion. The call is
 * bounded by a timer and by the browser closing the request, and it never
 * touches the Session log or the filesystem.
 */
async function complete(ctx, body, res) {
  const prefix = typeof body.prefix === 'string' ? body.prefix.slice(-COMPLETION_PREFIX_LIMIT) : ''
  const suffix = typeof body.suffix === 'string' ? body.suffix.slice(0, COMPLETION_SUFFIX_LIMIT) : ''
  if (prefix.length === 0 && suffix.length === 0) return fail('bad-request', 'Completion needs code context')
  const selection = ctx.agentDefaultModel.currentSelection()
  if (selection === undefined || typeof selection.provider !== 'string' || typeof selection.model !== 'string') {
    return fail('completion-unavailable', 'No default model is selected')
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), COMPLETION_TIMEOUT_MS)
  const onClose = () => { if (!res.writableEnded) controller.abort() }
  res.on('close', onClose)
  let raw = ''
  let failure
  try {
    const prepared = await ctx.llm.prepareCall({
      provider: selection.provider,
      model: selection.model,
      ...(selection.reasoningEffort !== undefined ? { reasoningEffort: selection.reasoningEffort } : {}),
      temperature: 0.15,
      maxTokens: COMPLETION_MAX_TOKENS,
    }, controller.signal, (controls, model) => {
      // Inline completion is latency-sensitive: skip thinking when the exact
      // model supports it, and keep the configured effort otherwise.
      const efforts = model.reasoning?.efforts ?? []
      return efforts.some(effort => effort.id === 'off')
        ? { ...controls, reasoningEffort: 'off' }
        : controls
    })
    const stream = prepared.stream({
      ...prepared.config,
      system: COMPLETION_SYSTEM,
      messages: [{
        role: 'user',
        content: [{
          type: 'text',
          text: completionPrompt(body.path, body.language, prefix, suffix),
        }],
      }],
      signal: controller.signal,
    })
    for await (const chunk of stream) {
      if (chunk.type === 'text-delta') raw += chunk.text
      else if (chunk.type === 'finish') {
        if (chunk.reason.kind === 'error') failure = chunk.reason.failure
        else if (chunk.reason.kind === 'aborted') failure = { code: 'aborted', message: 'The completion was aborted' }
      }
    }
  } catch (error) {
    failure = { code: 'completion-failed', message: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
    res.off('close', onClose)
  }
  if (controller.signal.aborted) {
    return fail('completion-timeout', 'The completion timed out or was cancelled')
  }
  if (failure !== undefined) {
    return fail('completion-failed', failure.message ?? failure.code ?? 'The completion failed')
  }
  return { ok: true, value: { completion: cleanCompletion(raw, suffix) } }
}

/** Trimmed non-empty query, or undefined when the request is unusable. */
function searchQuery(value) {
  if (typeof value !== 'string') return undefined
  const query = value.trim()
  return query.length === 0 || query.length > 200 ? undefined : query
}

/**
 * Breadth-first walk of the workspace for one bounded search. The visitor
 * returns true to stop with a truncated result. Hidden directories and common
 * build/VCS directories are skipped; hidden files remain searchable.
 */
async function walkWorkspace(ctx, workspace, visit) {
  const deadline = Date.now() + SEARCH_DEADLINE_MS
  const queue = [{ target: workspace.root, relative: '' }]
  const seen = new Set([String(ctx.fs.processPath(workspace.root))])
  let dirs = 0
  let files = 0
  while (queue.length > 0) {
    if (Date.now() > deadline) return { truncated: true, dirs, files }
    const current = queue.shift()
    dirs += 1
    if (dirs > SEARCH_MAX_DIRS) return { truncated: true, dirs, files }
    let entries
    try {
      entries = await ctx.fs.listDir(current.target)
    } catch {
      continue
    }
    for (const entry of entries) {
      const relative = current.relative === '' ? entry.name : `${current.relative}/${entry.name}`
      if (entry.type === 'directory') {
        if (SEARCH_SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
        if (!ctx.fs.contains(workspace.root, entry.target)) continue
        const key = String(ctx.fs.processPath(entry.target))
        if (seen.has(key)) continue
        seen.add(key)
        queue.push({ target: entry.target, relative })
        continue
      }
      if (entry.type !== 'file') continue
      files += 1
      if (files > SEARCH_MAX_FILES) return { truncated: true, dirs, files }
      const stop = await visit({
        target: entry.target,
        relative,
        name: entry.name,
        size: entry.size,
      })
      if (stop === true) return { truncated: true, dirs, files }
    }
  }
  return { truncated: false, dirs, files }
}

function relativeDepth(path) {
  return path.split('/').length
}

/** Match file names (or root-relative paths when the query contains `/`). */
async function searchNames(ctx, workspace, body) {
  const query = searchQuery(body.query)
  if (query === undefined) return fail('bad-request', 'A non-empty search query is required')
  const needle = query.toLowerCase()
  const byPath = query.includes('/')
  const matches = []
  const walk = await walkWorkspace(ctx, workspace, async (entry) => {
    const haystack = byPath ? entry.relative : entry.name
    if (!haystack.toLowerCase().includes(needle)) return false
    matches.push({ path: entry.target.displayPath, relative: entry.relative, name: entry.name })
    return matches.length >= SEARCH_MAX_RESULTS
  })
  matches.sort((left, right) => relativeDepth(left.relative) - relativeDepth(right.relative)
    || left.relative.localeCompare(right.relative))
  return {
    ok: true,
    value: {
      matches: matches.slice(0, SEARCH_MAX_RESULTS),
      truncated: walk.truncated || matches.length > SEARCH_MAX_RESULTS,
    },
  }
}

/** Case-insensitive substring search inside bounded UTF-8 text files. */
async function searchContent(ctx, workspace, body) {
  const query = searchQuery(body.query)
  if (query === undefined) return fail('bad-request', 'A non-empty search query is required')
  const needle = query.toLowerCase()
  const matches = []
  const deadline = Date.now() + SEARCH_DEADLINE_MS
  const walk = await walkWorkspace(ctx, workspace, async (entry) => {
    if (Date.now() > deadline) return true
    if (entry.size !== undefined && entry.size > SEARCH_MAX_FILE_BYTES) return false
    if (SEARCH_BINARY_EXT.test(entry.name)) return false
    let text
    try {
      text = await ctx.fs.readText(entry.target)
    } catch {
      return false
    }
    const lines = text.split('\n')
    for (let index = 0; index < lines.length; index += 1) {
      const column = lines[index].toLowerCase().indexOf(needle)
      if (column === -1) continue
      matches.push({
        path: entry.target.displayPath,
        relative: entry.relative,
        line: index + 1,
        column: column + 1,
        text: lines[index].slice(0, 300),
      })
      if (matches.length >= SEARCH_MAX_RESULTS) return true
    }
    return false
  })
  matches.sort((left, right) => left.relative.localeCompare(right.relative) || left.line - right.line)
  return {
    ok: true,
    value: {
      matches: matches.slice(0, SEARCH_MAX_RESULTS),
      truncated: walk.truncated || matches.length >= SEARCH_MAX_RESULTS,
    },
  }
}

async function handle(ctx, req, res, peer) {
  if (peer?.principal.kind !== 'owner') {
    sendJson(res, 403, fail('forbidden', 'Owner access is required'))
    return
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('allow', 'POST')
    res.end()
    return
  }
  const essence = String(req.headers['content-type'] ?? '').split(';', 1)[0].trim().toLowerCase()
  if (essence !== 'application/json') {
    sendJson(res, 415, fail('unsupported-media-type', 'Content-Type must be application/json'))
    return
  }
  const body = await readJsonBody(req)
  if (body === BODY_TOO_LARGE) {
    sendJson(res, 413, fail('body-too-large', `The request body exceeds ${MAX_BODY_BYTES} bytes`))
    return
  }
  if (body === null || body === undefined || typeof body !== 'object') {
    sendJson(res, 400, fail('bad-request', 'The request body must be JSON'))
    return
  }
  if (typeof body.sessionId !== 'string' || body.sessionId.length === 0) {
    sendJson(res, 400, fail('bad-request', 'sessionId is required'))
    return
  }
  try {
    if (body.op === 'complete') {
      // Completion reads no file state and needs no workspace root; the live
      // Session still authorizes the call and keeps it scoped to this editor.
      const session = ctx.sessions.get(body.sessionId)
      if (session === undefined) {
        sendJson(res, 200, fail('session-not-found', `Session "${body.sessionId}" is not open`))
        return
      }
      const result = await complete(ctx, body, res)
      if (res.destroyed || res.writableEnded) return
      sendJson(res, 200, result)
      return
    }
    const workspace = await resolveWorkspace(ctx, body.sessionId)
    if (workspace.unavailable !== undefined) {
      sendJson(res, 200, workspace.unavailable)
      return
    }
    let result
    if (body.op === 'list') result = await list(ctx, workspace, body)
    else if (body.op === 'read') result = await read(ctx, workspace, body)
    else if (body.op === 'write') result = await write(ctx, workspace, body)
    else if (body.op === 'search-names') result = await searchNames(ctx, workspace, body)
    else if (body.op === 'search-content') result = await searchContent(ctx, workspace, body)
    else result = fail('bad-request', `Unknown operation "${String(body.op)}"`)
    if (res.destroyed || res.writableEnded) return
    sendJson(res, 200, result)
  } catch (error) {
    const failure = fsFailure(error)
    if (res.destroyed || res.writableEnded) return
    sendJson(res, 200, { ok: false, error: failure })
  }
}

/** Register the editor's private JSON route for the life of this plugin. */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    auth: 'required',
    handler: (req, res, peer) => handle(ctx, req, res, peer),
  }), 'workspace-file-editor: rpc route')
}
