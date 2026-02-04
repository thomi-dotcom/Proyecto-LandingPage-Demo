(() => {
  // ---------- Helpers ----------
  const $$ = (sel) => document.querySelector(sel);

  // ---------- Config (with safe fallbacks) ----------
  const config = window.SITE_CONFIG || {};

  const BUSINESS_NAME = config.business?.name || "Maison Lúmina";
  const WHATSAPP_PHONE =
    (config.whatsapp?.phone || "").replace(/\D/g, "") || "5491112345678";
  const WHATSAPP_DEFAULT_MESSAGE =
  config.whatsapp?.defaultMessage ||
  `
Hola! 👋
Gracias por escribir a ${BUSINESS_NAME} ☕✨

¿En qué podemos ayudarte?
1️⃣ Reservar mesa
2️⃣ Ver la carta / hacer un pedido
3️⃣ Consultar horarios
4️⃣ Ubicación
5️⃣ Otra consulta
`.trim();

  // Mapa: podés proveer mapsUrl y mapsEmbed desde config.js
  // Si no están, construimos a partir de un "mapsQuery" (address)
  const MAPS_QUERY =
    config.location?.mapsQuery ||
    config.location?.address ||
    config.location?.city ||
    "CABA, Buenos Aires";

  // ---------- DOM ----------
  const $menuGrid = $$("#menuGrid");
  const $menuSearch = $$("#menuSearch");
  const $menuChips = $$("#menuChips");

  const $waTop = $$("#waTop");
  const $waHero = $$("#waHero");
  const $waMenu = $$("#waMenu");
  const $waHours = $$("#waHours");
  const $waBottom = $$("#waBottom");

  const $mapsBtn = $$("#mapsBtn");
  const $mapsFrame = $$("#mapsFrame");
  const $mapSkeleton = $$("#mapSkeleton");

  const $year = $$("#year");
  if ($year) $year.textContent = String(new Date().getFullYear());

  const $hoursText = $$("#hoursText");
  if ($hoursText && config.hours?.text) $hoursText.textContent = config.hours.text;

  const fmt = new Intl.NumberFormat("es-AR");

  const state = {
    data: null,
    activeSectionId: "desayunos",
    q: "",
    loading: true,
  };

  // =========================================================
  // ADMIN oculto: CTRL + A + D => abre admin.html (MISMA PESTAÑA)
  // =========================================================
  (() => {
    // Guardamos teclas presionadas
    const pressed = new Set();

    function isInputFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = (el.tagName || "").toUpperCase();
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }

    function shouldOpenAdmin() {
      // Ctrl + A + D
      const hasCtrl = pressed.has("Control");
      const hasA = pressed.has("a") || pressed.has("A");
      const hasD = pressed.has("d") || pressed.has("D");
      return hasCtrl && hasA && hasD;
    }

    window.addEventListener("keydown", (e) => {
      // Si estás escribiendo en inputs, no queremos atajos raros
      if (isInputFocused()) return;

      pressed.add(e.key);

      if (shouldOpenAdmin()) {
        // Evita que Ctrl+A seleccione toda la página
        e.preventDefault();

        // ✅ CAMBIO: Ahora usa location.href para abrir en la misma ventana
        window.location.href = "./admin.html";

        // Limpieza para que no dispare varias veces
        pressed.clear();
      }
    });

    window.addEventListener("keyup", (e) => {
      pressed.delete(e.key);
    });

    window.addEventListener("blur", () => {
      // Si la pestaña pierde foco, limpiamos estado
      pressed.clear();
    });
  })();

  // ---------- WhatsApp ----------
  function waLink(text) {
    const msg = encodeURIComponent(text);
    return `https://wa.me/${WHATSAPP_PHONE}?text=${msg}`;
  }

  function setGlobalWALinks() {
    const baseMsg = WHATSAPP_DEFAULT_MESSAGE;
    [$waTop, $waHero, $waMenu, $waHours, $waBottom].forEach((a) => {
      if (a) a.href = waLink(baseMsg);
    });
  }

  // ---------- Maps ----------
  function setMapsLink() {
    if (!$mapsBtn) return;

    // Si viene url directo desde config, lo usamos
    if (config.location?.mapsUrl) {
      $mapsBtn.href = config.location.mapsUrl;
      return;
    }

    // Sino, armamos búsqueda por query
    const q = encodeURIComponent(MAPS_QUERY);
    $mapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  function buildMapsEmbedUrl() {
    // Si viene embed directo desde config, lo usamos
    if (config.location?.mapsEmbed) return config.location.mapsEmbed;

    // Sino, armamos embed por query (NOTA: requiere API Key real para funcionar perfecto,
    // o usar el embed simple de Google Maps). 
    // Como fallback genérico, retornamos string vacío si no hay URL configurada.
    return "";
  }

  function initMapsEmbedLazy() {
    if (!$mapsFrame) return;

    const embedUrl = buildMapsEmbedUrl();
    if (!embedUrl) {
        // Si no hay URL de embed, ocultamos el esqueleto para que no quede cargando infinito
        if ($mapSkeleton) $mapSkeleton.style.display = "none";
        return; 
    }

    const load = () => {
      if ($mapsFrame.dataset.loaded === "1") return;

      $mapsFrame.src = embedUrl;
      $mapsFrame.dataset.loaded = "1";

      $mapsFrame.addEventListener(
        "load",
        () => {
          const wrap = $mapsFrame.closest(".mapWrap");
          if (wrap) wrap.classList.add("is-loaded");
          if ($mapSkeleton) $mapSkeleton.style.display = "none";
        },
        { once: true }
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            load();
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 }
    );

    io.observe($mapsFrame);
  }

  // ---------- Search / Normalize ----------
  function normalize(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function matchesItem(item, query) {
    if (!query) return true;
    const hay = normalize(`${item.name} ${item.desc || ""} ${item.note || ""}`);
    return hay.includes(query);
  }

  function priceText(price) {
    if (price === null || price === undefined || price === "") return "";
    if (typeof price === "string") return price;
    return `$${fmt.format(price)}`;
  }

  // ---------- Reveal ----------
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  }

  function debounce(fn, wait = 140) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------- Chips ----------
  function buildChips(sections) {
    if (!$menuChips) return;
    $menuChips.innerHTML = "";

    const mk = (id, text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (state.activeSectionId === id ? " active" : "");
      b.textContent = text;
      b.onclick = () => {
        state.activeSectionId = id;
        render();
        buildChips(sections);
      };
      return b;
    };

    for (const s of sections) $menuChips.appendChild(mk(s.id, s.title));
    $menuChips.appendChild(mk("all", "Todo"));
  }

  // ---------- Render Menu ----------
  function render() {
    if (!$menuGrid) return;

    const q = normalize(state.q.trim());
    const sections = state.data?.sections || [];

    const visible =
      state.activeSectionId === "all"
        ? sections
        : sections.filter((s) => s.id === state.activeSectionId);

    if (state.loading) {
      $menuGrid.innerHTML = `<div class="card"><p class="muted">Cargando carta...</p></div>`;
      return;
    }

    const isScheduleNote = (note) =>
      typeof note === "string" &&
      /(\b(11:00|12:00|13:00|14:00|15:00|16:00|17:00|18:00|19:00|20:00)\b)|(\b\d{1,2}:\d{2}\b)|(\bSábados\b|\bDomingos\b|\bFeriados\b)/i.test(
        note
      );

    const cards = [];

    for (const s of visible) {
      for (const it of s.items || []) {
        if (!matchesItem(it, q)) continue;

        const p = priceText(it.price);

        const note = it.note || "";
        const desc = it.desc || "";

        const schedule = isScheduleNote(note) ? note : "";
        const extra = !schedule ? note : "";

        const msg = `
Hola! 
Quisiera pedir/consultar:

• ${it.name}
(${s.title})

Gracias 
`.trim();
        const askHref = waLink(msg);

        const detailHtml = desc
          ? `<p>${desc}</p>`
          : extra
          ? `<p class="muted">${extra}</p>`
          : ``;

        const badgeHtml = schedule ? `<span class="badge">${schedule}</span>` : ``;

        const imageHtml = it.image
          ? `
            <div class="imageWrap">
              <img src="${it.image}" alt="${it.name}" class="dishImage">
            </div>
          `
          : ``;

        cards.push(`
          <article class="menuItem reveal" data-cat="${s.title}">
            <p class="cat">${s.title}</p>
            <div class="titleRow">
              <h4>${it.name}</h4>
              ${badgeHtml}
            </div>
            ${detailHtml}
            ${imageHtml}
            <div class="bottom">
              <div class="price">${p}</div>
              <a class="quick" href="${askHref}" target="_blank" rel="noopener">Pedir</a>
            </div>
          </article>
        `);
      }
    }

    $menuGrid.innerHTML = cards.length
      ? cards.join("")
      : `<div class="card"><p class="muted">No hay resultados para tu búsqueda.</p></div>`;

    initReveal();
  }

// ---------- Load Menu (CLOUD) ----------
  async function loadMenu() {
    // 1. Intentamos leer de la nube (JSONBin)
    try {
      // Usamos las credenciales de config.js
      const { binId, apiKey } = window.SITE_CONFIG.api;
      
      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          'X-Master-Key': apiKey
        }
      });

      if (!res.ok) throw new Error("Error conectando con la nube");

      const json = await res.json();
      // JSONBin devuelve los datos dentro de una propiedad "record"
      return json.record; 

    } catch (e) {
      console.error("Fallo la nube, intentando local...", e);
      // Fallback: Si falla internet, carga el local
      const res = await fetch("./data/menu.json");
      return await res.json();
    }
  }

  // ---------- Init ----------
  async function init() {
    setGlobalWALinks();
    setMapsLink();

    initReveal();
    initMapsEmbedLazy();

    state.loading = true;
    render();

    state.data = await loadMenu();

    if (!state.data || !Array.isArray(state.data.sections)) {
      throw new Error("El menú cargó pero no tiene 'sections' como array.");
    }

    state.loading = false;
    buildChips(state.data.sections || []);

    if ($menuSearch) {
      $menuSearch.addEventListener(
        "input",
        debounce((e) => {
          state.q = e.target.value || "";
          render();
        }, 120)
      );
    }

    render();
  }

  init().catch((err) => {
    console.error(err);
    state.loading = false;

    if ($menuGrid) {
      $menuGrid.innerHTML = `
        <div class="card">
          <p><strong>Error cargando la carta.</strong></p>
          <p class="muted" style="margin:0;">${String(err.message || err)}</p>
          <p class="muted" style="margin:10px 0 0; font-size:12px;">
            Tip: Abrí el sitio con un servidor local (no con file://).
          </p>
        </div>
      `;
    }
  });

   // =========================================================
   // MOBILE NAV
   // =========================================================
   (() => {
    const body = document.body;
    const toggle = document.querySelector(".nav__toggle");
    const drawer = document.getElementById("mobileNav");
    const backdrop = document.querySelector(".nav__backdrop");
  
    if (!toggle || !drawer || !backdrop) return;
  
    const setOpen = (open) => {
      body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  
      if (open) {
        const firstLink = drawer.querySelector("a");
        firstLink?.focus?.();
      } else {
        toggle.focus?.();
      }
    };
  
    const isOpen = () => body.classList.contains("nav-open");
  
    // Toggle
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      setOpen(!isOpen());
    });
  
    // Backdrop explícito
    backdrop.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      setOpen(false);
    });
  
    // Cerrar al tocar un link
    drawer.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a && isOpen()) setOpen(false);
    });
  
    // Cerrar con ESC
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) setOpen(false);
    });
  
    // Click outside robusto
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!isOpen()) return;
        const t = e.target;
        if (t && t.closest && t.closest("[data-nav-close]")) {
          setOpen(false);
          return;
        }
        if (drawer.contains(t) || toggle.contains(t)) return;
        setOpen(false);
      },
      true 
    );
  
    // Si cambia a desktop, cerrar
    const mq = window.matchMedia("(min-width: 861px)");
    mq.addEventListener?.("change", (e) => {
      if (e.matches) setOpen(false);
    });
  })();

})();