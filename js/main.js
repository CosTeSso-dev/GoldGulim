(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const CART_KEY = "opalia-cart";
  const LANG_KEY = "opalia-lang";
  const PAGE_SIZE = 12;
  const LANGS = Object.keys(I18N);

  const state = {
    lang: detectLang(),
    category: "all",
    query: "",
    sort: "default",
    shown: PAGE_SIZE,
    cart: loadCart(),
    openId: null,
  };

  /* ---------- Язык ---------- */

  function detectLang() {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (LANGS.includes(saved)) return saved;
    } catch (e) {
      /* хранилище недоступно */
    }
    return LANGS.includes(SHOP.defaultLang) ? SHOP.defaultLang : "ru";
  }

  // Текст интерфейса по ключу; {name} и т. п. заменяются значениями из vars
  function t(key, vars) {
    const text = I18N[state.lang][key] ?? I18N.ru[key] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m) : text;
  }

  // Значение, заданное в виде { ru: "...", uz: "..." } или простой строкой
  function local(value) {
    if (value && typeof value === "object") return value[state.lang] ?? value.ru;
    return value;
  }

  // Поле товара на текущем языке (с запасным вариантом на русском)
  function field(p, name) {
    return (state.lang !== "ru" && p[state.lang] && p[state.lang][name]) || p[name];
  }

  function categoryName(key) {
    return CATEGORIES[key] ? local(CATEGORIES[key]) : "";
  }

  function applyStaticTexts() {
    document.documentElement.lang = state.lang;
    document.title = t("meta.title");
    $('meta[name="description"]').content = t("meta.description");

    $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$("[data-i18n-placeholder]").forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    $$("[data-lang]").forEach((btn) => {
      const active = btn.dataset.lang === state.lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active);
    });
    const address = local(SHOP.address);
    $("#contact-address").textContent = address || "";
    $("#contact-address").hidden = !address;
  }

  function setLang(lang) {
    if (!LANGS.includes(lang) || lang === state.lang) return;
    state.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch (e) {
      /* хранилище недоступно */
    }
    applyStaticTexts();
    renderFilters();
    renderGrid();
    renderCart();
    if (state.openId !== null) fillModal(findProduct(state.openId));
  }

  /* ---------- Утилиты ---------- */

  function hasPrice(p) {
    return typeof p.price === "number" && p.price > 0;
  }

  function formatWeight(p) {
    return p.weight ? `${String(p.weight).replace(".", ",")} ${t("unit.gram")}` : "";
  }

  function formatPrice(value) {
    return value.toLocaleString("ru-RU") + " " + local(SHOP.currency);
  }

  // Цена товара (со старой ценой, если есть скидка) или «Цена по запросу»
  function priceHtml(p, sep) {
    if (!hasPrice(p)) return `<span class="price-request">${t("card.priceOnRequest")}</span>`;
    return formatPrice(p.price) + (p.oldPrice ? `${sep}<s>${formatPrice(p.oldPrice)}</s>` : "");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // Для поиска: регистр и разные варианты апострофа (o'/oʻ/o’) не важны
  function normalize(str) {
    return String(str).toLowerCase().replace(/[ʻʼ‘’`]/g, "'").replace(/ё/g, "е");
  }

  function findProduct(id) {
    return PRODUCTS.find((p) => p.id === id);
  }

  function telegramLink(text) {
    return "https://t.me/" + SHOP.telegram + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  function whatsappLink(text) {
    return "https://wa.me/" + SHOP.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  function productUrl(id) {
    return location.origin + location.pathname + "?lang=" + state.lang + "#product-" + id;
  }

  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2200);
  }

  /* ---------- Фильтры и каталог ---------- */

  function renderFilters() {
    const items = [["all", t("catalog.all")], ...Object.keys(CATEGORIES).map((key) => [key, categoryName(key)])];
    $("#filters").innerHTML = items
      .map(([key, label]) =>
        `<button class="filter${key === state.category ? " is-active" : ""}" role="tab" ` +
        `aria-selected="${key === state.category}" data-category="${key}">${escapeHtml(label)}</button>`)
      .join("");
  }

  function visibleProducts() {
    const q = normalize(state.query.trim());
    let list = PRODUCTS.filter((p) => {
      if (state.category !== "all" && p.category !== state.category) return false;
      if (!q) return true;
      // ищем сразу по всем языкам, чтобы находилось при любом выбранном
      const translations = LANGS.map((l) => p[l]).filter(Boolean);
      return [p, ...translations]
        .flatMap((src) => [src.name, src.material, src.stones, src.description])
        .concat(Object.values(CATEGORIES[p.category] || {}))
        .filter(Boolean)
        .some((text) => normalize(text).includes(q));
    });

    const sorters = {
      // товары без цены — всегда в конце
      "price-asc": (a, b) => (hasPrice(a) ? a.price : Infinity) - (hasPrice(b) ? b.price : Infinity),
      "price-desc": (a, b) => (hasPrice(b) ? b.price : -Infinity) - (hasPrice(a) ? a.price : -Infinity),
      new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0),
    };
    if (sorters[state.sort]) list = list.slice().sort(sorters[state.sort]);
    return list;
  }

  function cardHtml(p) {
    const soldOut = p.inStock === false;
    const name = escapeHtml(field(p, "name"));
    const details = [field(p, "material"), formatWeight(p), field(p, "stones")].filter(Boolean);
    const badges = [
      p.isNew ? `<span class="badge">${t("card.new")}</span>` : "",
      hasPrice(p) && p.oldPrice ? `<span class="badge badge--sale">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : "",
      soldOut ? `<span class="badge badge--muted">${t("card.soldOut")}</span>` : "",
    ].join("");

    return `
      <article class="card${soldOut ? " is-soldout" : ""}" data-id="${p.id}">
        <button class="card__media" data-open="${p.id}" aria-label="${escapeHtml(t("card.more", { name: field(p, "name") }))}">
          <img src="${p.images[0]}" alt="${name}" loading="lazy" />
          <div class="card__badges">${badges}</div>
        </button>
        <div class="card__body">
          <p class="card__category">${escapeHtml(categoryName(p.category))}</p>
          <h3 class="card__title"><button data-open="${p.id}">${name}</button></h3>
          <p class="card__material">${escapeHtml(details.join(" · "))}</p>
          <div class="card__footer">
            <p class="card__price">
              ${priceHtml(p, "\n")}
            </p>
            <button class="card__add" data-add="${p.id}" ${soldOut ? "disabled" : ""} aria-label="${t("card.add")}">+</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = visibleProducts();
    $("#grid").innerHTML = list.slice(0, state.shown).map(cardHtml).join("");
    $("#empty").hidden = list.length > 0;
    const rest = list.length - state.shown;
    $("#more").hidden = rest <= 0;
    $("#more").textContent = t("catalog.more", { count: rest });
  }

  // При смене фильтра, поиска или сортировки снова показываем первую страницу
  function resetGrid() {
    state.shown = PAGE_SIZE;
    renderGrid();
  }

  /* ---------- Карточка товара ---------- */

  let lastFocus = null;

  function fillModal(p) {
    const soldOut = p.inStock === false;
    const name = field(p, "name");

    $("#modal-category").textContent = categoryName(p.category);
    $("#modal-title").textContent = name;
    $("#modal-price").innerHTML = priceHtml(p, " ");
    $("#modal-desc").textContent = field(p, "description") || "";
    $("#modal-desc").hidden = !field(p, "description");

    const specs = [
      [t("modal.material"), field(p, "material")],
      [t("modal.weight"), formatWeight(p)],
      [t("modal.stones"), field(p, "stones")],
      [t("modal.stock"), soldOut ? t("modal.onOrder") : t("modal.inStock")],
    ];
    $("#modal-specs").innerHTML = specs
      .filter(([, v]) => v)
      .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`)
      .join("");

    $("#modal-image").alt = name;

    const addBtn = $("#modal-add");
    addBtn.dataset.add = p.id;
    addBtn.disabled = soldOut;
    addBtn.textContent = soldOut ? t("card.soldOut") : t("modal.add");

    const orderText = soldOut
      ? t("order.notify", { name })
      : hasPrice(p)
        ? t("order.one", { name, price: formatPrice(p.price) })
        : t("order.ask", { name });
    $("#modal-order").href = telegramLink(orderText + "\n" + productUrl(p.id));
    $("#modal-order").textContent = soldOut ? t("modal.notify") : t("modal.order");
  }

  function openModal(id) {
    const p = findProduct(id);
    if (!p) return;

    state.openId = id;
    fillModal(p);

    const image = $("#modal-image");
    image.src = p.images[0];
    $("#modal-thumbs").innerHTML = p.images.length > 1
      ? p.images.map((src, i) =>
          `<button class="thumb${i === 0 ? " is-active" : ""}" data-src="${src}"><img src="${src}" alt="" /></button>`).join("")
      : "";

    if (location.hash !== "#product-" + id) history.replaceState(null, "", "#product-" + id);

    if ($("#modal").hidden) lastFocus = document.activeElement;
    $("#modal").hidden = false;
    document.body.classList.add("no-scroll");
    $("#modal .modal__close").focus();
  }

  function closeModal() {
    state.openId = null;
    $("#modal").hidden = true;
    if (location.hash.startsWith("#product-")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    unlockScroll();
    if (lastFocus) lastFocus.focus();
  }

  function unlockScroll() {
    if ($("#modal").hidden && $("#cart").hidden) document.body.classList.remove("no-scroll");
  }

  // Ссылка вида index.html#product-3 сразу открывает товар
  function openFromHash() {
    const match = location.hash.match(/^#product-(\d+)$/);
    if (match && findProduct(Number(match[1]))) openModal(Number(match[1]));
  }

  async function shareProduct() {
    if (state.openId === null) return;
    const url = productUrl(state.openId);
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      // запасной вариант для старых браузеров и http
      const input = document.createElement("textarea");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    toast(t("modal.copied"));
  }

  /* ---------- Корзина ---------- */

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter((i) => findProduct(i.id) && i.qty > 0) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch (e) {
      /* хранилище недоступно — корзина живёт до перезагрузки */
    }
  }

  function addToCart(id) {
    const p = findProduct(id);
    if (!p || p.inStock === false) return;
    const item = state.cart.find((i) => i.id === id);
    if (item) item.qty += 1;
    else state.cart.push({ id, qty: 1 });
    saveCart();
    renderCart();
    toast(t("cart.added", { name: field(p, "name") }));
  }

  function changeQty(id, delta) {
    const item = state.cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) state.cart = state.cart.filter((i) => i.id !== id);
    saveCart();
    renderCart();
  }

  function orderMessage() {
    const lines = state.cart.map((i, n) => {
      const p = findProduct(i.id);
      const line = `${n + 1}. ${field(p, "name")} × ${i.qty}`;
      return hasPrice(p) ? `${line} — ${formatPrice(p.price * i.qty)}` : line;
    });
    return [t("order.many"), ...lines, `${t("cart.total")}: ${cartTotalText()}`].join("\n");
  }

  // Итог считается, только если у всех товаров в корзине есть цена
  function cartTotalText() {
    const items = state.cart.map((i) => ({ p: findProduct(i.id), qty: i.qty }));
    if (items.some(({ p }) => !hasPrice(p))) return t("cart.totalOnRequest");
    return formatPrice(items.reduce((sum, { p, qty }) => sum + p.price * qty, 0));
  }

  function renderCart() {
    const count = state.cart.reduce((sum, i) => sum + i.qty, 0);
    const counter = $("#cart-count");
    counter.textContent = count;
    counter.hidden = count === 0;

    $("#cart-list").innerHTML = state.cart.map((i) => {
      const p = findProduct(i.id);
      return `
        <li class="cart-item">
          <img src="${p.images[0]}" alt="" />
          <div class="cart-item__info">
            <p class="cart-item__name">${escapeHtml(field(p, "name"))}</p>
            <p class="cart-item__price">${priceHtml(p, " ")}</p>
            <div class="qty">
              <button data-qty="-1" data-id="${p.id}" aria-label="${t("cart.less")}">−</button>
              <span>${i.qty}</span>
              <button data-qty="1" data-id="${p.id}" aria-label="${t("cart.more")}">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-qty="${-i.qty}" data-id="${p.id}" aria-label="${t("cart.remove")}">&times;</button>
        </li>`;
    }).join("");

    const empty = state.cart.length === 0;
    $("#cart-empty").hidden = !empty;
    $("#cart-foot").hidden = empty;
    if (!empty) {
      const text = orderMessage();
      $("#cart-total").textContent = cartTotalText();
      $("#cart-telegram").href = telegramLink(text);
      if (SHOP.whatsapp) $("#cart-whatsapp").href = whatsappLink(text);
    }
  }

  function openCart() {
    $("#cart").hidden = false;
    document.body.classList.add("no-scroll");
    $("#cart .modal__close").focus();
  }

  function closeCart() {
    $("#cart").hidden = true;
    unlockScroll();
  }

  /* ---------- Контакты и шапка ---------- */

  // Кнопки контактов, которые не заполнены в config.js, скрываются
  function initContacts() {
    $("#contact-whatsapp").hidden = !SHOP.whatsapp;
    $("#cart-whatsapp").hidden = !SHOP.whatsapp;
    $("#contact-telegram").hidden = !SHOP.telegram;
    $("#cart-telegram").hidden = !SHOP.telegram;
    $("#contact-phone").hidden = !SHOP.phone;

    if (SHOP.whatsapp) $("#contact-whatsapp").href = whatsappLink();
    if (SHOP.telegram) $("#contact-telegram").href = telegramLink();
    if (SHOP.phone) {
      $("#contact-phone").href = "tel:" + SHOP.phone.replace(/[^\d+]/g, "");
      $("#contact-phone").textContent = SHOP.phone;
    }
    $("#year").textContent = new Date().getFullYear();
  }

  function initHeader() {
    const burger = $("#burger");
    const nav = $("#nav");
    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open);
    });
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
    const header = $(".header");
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- События ---------- */

  function bindEvents() {
    $("#filters").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-category]");
      if (!btn) return;
      state.category = btn.dataset.category;
      renderFilters();
      resetGrid();
    });

    $("#search").addEventListener("input", (e) => {
      state.query = e.target.value;
      resetGrid();
    });

    $("#sort").addEventListener("change", (e) => {
      state.sort = e.target.value;
      resetGrid();
    });

    $("#lang").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang]");
      if (btn) setLang(btn.dataset.lang);
    });

    document.addEventListener("click", (e) => {
      const open = e.target.closest("[data-open]");
      if (open) return openModal(Number(open.dataset.open));

      const add = e.target.closest("[data-add]");
      if (add && !add.disabled) return addToCart(Number(add.dataset.add));

      const thumb = e.target.closest(".thumb");
      if (thumb) {
        $("#modal-image").src = thumb.dataset.src;
        $$(".thumb").forEach((el) => el.classList.toggle("is-active", el === thumb));
        return;
      }

      const qty = e.target.closest("[data-qty]");
      if (qty) return changeQty(Number(qty.dataset.id), Number(qty.dataset.qty));

      if (e.target.closest("[data-close]")) return closeModal();
      if (e.target.closest("[data-cart-close]")) return closeCart();
    });

    $("#more").addEventListener("click", () => {
      state.shown += PAGE_SIZE;
      renderGrid();
    });
    $("#modal-share").addEventListener("click", shareProduct);
    $("#cart-open").addEventListener("click", openCart);
    $("#cart-clear").addEventListener("click", () => {
      state.cart = [];
      saveCart();
      renderCart();
    });

    window.addEventListener("hashchange", openFromHash);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#modal").hidden) closeModal();
      else if (!$("#cart").hidden) closeCart();
    });
  }

  applyStaticTexts();
  renderFilters();
  renderGrid();
  renderCart();
  initContacts();
  initHeader();
  bindEvents();
  openFromHash();
})();
