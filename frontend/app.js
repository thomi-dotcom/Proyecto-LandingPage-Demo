(() => {
  // ---------- Helpers ----------
  const $$ = (sel) => document.querySelector(sel);

  // ---------- Config ----------
  const config = window.SITE_CONFIG || {};
  const BUSINESS_NAME = config.business?.name || "Maison Lúmina";
  const WHATSAPP_PHONE = (config.whatsapp?.phone || "").replace(/\D/g, "") || "5491112345678";
  
  const WHATSAPP_DEFAULT_MESSAGE = config.whatsapp?.defaultMessage ||
  `Hola! 👋\nGracias por escribir a ${BUSINESS_NAME} ☕✨\n\n¿En qué podemos ayudarte?`;

  // ---------- DOM ----------
  const $menuGrid = $$("#menuGrid");
  const $menuSearch = $$("#menuSearch");
  const $menuChips = $$("#menuChips");

  // WhatsApp Links
  const $waTop = $$("#waTop");
  const $waHero = $$("#waHero");
  const $waMenu = $$("#waMenu");
  const $waHours = $$("#waHours");
  const $waBottom = $$("#waBottom");

  // Maps
  const $mapsBtn = $$("#mapsBtn");
  const $mapsFrame = $$("#mapsFrame");
  const $mapSkeleton = $$("#mapSkeleton");

  // Footer
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
  // ADMIN SHORTCUT: CTRL + A + D
  // =========================================================
  (() => {
    const pressed = new Set();
    window.addEventListener("keydown", (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      
      pressed.add(e.key);
      if (pressed.has("Control") && (pressed.has("a") || pressed.has("A")) && (pressed.has("d") || pressed.has("D"))) {
        e.preventDefault();
        window.location.href = "./admin.html";
        pressed.clear();
      }
    });
    window.addEventListener("keyup", (e) => pressed.delete(e.key));
  })();

  // ---------- WhatsApp Helper ----------
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

  // ---------- Maps Helper ----------
  function setMapsLink() {
    if (!$mapsBtn) return;
    if (config.location?.mapsUrl) {
      $mapsBtn.href = config.location.mapsUrl;
    }
  }

  function initMapsEmbedLazy() {
    if (!$mapsFrame || !config.location?.mapsEmbed) {
      if($mapSkeleton) $mapSkeleton.style.display = 'none';
      return;
    }
    const load = () => {
      $mapsFrame.src = config.location.mapsEmbed;
      $mapsFrame.onload = () => {
        const wrap = $mapsFrame.closest(".mapWrap");
        if (wrap) wrap.classList.add("is-loaded");
      };
    };
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { load(); io.disconnect(); }
    });
    io.observe($mapsFrame);
  }

  // ---------- Search & Logic ----------
  function normalize(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function matchesItem(item, query) {
    if (!query) return true;
    const hay = normalize(`${item.name} ${item.desc || ""} ${item.note || ""}`);
    return hay.includes(query);
  }

  function priceText(price) {
    if (!price && price !== 0) return "";
    return `$${fmt.format(price)}`;
  }

  // ---------- Reveal Animation ----------
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting) e.target.classList.add("is-visible");
      });
    }, { threshold: 0.1 });
    els.forEach(el => io.observe(el));
  }

  function debounce(fn, wait = 140) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ---------- Chips Navigation ----------
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

    // Si la sección activa no existe en los nuevos datos, volver a la primera
    const exists = sections.some(s => s.id === state.activeSectionId);
    if (!exists && sections.length > 0 && state.activeSectionId !== "all") {
      state.activeSectionId = sections[0].id;
    }

    sections.forEach(s => $menuChips.appendChild(mk(s.id, s.title)));
    $menuChips.appendChild(mk("all", "Todo"));
  }

  // ---------- Render Menu (Lógica de Stock Corregida) ----------
  function render() {
    if (!$menuGrid) return;

    const q = normalize(state.q.trim());
    const sections = state.data?.sections || [];

    const visible = state.activeSectionId === "all"
        ? sections
        : sections.filter((s) => s.id === state.activeSectionId);

    if (state.loading) {
      $menuGrid.innerHTML = `<div class="card"><p class="muted">Cargando carta...</p></div>`;
      return;
    }

    const cards = [];

    for (const s of visible) {
      for (const it of s.items || []) {
        if (!matchesItem(it, q)) continue;

        // --- LÓGICA DE STOCK ---
        const hasStock = it.available !== false; 
        const stockClass = hasStock ? "" : "no-stock";
        const btnText = hasStock ? "Pedir" : "Sin Stock";
        
        // Generar mensaje de WhatsApp
        const msg = `Hola! Quisiera pedir: ${it.name} (${s.title})`;
        
        // CORRECCIÓN: Si no hay stock, el link es '#' y deshabilitamos el click
        const btnLink = hasStock ? waLink(msg) : "#";
        const btnAttr = hasStock 
          ? 'target="_blank" rel="noopener"' 
          : 'onclick="return false;" style="cursor:not-allowed; opacity:0.6; background:rgba(255,255,255,0.05)"';

        const p = priceText(it.price);
        const desc = it.desc ? `<p>${it.desc}</p>` : "";
        const imageHtml = it.image ? `<div class="imageWrap"><img src="${it.image}" alt="${it.name}" class="dishImage"></div>` : "";
        const badgeHtml = it.note ? `<span class="badge">${it.note}</span>` : "";

        cards.push(`
          <article class="menuItem reveal ${stockClass}" data-cat="${s.title}">
            <p class="cat">${s.title}</p>
            <div class="titleRow">
              <h4>${it.name}</h4>
              ${badgeHtml}
            </div>
            ${desc}
            ${imageHtml}
            <div class="bottom">
              <div class="price">${p}</div>
              <a class="quick" href="${btnLink}" ${btnAttr}>${btnText}</a>
            </div>
          </article>
        `);
      }
    }

    $menuGrid.innerHTML = cards.length
      ? cards.join("")
      : `<div class="card"><p class="muted">No se encontraron productos.</p></div>`;

    initReveal();
  }

  // ---------- Load Menu (Conexión Backend) ----------
  async function loadMenu() {
    try {
      const url = window.SITE_CONFIG.api.baseUrl;
      const res = await fetch(url);

      if (!res.ok) throw new Error("Backend offline");

      const data = await res.json();
      return data;

    } catch (e) {
      console.warn("Fallo el backend, usando archivo local...", e);
      const res = await fetch("./data/menu.json");
      return await res.json();
    }
  }

  // ---------- Init ----------
  async function init() {
    setGlobalWALinks();
    setMapsLink();
    initMapsEmbedLazy();

    state.loading = true;
    render();

    state.data = await loadMenu();

    // Asegurar estructura
    if (!state.data.sections) state.data.sections = [];
    
    // Seleccionar primera sección por defecto
    if (state.data.sections.length > 0) {
       state.activeSectionId = state.data.sections[0].id;
    }

    state.loading = false;
    buildChips(state.data.sections);

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
    if ($menuGrid) {
      $menuGrid.innerHTML = `<div class="card"><p>Error cargando menú (Intenta npm start)</p></div>`;
    }
  });

  // Mobile Nav
  const toggle = document.querySelector(".nav__toggle");
  if(toggle) {
    toggle.addEventListener("click", () => document.body.classList.toggle("nav-open"));
    const backdrop = document.querySelector(".nav__backdrop");
    if(backdrop) backdrop.addEventListener("click", () => document.body.classList.remove("nav-open"));
  }

  // --- NUEVA FUNCIÓN: Subir Imagen ---
  window.uploadImage = async (input, secIdx, itemIdx) => {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    // Feedback visual inmediato
    const textInput = document.getElementById(`img-input-${secIdx}-${itemIdx}`);
    const originalText = textInput.value;
    textInput.value = "Subiendo...";
    textInput.disabled = true;

    try {
      const url = "http://localhost:3000/api/upload"; // URL de tu backend
      const res = await fetch(url, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Fallo la subida");

      const data = await res.json();
      
      // ¡Éxito! Actualizamos el dato y el input
      updateItem(secIdx, itemIdx, 'image', data.filePath);
      textInput.value = data.filePath;
      
      alert("✅ Imagen subida correctamente");

    } catch (e) {
      console.error(e);
      alert("Error al subir imagen.");
      textInput.value = originalText; // Restaurar si falló
    } finally {
      textInput.disabled = false;
      input.value = ""; // Limpiar input file para poder subir la misma si quiere
    }
  };

})();

