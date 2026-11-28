/**
 * Host half of dsh-chat-tags.
 *
 * Owns the tag/mark store (a plain JSON file) and exposes it to:
 *  - the Client half over the same-origin HTTP routes below;
 *  - the Agent through the `chat_tags_*` tools.
 */
import { mkdir, readFile, writeFile, rename, appendFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

export const name = 'dsh-chat-tags'
export const inject = ['webServer', 'tools']

const ROUTE_PREFIX = '/chat-tags'

function storeDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'storages', 'dsh-chat-tags')
}
function storePath() {
  return join(storeDir(), 'data.json')
}

const EMPTY = { tags: [], marks: [] }
let cache = null

async function load() {
  if (cache !== null) return cache
  try {
    const raw = await readFile(storePath(), 'utf8')
    const parsed = JSON.parse(raw)
    cache = {
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      marks: Array.isArray(parsed.marks) ? parsed.marks : [],
    }
  } catch {
    cache = { tags: [], marks: [] }
  }
  return cache
}

async function save(next) {
  cache = { tags: next.tags, marks: next.marks }
  const file = storePath()
  await mkdir(dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  await writeFile(tmp, JSON.stringify(cache, null, 2), 'utf8')
  await rename(tmp, file)
  return cache
}

function publicState() {
  return { tags: cache.tags, marks: cache.marks }
}

function normalizeColor(value) {
  if (typeof value !== 'string') return '#7c8cf8'
  const v = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#7c8cf8'
}

function textOf(value, max) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function makeTag(input) {
  return {
    id: 't_' + randomUUID().slice(0, 8),
    name: textOf(input.name, 40) || '标签',
    color: normalizeColor(input.color),
    createdAt: Date.now(),
  }
}

function makeMark(input) {
  return {
    id: 'm_' + randomUUID().slice(0, 8),
    tagId: input.tagId,
    sessionId: typeof input.sessionId === 'string' ? input.sessionId : '',
    seq: typeof input.seq === 'number' && Number.isFinite(input.seq) ? input.seq : null,
    text: textOf(input.text, 4000),
    title: textOf(input.title, 200),
    note: textOf(input.note, 2000),
    createdAt: Date.now(),
  }
}

function defaultTitle(text) {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 60 ? flat.slice(0, 60) + '…' : flat
}

async function readJsonBody(req, limit = 1024 * 512) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('payload too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  return JSON.parse(raw)
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function handle(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const action = url.pathname.slice(ROUTE_PREFIX.length).replace(/^\/+|\/+$/g, '')
  const method = (req.method || 'GET').toUpperCase()

  try {
    await load()

    if (action === 'state' && method === 'GET') {
      sendJson(res, 200, publicState())
      return
    }

    if (method !== 'POST') {
      sendJson(res, 405, { error: 'method not allowed' })
      return
    }

    const body = await readJsonBody(req)

    if (action === 'debug') {
      try {
        const file = join(storeDir(), 'debug.log')
        await mkdir(dirname(file), { recursive: true })
        await appendFile(file, new Date().toISOString() + ' ' + JSON.stringify(body) + '\n', 'utf8')
      } catch {}
      sendJson(res, 200, { ok: true })
      return
    }

    if (action === 'tag/create') {
      const tag = makeTag(body)
      const next = { tags: [...cache.tags, tag], marks: cache.marks }
      await save(next)
      sendJson(res, 200, { tag, state: publicState() })
      return
    }

    if (action === 'tag/update') {
      const tags = cache.tags.map((t) =>
        t.id === body.id
          ? { ...t, name: body.name === undefined ? t.name : textOf(body.name, 40) || t.name, color: body.color === undefined ? t.color : normalizeColor(body.color) }
          : t
      )
      await save({ tags, marks: cache.marks })
      sendJson(res, 200, { state: publicState() })
      return
    }

    if (action === 'tag/delete') {
      const tags = cache.tags.filter((t) => t.id !== body.id)
      const marks = cache.marks.filter((m) => m.tagId !== body.id)
      await save({ tags, marks })
      sendJson(res, 200, { state: publicState() })
      return
    }

    if (action === 'mark/create') {
      let tags = cache.tags
      let tagId = body.tagId
      if (!tagId) {
        const tag = makeTag({ name: body.tagName, color: body.color })
        tags = [...tags, tag]
        tagId = tag.id
      } else if (!tags.some((t) => t.id === tagId)) {
        sendJson(res, 400, { error: 'unknown tag' })
        return
      }
      const mark = makeMark({ ...body, tagId, title: body.title || defaultTitle(body.text || '') })
      await save({ tags, marks: [...cache.marks, mark] })
      sendJson(res, 200, { mark, state: publicState() })
      return
    }

    if (action === 'mark/update') {
      const marks = cache.marks.map((m) =>
        m.id === body.id
          ? {
              ...m,
              title: body.title === undefined ? m.title : textOf(body.title, 200),
              note: body.note === undefined ? m.note : textOf(body.note, 2000),
              tagId: body.tagId === undefined ? m.tagId : body.tagId,
            }
          : m
      )
      await save({ tags: cache.tags, marks })
      sendJson(res, 200, { state: publicState() })
      return
    }

    if (action === 'mark/delete') {
      const marks = cache.marks.filter((m) => m.id !== body.id)
      await save({ tags: cache.tags, marks })
      sendJson(res, 200, { state: publicState() })
      return
    }

    sendJson(res, 404, { error: 'not found' })
  } catch (error) {
    sendJson(res, 500, { error: String((error && error.message) || error) })
  }
}

function describeTag(tag) {
  return tag ? tag.name + ' (' + tag.color + ')' : '(无)'
}

export function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'prefix',
        path: ROUTE_PREFIX,
        handler: handle,
      }),
    'chat-tags: http routes'
  )

  const registerTools = (scoped) => {
    scoped.effect(
      () =>
        scoped.tools.register({
          name: 'chat_tags_list',
          description:
            'List chat tags and the marks (tagged snippets of the conversation). Use it to recall what the user flagged for later.',
          // Standard JSON Schema: ctx.tools.register does NOT run the DSL
          // transform that defineTool() applies, so the flat map would be sent
          // to the provider verbatim as input_schema and rejected by the
          // official API (400 "is not of type object").
          parameters: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'Only marks of this session when provided.' },
              limit: { type: 'number', description: 'Max marks to return, default 30.' },
            },
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
          },
          async execute(args) {
            const state = await load()
            const tags = new Map(state.tags.map((t) => [t.id, t]))
            let marks = state.marks
            if (args && typeof args.sessionId === 'string' && args.sessionId !== '') {
              marks = marks.filter((m) => m.sessionId === args.sessionId)
            }
            const limit = args && typeof args.limit === 'number' ? Math.max(1, Math.min(200, args.limit)) : 30
            const picked = marks.slice(-limit).reverse()
            if (picked.length === 0) return 'No chat marks yet.'
            const lines = picked.map((m, i) => {
              const tag = tags.get(m.tagId)
              const title = m.title || (m.text || '').slice(0, 60)
              return [
                String(i + 1) + '. [' + describeTag(tag) + '] ' + title,
                '   session=' + (m.sessionId || '?') + ' seq=' + (m.seq == null ? '?' : m.seq) + ' at ' + new Date(m.createdAt).toISOString(),
                m.note ? '   note: ' + m.note : '',
                m.text ? '   text: ' + m.text.replace(/\s+/g, ' ').slice(0, 200) : '',
                '   id=' + m.id,
              ]
                .filter((line) => line !== '')
                .join('\n')
            })
            return lines.join('\n')
          },
        }),
      'chat-tags: list tool'
    )

    scoped.effect(
      () =>
        scoped.tools.register({
          name: 'chat_tags_mark',
          description:
            'Tag a snippet of the conversation so it can be found and jumped back to later. Creates the tag when tagName is given without tagId.',
          parameters: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'Session id the snippet belongs to.' },
              text: { type: 'string', description: 'The tagged snippet text.' },
              tagId: { type: 'string', description: 'Existing tag id.' },
              tagName: { type: 'string', description: 'Tag name; creates the tag when tagId is absent.' },
              color: { type: 'string', description: 'Hex color for a newly created tag, e.g. #f2a03d.' },
              title: { type: 'string', description: 'Short label shown on hover; defaults to the snippet prefix.' },
              note: { type: 'string', description: 'Free-form note.' },
              seq: { type: 'number', description: 'Turn seq the snippet belongs to, when known.' },
            },
            required: ['sessionId', 'text'],
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
          },
          async execute(args) {
            const state = await load()
            let tags = state.tags
            let tagId = args.tagId
            if (!tagId) {
              const tag = makeTag({ name: args.tagName || 'AI', color: args.color })
              tags = [...tags, tag]
              tagId = tag.id
            } else if (!tags.some((t) => t.id === tagId)) {
              return 'Unknown tagId: ' + tagId
            }
            const mark = makeMark({ ...args, tagId, title: args.title || defaultTitle(args.text || '') })
            await save({ tags, marks: [...state.marks, mark] })
            return 'Marked: ' + mark.id + ' [' + mark.title + ']'
          },
        }),
      'chat-tags: mark tool'
    )

    scoped.effect(
      () =>
        scoped.tools.register({
          name: 'chat_tags_delete',
          description: 'Delete one chat mark by id.',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Mark id to delete.' },
            },
            required: ['id'],
          },
          output: {
            schema: { type: 'string' },
            render: (_args, value) => [{ type: 'text', text: value }],
          },
          async execute(args) {
            const state = await load()
            const marks = state.marks.filter((m) => m.id !== args.id)
            if (marks.length === state.marks.length) return 'No such mark: ' + args.id
            await save({ tags: state.tags, marks })
            return 'Deleted ' + args.id
          },
        }),
      'chat-tags: delete tool'
    )
  }

  if (ctx.tools) registerTools(ctx)
}