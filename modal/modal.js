(function () {
  "use strict";

  console.log("[MODAL] modal.js cargado ✅");

  let CONFIG = null;
  let LOCATIONS = null;
  let MODAL = null;

  // Selección principal
  let SELECTED_OFFER = null;
  let ACTIVE_OFFERS = [];

  // Estado
  let ready = false;
  let loading = null;

  // timers
  let reserveInterval = null;
  let liveInterval = null;

  // Session / bump / upsell / exit
  let ORDER_SESSION_ID = null;
  let ORDER_SENT = false;
  let ORDER_BUMP_SELECTED = false;
  let EXIT_DISCOUNT_APPLIED = false;

  let EXIT_TIMER_INT = null;
  let UPSELL_TIMER_INT = null;

  let CUSTOMER_HASHES = null;

  // ---------------------------
  // helpers
  // ---------------------------
  const pad2 = (n) => String(n).padStart(2, "0");

  async function sha256(str) {
    if (!str) return undefined;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str.trim().toLowerCase()));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function dlPush(obj) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(obj);
  }

  function money(n) {
    const sym = CONFIG?.product?.currency_symbol || "$";
    const v = Number(n);
    return `${sym}${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
  }

  async function fetchWithFallback(rootPath, relativePath) {
    try {
      const r1 = await fetch(rootPath, { cache: "no-store" });
      if (r1.ok) return r1;
    } catch (_) {}
    try {
      const r2 = await fetch(relativePath, { cache: "no-store" });
      if (r2.ok) return r2;
    } catch (_) {}
    return null;
  }

  function getBasePrice() {
    const p = CONFIG?.product || {};
    return (
      Number(p.base_price) ||
      Number(p.price) ||
      Number(p.price_value) ||
      Number(p.price_usd) ||
      0
    );
  }

  function getOffersFromConfig() {
    const qo = CONFIG?.quantity_offers;

    // Nuevo formato: { enabled, items: [] }
    if (qo && typeof qo === "object" && !Array.isArray(qo)) {
      if (qo.enabled === false) return [];
      if (Array.isArray(qo.items)) return qo.items;
      return [];
    }

    // Formato viejo: array directo
    if (Array.isArray(qo)) return qo;

    return [];
  }

  function ensureSessionId() {
    if (ORDER_SESSION_ID) return ORDER_SESSION_ID;
    try {
      ORDER_SESSION_ID = crypto?.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + "_" + Math.random().toString(16).slice(2);
    } catch (_) {
      ORDER_SESSION_ID = String(Date.now()) + "_" + Math.random().toString(16).slice(2);
    }
    return ORDER_SESSION_ID;
  }

  function isThankYouVisible() {
    const v = document.getElementById("thankyouView");
    return !!(v && v.style.display !== "none" && v.innerHTML.trim().length > 0);
  }

  function isUpsellVisible() {
    const v = document.getElementById("upsellView");
    return !!(v && v.style.display !== "none" && v.innerHTML.trim().length > 0);
  }

  function hideOverlays() {
    const upsell = document.getElementById("upsellView");
    const thanks = document.getElementById("thankyouView");
    if (upsell) upsell.style.display = "none";
    if (thanks) thanks.style.display = "none";

    const card = document.querySelector(".ecuaclic-modal__card");
    if (card) card.classList.remove("upsell-active");
  }

  // ✅ Calcula totales finales (base + bump - descuento + envío)
  function getCheckoutParts() {
    const base = Number(SELECTED_OFFER?.price ?? 0);

    const bump =
      CONFIG?.order_bump?.enabled && ORDER_BUMP_SELECTED
        ? Number(CONFIG?.order_bump?.offer_price ?? 0)
        : 0;

    const shipping = Number(CONFIG?.shipping?.cost ?? 0);

    const subtotalBeforeDiscount = base + bump;

    const discountPercent =
      EXIT_DISCOUNT_APPLIED && CONFIG?.exit_downsell?.enabled
        ? Number(CONFIG?.exit_downsell?.discount_percent ?? 0)
        : 0;

    const discountAmount = subtotalBeforeDiscount * (discountPercent / 100);

    const subtotal = Math.max(0, subtotalBeforeDiscount - discountAmount);
    const total = subtotal + shipping;

    return {
      base,
      bump,
      shipping,
      discountPercent,
      discountAmount,
      subtotalBeforeDiscount,
      subtotal,
      total
    };
  }

  // ---------------------------
  // load modal.html
  // ---------------------------
  async function loadModalHTML() {
    const res = await fetchWithFallback("/modal/modal.html", "modal/modal.html");
    if (!res) return false;

    const html = await res.text();
    const container = document.getElementById("modal-container");
    if (!container) return false;

    container.innerHTML = html;
    MODAL = document.getElementById("ecuaclicModal");
    return !!MODAL;
  }

  async function loadLocations() {
    const res = await fetchWithFallback("/modal/locations.json", "modal/locations.json");
    if (!res) return false;
    LOCATIONS = await res.json();
    return true;
  }

  async function ensureConfig() {
    CONFIG = window.ECUACLIC_CONFIG || CONFIG;

    if (!CONFIG || !CONFIG.product) {
      try {
        let r = await fetch("config.json", { cache: "no-store" });
        if (!r.ok && window.ECUACLIC_PRODUCT_FOLDER) {
          r = await fetch(`/${window.ECUACLIC_PRODUCT_FOLDER}/config.json`, { cache: "no-store" });
        }
        if (r.ok) {
          CONFIG = await r.json();
          window.ECUACLIC_CONFIG = CONFIG;
        }
      } catch (e) {
        console.error("[MODAL] no pude cargar config.json:", e);
      }
    }
    return CONFIG;
  }

  // ---------------------------
  // proof timer (squares)
  // ---------------------------
  function paintReserve(hh, mm, ss) {
    const h1 = document.querySelector(".js-mp-h1");
    const h2 = document.querySelector(".js-mp-h2");
    const m1 = document.querySelector(".js-mp-m1");
    const m2 = document.querySelector(".js-mp-m2");
    const s1 = document.querySelector(".js-mp-s1");
    const s2 = document.querySelector(".js-mp-s2");

    const hs = pad2(hh);
    const ms = pad2(mm);
    const ssx = pad2(ss);

    if (h1) h1.textContent = hs[0];
    if (h2) h2.textContent = hs[1];
    if (m1) m1.textContent = ms[0];
    if (m2) m2.textContent = ms[1];
    if (s1) s1.textContent = ssx[0];
    if (s2) s2.textContent = ssx[1];
  }

  function startReserveTimer(secondsStart = 10 * 60) {
    if (reserveInterval) clearInterval(reserveInterval);

    let seconds = secondsStart;
    paintReserve(
      Math.floor(seconds / 3600),
      Math.floor((seconds % 3600) / 60),
      seconds % 60
    );

    reserveInterval = setInterval(() => {
      seconds = Math.max(0, seconds - 1);
      paintReserve(
        Math.floor(seconds / 3600),
        Math.floor((seconds % 3600) / 60),
        seconds % 60
      );
      if (seconds <= 0) seconds = secondsStart; // evergreen
    }, 1000);
  }

  function startLiveViewers() {
    const els = document.querySelectorAll(".js-live-modal");
    if (!els.length) return;

    if (liveInterval) clearInterval(liveInterval);

    let v = Math.floor(Math.random() * 3) + 3; // 3-5
    els.forEach((el) => (el.textContent = String(v)));

    liveInterval = setInterval(() => {
      v += Math.random() > 0.6 ? 1 : -1;
      v = Math.max(2, Math.min(7, v));
      els.forEach((el) => (el.textContent = String(v)));
    }, 6000);
  }

  // ---------------------------
  // offers
  // ---------------------------
  function buildActiveOffers() {
    let offers = getOffersFromConfig();

    // fallback: si NO hay offers, crea 1 oferta por defecto
    if (!offers.length) {
      const price = getBasePrice();
      offers = [
        {
          quantity: 1,
          price,
          label: "1 unidad",
          badge: "Oferta",
          original_price: CONFIG?.product?.original_price || null,
          image: CONFIG?.product?.image || null
        }
      ];
    }

    offers = offers.map((o) => ({
      ...o,
      quantity: Number(o.quantity ?? 1),
      price: Number(o.price ?? 0),
      original_price: o.original_price != null ? Number(o.original_price) : null
    }));

    ACTIVE_OFFERS = offers;
  }

  function renderOffers() {
    const container = document.getElementById("orderSummary");
    if (!container) return;

    buildActiveOffers();

    let html = `<div class="order-summary__title">Selecciona opción</div>`;
    html += `<div class="quantity-offers">`;

    ACTIVE_OFFERS.forEach((offer, idx) => {
      const checked = idx === 0 ? "checked" : "";
      const img = offer.image ? new URL(offer.image, window.location.href).toString() : "";

      html += `
        <div class="quantity-offer">
          <input type="radio" name="quantity_offer" id="offer_${idx}" value="${idx}" ${checked}>
          <label class="quantity-offer__label" for="offer_${idx}">
            ${img ? `<img class="quantity-offer__image" src="${img}" alt="">` : ""}
            <div class="quantity-offer__info">
              <div class="quantity-offer__title">${offer.label || `Opción ${idx + 1}`}</div>
              ${offer.badge ? `<span class="quantity-offer__badge">${offer.badge}</span>` : ""}
              <div class="quantity-offer__price">
                ${
                  offer.original_price
                    ? `<span class="quantity-offer__old-price">${money(offer.original_price)}</span>`
                    : ""
                }
                <span class="quantity-offer__new-price">${money(offer.price)}</span>
              </div>
            </div>
          </label>
        </div>
      `;
    });

    const shippingCost = Number(CONFIG?.shipping?.cost ?? 0);
    const shippingLabel =
      CONFIG?.shipping?.label || (shippingCost === 0 ? "Envío GRATIS" : money(shippingCost));

    html += `
      </div>

      <div class="order-totals">
        <div class="order-total-row">
          <span>Subtotal:</span>
          <span id="subtotal">${money(ACTIVE_OFFERS[0].price)}</span>
        </div>

        <div class="order-total-row">
          <span>Envío:</span>
          <span id="shipping">${shippingCost === 0 ? shippingLabel : money(shippingCost)}</span>
        </div>

        <div class="order-total-row" id="discountRow" style="display:none">
          <span>Descuento:</span>
          <span class="js-discount-amount">- $0.00</span>
        </div>

        <div class="order-total-row order-total-row--final">
          <span>Total:</span>
          <span id="total">${money(Number(ACTIVE_OFFERS[0].price) + shippingCost)}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;

    document.querySelectorAll('input[name="quantity_offer"]').forEach((r) => {
      r.addEventListener("change", updateTotals);
    });

    // Inicializa selección 0
    SELECTED_OFFER = ACTIVE_OFFERS[0];
    updateTotals();
  }

  // ✅ updateTotals usa bump + descuento + cambia texto del botón
  function updateTotals() {
    const selected = document.querySelector('input[name="quantity_offer"]:checked');
    if (selected) {
      const idx = parseInt(selected.value, 10);
      const offer = ACTIVE_OFFERS[idx];
      if (offer) SELECTED_OFFER = offer;
    }

    if (!SELECTED_OFFER) return;

    const parts = getCheckoutParts();

    const shippingLabel =
      CONFIG?.shipping?.label || (parts.shipping === 0 ? "Envío GRATIS" : money(parts.shipping));

    const subtotalEl = document.getElementById("subtotal");
    const shippingEl = document.getElementById("shipping");
    const totalEl = document.getElementById("total");

    if (subtotalEl) subtotalEl.textContent = money(parts.subtotalBeforeDiscount);
    if (shippingEl) shippingEl.textContent = parts.shipping === 0 ? shippingLabel : money(parts.shipping);
    if (totalEl) totalEl.textContent = money(parts.total);

    // ✅ Mostrar fila de descuento cuando aplique
    const discountRow = document.getElementById("discountRow");
    if (discountRow) {
      const show = parts.discountPercent > 0 && parts.discountAmount > 0.0001;
      discountRow.style.display = show ? "flex" : "none";

      const discVal = discountRow.querySelector(".js-discount-amount");
      if (discVal) discVal.textContent = `- ${money(parts.discountAmount)}`;
    }

    // Botón con total
    const submitBtn = document.querySelector("#ecuaclicCheckoutForm .btn-submit");
    if (submitBtn) submitBtn.textContent = `Finalizar pedido — ${money(parts.total)}`;
  }

  // ---------------------------
  // provinces/cities
  // ---------------------------
  function renderProvinces() {
    const prov = document.getElementById("provinceSelect");
    const city = document.getElementById("citySelect");
    if (!prov || !city || !LOCATIONS) return;

    prov.innerHTML = `<option value="">Selecciona tu provincia</option>`;
    Object.keys(LOCATIONS).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LOCATIONS[code].name;
      prov.appendChild(opt);
    });

    prov.addEventListener("change", (e) => {
      const code = e.target.value;

      if (!code || !LOCATIONS[code]) {
        city.disabled = true;
        city.innerHTML = `<option value="">Primero selecciona provincia</option>`;
        return;
      }

      city.innerHTML = `<option value="">Selecciona tu ciudad</option>`;
      (LOCATIONS[code].cities || []).forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        city.appendChild(opt);
      });

      city.disabled = false;
    });
  }

  // ---------------------------
  // ORDER BUMP
  // ---------------------------
  function renderOrderBump() {
    const mount = document.getElementById("orderBumpMount");
    if (!mount) return;

    const ob = CONFIG?.order_bump;
    if (!ob || ob.enabled !== true) {
      mount.innerHTML = "";
      ORDER_BUMP_SELECTED = false;
      return;
    }

    const img = ob.image ? new URL(ob.image, window.location.href).toString() : "";

    mount.innerHTML = `
      <label class="order-bump">
        <input id="orderBumpCheck" type="checkbox" ${ob.default_checked ? "checked" : ""}>
        ${img ? `<img class="order-bump__img" src="${img}" alt="">` : ""}
        <div class="order-bump__txt">
          <div class="order-bump__title">Agrega ${ob.name} a tu orden</div>
          <div class="order-bump__sub">Por solo <span class="order-bump__price">${money(ob.offer_price)}</span></div>
        </div>
      </label>
    `;

    const check = document.getElementById("orderBumpCheck");
    ORDER_BUMP_SELECTED = !!ob.default_checked;

    if (check) {
      check.addEventListener("change", () => {
        ORDER_BUMP_SELECTED = check.checked;
        updateTotals();
      });
    }

    updateTotals();
  }

  // ---------------------------
  // UPSELL VIEW
  // ---------------------------
  function startUpsellTimer(secondsStart) {
    if (UPSELL_TIMER_INT) clearInterval(UPSELL_TIMER_INT);
    let s = Number(secondsStart || 600);

    const el = document.getElementById("upsellTimerTxt");
    const tick = () => {
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      if (el) el.textContent = `${mm}:${ss}`;
      s = Math.max(0, s - 1);
      if (s === 0) s = Number(secondsStart || 600); // evergreen
    };

    tick();
    UPSELL_TIMER_INT = setInterval(tick, 1000);
  }

  function showUpsellView() {
    const u = CONFIG?.upsell;
    const view = document.getElementById("upsellView");
    if (!view || !u || u.enabled !== true) {
      // si no hay upsell, gracias directa
      showThankYouView(false);
      return;
    }

    const img = u.image ? new URL(u.image, window.location.href).toString() : "";
    const secs = Number(u.timer_seconds || 600);

    view.style.display = "block";
    view.innerHTML = `
      <div class="upsell-hero">⚠️ Oferta de último minuto</div>
      <div class="upsell-desc">
        Agrega <strong>${u.name}</strong> a tu orden con <strong>${u.discount_label || "descuento"}</strong>.
        Esta oferta solo la verás disponible aquí, no en la tienda.
      </div>

      <div class="upsell-card">
        <div class="upsell-row">
          ${img ? `<img class="upsell-img" src="${img}" alt="">` : ""}
          <div>
            <div class="upsell-name">${u.name}</div>
            <div class="upsell-price">
              ${u.compare_at ? `<span class="upsell-old">${money(u.compare_at)}</span>` : ""}
              <span class="upsell-new">${money(u.offer_price)}</span>
            </div>
            ${u.discount_label ? `<div class="upsell-badge">🔥 ${u.discount_label}</div>` : ""}
            <div class="upsell-desc" style="margin:10px 0 0">
              ⏳ La oferta termina en <strong id="upsellTimerTxt"></strong>
            </div>
          </div>
        </div>

        <div class="upsell-actions">
          <button type="button" class="upsell-yes" id="upsellYes">Sí, agregar a mi pedido</button>
          <button type="button" class="upsell-no" id="upsellNo">No gracias, solo mi orden</button>
        </div>
      </div>
    `;

    // Forzar que se vea arriba (móvil)
    const card = document.querySelector(".ecuaclic-modal__card");
    if (card) card.classList.add("upsell-active");

    try { view.scrollTop = 0; } catch(e) {}
    const body = document.querySelector(".ecuaclic-modal__body");
    if (body) body.scrollTop = 0;
    if (card) card.scrollTop = 0;

    startUpsellTimer(secs);

    document.getElementById("upsellYes")?.addEventListener("click", () => submitUpsell(true));
    document.getElementById("upsellNo")?.addEventListener("click", () => submitUpsell(false));
  }

  // ---------------------------
  // THANK YOU VIEW
  // ---------------------------
  function getThankYouSummary() {
    const parts = getCheckoutParts();

    const shippingCost = Number(CONFIG?.shipping?.cost ?? 0);
    const shippingLabel =
      CONFIG?.shipping?.label || (shippingCost === 0 ? "Envío GRATIS" : money(shippingCost));

    return {
      productName: CONFIG?.product?.name || "Producto",
      productSku: CONFIG?.product?.sku || "",
      qty: Number(SELECTED_OFFER?.quantity || 1),
      offerLabel: SELECTED_OFFER?.label || "",
      bumpName: CONFIG?.order_bump?.name || "",
      bump: parts.bump,
      discountPercent: parts.discountPercent,
      discountAmount: parts.discountAmount,
      shippingLabel,
      total: parts.total
    };
  }

