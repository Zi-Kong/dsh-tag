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
  display: flex; gap: 12px; padding: 12px 12px 12px 0; margin-bottom: 6px;
  border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.18)); cursor: default;
}
.ct-bar { width: 3px; border-radius: 2px; flex: none; }
.ct-mark-body { flex: 1; min-width: 0; }
.ct-mark-title { font-size: 13.5px; font-weight: 600; cursor: pointer; word-break: break-word; }
.ct-mark-title:hover { text-decoration: underline; }
.ct-mark-text { font-size: 12px; opacity: .66; margin-top: 3px; white-space: pre-wrap; word-break: break-word; }
.ct-mark-note { font-size: 12px; opacity: .8; margin-top: 4px; }
.ct-mark-meta { font-size: 11px; opacity: .45; margin-top: 5px; display: flex; gap: 10px; }
.ct-mark-actions { display: flex; gap: 10px; align-items: flex-start; }
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

    function Overview() {
      const st = useStore()
      const [hovered, setHovered] = useState(null)
      const filter = st.filterTagId
      const marks = filter ? st.marks.filter((m) => m.tagId === filter) : st.marks
      const ordered = marks.slice().reverse()

      const countOf = (tagId) => st.marks.filter((m) => m.tagId === tagId).length

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
          : ordered.map((mark) => {
              const tag = st.tags.find((t) => t.id === mark.tagId)
              return h(
                'div',
                { key: mark.id, className: 'ct-mark' },
                h('div', { className: 'ct-bar', style: { background: (tag && tag.color) || '#9aa0a6' } }),
                h(
                  'div',
                  { className: 'ct-mark-body' },
                  h(
                    'div',
                    {
                      className: 'ct-mark-title',
                      onClick: () =>
                        patch({
                          dialog: { mode: 'edit', draft: { ...mark }, newTagName: '', newTagColor: PALETTE[0] },
                        }),
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
                    { type: 'button', className: 'ct-link', onClick: () => jumpTo(mark) },
                    '跳转'
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'ct-link',
                      onClick: () =>
                        confirmAsk('删除这条标签？', async () => {
                          try {
                            await request('/mark/delete', { id: mark.id })
                            toast('已删除')
                          } catch (e) {
                            toast('删除失败：' + String((e && e.message) || e))
                          }
                        }),
                    },
                    '删除'
                  )
                )
              )
            })
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
            return h(React.Fragment, null, h(Dialog, null), h(TagEditor, null), h(Confirm, null), h(Toast, null))
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