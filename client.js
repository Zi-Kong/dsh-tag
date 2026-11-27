/**
 * Client half of dsh-chat-tags.
 *
 * - adds a third selection bubble ("标签") next to quote / btw
 * - renders a hidden turn anchor per completed turn so a mark knows its turn
 * - renders a vertical tag track on the left edge of the chat column
 * - renders a "标签" panel registered in sidebar.panellist / main
 * - renders colored dots on sidebar session rows
 */
window.__ModuleLoader__.load({
  id: 'dsh-chat-tags',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef } = React

    const ROUTE = '/chat-tags'
    const PALETTE = [
      '#f2a03d',
      '#e5534b',
      '#4c9f70',
      '#4c8bf5',
      '#9a6ef2',
      '#e06ea8',
      '#8b8f98',
      '#d8b73a',
    ]

    /* Inlined PNG (3564 b64 chars) so the button needs no extra asset route. */
    const ICON_DELETE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAKJklEQVR4AeydC3bbNhAAmV6s6cnanizpyVLOc/giR7RMLEFwAYyfYFEUPruzGMovldQ/Fn8kIIEPCSjIh2h8QgLLoiDuAgm8IKAgL+D4lAQUxD0ggRcELhTkxao+JYFOCChIJ4UyzHsIKMg93F21EwIK0kmhDPMeAgpyD3dX7YRAn4J0Atcw+yegIP3X0AwuJKAgF8J16v4JKEj/NTSDCwkoyIVwnbp/AgryWw19KIFHAgrySOPc8dd1eKa2huPtLAEFOUtwWf5ep/ixtm/JGjER2xqWtygBBYmSexuHFP+8Hab8TWyIwitbygCzB6Ug8Qpxde5l4xFrPNOJRypIrPhsOK7OJaPv7IvItDtj6HJtBemybKGgkTo0cOZBChKrvlfjGLfuRilIdyUz4JYEFKQl7XvX+n7v8n2uriCxuv0bG3bVKOe9ioCCxMhyNabFRrcfxb+4KXWAu4IEoP0c8td6z8Zb71LfEFk5giVSkCC4n8PYeEjCJvx5Ks0dMSExLU1QvQWiIOcrhiRswi/rVNxnaFssSLKG5S1KQEGi5PbHsSEztP3oImcnH6Mgk28A039NQEFe8/HZyQkoyOQbwPRfE1CQ13x8dnICCjL5Brgz/R7WVpAeqmSMtxG4SxDeLk7jMwq2t8+1y+E1B/ZLc1FaC0KSfI57a/xXaNuyyOBzBuwZLiJLy5+WgpAcSX5tmaBrDUWAC0nTL6FoKQjJDVUtk7mNABfbV4tXe66VIM0SqkbGiTIT4K+QJnuqlSAklBm4sfVHoMmeUpD+NoYRvxEYShDe4fqWlr8l0BGBVq8gHSEx1E4INPlHn2dBrqHDh4qumdlZJXAhgVaC8CdWE+MvZOXUeQiwl5pcdFsJAloSIjGObRKIEmAPsZei44vGtRSEwEiMBGk8tkngCAH+AqHxeX/20JExVfq0FoSgSZDGFwt81iIifTanzy9LbwwQg4YkS8ufpoK0TMy1JFCDgILUoOgcwxJQkGFLa2I1CChIDYrOMSwBBRm2tCZWg8AogtRg4RwSeCKgIE9IPCGBXwQU5BcLjyTwREBBnpB4QgK/CCjILxYeSeCJgII8Ifn9hI9nJqAgM1e/Te58NJbGlyxw32bVSqsoSCWQTvNEABn4HrSt8cZTjvleK2R5GpDxhIJkrEr/MSEAMiDJXjbIQp+951KdU5BU5RgmGAT4LBn6fCTQZ2ObPa8gzVDvLDTmqZJXBl5lUlNQkNTl6TK40leF0v5NoShIU9xTLJZ6w5dWQEFKidm/NoE/a09Ycz4FqUnTuYYjoCDDlfQtIX/XIaAgdTg6y6AEFGTQwppWHQIKUoejswxKQEEGLaxp1SGgIHU4zjTLVLkqyFTlNtlSAgpSSsz+UxFQkPPl5q0VvEGPN97ROKadn7lsBuJgfRrr08pmsPcTAQV5QlJ0gk3Ihtzeus0m5ZjGeR4XTRjozBqsReOYxvq0rj6cFMj98iEKEkeMHGzCj2Zgo26b9qM+Nc5/tgYxEmuNtS6eI9/0ChKvCRvvyOgrN+fRuYkVYY/Ea58HAgryAKPg8OjGZEo2Jo3jmo052fhH50z9rtmjSbTupyAx4mzO2Mh6o0o3fIaY62XfaCYFiYEu3WylmzkW1etRpTG/nm2SZxVkkkJPn2YQgIIEwTlsDgIKMkedzTJIQEGC4Bw2BwEFmaPOZhkkoCBBcA6bg8ARQeYgYZYS2CGgIDtQPCWBjYCCbCS8l8AOAQXZgeIpCWwEFGQj4b0EdgjcLMhORJ6SQCICCpKoGIaSj4CC5KuJESUioCCJimEo+QgoSL6aGFEiAuMKkgiyofRLQEH6rZ2RNyCgIA0gu0S/BBSk39oZeQMCCtIAskv0S0BBArVzyDwEFGSeWptpgICCBKA5ZB4CCjJPrc00QEBBAtAcMg8BBclVa6NJRkBBkhXEcHIRUJBc9TCaZAQUJFlBDCcXAQXJVQ+jSUZAQZIV5LpwnDlCQEEi1BwzDQEFmabUJhohoCARao6ZhoCCTFNqE40QUJAINce8JzDwIwUZuLimdp6Agpxn6AwDE1CQgYtraucJKMh5hs4wMAEFGbi4I6R2dw4KcncFXD81AQVJXR6Du5uAgtxdAddPTUBBUpfH4O4moCB3V8D17yJwaF0FOYTJTrMSUJBZK2/ehwgoyCFMdpqVgILEKv89NqzqqP8KZ8sQc2HI93dXkFgN/i0cVrqZC6c/1F1BDmF63ykmyPs5ZnxUstn+WQGV9F+7H7oxJ+1Q57VTqdTrEG8KEt8Dfx0ceuXGPBoDkh4M126PBBTkkUbZMVfvVxuP57+UTRnqzRofxUEMSHSlpKGgexmkIOcqxcbbNiibdNuQbEraudmPjyYO1iOGrfGYRkzHZ7LnOwIK8g5H+AEblLZtyDs2JWsSw9Z4HE7IgW8E0gnyFpa/JZCDgILkqINRJCWgIEkLY1g5CChIjjoYRVICCpK0MIaVg8BMguQgbhRdEVCQrsplsK0JKEhr4q7XFQEF6apcBtuagIK0Ju56XRFQkCrlcpJRCSjIqJU1ryoEFKQKRicZlYCCjFpZ86pCQEGqYHSSUQkoSPbKGt+tBBTkVvwunp1AdkEyfF1O9hoa34UEsgsSSf1rZJBjqhCIsE99ERxRkCqVdpIQgT9DoxIPyi5I5IsH/k7MO1VoSYKJ1LhZ6NkFiYCIvMxH1nHMMwG+cuj5bMdnehAkcoXxVaT9powwj9S2aWajCsKVzFeSdlsJ1jAvXVFBSont9I/+K0fkirazvKcOEIiyjtb2QEh1uvTyChK50nBV+7Zi4n6983YBAdjuMT66VKSuR+eu0q8HQUg0CnIrYPQKx9q2fQIwPSNH5E+y/UguPNuLIHzf7BkMFOPHOgFFpSGObVkiDJACljBdTvycremJpY8P7UUQMjpbkG0O5qHItmWJMEAqWJ5p1ODM+GZjexKEK070T61mQF3oEAFqeajj3Z16EgRW3YAlWNsugZOvHrtzXnayN0F4BekK8GWV63NiatfVRa43QdgWAAY0x7Z+CFAzatdPxGukPQqyhr0AmlcTjm35CVArapY/0t8i7FUQ0uB/d8ZViWNbXgLUiFrljfBFZD0LQlpclSgAx7Z8BKgNNcoX2V5EO+d6F4SUKACF4NiWgwB/UvGqQW1yRBSMYgRBSJ1CfFkPFGWFcPMNMWhIcnMo55cfRZCNxKMoQxRoSyz5PayRgosUx8nDPR7eaIJsmSPKVjBeVYYq2pbkzfcwhfHWeHxzSPWXH1WQR1KPsnCFo21F9X5ZShnAj8Y4pKA98h7quJYgvUGhqLZliTBYZvqZVZCZamyuJwgoyAl4Dh2fgIKMX2MzPEFAQU7Ac+j4BDoQZPwimGFeAgqStzZGloCAgiQogiHkJaAgeWtjZAkIKEiCIhhCXgJzC5K3LkaWhICCJCmEYeQkoCA562JUSQgoSJJCGEZOAgqSsy5GlYSAglxUCKcdg8D/AAAA//+/xnV5AAAABklEQVQDAIs/Fa/S0aCUAAAAAElFTkSuQmCC'
    /* Inlined PNG (6156 b64 chars) so the button needs no extra asset route. */
    const ICON_JUMP = 'data:image/png;base64,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'

    let CTX = null

    /* ------------------------------------------------------------------ store */

    const STATE = {
      tags: [],
      marks: [],
      loaded: false,
      error: null,
      dialog: null,
      tagEditor: null,
      confirm: null,
      toast: null,
      filterTagId: null,
      wsColor: null,
      wsColors: {},
    }
    const listeners = new Set()

    function emit() {
      for (const fn of Array.from(listeners)) fn()
    }
    function patch(next) {
      Object.assign(STATE, next)
      emit()
    }
    function useStore() {
      const [, setTick] = useState(0)
      useEffect(() => {
        const fn = () => setTick((n) => (n + 1) % 1000000)
        listeners.add(fn)
        return () => {
          listeners.delete(fn)
        }
      }, [])
      return STATE
    }

    let toastTimer = null
    let flashBox = null
    let flashTimer = 0
    function toast(text) {
      patch({ toast: text })
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => patch({ toast: null }), 2200)
    }

    async function request(path, body) {
      const init =
        body === undefined
          ? { method: 'GET' }
          : {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            }
      const res = await fetch(ROUTE + path, init)
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error((data && data.error) || 'HTTP ' + res.status)
      if (data && data.tags && data.marks) {
        patch({ tags: data.tags, marks: data.marks, loaded: true, error: null })
      } else if (data && data.state) {
        patch({ tags: data.state.tags, marks: data.state.marks, loaded: true, error: null })
      }
      return data
    }

    let refreshing = null
    function refresh() {
      if (refreshing) return refreshing
      refreshing = request('/state')
        .catch((e) => patch({ loaded: true, error: String((e && e.message) || e) }))
        .finally(() => {
          refreshing = null
        })
      return refreshing
    }

    /* ------------------------------------------------------------- dom helpers */

    function defaultTitle(text) {
      const flat = String(text || '').replace(/\s+/g, ' ').trim()
      return flat.length > 60 ? flat.slice(0, 60) + '…' : flat
    }

    function anchors() {
      return Array.from(document.querySelectorAll('[data-ct-anchor]'))
    }

    function tagColorOf(tagId) {
      const tags = (STATE && STATE.tags) || []
      const hit = tags.find((t) => t.id === tagId)
      return (hit && hit.color) || '#ffd60a'
    }

    /* Workspace (project folder) that owns a Session — used to group the overview.
       Items come from the `main` slot's useWorkspaces() snapshot. */
    function workspaceOf(items, sessionId) {
      const list = Array.isArray(items) ? items : []
      for (const w of list) {
        if (w && Array.isArray(w.sessionIds) && w.sessionIds.indexOf(sessionId) >= 0) {
          return { key: String(w.workspaceId || ''), label: w.title || w.path || '工作区', path: w.path || '' }
        }
      }
      return { key: '', label: '未分组', path: '' }
    }

    /* Per-workspace tint. A user-picked colour wins; otherwise the workspaceId hashes to a hue.
       `skin` descends from `base` so the container plate stays light and low-saturation. */
    const WS_COLOR_KEY = 'dsh-chat-tags:workspace-colors'
    function readWsColors() {
      try {
        const raw = window.localStorage.getItem(WS_COLOR_KEY)
        const obj = raw ? JSON.parse(raw) : {}
        return obj && typeof obj === 'object' ? obj : {}
      } catch (e) {
        return {}
      }
    }
    function writeWsColors(next) {
      try {
        window.localStorage.setItem(WS_COLOR_KEY, JSON.stringify(next))
      } catch (e) {
        /* storage blocked — the colour still applies for this render */
      }
    }

    function hashHue(key) {
      let hash = 0
      for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
      return Math.abs(hash) % 360
    }

    function hexToHsl(hex) {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
      if (!m) return null
      const n = parseInt(m[1], 16)
      const r = ((n >> 16) & 255) / 255
      const g = ((n >> 8) & 255) / 255
      const b = (n & 255) / 255
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2
      let h = 0
      let s = 0
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
      }
      return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
    }

    function wsBase(key) {
      const custom = (STATE.wsColors || {})[key]
      const picked = custom ? hexToHsl(custom) : null
      if (picked) return picked
      if (!key) return { h: 210, s: 8, l: 62 }
      return { h: hashHue(key), s: 62, l: 55 }
    }

    function wsSkin(key) {
      const base = wsBase(key)
      return {
        color: 'hsl(' + base.h + ' ' + base.s + '% ' + base.l + '%)',
        background: 'hsla(' + base.h + ', ' + Math.round(base.s * 0.3) + '%, ' + base.l + '%, 0.09)',
        borderColor: 'hsla(' + base.h + ', ' + Math.round(base.s * 0.38) + '%, ' + base.l + '%, 0.28)',
      }
    }

    /* Folded workspace groups survive a page refresh. */
    const FOLD_KEY = 'dsh-chat-tags:folded-workspaces'
    function readFolded() {
      try {
        const raw = window.localStorage.getItem(FOLD_KEY)
        const obj = raw ? JSON.parse(raw) : {}
        return obj && typeof obj === 'object' ? obj : {}
      } catch (e) {
        return {}
      }
    }
    function writeFolded(next) {
      try {
        window.localStorage.setItem(FOLD_KEY, JSON.stringify(next))
      } catch (e) {
        /* storage blocked — folding still works for this render */
      }
    }

    function hexToRgba(hex, alpha) {
      let value = String(hex || '').trim().replace('#', '')
      if (value.length === 3) value = value.split('').map((c) => c + c).join('')
      if (value.length !== 6 || /[^0-9a-f]/i.test(value)) return 'rgba(255,214,10,' + alpha + ')'
      const n = parseInt(value, 16)
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')'
    }

    /* One context menu for everything that is plain DOM (tag chips, track dots). */
    let bodyMenu = null
    let bodyMenuOff = null
    function closeBodyMenu() {
      if (bodyMenuOff) {
        bodyMenuOff()
        bodyMenuOff = null
      }
      if (bodyMenu && bodyMenu.parentNode) bodyMenu.parentNode.removeChild(bodyMenu)
      bodyMenu = null
    }
    function showBodyMenu(event, items) {
      closeBodyMenu()
      const box = document.createElement('div')
      box.className = 'ct-menu'
      for (const item of items) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'ct-menu-item' + (item.danger ? ' ct-menu-item-danger' : '')
        btn.textContent = item.label
        btn.addEventListener('click', () => {
          closeBodyMenu()
          item.run()
        })
        box.appendChild(btn)
      }
      document.body.appendChild(box)
      bodyMenu = box
      const w = box.offsetWidth || 150
      const ht = box.offsetHeight || 96
      let x = event.clientX + 6
      let y = event.clientY + 6
      if (x + w > window.innerWidth - 4) x = Math.max(4, event.clientX - w - 6)
      if (y + ht > window.innerHeight - 4) y = Math.max(4, event.clientY - ht - 6)
      box.style.left = x + 'px'
      box.style.top = y + 'px'
      const off = (ev) => {
        if (bodyMenu && !bodyMenu.contains(ev.target)) closeBodyMenu()
      }
      setTimeout(() => document.addEventListener('pointerdown', off, true), 0)
      bodyMenuOff = () => document.removeEventListener('pointerdown', off, true)
    }

    function openTagEditor(tag) {
      closeBodyMenu()
      patch({
        tagEditor: { id: tag.id, name: tag.name, color: tag.color || PALETTE[0] },
      })
    }

    function confirmAsk(text, run) {
      closeBodyMenu()
      patch({ confirm: { text, run } })
    }

    function tagMenu(event, tag) {
      event.preventDefault()
      event.stopPropagation()
      const used = STATE.marks.filter((m) => m.tagId === tag.id).length
      showBodyMenu(event, [
        { label: '编辑标签', run: () => openTagEditor(tag) },
        {
          label: '删除标签',
          danger: true,
          run: () =>
            confirmAsk(
              '删除标签「' + tag.name + '」？' + (used > 0 ? '它下面的 ' + used + ' 条标记也会一起删除。' : ''),
              async () => {
                try {
                  await request('/tag/delete', { id: tag.id })
                  toast('标签已删除')
                } catch (e) {
                  toast('删除失败：' + String((e && e.message) || e))
                }
              }
            ),
        },
      ])
    }

    function prevAnchor(el) {
      const list = anchors()
      for (let i = 1; i < list.length; i += 1) {
        if (list[i] === el) return list[i - 1]
      }
      return null
    }

    function currentSessionId() {
      const list = anchors()
      if (list.length === 0) return null
      const id = list[0].getAttribute('data-ct-session')
      return id || null
    }

    /** The first anchor that sits after the selection start belongs to that turn. */
    function locateSeq() {
      try {
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) return null
        const range = sel.getRangeAt(0)
        const node = range.startContainer
        for (const anchor of anchors()) {
          if (anchor === node || anchor.contains(node)) return Number(anchor.getAttribute('data-ct-anchor'))
          const rel = anchor.compareDocumentPosition(node)
          if (rel & Node.DOCUMENT_POSITION_PRECEDING) {
            return Number(anchor.getAttribute('data-ct-anchor'))
          }
        }
        const last = anchors()[anchors().length - 1]
        return last ? Number(last.getAttribute('data-ct-anchor')) : null
      } catch {
        return null
      }
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async function waitForAnchor(seq, sessionId, timeoutMs) {
      const started = Date.now()
      const selector = '[data-ct-anchor="' + seq + '"]'
      for (;;) {
        const found = Array.from(document.querySelectorAll(selector)).find(
          (el) => !sessionId || el.getAttribute('data-ct-session') === sessionId
        )
        if (found) return found
        if (Date.now() - started > (timeoutMs || 5000)) return null
        await sleep(80)
      }
    }

    /** Ask the session to load history through this seq so its Turn is mounted. */
    async function ensureLoaded(sessionId, seq) {
      if (!CTX || !sessionId || !Number.isFinite(seq)) return 'no-session'
      for (let i = 0; i < 50; i += 1) {
        let session = null
        try {
          const binding = CTX.sessions && CTX.sessions.binding(sessionId)
          session = binding && binding.session
        } catch {
          session = null
        }
        if (session && typeof session.loadThrough === 'function') {
          try {
            await session.loadThrough(seq)
            return 'ok'
          } catch (error) {
            return 'error:' + String((error && error.message) || error).slice(0, 60)
          }
        }
        await sleep(100)
      }
      return 'no-binding'
    }

    async function jumpTo(mark) {
      if (!CTX) return
      const diag = {
        seq: mark.seq === undefined ? null : mark.seq,
        sameSession: false,
        loaded: null,
        anchors: -1,
        anchorHit: false,
        textHit: false,
        findHit: false,
        at: Date.now(),
      }
      try {
        CTX.layout.selectPanel(null)
      } catch {}
      const current = currentSessionId()
      diag.sameSession = !!mark.sessionId && mark.sessionId === current
      if (mark.sessionId && mark.sessionId !== current) {
        try {
          CTX.uiWorkspace.openSession(mark.sessionId)
        } catch (e) {
          toast('打开会话失败：' + String((e && e.message) || e))
          return
        }
        await sleep(220)
      }
      let located = false
      let flash = null
      let scrollTask = null
      const flashColor = tagColorOf(mark.tagId)
      diag.anchors = anchors().length
      if (mark.seq !== null && mark.seq !== undefined) {
        diag.loaded = await ensureLoaded(mark.sessionId, Number(mark.seq))
        diag.anchors = anchors().length
        const el = await waitForAnchor(mark.seq, mark.sessionId, 8000)
        if (el) {
          diag.anchorHit = true
          located = true
          const prev = prevAnchor(el)
          let bounds = null
          if (prev) {
            try {
              bounds = document.createRange()
              bounds.setStartAfter(prev)
              bounds.setEndBefore(el)
            } catch {
              bounds = null
            }
          }
          const hit = findTextRange(mark.text, bounds)
          if (hit) diag.textHit = true
          // Scroll to the very text: the anchor sits at the end of the turn, so
          // centring on it parks the view at the bottom of that reply.
          const focusEl = hit ? hit.range.startContainer.parentElement || el : el
          scrollTask = smoothCenter(focusEl)
          flash = hit
            ? { rect: () => Array.from(hit.range.getClientRects()), persist: false, keep: true, color: flashColor }
            : { rect: () => [el.getBoundingClientRect()], persist: true, color: flashColor }
        }
      }
      if (!located) {
        await sleep(160)
        const hit = findTextRange(mark.text)
        const el = hit && hit.range.startContainer.parentElement
        if (el) {
          scrollTask = smoothCenter(el)
          located = true
          flash = { rect: () => Array.from(hit.range.getClientRects()), persist: false, keep: true, color: flashColor }
          diag.textHit = true
        }
      }
      if (!located) {
        const probe = String(mark.text || '').replace(/\s+/g, ' ').trim().slice(0, 40)
        if (probe) {
          try {
            const found = window.find(probe, false, false, true) === true
            if (found) {
              located = true
              diag.findHit = true
              const sel = window.getSelection()
              if (sel && sel.rangeCount > 0) {
                const range = sel.getRangeAt(0).cloneRange()
                flash = { rect: () => Array.from(range.getClientRects()), persist: false, color: flashColor }
              }
            }
          } catch {}
        }
      }
      if (flash) drawFlash(flash.rect, flash.persist, flash.keep, flash.color)
      patch({ jumpDiag: diag })
      if (!located) {
        toast('已打开会话，但没找到这条内容（锚点 ' + Math.max(0, diag.anchors) + ' 个）')
      } else {
        const via = []
        if (diag.anchorHit) via.push('锚点')
        if (diag.textHit) via.push('文本')
        if (diag.findHit) via.push('查找')
        toast('已定位到此处（' + via.join('+') + '）' + (flash && flash.persist ? '，高亮已保持' : ''))
      }
      if (scrollTask) {
        try {
          await scrollTask
        } catch {}
      }
    }

    /** Blink a highlight over a freshly located range; keep it while the result is approximate. */
    function drawFlash(rectOf, persist, keep, color) {
      clearFlash()
      const tint = hexToRgba(color, 0.26)
      const ring = hexToRgba(color, 0.85)
      const glow = hexToRgba(color, 0.35)
      const host = document.createElement('div')
      host.className = 'ct-flash-host'
      document.body.appendChild(host)
      flashBox = host
      const boxes = []
      const makeBox = () => {
        const box = document.createElement('div')
        box.className = persist ? 'ct-flash ct-flash-hold' : 'ct-flash'
        box.style.background = tint
        box.style.boxShadow = '0 0 0 2px ' + ring + ', 0 0 16px ' + glow
        host.appendChild(box)
        boxes.push(box)
      }
      const place = () => {
        if (flashBox !== host) return
        let list = null
        try {
          list = rectOf()
        } catch {}
        if (!list) return
        if (!Array.isArray(list)) list = [list]
        const wanted = list.filter((r) => r && (r.width > 0 || r.height > 0))
        // Rebuild only when the line count changes, so every box starts its
        // animation on the same frame instead of drifting out of phase.
        if (boxes.length !== wanted.length) {
          while (host.firstChild) host.removeChild(host.firstChild)
          boxes.length = 0
          for (let i = 0; i < wanted.length; i += 1) makeBox()
        }
        for (let i = 0; i < boxes.length; i += 1) {
          const box = boxes[i]
          const r = wanted[i]
          if (!r) {
            box.style.display = 'none'
            continue
          }
          box.style.display = 'block'
          box.style.width = Math.round(r.width) + 6 + 'px'
          box.style.height = Math.round(r.height) + 4 + 'px'
          box.style.transform =
            'translate3d(' + Math.max(0, Math.round(r.left) - 3) + 'px,' + Math.max(0, Math.round(r.top) - 2) + 'px,0)'
        }
      }
      place()
      flashTimer = window.setInterval(place, 220)
      const dropWhenClicked = () => {
        if (flashBox !== host) return
        document.addEventListener('pointerdown', () => {
          if (flashBox === host) clearFlash()
        }, { once: true })
      }
      if (persist) {
        window.setTimeout(dropWhenClicked, 400)
        return
      }
      if (keep) {
        // Five 640ms beats (alternating 0.05 <-> 0.35), then it lets go.
        window.setTimeout(() => {
          if (flashBox === host) clearFlash()
        }, 3600)
        return
      }
      window.setTimeout(() => {
        if (flashBox === host) clearFlash()
      }, 2000)
    }

    function clearFlash() {
      window.clearInterval(flashTimer)
      flashTimer = 0
      if (flashBox && flashBox.parentNode) flashBox.parentNode.removeChild(flashBox)
      flashBox = null
    }

    /** Nearest ancestor that really scrolls vertically. */
    function scrollBoxOf(el) {
      let node = el && el.parentElement
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node)
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 8) return node
        node = node.parentElement
      }
      return null
    }

    function centerNow(el) {
      const box = scrollBoxOf(el)
      if (box) {
        const r = el.getBoundingClientRect()
        const b = box.getBoundingClientRect()
        const delta = r.top + r.height / 2 - (b.top + b.height / 2)
        if (Math.abs(delta) > 2) box.scrollTop += delta
        return
      }
      try {
        el.scrollIntoView({ block: 'center' })
      } catch {}
    }

    /** Center an element, retrying so late layout or auto-scroll cannot steal the position. */
    async function centerOn(el) {
      for (const wait of [0, 140, 420, 800]) {
        if (wait) await sleep(wait)
        centerNow(el)
      }
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3)
    }

    /** Glide to the element over ~0.9s (fast first, slow at the end), then correct. */
    async function smoothCenter(el) {
      const box = scrollBoxOf(el)
      if (!box) {
        try {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        } catch {}
        await sleep(900)
        return
      }
      const r = el.getBoundingClientRect()
      const b = box.getBoundingClientRect()
      const delta = r.top + r.height / 2 - (b.top + b.height / 2)
      const max = Math.max(0, box.scrollHeight - box.clientHeight)
      const target = Math.max(0, Math.min(max, box.scrollTop + delta))
      const start = box.scrollTop
      const dist = target - start
      if (Math.abs(dist) < 2) return
      const duration = Math.min(1000, Math.max(420, Math.abs(dist) * 1.1))
      await new Promise((resolve) => {
        const t0 = performance.now()
        const step = (now) => {
          const t = Math.min(1, (now - t0) / duration)
          box.scrollTop = start + dist * easeOutCubic(t)
          if (t < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })
      await settle(el)
    }

    /**
     * Keep the target in view for a moment after the glide: the chat view can
     * append content and pull itself back to the bottom. Corrections are glided
     * (never snapped) so a late nudge does not read as a second, wrong jump.
     */
    async function settle(el) {
      for (const wait of [120, 420, 900, 1600]) {
        await sleep(wait)
        if (!el || !el.isConnected) return
        const box = scrollBoxOf(el)
        if (!box) return
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) return
        const b = box.getBoundingClientRect()
        const delta = r.top + r.height / 2 - (b.top + b.height / 2)
        if (Math.abs(delta) <= 24) continue
        const start = box.scrollTop
        const target = start + delta
        const t0 = performance.now()
        await new Promise((resolve) => {
          const step = (now) => {
            const t = Math.min(1, (now - t0) / 260)
            box.scrollTop = start + (target - start) * easeOutCubic(t)
            if (t < 1) requestAnimationFrame(step)
            else resolve()
          }
          requestAnimationFrame(step)
        })
      }
    }

    /** Locate a piece of marked text in the rendered DOM, shrinking the probe if needed. */
    function findTextRange(text, bounds) {
      const flat = String(text || '').replace(/\s+/g, ' ').trim()
      if (flat.length < 4) return null
      const skip = '.ct-track, .ct-menu, .ct-tip, .ct-selbubble, .ct-mask, .ct-anchor'
      const usable = (node) => {
        const host = node.parentElement
        if (!host || host.closest(skip)) return false
        if (!bounds) return true
        try {
          return bounds.intersectsNode(node)
        } catch {
          return false
        }
      }
      for (const size of [30, 16, 8]) {
        const needle = flat.slice(0, size)
        if (needle.length < 4) continue
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
        let node = walker.nextNode()
        while (node) {
          if (usable(node)) {
            const value = (node.nodeValue || '').replace(/\s+/g, ' ')
            const at = value.indexOf(needle)
            if (at >= 0) {
              try {
                const range = document.createRange()
                range.setStart(node, at)
                range.setEnd(node, Math.min(node.nodeValue.length, at + needle.length))
                const rect = range.getBoundingClientRect()
                if (rect && (rect.width || rect.height)) return { range, rect }
              } catch {}
            }
          }
          node = walker.nextNode()
        }
      }
      // Text split across inline nodes (bold / inline code / links): stitch the run back together.
      const nodes = []
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
      let node = walker.nextNode()
      while (node) {
        if (usable(node) && node.nodeValue) nodes.push(node)
        node = walker.nextNode()
      }
      if (nodes.length === 0) return null
      const starts = []
      let joined = ''
      for (const n of nodes) {
        starts.push(joined.length)
        joined += String(n.nodeValue)
      }
      for (const size of [60, 30, 16, 8]) {
        const needle = flat.slice(0, size)
        if (needle.length < 4) continue
        const at = joined.indexOf(needle)
        if (at < 0) continue
        let idx = 0
        for (let i = 0; i < nodes.length; i += 1) {
          const end = starts[i] + String(nodes[i].nodeValue).length
          if (at >= starts[i] && at < end) {
            idx = i
            break
          }
        }
        const first = nodes[idx]
        const offset = Math.min(at - starts[idx], first.nodeValue.length)
        try {
          const range = document.createRange()
          range.setStart(first, offset)
          let remain = needle.length
          let cur = idx
          let curOffset = offset
          let done = false
          while (cur < nodes.length) {
            const text = String(nodes[cur].nodeValue)
            const avail = text.length - curOffset
            if (remain <= avail) {
              range.setEnd(nodes[cur], curOffset + remain)
              done = true
              break
            }
            remain -= avail
            cur += 1
            curOffset = 0
          }
          if (!done) {
            const last = nodes[nodes.length - 1]
            range.setEnd(last, String(last.nodeValue).length)
          }
          const rect = range.getBoundingClientRect()
          if (rect && (rect.width || rect.height)) return { range, rect }
        } catch {}
      }
      return null
    }

    /* -------------------------------------------------------------------- css */

    const CSS = `
.ct-anchor { display: block; height: 0; margin: 0; padding: 0; border: 0; overflow: hidden; }
.ct-bubble {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border: none; border-radius: 999px;
  background: var(--dsw-alias-button-floating-fill, rgba(28,28,30,.92));
  --dsw-elevation-stroke-color: var(--dsw-alias-border-l3, rgba(255,255,255,.12));
  box-shadow: var(--dsw-elevation-panel, 0 6px 20px rgba(0,0,0,.28));
  color: var(--dsw-alias-label-primary, #f5f5f7);
  font: var(--dsw-font-xs-13, 13px/1.2 system-ui, sans-serif);
  cursor: pointer;
}
.ct-bubble:hover { background: var(--dsw-alias-button-floating-hover, rgba(48,48,52,.96)); }
.ct-bubble-dot { display: none; }

.ct-track { position: fixed; width: 12px; pointer-events: none; z-index: 40; transform: translateY(-50%); }
.ct-track-line {
  position: absolute; left: 4px; top: 0; bottom: 0; width: 2px; border-radius: 1px;
  background: var(--dsw-alias-border-l1, rgba(127,127,127,.2));
}
.ct-dot {
  position: absolute; width: 10px; height: 3px; margin: 0; padding: 0;
  border-radius: 2px; border: 1px solid var(--dsw-alias-border-inverted, rgba(127,127,127,.5));
  transform: translateY(-50%); pointer-events: auto; cursor: pointer;
  transition: transform .14s ease, box-shadow .14s ease, height .14s ease;
}
/* A 3px sliver is a cruel hover target: this invisible pad adds ~12px of grip. */
.ct-dot::after {
  content: ''; position: absolute; left: -9px; right: -9px; top: -6px; bottom: -6px;
  border-radius: 6px;
}
.ct-dot:hover, .ct-dot-active { height: 6px; transform: translateY(-50%) scaleX(1.35); box-shadow: 0 0 0 2px var(--dsw-alias-bg-overlay, rgba(0,0,0,.2)); }
.ct-tip {
  position: absolute; left: 18px; width: max-content; max-width: 300px;
  transform: translateY(-50%); pointer-events: auto; z-index: 41;
  background: var(--dsw-alias-bg-layer-3, rgba(250,250,252,.98));
  color: var(--dsw-alias-label-primary, #1c1c1e);
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.28));
  border-radius: 8px; padding: 7px 9px;
  box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgba(0,0,0,.35));
  font: var(--dsw-font-xs-13, 13px/1.35 system-ui, sans-serif);
  white-space: normal; word-break: break-word;
}
.ct-tip-title { font-weight: 600; margin-bottom: 3px; }
.ct-tip-sub { opacity: .62; font-size: 11px; }
.ct-tip-actions { display: flex; gap: 8px; margin-top: 6px; }
.ct-link { background: none; border: none; color: var(--dsw-alias-label-secondary, #9aa0a6); font-size: 11px; cursor: pointer; padding: 0; }
.ct-link:hover { color: var(--dsw-alias-label-primary, #f5f5f7); text-decoration: underline; }

.ct-row-dots { display: inline-flex; align-items: center; gap: 3px; }
.ct-row-dot { width: 6px; height: 6px; border-radius: 50%; display: block; }

.ct-mask {
  position: fixed; inset: 0; background: var(--dsw-alias-bg-mask-2, rgba(0,0,0,.38));
  display: flex; align-items: center; justify-content: center; z-index: 60;
  pointer-events: auto;
}
.ct-card {
  width: min(560px, calc(100vw - 48px)); max-height: 76vh; overflow: auto;
  background: var(--dsw-alias-bg-layer-3, #1c1c1e);
  color: var(--dsw-alias-label-primary, #f5f5f7);
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.28));
  border-radius: 14px; padding: 18px;
  box-shadow: var(--dsw-elevation-panel, 0 24px 64px rgba(0,0,0,.45));
  font: var(--dsw-font-body, 14px/1.5 system-ui, sans-serif);
}
.ct-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.ct-quote {
  border-left: 3px solid var(--dsw-alias-border-l3, rgba(127,127,127,.45)); padding: 4px 10px; margin-bottom: 14px;
  opacity: .8; font-size: 12.5px; max-height: 96px; overflow: auto; white-space: pre-wrap;
}
.ct-label { font-size: 11.5px; opacity: .6; margin: 12px 0 6px; }
.ct-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.ct-chip {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px;
  border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3));
  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08)); color: inherit; cursor: pointer; font-size: 12.5px;
  transition: border-color .14s ease, background .14s ease;
}
.ct-chip:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,.14)); }
.ct-chip-on { border-color: var(--dsw-alias-border-selected, rgba(127,127,127,.7)); background: var(--dsw-alias-bg-multi-select, rgba(127,127,127,.2)); }
.ct-swatch { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.ct-input, .ct-textarea {
  width: 100%; box-sizing: border-box; padding: 7px 9px; font: inherit; font-size: 13px;
  color: inherit; background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,.1));
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: 8px; outline: none;
}
.ct-input:focus, .ct-textarea:focus { border-color: var(--dsw-alias-border-l4, rgba(127,127,127,.6)); }
.ct-textarea { min-height: 60px; resize: vertical; }
.ct-palette { display: flex; gap: 8px; margin-top: 8px; }
.ct-swatch-btn { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
.ct-swatch-btn-on { border-color: var(--dsw-alias-label-primary, #f5f5f7); }
.ct-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.ct-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3));
  background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08)); color: inherit; cursor: pointer; font-size: 13px;
}
.ct-btn:hover { background: var(--dsw-alias-bg-layer-1, rgba(127,127,127,.16)); }
.ct-btn-primary { background: #4c8bf5; border-color: #4c8bf5; color: #fff; }
.ct-btn-primary:hover { background: #5b96f7; }
.ct-btn-danger { color: #e5484d; border-color: rgba(229, 72, 77, .45); }
.ct-btn-danger:hover { background: rgba(229, 72, 77, .1); }
.ct-confirm-text {
  margin: 8px 0 4px; font-size: 13px; line-height: 1.65;
  color: var(--dsw-alias-label-secondary, rgba(60,60,67,.72));
  word-break: break-word;
}
.ct-btn:disabled { opacity: .45; cursor: default; }

.ct-overview { width: 100%; height: 100%; box-sizing: border-box; overflow: auto; padding: 22px 26px 40px; }
.ct-ov-close {
  margin-left: auto; align-self: center; flex: none;
  padding: 5px 12px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128,140,160,.35));
  background: transparent; color: inherit; font-size: 12px; opacity: .75;
}
.ct-ov-close:hover { opacity: 1; }
.ct-selbubble { position: fixed; z-index: 60; pointer-events: auto; display: flex; gap: 6px; }
.ct-ov-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; }
.ct-diag { margin: -8px 0 14px; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, rgba(127,127,127,.9)); word-break: break-all; }
.ct-ov-title { font-size: 17px; font-weight: 650; }
.ct-ov-sub { font-size: 12px; opacity: .55; }
.ct-tagbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.ct-tag {
  display: inline-flex; align-items: center; gap: 7px; padding: 4px 9px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.3)); border-radius: 999px; font-size: 12.5px;
  background: transparent; color: inherit; cursor: pointer;
}
.ct-tag-on { border-color: currentColor; }
.ct-tag-count { opacity: .55; font-size: 11px; }
.ct-tag-edit {
  margin-left: 5px; padding: 0 4px; border-radius: 4px;
  opacity: .45; font-size: 12px; line-height: 1.1;
}
.ct-tag-edit:hover { opacity: 1; background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18)); }
.ct-mark {
  display: flex; gap: 10px; padding: 11px 12px; margin: 0;
  border: 1px solid var(--dsw-alias-border-l3, rgba(127, 127, 127, .42));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, rgba(127, 127, 127, .06));
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}
.ct-mark:hover {
  background: var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, .12));
  border-color: var(--dsw-alias-border-l4, rgba(127, 127, 127, .58));
}
.ct-bar { width: 3px; border-radius: 2px; flex: none; }
.ct-mark-body { flex: 1; min-width: 0; }
.ct-mark-title { font-size: 13.5px; font-weight: 600; cursor: pointer; word-break: break-word; }
.ct-mark-title:hover { text-decoration: underline; }
.ct-mark-text { font-size: 12px; opacity: .66; margin-top: 3px; white-space: pre-wrap; word-break: break-word; }
.ct-mark-note { font-size: 12px; opacity: .8; margin-top: 4px; }
.ct-mark-meta { font-size: 11px; opacity: .45; margin-top: 5px; display: flex; gap: 10px; }
.ct-mark-actions { display: flex; gap: 6px; align-items: center; align-self: center; flex: none; }
/* Icon buttons keep a light plate on purpose: the inlined PNGs are black/blue line art,
   so a theme-colored plate would swallow them in the dark theme. */
.ct-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; padding: 0; cursor: pointer;
  border: 1px solid rgba(0, 0, 0, .14); border-radius: 7px;
  background: rgba(255, 255, 255, .92);
}
.ct-icon-btn:hover { background: #fff; border-color: rgba(0, 0, 0, .28); }
.ct-icon-btn-danger:hover { background: #fff0f0; border-color: rgba(220, 70, 70, .55); }
.ct-icon { width: 15px; height: 15px; display: block; pointer-events: none; }
/* Two marks per row on a wide panel, one per row when the panel gets narrow.
   Container query (not viewport) so a workspace card split in half still stacks sanely. */
.ct-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; align-items: stretch; }
@container (max-width: 720px) { .ct-grid { grid-template-columns: 1fr; } }
@media (max-width: 880px) { .ct-grid { grid-template-columns: 1fr; } }
/* Collapsible Workspace groups in the overview. */
.ct-ws-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 14px;
  margin-top: 14px;
  align-items: stretch;
}
.ct-ws {
  container-type: inline-size;
  margin-top: 0;
  border: 1px solid var(--dsw-alias-border-l2, rgba(127, 127, 127, .28));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, rgba(127, 127, 127, .05));
  padding: 4px 12px 12px;
}
/* A folded card keeps only its header row: no stretched height from the grid row. */
.ct-ws-folded { padding-bottom: 4px; }
.ct-ws-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 2px;
  margin: 0 -4px;
  border-radius: 8px;
  user-select: none;
  background: transparent;
}
.ct-ws-caret {
  flex: none; width: 18px; height: 18px; padding: 0; cursor: pointer;
  border: none; background: transparent; border-radius: 5px;
  font-size: 11px; line-height: 1; opacity: .62;
  color: var(--dsw-alias-label-primary, #1c1c1e);
}
.ct-ws-caret:hover { opacity: 1; background: var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, .14)); }
.ct-ws-name {
  max-width: 55%; padding: 1px 4px; margin-left: -2px; cursor: pointer;
  border: none; background: transparent; border-radius: 5px;
  font: inherit; font-size: 13px; font-weight: 650; text-align: left;
  color: var(--dsw-alias-label-primary, #1c1c1e);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ct-ws-name:hover { background: var(--dsw-alias-bg-layer-2, rgba(127, 127, 127, .14)); text-decoration: underline; }
.ct-ws-dot {
  flex: none; width: 10px; height: 10px; padding: 0; cursor: pointer;
  border: 1px solid rgba(0, 0, 0, .18); border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .45) inset;
}
.ct-ws-dot:hover { transform: scale(1.18); }
.ct-swatches { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
.ct-swatch {
  width: 24px; height: 24px; padding: 0; cursor: pointer; border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, .18);
}
.ct-swatch-on { box-shadow: 0 0 0 2px var(--dsw-alias-label-primary, #1c1c1e); }
.ct-ws-caret-old { flex: none; width: 12px; font-size: 11px; opacity: .6; }
.ct-ws-name-old { font-size: 13px; font-weight: 650; }
.ct-ws-count { font-size: 11px; opacity: .55; }
.ct-ws-path {
  margin-left: auto;
  max-width: 45%;
  font-size: 11px;
  opacity: .4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ct-empty { opacity: .5; font-size: 13px; padding: 28px 0; }
.ct-menu {
  position: fixed; z-index: 95; min-width: 132px; pointer-events: auto;
  background: var(--dsw-alias-bg-layer-3, rgba(250,250,252,.98));
  color: var(--dsw-alias-label-primary, #1c1c1e);
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.28));
  border-radius: 8px; padding: 4px;
  box-shadow: var(--dsw-elevation-panel, 0 8px 24px rgba(0,0,0,.35));
  font: var(--dsw-font-xs-13, 13px/1.35 system-ui, sans-serif);
}
.ct-menu-item {
  display: block; width: 100%; text-align: left; padding: 6px 9px;
  border: 0; border-radius: 6px; background: transparent; color: inherit;
  font-size: 12.5px; cursor: pointer;
}
.ct-menu-item:hover { background: var(--dsw-alias-bg-layer-2, rgba(127,127,127,.16)); }
.ct-menu-item-danger { color: #ff6b6b; }
.ct-flash-host { position: fixed; inset: 0; pointer-events: none; z-index: 55; }
.ct-flash {
  position: fixed; left: 0; top: 0; pointer-events: none; border-radius: 6px;
  background: rgba(255, 214, 10, .28);
  box-shadow: 0 0 0 2px rgba(255, 214, 10, .8), 0 0 16px rgba(255, 214, 10, .36);
  animation: ct-flash-blink 640ms linear 5 alternate,
             ct-flash-out 360ms 3200ms ease-out forwards;
  will-change: opacity, transform;
  backface-visibility: hidden;
}
.ct-flash-hold { animation: none; }
@keyframes ct-flash-blink {
  0% { opacity: .2; }
  100% { opacity: .7; }
}
@keyframes ct-flash-out {
  from { opacity: .7; }
  to { opacity: 0; }
}

.ct-toast {
  position: fixed; left: 50%; bottom: 40px; transform: translateX(-50%);
  background: var(--dsw-alias-bg-layer-3, rgba(250,250,252,.98));
  color: var(--dsw-alias-label-primary, #1c1c1e);
  border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.28));
  box-shadow: var(--dsw-elevation-panel, 0 6px 20px rgba(0,0,0,.28));
  padding: 8px 14px; border-radius: 8px;
  font-size: 12.5px; z-index: 70; pointer-events: none;
}
`

    /* ------------------------------------------------------------- components */

    function SelectionBubble() {
      const st = useStore()
      const [pos, setPos] = useState(null)

      useEffect(() => {
        let raf = 0
        const reset = () => setPos((prev) => (prev === null ? prev : null))
        const compute = () => {
          raf = 0
          if (STATE.dialog !== null) return reset()
          let sel = null
          try {
            sel = window.getSelection()
          } catch {
            return reset()
          }
          if (!sel || sel.isCollapsed || sel.rangeCount === 0) return reset()
          const range = sel.getRangeAt(0)
          const text = String(sel).trim()
          if (text.length === 0) return reset()
          const node = range.commonAncestorContainer
          const el = node && node.nodeType === 1 ? node : node && node.parentElement
          if (el && el.closest && el.closest('input, textarea, [contenteditable="true"]')) return reset()
          const rect = range.getBoundingClientRect()
          if (!rect || (rect.width === 0 && rect.height === 0)) return reset()
          setPos({ x: Math.max(8, rect.left), y: rect.bottom + 10, text })
        }
        const schedule = () => {
          if (!raf) raf = requestAnimationFrame(compute)
        }
        document.addEventListener('selectionchange', schedule)
        document.addEventListener('mouseup', schedule, true)
        document.addEventListener('keyup', schedule, true)
        document.addEventListener('scroll', schedule, true)
        window.addEventListener('resize', schedule)
        return () => {
          document.removeEventListener('selectionchange', schedule)
          document.removeEventListener('mouseup', schedule, true)
          document.removeEventListener('keyup', schedule, true)
          document.removeEventListener('scroll', schedule, true)
          window.removeEventListener('resize', schedule)
          if (raf) cancelAnimationFrame(raf)
        }
      }, [])

      if (pos === null) return null

      return h(
        'div',
        {
          className: 'ct-selbubble',
          style: { left: pos.x + 'px', top: pos.y + 'px' },
          onPointerDown: (e) => e.preventDefault(),
        },
        h(
          'button',
          {
            type: 'button',
            className: 'ct-bubble',
            onClick: () => {
              const sessionId = currentSessionId() || ''
              const seq = locateSeq()
              setPos(null)
              patch({
                dialog: {
                  mode: 'create',
                  draft: {
                    sessionId,
                    seq,
                    text: pos.text,
                    title: defaultTitle(pos.text),
                    note: '',
                    tagId: st.tags.length > 0 ? st.tags[0].id : null,
                  },
                  newTagName: '',
                  newTagColor: PALETTE[0],
                },
              })
            },
          },
          '打标签'
        )
      )
    }

    function TurnAnchor(props) {
      if (typeof props.seq !== 'number') return null
      return h('i', {
        className: 'ct-anchor',
        'data-ct-anchor': String(props.seq),
        'data-ct-session': String(props.sessionId || ''),
      })
    }

    function SessionDots(props) {
      const st = useStore()
      const sid = props.sessionId
      const colors = []
      const seen = new Set()
      for (const mark of st.marks) {
        if (mark.sessionId !== sid) continue
        if (seen.has(mark.tagId)) continue
        seen.add(mark.tagId)
        const tag = st.tags.find((t) => t.id === mark.tagId)
        colors.push(tag ? tag.color : '#9aa0a6')
        if (colors.length >= 3) break
      }
      if (colors.length === 0) return null
      return h(
        'span',
        { className: 'ct-row-dots' },
        colors.map((color, i) => h('i', { key: String(i), className: 'ct-row-dot', style: { background: color } }))
      )
    }

    function trackHeight() {
      return Math.max(240, Math.min(Math.round(window.innerHeight * 0.56), 520))
    }

    function Track() {
      const st = useStore()
      const [points, setPoints] = useState([])
      const [left, setLeft] = useState(0)
      const [hovered, setHovered] = useState(null)
      const [menu, setMenu] = useState(null)
      const hideTimer = useRef(0)
      const menuBox = useRef(null)
      const menuDetach = useRef(null)

      const closeMenuDom = () => {
        if (menuDetach.current) {
          menuDetach.current()
          menuDetach.current = null
        }
        if (menuBox.current && menuBox.current.parentNode) {
          menuBox.current.parentNode.removeChild(menuBox.current)
        }
        menuBox.current = null
      }

      useEffect(() => {
        let raf = 0
        let timer = 0
        const compute = () => {
          raf = 0
          const list = anchors()
          if (list.length === 0) {
            setPoints((prev) => (prev.length === 0 ? prev : []))
            return
          }
          const sessionId = list[0].getAttribute('data-ct-session')
          const columnLeft = list[0].getBoundingClientRect().left
          let min = Infinity
          let max = -Infinity
          for (const el of list) {
            const s = Number(el.getAttribute('data-ct-anchor'))
            if (!Number.isFinite(s)) continue
            if (s < min) min = s
            if (s > max) max = s
          }
          const mine = st.marks
            .filter((m) => (!sessionId || m.sessionId === sessionId) && Number.isFinite(Number(m.seq)))
            .slice()
            .sort((a, b) => Number(a.seq) - Number(b.seq))
          for (const m of mine) {
            const s = Number(m.seq)
            if (s < min) min = s
            if (s > max) max = s
          }
          const span = Number.isFinite(min) && max > min ? max - min : 0
          const height = trackHeight()
          let last = -100
          const next = mine.map((mark) => {
            let y = Math.round(span > 0 ? ((Number(mark.seq) - min) / span) * (height - 12) : 0)
            if (y < last + 7) y = last + 7
            if (y > height - 4) y = height - 4
            last = y
            const tag = st.tags.find((t) => t.id === mark.tagId) || null
            return { mark, y, color: (tag && tag.color) || '#9aa0a6', tagName: (tag && tag.name) || '' }
          })
          setPoints(next)
          if (columnLeft > 0) setLeft(columnLeft)
        }
        const schedule = () => {
          if (!raf) raf = requestAnimationFrame(compute)
        }
        compute()
        window.addEventListener('scroll', schedule, true)
        window.addEventListener('resize', schedule)
        timer = window.setInterval(schedule, 800)
        return () => {
          window.removeEventListener('scroll', schedule, true)
          window.removeEventListener('resize', schedule)
          window.clearInterval(timer)
          if (raf) cancelAnimationFrame(raf)
        }
      }, [st.marks, st.tags])

      const menuOpen = menu !== null
      useEffect(() => () => closeMenuDom(), [])
      useEffect(() => {
        if (!menuOpen) return undefined
        const close = () => setMenu(null)
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
      }, [menuOpen])

      const showHover = (id) => {
        clearTimeout(hideTimer.current)
        setHovered(id)
      }
      const hideHover = () => {
        clearTimeout(hideTimer.current)
        hideTimer.current = setTimeout(() => setHovered(null), 180)
      }
      const openMenu = (event, mark) => {
        event.preventDefault()
        event.stopPropagation()
        clearTimeout(hideTimer.current)
        setHovered(null)
        setMenu(null)
        closeMenuDom()
        const box = document.createElement('div')
        box.className = 'ct-menu'
        const entries = [
          {
            label: '编辑标签',
            run: () =>
              patch({
                dialog: { mode: 'edit', draft: { ...mark }, newTagName: '', newTagColor: PALETTE[0] },
              }),
          },
          { label: '删除标签', run: () => removeMark(mark), danger: true },
        ]
        for (const entry of entries) {
          const btn = document.createElement('button')
          btn.type = 'button'
          btn.className = 'ct-menu-item' + (entry.danger ? ' ct-menu-item-danger' : '')
          btn.textContent = entry.label
          btn.addEventListener('click', (e) => {
            e.stopPropagation()
            closeMenuDom()
            entry.run()
          })
          box.appendChild(btn)
        }
        document.body.appendChild(box)
        const bw = box.offsetWidth || 150
        const bh = box.offsetHeight || 120
        const gap = 6
        let x = event.clientX + gap
        let y = event.clientY + gap
        if (x + bw > window.innerWidth - 4) x = Math.max(4, event.clientX - bw - gap)
        if (y + bh > window.innerHeight - 4) y = Math.max(4, event.clientY - bh - gap)
        box.style.left = x + 'px'
        box.style.top = y + 'px'
        menuBox.current = box
        const onDown = (e) => {
          if (!box.contains(e.target)) closeMenuDom()
        }
        window.setTimeout(() => {
          document.addEventListener('pointerdown', onDown, true)
          menuDetach.current = () => document.removeEventListener('pointerdown', onDown, true)
        }, 0)
      }
      const removeMark = async (mark) => {
        setMenu(null)
        confirmAsk('删除这条标签？', async () => {
          try {
            await request('/mark/delete', { id: mark.id })
            toast('已删除')
            refresh()
          } catch (e) {
            toast('删除失败：' + String((e && e.message) || e))
          }
        })
      }

      if (points.length === 0 || left <= 0) return null

      const hoveredPoint = points.find((p) => p.mark.id === hovered)
      return h(
        'div',
        { className: 'ct-track', style: { left: Math.max(4, left - 54) + 'px', top: '50%', height: trackHeight() + 'px' } },
        h('div', { className: 'ct-track-line' }),
        points.map((point) =>
          h('button', {
            key: point.mark.id,
            type: 'button',
            className: 'ct-dot' + (hovered === point.mark.id ? ' ct-dot-active' : ''),
            style: { top: point.y + 'px', background: point.color },
            'aria-label': '标签：' + String(point.mark.title || point.mark.text || '').slice(0, 30),
            title: String(point.mark.title || point.mark.text || '').slice(0, 60),
            onPointerEnter: () => showHover(point.mark.id),
            onPointerLeave: hideHover,
            onClick: () => jumpTo(point.mark),
            onContextMenu: (event) => openMenu(event, point.mark),
          })
        ),
        hoveredPoint
          ? h(
              'div',
              {
                className: 'ct-tip',
                style: { top: hoveredPoint.y + 'px' },
                onPointerEnter: () => showHover(hoveredPoint.mark.id),
                onPointerLeave: hideHover,
              },
              h(
                'div',
                { className: 'ct-tip-title' },
                hoveredPoint.mark.note ||
                  hoveredPoint.mark.title ||
                  defaultTitle(hoveredPoint.mark.text)
              ),
              h(
                'div',
                { className: 'ct-tip-sub' },
                String(hoveredPoint.mark.title || '').trim() || hoveredPoint.tagName || ''
              ),
              h(
                'div',
                { className: 'ct-tip-actions' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ct-link',
                    onClick: () => jumpTo(hoveredPoint.mark),
                  },
                  '跳转'
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'ct-link',
                    onClick: () =>
                      patch({
                        dialog: {
                          mode: 'edit',
                          draft: { ...hoveredPoint.mark },
                          newTagName: '',
                          newTagColor: PALETTE[0],
                        },
                      }),
                  },
                  '编辑'
                )
              )
            )
          : null
      )
    }

    function Dialog() {
      const st = useStore()
      const dialog = st.dialog
      const [name, setName] = useState('')
      const [color, setColor] = useState(PALETTE[0])
      const [title, setTitle] = useState('')
      const [note, setNote] = useState('')
      const [tagId, setTagId] = useState(null)
      const [createTag, setCreateTag] = useState(false)
      const [busy, setBusy] = useState(false)
      const draftId = dialog ? (dialog.mode === 'edit' ? dialog.draft.id : dialog.draft.text + ':' + dialog.draft.seq) : null

      useEffect(() => {
        if (!dialog) return
        setName('')
        setColor(PALETTE[0])
        setTitle(dialog.draft.title || '')
        setNote(dialog.draft.note || '')
        setTagId(dialog.draft.tagId || (st.tags[0] ? st.tags[0].id : null))
        setCreateTag(st.tags.length === 0)
      }, [draftId])

      if (!dialog) return null
      const draft = dialog.draft
      const editing = dialog.mode === 'edit'

      const close = () => patch({ dialog: null })

      const submit = async () => {
        if (busy) return
        setBusy(true)
        try {
          let finalTagId = tagId
          if (createTag) {
            if (!name.trim()) {
              toast('先给标签起个名字')
              return
            }
            const created = await request('/tag/create', { name: name.trim(), color })
            finalTagId = created && created.tag ? created.tag.id : null
            if (!finalTagId) {
              toast('创建标签失败')
              return
            }
          }
          if (!finalTagId) {
            toast('先选一个标签，或新建一个')
            return
          }
          if (editing) {
            await request('/mark/update', { id: draft.id, title, note, tagId: finalTagId })
            toast('已更新')
          } else {
            await request('/mark/create', {
              sessionId: draft.sessionId,
              seq: draft.seq,
              text: draft.text,
              title,
              note,
              tagId: finalTagId,
            })
            toast('已打标签')
          }
          close()
        } catch (e) {
          toast('保存失败：' + String((e && e.message) || e))
        } finally {
          setBusy(false)
        }
      }

      const creatingNew = createTag

      return h(
        'div',
        {
          className: 'ct-mask',
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) close()
          },
        },
        h(
          'div',
          { className: 'ct-card', onMouseDown: (e) => e.stopPropagation() },
          h('div', { className: 'ct-title' }, editing ? '编辑标签' : '给这段内容打标签'),
          h('div', { className: 'ct-quote' }, String(draft.text || '').slice(0, 600)),

          h('div', { className: 'ct-label' }, '标签'),
          h(
            'div',
            { className: 'ct-chips' },
            st.tags.map((tag) =>
              h(
                'button',
                {
                  key: tag.id,
                  type: 'button',
                  className: 'ct-chip' + (tagId === tag.id ? ' ct-chip-on' : ''),
                  title: '右键可编辑或删除标签',
                  onContextMenu: (e) => tagMenu(e, tag),
                  onClick: () => {
                    setTagId(tag.id)
                    setCreateTag(false)
                  },
                },
                h('i', { className: 'ct-swatch', style: { background: tag.color } }),
                tag.name,
                h(
                  'span',
                  {
                    className: 'ct-tag-edit',
                    title: '编辑名称/颜色',
                    onClick: (e) => {
                      e.stopPropagation()
                      openTagEditor(tag)
                    },
                  },
                  '⋯'
                )
              )
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'ct-chip' + (createTag ? ' ct-chip-on' : ''),
                onClick: () => {
                  setCreateTag(true)
                  setTagId(null)
                },
              },
              '＋ 新建标签'
            )
          ),

          creatingNew
            ? h(
                'div',
                null,
                h('div', { className: 'ct-label' }, '新标签名称'),
                h('input', {
                  className: 'ct-input',
                  value: name,
                  placeholder: '例如：待办 / 疑问 / 灵感',
                  autoFocus: true,
                  onChange: (e) => setName(e.target.value),
                }),
                h(
                  'div',
                  { className: 'ct-palette' },
                  PALETTE.map((c) =>
                    h('button', {
                      key: c,
                      type: 'button',
                      className: 'ct-swatch-btn' + (color === c ? ' ct-swatch-btn-on' : ''),
                      style: { background: c },
                      onClick: () => setColor(c),
                    })
                  )
                )
              )
            : null,

          h('div', { className: 'ct-label' }, '标题（悬停次行，可留空）'),
          h('input', {
            className: 'ct-input',
            value: title,
            placeholder: defaultTitle(draft.text),
            onChange: (e) => setTitle(e.target.value),
          }),

          h('div', { className: 'ct-label' }, '备注（悬停首行，可留空）'),
          h('textarea', {
            className: 'ct-textarea',
            value: note,
            placeholder: '为什么标记它？',
            onChange: (e) => setNote(e.target.value),
          }),

          h(
            'div',
            { className: 'ct-actions' },
            h('button', { type: 'button', className: 'ct-btn', onClick: close }, '取消'),
            h(
              'button',
              { type: 'button', className: 'ct-btn ct-btn-primary', disabled: busy, onClick: submit },
              editing ? '保存' : '打标签'
            )
          )
        )
      )
    }

    function Overview(props) {
      const st = useStore()
      const [hovered, setHovered] = useState(null)
      const filter = st.filterTagId
      const marks = filter ? st.marks.filter((m) => m.tagId === filter) : st.marks
      const ordered = marks.slice().reverse()

      /* The `main` slot hands every panel a useWorkspaces() snapshot selector, so the
         Workspace registry is read from its owner rather than a client service.
         It re-renders on rename / new folder / moved session by itself. */
      let wsItems = []
      try {
        if (props && typeof props.useWorkspaces === 'function') {
          const snap = props.useWorkspaces((s) => s)
          wsItems = (snap && snap.items) || []
        }
      } catch (e) {
        /* selector threw once (registry still loading) — every mark lands in 未分组 */
      }

      const [folded, setFolded] = useState(readFolded)
      const toggleFold = (key) => {
        setFolded((cur) => {
          const next = Object.assign({}, cur)
          if (next[key]) delete next[key]
          else next[key] = true
          writeFolded(next)
          return next
        })
      }

      const groups = []
      const groupBy = Object.create(null)
      ordered.forEach((mark) => {
        const ws = workspaceOf(wsItems, mark.sessionId)
        if (!groupBy[ws.key]) {
          groupBy[ws.key] = { key: ws.key, label: ws.label, path: ws.path, items: [] }
          groups.push(groupBy[ws.key])
        }
        groupBy[ws.key].items.push(mark)
      })

      const countOf = (tagId) => st.marks.filter((m) => m.tagId === tagId).length

      const renderMark = (mark) => {
        const tag = st.tags.find((t) => t.id === mark.tagId)
        const editThis = () =>
          patch({
            dialog: { mode: 'edit', draft: { ...mark }, newTagName: '', newTagColor: PALETTE[0] },
          })
        const deleteThis = () =>
          confirmAsk('删除这条标签？', async () => {
            try {
              await request('/mark/delete', { id: mark.id })
              toast('已删除')
            } catch (e) {
              toast('删除失败：' + String((e && e.message) || e))
            }
          })
        return h(
          'div',
          {
            key: mark.id,
            className: 'ct-mark',
            title: '点击跳转到原文',
            onClick: () => jumpTo(mark),
            onContextMenu: (event) => {
              event.preventDefault()
              event.stopPropagation()
              showBodyMenu(event, [
                { label: '编辑标签', run: editThis },
                { label: '删除标签', run: deleteThis, danger: true },
              ])
            },
          },
          h('div', { className: 'ct-bar', style: { background: (tag && tag.color) || '#9aa0a6' } }),
          h(
            'div',
            { className: 'ct-mark-body' },
            h(
              'div',
              {
                className: 'ct-mark-title',
                onClick: (event) => {
                  event.stopPropagation()
                  editThis()
                },
              },
              mark.title || defaultTitle(mark.text)
            ),
            mark.text ? h('div', { className: 'ct-mark-text' }, String(mark.text).slice(0, 300)) : null,
            mark.note ? h('div', { className: 'ct-mark-note' }, mark.note) : null,
            h(
              'div',
              { className: 'ct-mark-meta' },
              h('span', null, tag ? tag.name : '无标签'),
              h('span', null, mark.seq === null || mark.seq === undefined ? 'seq ?' : 'turn ' + mark.seq),
              h('span', null, new Date(mark.createdAt).toLocaleString()),
              h('span', null, String(mark.sessionId || '').slice(0, 8))
            )
          ),
          h(
            'div',
            { className: 'ct-mark-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'ct-icon-btn',
                title: '跳转到此处',
                'aria-label': '跳转到此处',
                onClick: (event) => {
                  event.stopPropagation()
                  jumpTo(mark)
                },
              },
              h('img', { className: 'ct-icon', src: ICON_JUMP, alt: '', draggable: false })
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'ct-icon-btn ct-icon-btn-danger',
                title: '删除这条标签',
                'aria-label': '删除这条标签',
                onClick: (event) => {
                  event.stopPropagation()
                  deleteThis()
                },
              },
              h('img', { className: 'ct-icon', src: ICON_DELETE, alt: '', draggable: false })
            )
          )
        )
      }

      return h(
        'div',
        { className: 'ct-overview' },
        h(
          'div',
          { className: 'ct-ov-head' },
          h('div', { className: 'ct-ov-title' }, '标签'),
          h('div', { className: 'ct-ov-sub' }, st.marks.length + ' 条标记 · 点标签上的 ⋯ 可改名或删除'),
          h(
            'button',
            {
              type: 'button',
              className: 'ct-ov-close',
              onClick: () => {
                if (CTX && CTX.layout && typeof CTX.layout.selectPanel === 'function') CTX.layout.selectPanel(null)
              },
            },
            '返回对话'
          )
        ),
        st.jumpDiag
          ? h(
              'div',
              { className: 'ct-diag' },
              '上次跳转：seq=' +
                String(st.jumpDiag.seq) +
                ' · 同会话' +
                (st.jumpDiag.sameSession ? '✓' : '✗') +
                ' · loadThrough=' +
                String(st.jumpDiag.loaded) +
                ' · 锚点 ' +
                String(st.jumpDiag.anchors) +
                ' 个' +
                (st.jumpDiag.anchorHit ? '(命中)' : '(未命中)') +
                ' · 文本' +
                (st.jumpDiag.textHit ? '✓' : '✗') +
                ' · find' +
                (st.jumpDiag.findHit ? '✓' : '✗')
            )
          : null,
        h(
          'div',
          { className: 'ct-tagbar' },
          h(
            'button',
            {
              type: 'button',
              className: 'ct-tag' + (filter === null ? ' ct-tag-on' : ''),
              onClick: () => patch({ filterTagId: null }),
            },
            '全部',
            h('span', { className: 'ct-tag-count' }, String(st.marks.length))
          ),
          st.tags.map((tag) =>
            h(
              'button',
              {
                key: tag.id,
                type: 'button',
                className: 'ct-tag' + (filter === tag.id ? ' ct-tag-on' : ''),
                title: '右键可删除标签',
                onMouseEnter: () => setHovered(tag.id),
                onMouseLeave: () => setHovered((cur) => (cur === tag.id ? null : cur)),
                onContextMenu: (e) => tagMenu(e, tag),
                onClick: () => patch({ filterTagId: filter === tag.id ? null : tag.id }),
              },
              h('i', { className: 'ct-swatch', style: { background: tag.color } }),
              tag.name,
              h('span', { className: 'ct-tag-count' }, String(countOf(tag.id))),
              h(
                'span',
                {
                  className: 'ct-tag-edit',
                  title: '编辑名称/颜色',
                  onClick: (e) => {
                    e.stopPropagation()
                    openTagEditor(tag)
                  },
                },
                '⋯'
              )
            )
          )
        ),
        ordered.length === 0
          ? h('div', { className: 'ct-empty' }, '还没有标签。选中聊天里的文字，点「标签」气泡试试。')
          : groups.length === 1 && groups[0].key === ''
            ? h('div', { className: 'ct-grid' }, groups[0].items.map(renderMark))
            : h(
                'div',
                { className: 'ct-ws-grid' },
                groups.map((g) => {
                  const skin = wsSkin(g.key)
                  const openWsEditor = () => patch({ wsColor: { key: g.key, label: g.label } })
                  return h(
                    'div',
                    {
                      key: 'ws:' + g.key,
                      className: 'ct-ws' + (folded[g.key] ? ' ct-ws-folded' : ''),
                      style: {
                        background: skin.background,
                        borderColor: skin.borderColor,
                        alignSelf: folded[g.key] ? 'start' : undefined,
                      },
                    },
                    h(
                      'div',
                      {
                        className: 'ct-ws-head',
                        onContextMenu: (event) => {
                          event.preventDefault()
                          showBodyMenu(event, [{ label: '设置工作区颜色', run: openWsEditor }])
                        },
                      },
                      h('button', {
                        type: 'button',
                        className: 'ct-ws-caret',
                        title: folded[g.key] ? '展开' : '折叠',
                        'aria-label': folded[g.key] ? '展开工作区' : '折叠工作区',
                        'aria-expanded': folded[g.key] ? 'false' : 'true',
                        onClick: (event) => {
                          event.stopPropagation()
                          toggleFold(g.key)
                        },
                      }, folded[g.key] ? '▸' : '▾'),
                      h('button', {
                        type: 'button',
                        className: 'ct-ws-dot',
                        title: '设置工作区颜色',
                        'aria-label': '设置工作区颜色',
                        style: { background: skin.color },
                        onClick: (event) => {
                          event.stopPropagation()
                          openWsEditor()
                        },
                      }),
                      h('button', {
                        type: 'button',
                        className: 'ct-ws-name',
                        title: g.path || '点击设置工作区颜色',
                        onClick: (event) => {
                          event.stopPropagation()
                          openWsEditor()
                        },
                      }, g.label),
                      h('span', { className: 'ct-ws-count' }, g.items.length + ' 条'),
                      g.path ? h('span', { className: 'ct-ws-path' }, g.path) : null
                    ),
                    folded[g.key] ? null : h('div', { className: 'ct-grid' }, g.items.map(renderMark))
                  )
                })
              )
      )
    }

    function TagEditor() {
      const st = useStore()
      const editor = st.tagEditor
      const [color, setColor] = useState(PALETTE[0])
      const [name, setName] = useState('')
      useEffect(() => {
        if (editor) {
          setColor(editor.color || PALETTE[0])
          setName(editor.name || '')
        }
      }, [editor ? editor.id : null])
      if (!editor) return null
      const close = () => patch({ tagEditor: null })
      return h(
        'div',
        {
          className: 'ct-mask',
          style: { zIndex: 88 },
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) close()
          },
        },
        h(
          'div',
          { className: 'ct-card', style: { width: 'min(380px, calc(100vw - 48px))' } },
          h('div', { className: 'ct-title' }, '编辑标签'),
          h('div', { className: 'ct-label' }, '名称'),
          h('input', { className: 'ct-input', value: name, onChange: (e) => setName(e.target.value) }),
          h('div', { className: 'ct-label' }, '颜色'),
          h(
            'div',
            { className: 'ct-palette' },
            PALETTE.map((c) =>
              h('button', {
                key: c,
                type: 'button',
                className: 'ct-swatch-btn' + (color === c ? ' ct-swatch-btn-on' : ''),
                style: { background: c },
                onClick: () => setColor(c),
              })
            )
          ),
          h(
            'div',
            { className: 'ct-actions' },
            h('button', { type: 'button', className: 'ct-btn', onClick: close }, '取消'),
            h(
              'button',
              {
                type: 'button',
                className: 'ct-btn ct-btn-primary',
                onClick: async () => {
                  try {
                    await request('/tag/update', { id: editor.id, name, color })
                    close()
                    toast('已保存')
                  } catch (e) {
                    toast('保存失败：' + String((e && e.message) || e))
                  }
                },
              },
              '保存'
            )
          )
        )
      )
    }

    function WsColorPicker() {
      const st = useStore()
      const pick = st.wsColor
      if (!pick) return null
      const close = () => patch({ wsColor: null })
      const custom = (st.wsColors || {})[pick.key] || ''
      const choose = (color) => {
        const next = Object.assign({}, STATE.wsColors)
        if (color) next[pick.key] = color
        else delete next[pick.key]
        writeWsColors(next)
        patch({ wsColors: next, wsColor: null })
      }
      return h(
        'div',
        {
          className: 'ct-mask',
          style: { zIndex: 90 },
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) close()
          },
        },
        h(
          'div',
          { className: 'ct-card', style: { width: 'min(320px, calc(100vw - 48px))' } },
          h('div', { className: 'ct-title' }, '工作区颜色'),
          h('div', { className: 'ct-label' }, pick.label || '未分组'),
          h(
            'div',
            { className: 'ct-swatches' },
            PALETTE.map((c) =>
              h('button', {
                key: c,
                type: 'button',
                className: 'ct-swatch' + (custom.toLowerCase() === c.toLowerCase() ? ' ct-swatch-on' : ''),
                style: { background: c },
                title: c,
                onClick: () => choose(c),
              })
            )
          ),
          h(
            'div',
            { className: 'ct-actions' },
            h('button', { type: 'button', className: 'ct-btn', onClick: () => choose(null) }, '自动'),
            h('button', { type: 'button', className: 'ct-btn', onClick: close }, '取消')
          )
        )
      )
    }

    function Confirm() {
      const st = useStore()
      const ask = st.confirm
      if (!ask) return null
      const close = () => patch({ confirm: null })
      return h(
        'div',
        {
          className: 'ct-mask',
          style: { zIndex: 92 },
          onMouseDown: (e) => {
            if (e.target === e.currentTarget) close()
          },
        },
        h(
          'div',
          { className: 'ct-card', style: { width: 'min(340px, calc(100vw - 48px))' } },
          h('div', { className: 'ct-title' }, '确认'),
          h('div', { className: 'ct-confirm-text' }, ask.text),
          h(
            'div',
            { className: 'ct-actions' },
            h('button', { type: 'button', className: 'ct-btn', onClick: close }, '取消'),
            h(
              'button',
              {
                type: 'button',
                className: 'ct-btn ct-btn-danger',
                onClick: async () => {
                  close()
                  try {
                    await ask.run()
                  } catch (e) {
                    toast('操作失败：' + String((e && e.message) || e))
                  }
                },
              },
              '删除'
            )
          )
        )
      )
    }

    function Toast() {
      const st = useStore()
      if (!st.toast) return null
      return h('div', { className: 'ct-toast' }, st.toast)
    }

    function PanelIcon() {
      return h(
        'svg',
        { viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M4 8.5V5.5A1.5 1.5 0 0 1 5.5 4h3l3 2H18a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18 18H5.5A1.5 1.5 0 0 1 4 16.5v-8Z',
          stroke: 'currentColor',
          'stroke-width': 1.6,
          'stroke-linejoin': 'round',
        }),
        h('circle', { cx: 10, cy: 11.5, r: 1.6, fill: '#f2a03d' })
      )
    }

    /* ------------------------------------------------------------------ apply */

    const inject = ['slots', 'sessions', 'uiConversation', 'layout', 'uiWorkspace']

    function apply(ctx) {
      CTX = ctx

      const style = document.createElement('style')
      style.dataset.plugin = 'dsh-chat-tags'
      style.dataset.pluginCss = 'dsh-chat-tags/client.css'
      style.textContent = CSS
      document.head.appendChild(style)
      ctx.effect(
        () => () => {
          style.remove()
        },
        'chat-tags: styles'
      )

      refresh()

      STATE.wsColors = readWsColors()

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'chat-tags-selection', order: 25 },
          SelectionBubble
        )
      )

      ctx.slots.inject('conversation.chat.turnTail', () =>
        ctx.slots.register(
          { name: 'conversation.chat.turnTail', id: 'chat-tags-anchor', order: 4 },
          TurnAnchor
        )
      )

      ctx.slots.inject('sidebar.session.row.trailing', () =>
        ctx.slots.register(
          { name: 'sidebar.session.row.trailing', id: 'chat-tags-dots', order: 4 },
          SessionDots
        )
      )

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'chat-tags-track', order: 30 },
          Track
        )
      )

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'chat-tags-dialog', order: 70 },
          function OverlayDialogs() {
            return h(
              React.Fragment,
              null,
              h(Dialog, null),
              h(TagEditor, null),
              h(WsColorPicker, null),
              h(Confirm, null),
              h(Toast, null)
            )
          }
        )
      )

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: 'chat-tags', order: 40, label: () => '标签' },
          PanelIcon
        )
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register({ name: 'main', key: 'chat-tags' }, Overview)
      )
    }

    return { name: 'dsh-chat-tags', inject, apply }
  },
})