function showThankYouView(upsellAccepted) {
  const view = document.getElementById("thankyouView");
  if (!view) return;

  // ✅ FIX DEFINITIVO: cambiar de vista (oculta checkout y upsell, muestra thanks)
  const ups = document.getElementById("upsellView");
  if (ups) ups.style.display = "none";
  if (UPSELL_TIMER_INT) clearInterval(UPSELL_TIMER_INT);

  // Ocultar el checkout (formulario + resumen) para que NO se quede "encima"
  const form = document.getElementById("ecuaclicCheckoutForm");
  if (form) form.style.display = "none";

  // Si tu resumen/ofertas está fuera del form, ocultamos también el summary
  const summary = document.getElementById("orderSummary");
  if (summary) summary.style.display = "none";

  // Mostrar thankyou
  view.style.display = "block";

  dlPush({
    event: "ecuaclic_order",
    tiktok_event: "PlaceAnOrder",
    ecommerce: {
      value: getCheckoutParts().total,
      currency: CONFIG?.product?.currency || "USD",
      content_name: CONFIG?.product?.name,
      content_id: CONFIG?.product?.sku || CONFIG?.product?.id,
    },
    customer_hashed: CUSTOMER_HASHES || {},
  });

  const card = document.querySelector(".ecuaclic-modal__card");
  if (card) card.classList.add("upsell-active");

  const s = getThankYouSummary();

  const phone =
    CONFIG?.whatsapp ||
    CONFIG?.whatsapp_number ||
    CONFIG?.whatsapp_number?.toString?.() ||
    "";
  const wa = String(phone || "").replace(/\D/g, "");

  // ====== TU RENDER (NO LO CAMBIÉ) ======
  view.innerHTML = `
    <div class="thankyou-card">
      <div class="thankyou-title">✅ Hemos recibido tu pedido</div>
      <div class="thankyou-sub">
        Un asesor te contactará por <strong>WhatsApp</strong> para confirmar tu orden.
        ${upsellAccepted ? " (Incluye tu oferta extra ✅)" : ""}
      </div>

      <div class="thankyou-row">
        <span>Producto</span>
        <strong>${s.productName}</strong>
      </div>

      <div class="thankyou-row">
        <span>Cantidad</span>
        <strong>${s.qty}${s.offerLabel ? ` (${s.offerLabel})` : ""}</strong>
      </div>

      ${s.bump > 0 ? `
        <div class="thankyou-row">
          <span>Extra</span>
          <strong>${s.bumpName ? s.bumpName : "Order bump"} (${money(s.bump)})</strong>
        </div>
      ` : ""}

      ${s.discountPercent > 0 ? `
        <div class="thankyou-row">
          <span>Descuento</span>
          <strong>- ${money(s.discountAmount)} (${s.discountPercent}%)</strong>
        </div>
      ` : ""}

      <div class="thankyou-row">
        <span>Envío</span>
        <strong>${s.shippingLabel}</strong>
      </div>

      <div class="thankyou-row">
        <span>Total</span>
        <strong>${money(s.total)}</strong>
      </div>

      <div class="thankyou-cta">
        <button class="thankyou-btn thankyou-btn--close" id="thankyouClose">Cerrar</button>
      </div>
    </div>
  `;

  try { view.scrollTop = 0; } catch (e) {}

  if (wa) {
    document.getElementById("thankyouWhatsApp")?.addEventListener("click", () => {
      const text = encodeURIComponent("Hola, acabo de realizar un pedido. ¿Me ayudas a confirmarlo?");
      window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
    });
  }

  document.getElementById("thankyouClose")?.addEventListener("click", () => {
    closeModal(true);
  });
}

  async function submitUpsell(accepted) {
    const u = CONFIG?.upsell;
    const endpoint = u?.n8n_webhook || CONFIG?.n8n_webhook;

    if (endpoint) {
      try {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "upsell",
            session: { id: ORDER_SESSION_ID },
            accepted,
            upsell: {
              product_id: u?.product_id || null,
              sku: u?.sku || null,
              offer_price: u?.offer_price || null
            }
          })
        });
      } catch (e) {
        console.error("Upsell submit error:", e);
      }
    }

    showThankYouView(accepted);
  }

  // ---------------------------
  // EXIT OFFER (popup al cerrar)
  // ---------------------------
  function startExitTimer(secondsStart) {
    if (EXIT_TIMER_INT) clearInterval(EXIT_TIMER_INT);
    let s = Number(secondsStart || 300);
    const el = document.getElementById("exitOfferTimer");

    const tick = () => {
      const mm = String(Math.floor(s / 60)).padStart(2, "0");
      const ss = String(s % 60).padStart(2, "0");
      if (el) el.textContent = `⏳ Oferta expira en ${mm}:${ss}`;
      s = Math.max(0, s - 1);
      if (s === 0) s = Number(secondsStart || 300); // evergreen
    };

    tick();
    EXIT_TIMER_INT = setInterval(tick, 1000);
  }

  function hideExitOffer() {
    const wrap = document.getElementById("exitOffer");
    if (wrap) wrap.style.display = "none";
  }

  function showExitOffer() {
    const ed = CONFIG?.exit_downsell;
    const wrap = document.getElementById("exitOffer");
    if (!wrap || !ed) return;

    const msgEl = document.getElementById("exitOfferMsg");
    if (msgEl) msgEl.textContent = ed.message || "Espera 👀 Te doy un descuento si finalizas ahora.";

    wrap.style.display = "flex";

    const close = wrap.querySelector(".exit-offer__close");
    const yes = document.getElementById("exitOfferYes");
    const no = document.getElementById("exitOfferNo");

    if (close) close.onclick = hideExitOffer;

    if (no)
      no.onclick = () => {
        hideExitOffer();
        closeModal(true);
      };

    if (yes)
      yes.onclick = () => {
        EXIT_DISCOUNT_APPLIED = true; // activa descuento
        hideExitOffer();
        updateTotals(); // recalcula UI
      };

    startExitTimer(Number(ed.timer_seconds || 300));
  }

  function attemptClose() {
    // Si está en gracias / upsell, cerrar limpio (sin downsell)
    if (isThankYouVisible() || isUpsellVisible()) {
      closeModal(true);
      return;
    }

    const ed = CONFIG?.exit_downsell;
    if (!ORDER_SENT && ed?.enabled === true) {
      showExitOffer();
      return;
    }
    closeModal(true);
  }

  // ---------------------------
  // open/close
  // ---------------------------
  function openModal() {
    if (!MODAL) return;
    MODAL.classList.add("open");
    MODAL.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";

    // scroll arriba del body del modal
    const body = document.querySelector(".ecuaclic-modal__body");
    if (body) body.scrollTop = 0;

    dlPush({
      event: "ecuaclic_view_content",
      tiktok_event: "ViewContent",
      ecommerce: {
        content_name: CONFIG?.product?.name,
        content_id: CONFIG?.product?.sku || CONFIG?.product?.id,
        currency: CONFIG?.product?.currency || "USD",
        value: getBasePrice(),
      },
    });
  }

  function closeModal(force = false) {
    hideOverlays();
    hideExitOffer();

    if (UPSELL_TIMER_INT) clearInterval(UPSELL_TIMER_INT);
    if (EXIT_TIMER_INT) clearInterval(EXIT_TIMER_INT);

    if (!MODAL) return;
    MODAL.classList.remove("open");
    MODAL.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  // Toggle domicilio / oficina Servientrega
  function bindDeliveryToggle() {
    const radios = document.querySelectorAll('input[name="delivery_method"]');
    const home = document.getElementById("homeFields");
    const servi = document.getElementById("servientregaFields");
    if (!radios.length || !home || !servi) return;

    const addr = home.querySelector('[name="address"]');
    const serviRef = servi.querySelector('[name="servientrega_ref"]');

    function apply() {
      const isOffice =
        document.querySelector('input[name="delivery_method"]:checked')?.value ===
        "oficina_servientrega";
      home.style.display = isOffice ? "none" : "";
      servi.style.display = isOffice ? "" : "none";
      // required se alterna para no bloquear el submit con campos ocultos
      if (addr) addr.required = !isOffice;
      if (serviRef) serviRef.required = isOffice;
    }

    radios.forEach((r) => r.addEventListener("change", apply));
    apply();
  }

  function bindClose() {
    // robusto: engancha varias variantes por si cambiaste html/css
    const closeCandidates = [
      ".ecuaclic-modal__close",
      "[data-modal-close]",
      ".modal-close",
      ".close-modal"
    ];

    closeCandidates.forEach((sel) => {
      document.querySelectorAll(sel).forEach((btn) => {
        btn.onclick = attemptClose;
      });
    });

    const backdrop = document.querySelector(".ecuaclic-modal__backdrop");
    if (backdrop) backdrop.onclick = attemptClose;

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") attemptClose();
    });
  }

  // ---------------------------
  // status helpers
  // ---------------------------
  function showStatus(msg, type) {
    const el = document.getElementById("ecuaclicStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = `ecuaclic-status show ecuaclic-status--${type}`;
  }

  function hideStatus() {
    const el = document.getElementById("ecuaclicStatus");
    if (!el) return;
    el.className = "ecuaclic-status";
  }

  // ---------------------------
  // submit to n8n
  // ---------------------------
  async function handleSubmit(e) {
    e.preventDefault();

    if (!SELECTED_OFFER) {
      showStatus("Por favor selecciona una opción.", "error");
      return;
    }

    const endpoint = CONFIG?.n8n_webhook;
    if (!endpoint) {
      showStatus("Falta configurar n8n_webhook en config.json", "error");
      return;
    }

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    showStatus("Enviando tu pedido...", "loading");

    try {
      const fd = new FormData(form);

      // Hashear y guardar para reusar en PlaceAnOrder
      const phone = (fd.get("phone") || "").replace(/\D/g, "");
      CUSTOMER_HASHES = { phone: await sha256(phone) };

      const parts = getCheckoutParts();
      dlPush({
        event: "ecuaclic_checkout",
        tiktok_event: "InitiateCheckout",
        ecommerce: {
          value: parts.total,
          currency: CONFIG?.product?.currency || "USD",
          content_name: CONFIG?.product?.name,
          content_id: CONFIG?.product?.sku || CONFIG?.product?.id,
        },
        customer_hashed: CUSTOMER_HASHES,
      });

      const provSel = document.getElementById("provinceSelect");
      const citySel = document.getElementById("citySelect");
      const provinceCode = fd.get("province") || "";
      const provinceName = provSel?.selectedOptions?.[0]?.textContent?.trim() || "";
      const cityName = citySel?.selectedOptions?.[0]?.textContent?.trim() || fd.get("city") || "";

      const payload = {
        action: "checkout",
        session: { id: ensureSessionId() },

        product: {
          id: CONFIG?.product?.id,
          sku: CONFIG?.product?.sku || null,
          name: CONFIG?.product?.name,
          folder: window.ECUACLIC_PRODUCT_FOLDER || ""
        },

        offer: {
          quantity: SELECTED_OFFER.quantity,
          price: SELECTED_OFFER.price,
          label: SELECTED_OFFER.label
        },

        order_bump: {
          enabled: !!CONFIG?.order_bump?.enabled,
          selected: ORDER_BUMP_SELECTED,
          product_id: CONFIG?.order_bump?.product_id || null,
          sku: CONFIG?.order_bump?.sku || null,
          offer_price: CONFIG?.order_bump?.offer_price || null
        },

        exit_discount: {
          applied: EXIT_DISCOUNT_APPLIED,
          percent: CONFIG?.exit_downsell?.discount_percent || 0
        },

        customer: {
          name: fd.get("name"),
          lastname: fd.get("lastname"),
          phone: fd.get("phone"),
          email: fd.get("email") || "",
          province: provinceCode,
          province_name: provinceName,
          city: cityName,
          delivery_method: fd.get("delivery_method") || "domicilio",
          address:
            fd.get("delivery_method") === "oficina_servientrega"
              ? "Retiro en oficina de Servientrega"
              : fd.get("address"),
          reference:
            fd.get("delivery_method") === "oficina_servientrega"
              ? fd.get("servientrega_ref") || ""
              : fd.get("reference") || "",
          note:
            fd.get("delivery_method") === "oficina_servientrega"
              ? ""
              : fd.get("note") || ""
        },

        upsell: {
          enabled: !!(CONFIG?.upsell?.enabled),
           product_id: CONFIG?.upsell?.product_id || null,
           sku: CONFIG?.upsell?.sku || null,
          offer_price: CONFIG?.upsell?.offer_price || null
        },


        metadata: {
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          
          // ✅ Tracking completo
          ...(window.ECUACLIC_TRACKING || {})
        }
      };

      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json().catch(() => ({}));

      // Si el backend decide (recomendado)
      const upsellEnabledServer =
      typeof data.upsell_enabled === "boolean" ? data.upsell_enabled : null;

      ORDER_SENT = true;
      showStatus("✅ Pedido base enviado. Confirmemos una oferta final…", "success");

      setTimeout(() => {
        hideStatus();
        btn.disabled = false;

        // ✅ Decide: primero manda el backend (si vino), si no, usa config.json
        const finalUpsellEnabled = !!CONFIG?.upsell?.enabled;


        if (finalUpsellEnabled) {
          showUpsellView();
        } else {
          showThankYouView(false);
        }
      }, 700);

    } catch (err) {
      console.error(err);
      showStatus("❌ Error al enviar. Intenta nuevamente.", "error");
      btn.disabled = false;
    }
  }

  // ---------------------------
  // ensureReady
  // ---------------------------
  async function ensureReady() {
    if (ready) return true;
    if (loading) return loading;

    loading = (async () => {
      await ensureConfig();

      const okHTML = await loadModalHTML();
      if (!okHTML) {
        console.error("[MODAL] No se pudo cargar modal.html");
        return false;
      }

      await loadLocations();

      renderOffers();
      renderProvinces();
      bindDeliveryToggle();
      bindClose();

      const form = document.getElementById("ecuaclicCheckoutForm");
      if (form) form.onsubmit = handleSubmit;

      ensureSessionId();

      ready = true;
      return true;
    })();

    return loading;
  }

  // ---------------------------
  // open event
  // ---------------------------
  window.addEventListener("ecuaclic:open-modal", async () => {
    const ok = await ensureReady();
    if (!ok) return;

    // reset estado por apertura
    ORDER_SENT = false;
    EXIT_DISCOUNT_APPLIED = false;
    ORDER_BUMP_SELECTED = false;

    hideOverlays();
    hideExitOffer();

    openModal();

    // bump + totales
    renderOrderBump();
    updateTotals();

    startReserveTimer(10 * 60);
    startLiveViewers();
  });
})();
