(function () {
  "use strict";

  // =============================
  // SAFE STORAGE (si localStorage falla, usa memoria)
  // =============================
  const _memStore = {};
  const safeStore = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return Object.prototype.hasOwnProperty.call(_memStore, key) ? _memStore[key] : null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (e) {
        _memStore[key] = String(value);
      }
    }
  };

  // =============================
  // ✅ NUEVO: TRACKING DATA CAPTURE
  // =============================
  function getCookie(name) {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    } catch (e) {
      // ignore
    }
    return null;
  }

  function getUrlParam(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    } catch (e) {
      return null;
    }
  }

  function captureTrackingData() {
    console.log('🔍 Capturando tracking data...');
    
    // Capturar todos los parámetros de tracking
    const tracking = {
      // TikTok
      ttclid: getUrlParam('ttclid'),
      ttp: getCookie('_ttp'),
      
      // UTM Parameters
      utm_source: getUrlParam('utm_source'),
      utm_medium: getUrlParam('utm_medium'),
      utm_campaign: getUrlParam('utm_campaign'),
      utm_content: getUrlParam('utm_content'),
      utm_term: getUrlParam('utm_term'),
      
      // Meta/Facebook
      fbclid: getUrlParam('fbclid'),
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc'),
      
      // Contexto
      page_url: window.location.href,
      landing_page: window.location.pathname,
      referrer: document.referrer || null,
      
      // Timestamp
      captured_at: new Date().toISOString(),
      
      // Device
      user_agent: navigator.userAgent,
      device_type: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      screen_resolution: `${window.screen.width}x${window.screen.height}`
    };

    // Debug: mostrar lo que se capturó
    console.log('📊 Datos crudos capturados:', {
      ttclid: tracking.ttclid || '❌ no encontrado',
      utm_source: tracking.utm_source || '❌ no encontrado',
      utm_campaign: tracking.utm_campaign || '❌ no encontrado',
      page_url: tracking.page_url
    });

    // Limpiar valores null/undefined para tener un objeto más limpio
    const cleanTracking = {};
    for (const [key, value] of Object.entries(tracking)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanTracking[key] = value;
      }
    }

    console.log('✅ Tracking limpio tiene', Object.keys(cleanTracking).length, 'campos');

    // ✅ Persistir en localStorage (30 días)
    try {
      const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
      const stored = {
        data: cleanTracking,
        expires_at: expiresAt
      };
      safeStore.set('ecuaclic_tracking', JSON.stringify(stored));
      console.log('💾 Guardado en localStorage');
    } catch (e) {
      console.warn('⚠️ No se pudo guardar tracking en localStorage:', e);
    }

    // ✅ También en sessionStorage (backup)
    try {
      window.sessionStorage.setItem('ecuaclic_tracking_session', JSON.stringify(cleanTracking));
      console.log('💾 Guardado en sessionStorage');
    } catch (e) {
      console.warn('⚠️ No se pudo guardar tracking en sessionStorage:', e);
    }

    return cleanTracking;
  }

  function getTrackingData() {
    // Intentar recuperar de diferentes fuentes con prioridad

    // 1. Session storage (más reciente)
    try {
      const session = window.sessionStorage.getItem('ecuaclic_tracking_session');
      if (session) {
        const data = JSON.parse(session);
        if (data && typeof data === 'object') return data;
      }
    } catch (e) {
      // ignore
    }

    // 2. Local storage (persistente)
    try {
      const stored = safeStore.get('ecuaclic_tracking');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Verificar si no expiró
        if (parsed.expires_at && parsed.expires_at > Date.now()) {
          return parsed.data || {};
        }
      }
    } catch (e) {
      // ignore
    }

    // 3. Capturar nuevamente si no hay nada guardado
    return captureTrackingData();
  }

  // =============================
  // BASICS (robusto)
  // =============================
  const body = document.body;
  let CONFIG = {};

  // Detecta el folder del producto:
  // - Prioridad 1: <body data-product-folder="productos/slug">
  // - Prioridad 2: URL /productos/slug/  => productos/slug
  function detectProductFolder() {
    const fromAttr = body?.dataset?.productFolder;
    if (fromAttr && fromAttr.trim()) return fromAttr.replace(/\/+$/, "");

    // Normaliza: quita query/hash y quita trailing slashes
    const path = window.location.pathname.replace(/\/+$/, "");

    // Caso estándar: /productos/slug
    // Ej: /productos/afeitadora-3en1  => slug=afeitadora-3en1
    let m = path.match(/\/productos\/([^\/]+)$/);
    if (m) return `productos/${m[1]}`;

    // Fallback por si hay un / al final o algo extra:
    // /productos/slug/anything...
    m = path.match(/\/productos\/([^\/]+)\//);
    if (m) return `productos/${m[1]}`;

    // Si no se puede detectar, devuelve vacío (loadConfig no rompe)
    return "";
  }

  const PRODUCT_FOLDER = detectProductFolder();

  // Variables globales neutrales (para debug)
  window.CRAFT_CONFIG = null;
  window.CRAFT_PRODUCT_FOLDER = PRODUCT_FOLDER;
  // ✅ NUEVO: Exponer tracking globalmente
  window.ECUACLIC_TRACKING = null;

  // =============================
  // LOAD CONFIG (si falla, no rompe nada)
  // =============================
  async function loadConfig() {
    try {
      if (!PRODUCT_FOLDER) return {};

      // Evita cache raro en local / preview
      const url = `/${PRODUCT_FOLDER}/config.json?v=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) return {};
      CONFIG = await res.json();

      // debug global
      window.CRAFT_CONFIG = CONFIG;

      return CONFIG;
    } catch (err) {
      console.warn("Config load failed:", err);
      return {};
    }
  }

  // =============================
  // TOPBAR HEIGHT
  // =============================
  function syncTopbarHeight() {
    const topbar = document.getElementById("topbar");
    if (!topbar) return;
    document.documentElement.style.setProperty("--topbar-h", `${topbar.offsetHeight}px`);
  }

  // =============================
  // EVERGREEN TIMER (SIEMPRE ARRANCA)
  // - No depende de CONFIG
  // - Reinicia cuando llega a 0
  // =============================
  function initTimerEvergreen() {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;

    const HOURS = 4;
    // clave evergreen por producto-folder (evita mezclar productos)
    const KEY = `promo_end_${PRODUCT_FOLDER || "default"}`;

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function setNewEnd() {
      const end = Date.now() + HOURS * 60 * 60 * 1000;
      safeStore.set(KEY, String(end));
      return end;
    }

    let endTs = parseInt(safeStore.get(KEY) || "", 10);
    if (!endTs || Number.isNaN(endTs) || endTs <= Date.now()) {
      endTs = setNewEnd();
    }

    function tick() {
      let diff = endTs - Date.now();

      // ✅ cuando llega a 0: reinicia automáticamente
      if (diff <= 0) {
        endTs = setNewEnd();
        diff = endTs - Date.now();
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hh = Math.floor(totalSeconds / 3600);
      const mm = Math.floor((totalSeconds % 3600) / 60);
      const ss = totalSeconds % 60;

      timerEl.textContent = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
    }

    tick();
    setInterval(tick, 1000);
  }

  // =============================
  // SYNC CAJAS DEL CONTADOR (lee #timer)
  // =============================
  function syncCountdownBoxes() {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;

    const setAll = (sel, v) => {
      document.querySelectorAll(sel).forEach((el) => (el.textContent = v));
    };

    const apply = () => {
      const parts = (timerEl.textContent || "00:00:00").trim().split(":");
      const hh = (parts[0] || "00").padStart(2, "0");
      const mm = (parts[1] || "00").padStart(2, "0");
      const ss = (parts[2] || "00").padStart(2, "0");

      setAll(".js-cd-h1", hh[0]);
      setAll(".js-cd-h2", hh[1]);
      setAll(".js-cd-m1", mm[0]);
      setAll(".js-cd-m2", mm[1]);
      setAll(".js-cd-s1", ss[0]);
      setAll(".js-cd-s2", ss[1]);
    };

    apply();

    try {
      new MutationObserver(apply).observe(timerEl, {
        childList: true,
        characterData: true,
        subtree: true
      });
    } catch (e) {
      // fallback si MutationObserver falla: refresca cada 500ms
      setInterval(apply, 500);
    }
  }

  // =============================
  // LIVE VIEWERS (realista)
  // =============================
  function initLiveViewers() {
    document.querySelectorAll(".js-live").forEach((el) => {
      let v = Math.floor(Math.random() * 4) + 4; // 4–7
      el.textContent = String(v);

      setInterval(() => {
        v += Math.random() > 0.65 ? 1 : -1;
        v = Math.max(3, Math.min(9, v));
        el.textContent = String(v);
      }, 8000);
    });
  }

  // =============================
  // STOCK desde config (si existe)
  // =============================
  function syncStockFromConfig() {
    const stock = CONFIG?.product?.stock;
    if (typeof stock !== "number" || !Number.isFinite(stock)) return;

    document.querySelectorAll(".js-stock").forEach((el) => {
      el.textContent = String(stock);
    });
  }

  // =============================
  // BOTTOM CTA (15% scroll)
  // =============================
  function onScroll() {
    const bottomCta = document.getElementById("bottomCta");
    if (!bottomCta) return;

    const doc = document.documentElement;
    const scrolled = doc.scrollTop || document.body.scrollTop || 0;
    const height = (doc.scrollHeight - doc.clientHeight) || 1;
    const pct = scrolled / height;

    if (pct >= 0.15) {
      bottomCta.classList.add("show");
      document.body.classList.add("has-bottomcta");
    } else {
      bottomCta.classList.remove("show");
      document.body.classList.remove("has-bottomcta");
    }
  }

  // =============================
  // WhatsApp - ACTUALIZADO CON DEBUG
  // =============================
  function initWhatsApp() {
    console.log('🔧 Inicializando WhatsApp...');
    
    const waFloat = document.getElementById("waFloat");
    if (!waFloat) {
      console.warn('⚠️ Botón de WhatsApp no encontrado (#waFloat)');
      return;
    }

    // Obtener número de WhatsApp del config o del data-attribute
    let whatsappNum = CONFIG?.whatsapp || waFloat.dataset.whatsapp || "";
    
    // Si no hay número configurado, ocultar el botón
    if (!whatsappNum) {
      console.warn('⚠️ No hay número de WhatsApp configurado');
      waFloat.style.display = "none";
      return;
    }

    const num = whatsappNum.toString().replace(/\D/g, "");
    if (!num) {
      console.warn('⚠️ Número de WhatsApp inválido:', whatsappNum);
      waFloat.style.display = "none";
      return;
    }

    console.log('✅ Número de WhatsApp:', num);

    // Obtener tracking
    const tracking = window.ECUACLIC_TRACKING || {};

    // Construir bloque de metadata completo para craft-api (parseable por el backend)
    const trkParts = [];
    if (tracking.fbclid)       trkParts.push(`fbclid=${tracking.fbclid}`);
    if (tracking.fbp)          trkParts.push(`fbp=${tracking.fbp}`);
    if (tracking.fbc)          trkParts.push(`fbc=${tracking.fbc}`);
    if (tracking.ttclid)       trkParts.push(`ttclid=${tracking.ttclid}`);
    if (tracking.ttp)          trkParts.push(`ttp=${tracking.ttp}`);
    if (tracking.utm_source)   trkParts.push(`src=${tracking.utm_source}`);
    if (tracking.utm_campaign) trkParts.push(`cmp=${tracking.utm_campaign}`);
    if (tracking.utm_medium)   trkParts.push(`med=${tracking.utm_medium}`);
    if (tracking.utm_content)  trkParts.push(`cnt=${tracking.utm_content}`);

    const trkBlock = trkParts.length > 0 ? `\n[TRK:${trkParts.join('&')}]` : '';
    const msg = `Hola, necesito más información de este producto: ${window.location.href}${trkBlock}`;
    waFloat.href = `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

    waFloat.style.display = "flex";
    waFloat.style.pointerEvents = "auto";

    console.log('✅ WhatsApp inicializado. Tracking campos:', trkParts.length);
  }

  // =============================
  // Modal triggers
  // =============================
  function attachModalTriggers() {
    document.querySelectorAll(".js-open-modal").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("ecuaclic:open-modal"));
      });
    });
  }

  // =============================
  // INIT (blindado)
  // =============================
  async function init() {
    try {
      // ✅ CRÍTICO: Capturar tracking PRIMERO y SINCRÓNICO
      window.ECUACLIC_TRACKING = getTrackingData();
      console.log('✅ Tracking inicializado:', window.ECUACLIC_TRACKING);

      // UI base
      syncTopbarHeight();

      // ✅ ARRANCA TIMER SI O SI
      initTimerEvergreen();

      // sync cajas
      syncCountdownBoxes();

      // bottom cta: evaluar ya mismo
      onScroll();

      // listeners
      window.addEventListener("resize", syncTopbarHeight);
      window.addEventListener("scroll", onScroll, { passive: true });

      // config (no bloquea) - pero esperamos para WhatsApp
      await loadConfig();
      window.ECUACLIC_CONFIG = CONFIG;

      // ✅ CRÍTICO: Re-inicializar WhatsApp DESPUÉS de config Y verificar tracking
      if (!window.ECUACLIC_TRACKING || Object.keys(window.ECUACLIC_TRACKING).length === 0) {
        console.warn('⚠️ Tracking vacío, recapturando...');
        window.ECUACLIC_TRACKING = captureTrackingData();
      }
      
      initWhatsApp();
      
      // extras
      attachModalTriggers();
      initLiveViewers();
      syncStockFromConfig();
    } catch (err) {
      console.error("Fatal init error:", err);
      // aún así: intenta mostrar bottom CTA como fallback
      try { 
        onScroll(); 
        // Asegurar tracking antes de WhatsApp
        if (!window.ECUACLIC_TRACKING) {
          window.ECUACLIC_TRACKING = captureTrackingData();
        }
        initWhatsApp();
      } catch (_) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();