/* ==========================================================================
   PRIMO PASSO — Core JS (ES2020, zero dipendenze)
   --------------------------------------------------------------------------
   01. Guard & utilità (money format, fetch JSON, escape)
   02. Scroll reveal (IntersectionObserver) + contatori + parallax
   03. <pp-header>  : trasparente → frosted glass, auto-hide
   04. Drawer (menu / carrello), search overlay, focus trap, scroll lock
   05. Carrello AJAX: add / change / render drawer / badge
   06. Product card: quick add, pannello varianti, wishlist
   07. Bottoni magnetici (micro-interazione)
   08. <pp-carousel> : recensioni (drag, frecce, progress, autoplay)
   09. Dots carosello prodotti mobile
   10. <pp-hero-3d> : lazy loader Three.js + input + render loop + fallback
   11. Newsletter (copia codice), stato "online" assistenza
   12. Theme editor hooks (shopify:section:load)
   ========================================================================== */
(() => {
  'use strict';

  /* 01. GUARD & UTILITÀ --------------------------------------------------- */
  if (window.PrimoPasso) return; // lo script può essere incluso da più sezioni
  const PP = (window.PrimoPasso = {});
  const cfg = () => window.PrimoPassoConfig || { routes: { root: '/', cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change' } };
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const escapeHTML = (str = '') =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Formatta i centesimi secondo shop.money_format (es. "€{{amount_with_comma_separator}}") */
  PP.formatMoney = function formatMoney(cents, format) {
    format = format || cfg().moneyFormat || '€{{amount_with_comma_separator}}';
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const fmt = (n, precision, thousands = ',', decimal = '.') => {
      if (isNaN(n) || n == null) return '0';
      const num = (n / 100).toFixed(precision);
      const [int, dec] = num.split('.');
      return int.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + thousands) + (dec ? decimal + dec : '');
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount': return fmt(cents, 2);
        case 'amount_no_decimals': return fmt(cents, 0);
        case 'amount_with_comma_separator': return fmt(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(cents, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return fmt(cents, 2, "'", '.');
        case 'amount_with_space_separator': return fmt(cents, 2, ' ', ',');
        default: return fmt(cents, 2, '.', ',');
      }
    });
  };

  async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.description || data.message || res.statusText), { data, status: res.status });
    return data;
  }

  const strings = () => {
    if (!PP._strings) {
      try { PP._strings = JSON.parse(($('#PPCartStrings') || {}).textContent || '{}'); } catch (e) { PP._strings = {}; }
    }
    return PP._strings;
  };

  PP.toast = function toast(msg, ms = 2600) {
    const el = $('[data-pp-toast]');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(PP._toastT);
    PP._toastT = setTimeout(() => el.classList.remove('is-visible'), ms);
  };

  /* 02. SCROLL REVEAL, CONTATORI, PARALLAX -------------------------------- */
  const revealIO = 'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-visible');
          if (e.target.hasAttribute('data-pp-count-to')) countUp(e.target);
          revealIO.unobserve(e.target);
        }),
        { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
      )
    : null;

  function countUp(el) {
    const to = parseFloat(el.getAttribute('data-pp-count-to'));
    const decimals = parseInt(el.getAttribute('data-pp-decimals') || '0', 10);
    const suffix = el.getAttribute('data-pp-suffix') || '';
    if (prefersReducedMotion() || isNaN(to)) { el.textContent = to.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix; return; }
    const dur = 1600, t0 = performance.now();
    const step = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      const v = to * (1 - Math.pow(1 - p, 4));
      el.textContent = v.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  PP.initReveal = function initReveal(root = document) {
    $$('.pp-reveal, [data-pp-count-to]', root).forEach((el) => {
      if (!revealIO) { el.classList.add('is-visible'); return; }
      revealIO.observe(el);
    });
  };

  // Parallax leggero per le immagini ad arco ([data-pp-parallax="0.12"])
  const parallaxEls = new Set();
  let parallaxTicking = false;
  function updateParallax() {
    parallaxTicking = false;
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const speed = parseFloat(el.dataset.ppParallax) || 0.1;
      const progress = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      el.style.transform = `translate3d(0, ${(-progress * speed * 100).toFixed(2)}px, 0)`;
    });
  }
  PP.initParallax = function initParallax(root = document) {
    if (prefersReducedMotion()) return;
    $$('[data-pp-parallax]', root).forEach((el) => parallaxEls.add(el));
    updateParallax();
  };
  window.addEventListener('scroll', () => {
    if (!parallaxTicking && parallaxEls.size) { parallaxTicking = true; requestAnimationFrame(updateParallax); }
  }, { passive: true });

  /* 03. HEADER ------------------------------------------------------------ */
  class PPHeader extends HTMLElement {
    connectedCallback() {
      this.lastY = window.scrollY;
      this.hideOnScroll = this.dataset.hideOnScroll === 'true';
      this.onScroll = this.onScroll.bind(this);
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
    }
    disconnectedCallback() { window.removeEventListener('scroll', this.onScroll); }
    onScroll() {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        this.classList.toggle('is-scrolled', y > 12);
        if (this.hideOnScroll) {
          const goingDown = y > this.lastY && y > 240;
          const anyOpen = document.documentElement.classList.contains('pp-lock');
          this.classList.toggle('is-hidden', goingDown && !anyOpen);
        }
        this.lastY = y;
        this.ticking = false;
      });
    }
  }
  if (!customElements.get('pp-header')) customElements.define('pp-header', PPHeader);

  /* 04. DRAWER, SEARCH, FOCUS TRAP --------------------------------------- */
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let activeLayer = null;
  let lastFocus = null;

  function lockScroll(lock) {
    const html = document.documentElement;
    if (lock) {
      const sw = window.innerWidth - html.clientWidth;
      html.style.setProperty('--pp-scrollbar', sw + 'px');
      html.classList.add('pp-lock');
      html.style.overflow = 'hidden';
      html.style.paddingRight = sw ? sw + 'px' : '';
    } else {
      html.classList.remove('pp-lock');
      html.style.overflow = '';
      html.style.paddingRight = '';
    }
  }

  PP.openLayer = function openLayer(el, trigger) {
    if (!el) return;
    if (activeLayer && activeLayer !== el) PP.closeLayer(activeLayer, false);
    lastFocus = trigger || document.activeElement;
    el.hidden = false;
    // forza reflow per far partire la transizione dopo hidden=false
    void el.offsetWidth;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    $$(`[aria-controls="${el.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'true'));
    activeLayer = el;
    lockScroll(true);
    const first = $('input:not([type="hidden"]), [data-pp-close].pp-icon-btn, ' + FOCUSABLE, el.querySelector('.pp-drawer__panel') || el);
    setTimeout(() => first && first.focus({ preventScroll: true }), 80);
  };

  PP.closeLayer = function closeLayer(el = activeLayer, restoreFocus = true) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    $$(`[aria-controls="${el.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
    if (el.classList.contains('pp-search')) setTimeout(() => { if (!el.classList.contains('is-open')) el.hidden = true; }, 520);
    if (activeLayer === el) activeLayer = null;
    lockScroll(false);
    if (restoreFocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };

  document.addEventListener('keydown', (e) => {
    if (!activeLayer) return;
    if (e.key === 'Escape') { PP.closeLayer(); return; }
    if (e.key === 'Tab') {
      const nodes = $$(FOCUSABLE, activeLayer).filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* 05. CARRELLO AJAX ----------------------------------------------------- */
  PP.cart = {
    state: null,
    busy: false,

    async fetch() {
      this.state = await fetchJSON(cfg().routes.cart + '.js');
      return this.state;
    },

    async add(variantId, quantity = 1, trigger) {
      if (trigger) trigger.setAttribute('aria-busy', 'true');
      try {
        await fetchJSON(cfg().routes.cartAdd + '.js', {
          method: 'POST',
          body: JSON.stringify({ items: [{ id: Number(variantId), quantity }] })
        });
        await this.fetch();
        this.render();
        this.bump();
        PP.toast(strings().added || 'Aggiunto al carrello ✓');
        PP.openLayer($('#PPCartDrawer'), trigger);
        document.dispatchEvent(new CustomEvent('pp:cart:added', { detail: { variantId, quantity, cart: this.state } }));
        return true;
      } catch (err) {
        PP.toast(err.message || strings().error || 'Errore');
        return false;
      } finally {
        if (trigger) trigger.removeAttribute('aria-busy');
      }
    },

    async change(key, quantity, row) {
      if (row) row.classList.add('is-removing');
      try {
        this.state = await fetchJSON(cfg().routes.cartChange + '.js', { method: 'POST', body: JSON.stringify({ id: key, quantity }) });
        this.render();
      } catch (err) {
        PP.toast(err.message || strings().error);
        if (row) row.classList.remove('is-removing');
      }
    },

    bump() {
      $$('[data-pp-cart-count]').forEach((b) => {
        b.classList.remove('is-bumping');
        void b.offsetWidth;
        b.classList.add('is-bumping');
      });
    },

    imageUrl(src, w = 240) {
      if (!src) return '';
      return src + (src.includes('?') ? '&' : '?') + 'width=' + w;
    },

    render() {
      const cart = this.state;
      if (!cart) return;
      const S = strings();
      const count = cart.item_count;
      $$('[data-pp-cart-count]').forEach((b) => { b.textContent = count; b.dataset.count = count; });
      $$('[data-pp-cart-open]').forEach((b) => b.setAttribute('aria-label', `Carrello (${count})`));
      $$('[data-pp-cart-title-count]').forEach((b) => (b.textContent = `(${count})`));

      const body = $('[data-pp-cart-body]');
      const foot = $('[data-pp-cart-foot]');
      if (!body) return;

      if (!count) {
        body.innerHTML = `
          <div class="pp-cart__empty">
            <div class="pp-cart__empty-arch pp-arch pp-arch--full">${PP.footprintSVG}</div>
            <h3>${escapeHTML(S.emptyTitle || 'Il carrello è vuoto')}</h3>
            <p>${escapeHTML(S.emptyText || '')}</p>
            <a class="pp-btn" href="${escapeHTML(S.emptyUrl || '/collections/all')}">${escapeHTML(S.emptyCta || 'Esplora')}</a>
          </div>`;
        if (foot) foot.hidden = true;
        return;
      }

      // Barra spedizione gratuita
      const threshold = Number(S.freeShippingThreshold || 0);
      let shippingHTML = '';
      if (threshold > 0) {
        const remaining = Math.max(0, threshold - cart.total_price);
        const progress = clamp((cart.total_price / threshold) * 100, 0, 100);
        const label = remaining > 0
          ? escapeHTML(S.freeShippingRemaining || '').replace('[amount]', `<strong>${PP.formatMoney(remaining)}</strong>`)
          : escapeHTML(S.freeShippingReached || '');
        shippingHTML = `<div class="pp-cart__shipping"><div>${label}</div><div class="pp-cart__bar"><span style="--progress:${progress}%"></span></div></div>`;
      }

      const items = cart.items.map((item) => {
        const variant = item.variant_title && item.variant_title !== 'Default Title' ? `<div class="pp-cart-item__variant">${escapeHTML(item.variant_title)}</div>` : '';
        const img = item.image
          ? `<img src="${escapeHTML(this.imageUrl(item.image))}" alt="${escapeHTML(item.product_title)}" width="84" height="105" loading="lazy">`
          : '';
        const compare = item.original_line_price > item.final_line_price ? `<s style="display:block;font-weight:400;color:var(--color-ink-muted)">${PP.formatMoney(item.original_line_price)}</s>` : '';
        return `
          <li class="pp-cart-item" data-key="${escapeHTML(item.key)}">
            <a href="${escapeHTML(item.url)}" class="pp-cart-item__media pp-arch">${img}</a>
            <div>
              <a href="${escapeHTML(item.url)}" class="pp-cart-item__title">${escapeHTML(item.product_title)}</a>
              ${variant}
              <div class="pp-qty" role="group" aria-label="Quantità">
                <button type="button" data-pp-qty="-1" aria-label="Diminuisci">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-pp-qty="1" aria-label="Aumenta">+</button>
              </div>
              <button type="button" class="pp-cart-item__remove" data-pp-remove>${escapeHTML(S.remove || 'Rimuovi')}</button>
            </div>
            <div class="pp-cart-item__price">${compare}${PP.formatMoney(item.final_line_price)}</div>
          </li>`;
      }).join('');

      body.innerHTML = `${shippingHTML}<ul class="pp-cart__items" role="list">${items}</ul>`;
      if (foot) {
        foot.hidden = false;
        const total = $('[data-pp-cart-total]', foot);
        if (total) total.textContent = PP.formatMoney(cart.total_price);
      }
    }
  };

  PP.footprintSVG = '<svg viewBox="0 0 48 64" fill="currentColor" aria-hidden="true"><path d="M25.2 22.6c7.6-.4 11.6 5.4 11 12.6-.4 5.6-3.8 8.6-4.4 13.6-.8 6.9-3.3 12.6-8.8 12.6-5.9 0-8.4-5.2-7.6-11.4.6-4.8-2.6-8.2-2.9-14.2-.4-7.3 4.6-12.8 12.7-13.2z"/><ellipse cx="17.6" cy="13.2" rx="5" ry="5.8" transform="rotate(-12 17.6 13.2)"/><circle cx="26.4" cy="9.6" r="3.6"/><circle cx="33" cy="11.4" r="3.1"/><circle cx="38" cy="15.4" r="2.6"/><circle cx="41.2" cy="20.6" r="2.15"/></svg>';

  /* Delegazione eventi globale (sopravvive al re-render delle sezioni) */
  document.addEventListener('click', async (e) => {
    const t = e.target;

    // Apertura drawer generici
    const opener = t.closest('[data-pp-open]');
    if (opener) { e.preventDefault(); PP.openLayer(document.getElementById(opener.dataset.ppOpen), opener); return; }

    // Carrello
    const cartOpen = t.closest('[data-pp-cart-open]');
    if (cartOpen && $('#PPCartDrawer')) {
      e.preventDefault();
      PP.openLayer($('#PPCartDrawer'), cartOpen);
      PP.cart.fetch().then(() => PP.cart.render()).catch(() => {});
      return;
    }

    // Ricerca
    const searchOpen = t.closest('[data-pp-search-open]');
    if (searchOpen) { e.preventDefault(); PP.openLayer($('#PPSearch'), searchOpen); return; }
    if (t.closest('[data-pp-search-close]')) { PP.closeLayer($('#PPSearch')); return; }

    // Chiusura (overlay, X, link nel menu)
    const closer = t.closest('[data-pp-close]');
    if (closer && activeLayer && activeLayer.contains(closer)) {
      if (closer.tagName !== 'A') e.preventDefault();
      PP.closeLayer(activeLayer, closer.tagName !== 'A');
      return;
    }

    // Quantità / rimozione nel drawer
    const qtyBtn = t.closest('[data-pp-qty]');
    const removeBtn = t.closest('[data-pp-remove]');
    if (qtyBtn || removeBtn) {
      const row = t.closest('.pp-cart-item');
      const item = PP.cart.state && PP.cart.state.items.find((i) => i.key === row.dataset.key);
      if (!item) return;
      const q = removeBtn ? 0 : Math.max(0, item.quantity + Number(qtyBtn.dataset.ppQty));
      PP.cart.change(item.key, q, q === 0 ? row : null);
      return;
    }

    /* 06. PRODUCT CARD -------------------------------------------------- */
    const add = t.closest('[data-pp-add]');
    if (add) {
      e.preventDefault();
      if (add.hasAttribute('disabled')) return;
      add.classList.add('is-loading');
      const ok = await PP.cart.add(add.dataset.ppAdd, 1, add);
      add.classList.remove('is-loading');
      const card = add.closest('[data-pp-card]');
      if (card) closeQuick(card);
      if (ok && add.classList.contains('pp-quick-btn')) {
        add.classList.add('is-added');
        setTimeout(() => add.classList.remove('is-added'), 1800);
      }
      return;
    }
    const demoAdd = t.closest('[data-pp-demo-add]');
    if (demoAdd) {
      e.preventDefault();
      closeQuick(demoAdd.closest('[data-pp-card]'));
      PP.toast('Prodotto demo: collega una collezione dall’editor per il Quick Add reale');
      return;
    }

    const quickOpen = t.closest('[data-pp-quick-open]');
    if (quickOpen) {
      e.preventDefault();
      const card = quickOpen.closest('[data-pp-card]');
      $$('.pp-card.is-quick-open').forEach((c) => c !== card && closeQuick(c));
      card.classList.add('is-quick-open');
      quickOpen.setAttribute('aria-expanded', 'true');
      const firstPill = $('.pp-variant-pill:not([disabled])', card);
      if (firstPill) setTimeout(() => firstPill.focus({ preventScroll: true }), 200);
      return;
    }
    const quickClose = t.closest('[data-pp-quick-close]');
    if (quickClose) { e.preventDefault(); closeQuick(quickClose.closest('[data-pp-card]')); return; }

    const wish = t.closest('[data-pp-wishlist]');
    if (wish) {
      e.preventDefault();
      const key = 'pp-wishlist';
      let list = [];
      try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
      const h = wish.dataset.ppWishlist;
      const on = wish.getAttribute('aria-pressed') !== 'true';
      list = on ? Array.from(new Set([...list, h])) : list.filter((x) => x !== h);
      try { localStorage.setItem(key, JSON.stringify(list)); } catch (_) {}
      wish.setAttribute('aria-pressed', String(on));
      if (on) PP.toast('Aggiunto ai preferiti ♡');
      return;
    }

    // Chat diretta: apre Shopify Inbox se presente, altrimenti fallback (email/pagina contatti)
    const chat = t.closest('[data-pp-chat]');
    if (chat) {
      e.preventDefault();
      const inbox = document.querySelector('#ShopifyChat, shopify-chat, inbox-online-store-chat');
      const btn = inbox && inbox.shadowRoot && inbox.shadowRoot.querySelector('button');
      if (btn) btn.click();
      else if (chat.dataset.fallback) window.location.href = chat.dataset.fallback;
      return;
    }

    // Copia codice sconto newsletter
    const code = t.closest('[data-pp-copy]');
    if (code) {
      try { await navigator.clipboard.writeText(code.dataset.ppCopy); PP.toast('Codice copiato: ' + code.dataset.ppCopy); } catch (_) {}
      return;
    }

    // Click fuori da una card con pannello varianti aperto
    if (!t.closest('.pp-card')) $$('.pp-card.is-quick-open').forEach(closeQuick);
  });

  function closeQuick(card) {
    if (!card) return;
    card.classList.remove('is-quick-open');
    const btn = $('[data-pp-quick-open]', card);
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function initWishlist(root = document) {
    let list = [];
    try { list = JSON.parse(localStorage.getItem('pp-wishlist') || '[]'); } catch (_) {}
    $$('[data-pp-wishlist]', root).forEach((b) => b.setAttribute('aria-pressed', String(list.includes(b.dataset.ppWishlist))));
  }

  /* 07. BOTTONI MAGNETICI ------------------------------------------------- */
  document.addEventListener('pointermove', (e) => {
    const btn = e.target.closest && e.target.closest('.pp-btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
    btn.style.setProperty('--my', `${e.clientY - r.top}px`);
    if (btn.hasAttribute('data-pp-magnetic') && !prefersReducedMotion() && e.pointerType === 'mouse') {
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.transform = `translate(${dx * 8}px, ${dy * 6 - 2}px)`;
    }
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const btn = e.target.closest && e.target.closest('[data-pp-magnetic]');
    if (btn && !btn.contains(e.relatedTarget)) btn.style.transform = '';
  });

  /* 08. <pp-carousel> ----------------------------------------------------- */
  class PPCarousel extends HTMLElement {
    connectedCallback() {
      this.track = $('[data-pp-track]', this);
      if (!this.track) return;
      this.prev = $('[data-pp-prev]', this);
      this.next = $('[data-pp-next]', this);
      this.bar = $('[data-pp-progress]', this);
      this.autoplay = parseInt(this.dataset.autoplay || '0', 10) * 1000;

      this.prev && this.prev.addEventListener('click', () => this.go(-1));
      this.next && this.next.addEventListener('click', () => this.go(1));
      this.track.addEventListener('scroll', () => this.update(), { passive: true });
      window.addEventListener('resize', () => this.update(), { passive: true });

      // Drag con mouse (su touch lo scroll nativo è già perfetto)
      let down = false, startX = 0, startLeft = 0, moved = false;
      this.track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        down = true; moved = false; startX = e.clientX; startLeft = this.track.scrollLeft;
      });
      window.addEventListener('pointermove', (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 4 && !moved) { moved = true; this.track.classList.add('is-dragging'); }
        if (moved) this.track.scrollLeft = startLeft - dx;
      });
      window.addEventListener('pointerup', () => {
        if (!down) return;
        down = false;
        if (moved) {
          this.track.classList.remove('is-dragging');
          this.snap();
        }
      });

      // Autoplay: si ferma su hover/focus/interazione e fuori viewport
      if (this.autoplay && !prefersReducedMotion()) {
        this.paused = false;
        ['pointerenter', 'focusin', 'touchstart'].forEach((ev) => this.addEventListener(ev, () => (this.paused = true), { passive: true }));
        ['pointerleave', 'focusout'].forEach((ev) => this.addEventListener(ev, () => (this.paused = false)));
        this.io = new IntersectionObserver(([en]) => (this.visible = en.isIntersecting));
        this.io.observe(this);
        this.timer = setInterval(() => {
          if (this.paused || !this.visible || document.hidden) return;
          const atEnd = this.track.scrollLeft + this.track.clientWidth >= this.track.scrollWidth - 8;
          atEnd ? this.track.scrollTo({ left: 0, behavior: 'smooth' }) : this.go(1);
        }, this.autoplay);
      }
      this.update();
    }
    disconnectedCallback() { clearInterval(this.timer); this.io && this.io.disconnect(); }
    stepSize() {
      const first = this.track.children[0];
      if (!first) return this.track.clientWidth;
      const gap = parseFloat(getComputedStyle(this.track).columnGap || getComputedStyle(this.track).gap) || 0;
      return first.getBoundingClientRect().width + gap;
    }
    go(dir) { this.track.scrollBy({ left: dir * this.stepSize(), behavior: prefersReducedMotion() ? 'auto' : 'smooth' }); }
    snap() {
      const s = this.stepSize();
      this.track.scrollTo({ left: Math.round(this.track.scrollLeft / s) * s, behavior: 'smooth' });
    }
    update() {
      const { scrollLeft, scrollWidth, clientWidth } = this.track;
      const max = Math.max(1, scrollWidth - clientWidth);
      if (this.prev) this.prev.disabled = scrollLeft <= 4;
      if (this.next) this.next.disabled = scrollLeft >= max - 4;
      if (this.bar) {
        const w = clamp((clientWidth / scrollWidth) * 100, 8, 100);
        this.bar.style.setProperty('--w', w + '%');
        this.bar.style.setProperty('--x', ((scrollLeft / max) * (100 / w - 1) * 100).toFixed(2) + '%');
      }
    }
  }
  if (!customElements.get('pp-carousel')) customElements.define('pp-carousel', PPCarousel);

  /* 09. DOTS CAROSELLO PRODOTTI (mobile) ---------------------------------- */
  function initProductDots(root = document) {
    $$('[data-pp-products-carousel]', root).forEach((grid) => {
      const dots = grid.parentElement.querySelector('[data-pp-dots]');
      if (!dots || dots.dataset.ready) return;
      dots.dataset.ready = '1';
      const n = grid.children.length;
      dots.innerHTML = Array.from({ length: n }, (_, i) => `<span${i === 0 ? ' class="is-active"' : ''}></span>`).join('');
      grid.addEventListener('scroll', () => {
        const step = grid.children[0] ? grid.children[0].getBoundingClientRect().width : 1;
        const i = Math.round(grid.scrollLeft / step);
        Array.from(dots.children).forEach((d, k) => d.classList.toggle('is-active', k === i));
      }, { passive: true });
    });
  }

  /* 10. <pp-hero-3d> ------------------------------------------------------ */
  class PPHero3D extends HTMLElement {
    connectedCallback() {
      this.canvas = $('[data-pp-hero-canvas]', this);
      this.input = { mx: 0, my: 0, scroll: 0 };
      this.target = { mx: 0, my: 0 };
      this.visible = true;
      this.running = false;

      requestAnimationFrame(() => this.classList.add('is-in'));

      this.onPointer = this.onPointer.bind(this);
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.loop = this.loop.bind(this);
      window.addEventListener('pointermove', this.onPointer, { passive: true });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });
      this.addEventListener('pointerdown', (e) => this.onPointerDown(e));
      this.onScroll();

      this.io = new IntersectionObserver(([en]) => {
        this.visible = en.isIntersecting;
        if (this.visible) { this.maybeInit(); this.start(); }
      }, { rootMargin: '200px 0px' });
      this.io.observe(this);

      this.onVisibility = () => (document.hidden ? (this.running = false) : this.start());
      document.addEventListener('visibilitychange', this.onVisibility);

      if (this.dataset.gyro === 'true') this.initGyro();
    }

    disconnectedCallback() {
      window.removeEventListener('pointermove', this.onPointer);
      window.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.io && this.io.disconnect();
      this.ro && this.ro.disconnect();
      this.running = false;
      if (this.scene) this.scene.dispose();
      this.scene = null;
    }

    supportsWebGL() {
      try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
      } catch (e) { return false; }
    }

    async maybeInit() {
      if (this.initStarted) return;
      this.initStarted = true;
      if (this.dataset.enable3d !== 'true' || !this.supportsWebGL()) return; // resta il fallback CSS
      const conn = navigator.connection;
      if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return; // rispetto risparmio dati

      // Avvio non bloccante: lascia priorità al LCP (testo hero)
      await new Promise((r) => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 1200 }) : setTimeout(r, 300)));
      try {
        const [THREE, mod] = await Promise.all([import(this.dataset.threeUrl), import(this.dataset.sceneUrl)]);
        if (!this.isConnected) return;
        const isMobile = window.matchMedia('(max-width: 749px), (pointer: coarse)').matches;
        this.reduced = prefersReducedMotion();
        this.scene = mod.createHeroScene(THREE, this.canvas, {
          accent: this.dataset.colorAccent,
          wall: this.dataset.colorWall,
          wood: this.dataset.colorWood,
          plush: this.dataset.colorPlush,
          shadows: this.dataset.shadows === 'true',
          dust: this.dataset.dust === 'true',
          timeOfDay: this.dataset.timeOfDay,
          cameraIntensity: Number(this.dataset.cameraIntensity || 5),
          scrollTravel: Number(this.dataset.scrollTravel || 6),
          autoOrbit: this.dataset.autoOrbit === 'true',
          reducedMotion: this.reduced,
          isMobile
        });
        this.onResize();
        this.ro = new ResizeObserver(() => this.onResize());
        this.ro.observe(this);
        this.last = performance.now();
        this.t0 = this.last;
        // primo frame, poi fade-in del canvas
        this.scene.render(0.016, 0, this.input);
        requestAnimationFrame(() => this.classList.add('is-3d-ready'));
        this.start();
      } catch (err) {
        console.warn('[PRIMO PASSO] Hero 3D non disponibile, uso il fallback CSS.', err);
      }
    }

    start() {
      if (this.running || !this.visible || document.hidden) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }

    loop(now) {
      if (!this.running || !this.visible) { this.running = false; return; }
      const dt = (now - this.last) / 1000;
      this.last = now;
      // input smorzato (inerzia morbida del cursore)
      const k = 1 - Math.exp(-dt * 4);
      this.input.mx += (this.target.mx - this.input.mx) * k;
      this.input.my += (this.target.my - this.input.my) * k;
      if (this.scene) {
        this.scene.render(dt, (now - this.t0) / 1000, this.input);
        if (this.reduced) { this.running = false; return; } // reduced motion: frame statico
      } else {
        this.updateFallback();
        // fallback CSS: si ferma quando il movimento si è assestato
        if (Math.abs(this.target.mx - this.input.mx) + Math.abs(this.target.my - this.input.my) < 0.002) { this.running = false; return; }
      }
      requestAnimationFrame(this.loop);
    }

    onPointer(e) {
      if (!this.visible) return;
      const r = this.getBoundingClientRect();
      this.target.mx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      this.target.my = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      if (!this.scene) this.start();
    }

    onPointerDown(e) {
      if (!this.scene || e.target.closest('a, button')) return;
      const r = this.canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      this.scene.pointerDown(nx, ny);
      if (this.reduced) this.scene.render(0.016, 0, this.input);
    }

    onScroll() {
      const r = this.getBoundingClientRect();
      this.input.scroll = clamp(-r.top / Math.max(1, r.height), 0, 1);
      if (this.scene && this.reduced) this.scene.render(0.016, 0, this.input);
      if (!this.scene) this.updateFallback();
    }

    onResize() {
      if (!this.scene) return;
      const w = this.clientWidth, h = this.clientHeight;
      if (w === this.lastW && h === this.lastH) return;
      this.lastW = w; this.lastH = h;
      this.scene.resize(w, h);
      if (this.reduced) this.scene.render(0.016, 0, this.input);
    }

    updateFallback() {
      if (prefersReducedMotion()) return;
      this.style.setProperty('--px', (-this.input.mx).toFixed(3));
      this.style.setProperty('--py', (-this.input.my + this.input.scroll * 2).toFixed(3));
    }

    initGyro() {
      const handler = (e) => {
        if (e.gamma == null) return;
        this.target.mx = clamp(e.gamma / 25, -1, 1);
        this.target.my = clamp((e.beta - 45) / 30, -1, 1);
      };
      const enable = () => window.addEventListener('deviceorientation', handler, { passive: true });
      const DOE = window.DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === 'function') {
        // iOS: permesso richiesto su gesto utente
        this.addEventListener('touchend', () => DOE.requestPermission().then((s) => s === 'granted' && enable()).catch(() => {}), { once: true });
      } else if (DOE) enable();
    }
  }
  if (!customElements.get('pp-hero-3d')) customElements.define('pp-hero-3d', PPHero3D);

  /* 11. ASSISTENZA "ONLINE ORA" ------------------------------------------ */
  function initSupportStatus(root = document) {
    $$('[data-pp-hours]', root).forEach((el) => {
      // formato: "9-19" (lun-ven), sabato "9-13"
      const [wk, sat] = (el.dataset.ppHours || '9-19|9-13').split('|');
      const parse = (s) => (s || '').split('-').map(Number);
      const now = new Date();
      const day = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
      const [a, b] = day === 0 ? [0, 0] : day === 6 ? parse(sat) : parse(wk);
      const online = h >= a && h < b;
      el.classList.toggle('is-online', online);
      el.textContent = online ? el.dataset.ppOnline || 'Online ora' : el.dataset.ppOffline || 'Rispondiamo presto';
    });
  }

  /* 12. INIT & THEME EDITOR ---------------------------------------------- */
  function init(root = document) {
    PP.initReveal(root);
    PP.initParallax(root);
    initWishlist(root);
    initProductDots(root);
    initSupportStatus(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init());
  else init();

  document.addEventListener('shopify:section:load', (e) => { PP._strings = null; init(e.target); });
  document.addEventListener('shopify:section:select', (e) => {
    $$('.pp-reveal', e.target).forEach((el) => el.classList.add('is-visible'));
  });
})();
