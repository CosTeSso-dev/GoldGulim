(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const CART_KEY = "aurum-cart";

  const state = {
    category: "all",
    query: "",
    sort: "default",
    cart: loadCart(),
  };

  /* ---------- Утилиты ---------- */

  function formatPrice(value) {
    return value.toLocaleString("ru-RU") + " " + SHOP.currency;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
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
    const items = [["all", "Все"], ...Object.entries(CATEGORIES)];
    $("#filters").innerHTML = items
      .map(([key, label]) =>
        `<button class="filter${key === state.category ? " is-active" : ""}" role="tab" ` +
        `aria-selected="${key === state.category}" data-category="${key}">${label}</button>`)
      .join("");
  }

  function visibleProducts() {
    const q = state.query.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (state.category !== "all" && p.category !== state.category) return false;
      if (!q) return true;
      return [p.name, p.material, p.stones, p.description, CATEGORIES[p.category]]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q));
    });

    const sorters = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0),
    };
    if (sorters[state.sort]) list = list.slice().sort(sorters[state.sort]);
    return list;
  }

  function cardHtml(p) {
    const soldOut = p.inStock === false;
    const badges = [
      p.isNew ? '<span class="badge">Новинка</span>' : "",
      p.oldPrice ? `<span class="badge badge--sale">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : "",
      soldOut ? '<span class="badge badge--muted">Нет в наличии</span>' : "",
    ].join("");

    return `
      <article class="card${soldOut ? " is-soldout" : ""}" data-id="${p.id}">
        <button class="card__media" data-open="${p.id}" aria-label="Подробнее: ${escapeHtml(p.name)}">
          <img src="${p.images[0]}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <div class="card__badges">${badges}</div>
        </button>
        <div class="card__body">
          <p class="card__category">${CATEGORIES[p.category] || ""}</p>
          <h3 class="card__title"><button data-open="${p.id}">${escapeHtml(p.name)}</button></h3>
          <p class="card__material">${escapeHtml(p.material)}${p.stones ? " · " + escapeHtml(p.stones) : ""}</p>
          <div class="card__footer">
            <p class="card__price">
              ${formatPrice(p.price)}
              ${p.oldPrice ? `<s>${formatPrice(p.oldPrice)}</s>` : ""}
            </p>
            <button class="card__add" data-add="${p.id}" ${soldOut ? "disabled" : ""} aria-label="Добавить в корзину">+</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = visibleProducts();
    $("#grid").innerHTML = list.map(cardHtml).join("");
    $("#empty").hidden = list.length > 0;
  }

  /* ---------- Карточка товара ---------- */

  let lastFocus = null;

  function openModal(id) {
    const p = findProduct(id);
    if (!p) return;
    const soldOut = p.inStock === false;

    $("#modal-category").textContent = CATEGORIES[p.category] || "";
    $("#modal-title").textContent = p.name;
    $("#modal-price").innerHTML = formatPrice(p.price) + (p.oldPrice ? ` <s>${formatPrice(p.oldPrice)}</s>` : "");
    $("#modal-desc").textContent = p.description;

    const specs = [["Материал", p.material], ["Камни", p.stones], ["Наличие", soldOut ? "Под заказ" : "В наличии"]];
    $("#modal-specs").innerHTML = specs
      .filter(([, v]) => v)
      .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`)
      .join("");

    const image = $("#modal-image");
    image.src = p.images[0];
    image.alt = p.name;
    $("#modal-thumbs").innerHTML = p.images.length > 1
      ? p.images.map((src, i) =>
          `<button class="thumb${i === 0 ? " is-active" : ""}" data-src="${src}"><img src="${src}" alt="" /></button>`).join("")
      : "";

    const addBtn = $("#modal-add");
    addBtn.dataset.add = p.id;
    addBtn.disabled = soldOut;
    addBtn.textContent = soldOut ? "Нет в наличии" : "В корзину";

    const orderText = `Здравствуйте! Хочу заказать: ${p.name} (${formatPrice(p.price)})`;
    $("#modal-order").href = telegramLink(orderText);
    $("#modal-order").textContent = soldOut ? "Узнать о поступлении" : "Заказать в 1 клик";

    lastFocus = document.activeElement;
    $("#modal").hidden = false;
    document.body.classList.add("no-scroll");
    $("#modal .modal__close").focus();
  }

  function closeModal() {
    $("#modal").hidden = true;
    unlockScroll();
    if (lastFocus) lastFocus.focus();
  }

  function unlockScroll() {
    if ($("#modal").hidden && $("#cart").hidden) document.body.classList.remove("no-scroll");
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
    toast(`«${p.name}» добавлен в корзину`);
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
      return `${n + 1}. ${p.name} × ${i.qty} — ${formatPrice(p.price * i.qty)}`;
    });
    return ["Здравствуйте! Хочу оформить заказ:", ...lines, `Итого: ${formatPrice(cartTotal())}`].join("\n");
  }

  function cartTotal() {
    return state.cart.reduce((sum, i) => sum + findProduct(i.id).price * i.qty, 0);
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
            <p class="cart-item__name">${escapeHtml(p.name)}</p>
            <p class="cart-item__price">${formatPrice(p.price)}</p>
            <div class="qty">
              <button data-qty="-1" data-id="${p.id}" aria-label="Уменьшить">−</button>
              <span>${i.qty}</span>
              <button data-qty="1" data-id="${p.id}" aria-label="Увеличить">+</button>
            </div>
          </div>
          <button class="cart-item__remove" data-qty="${-i.qty}" data-id="${p.id}" aria-label="Удалить">&times;</button>
        </li>`;
    }).join("");

    const empty = state.cart.length === 0;
    $("#cart-empty").hidden = !empty;
    $("#cart-foot").hidden = empty;
    if (!empty) {
      const text = orderMessage();
      $("#cart-total").textContent = formatPrice(cartTotal());
      $("#cart-telegram").href = telegramLink(text);
      $("#cart-whatsapp").href = whatsappLink(text);
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

  function initContacts() {
    $("#contact-whatsapp").href = whatsappLink();
    $("#contact-telegram").href = telegramLink();
    $("#contact-phone").href = "tel:" + SHOP.phone.replace(/[^\d+]/g, "");
    $("#contact-phone").textContent = SHOP.phone;
    $("#contact-address").textContent = SHOP.address;
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
      renderGrid();
    });

    $("#search").addEventListener("input", (e) => {
      state.query = e.target.value;
      renderGrid();
    });

    $("#sort").addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderGrid();
    });

    document.addEventListener("click", (e) => {
      const open = e.target.closest("[data-open]");
      if (open) return openModal(Number(open.dataset.open));

      const add = e.target.closest("[data-add]");
      if (add && !add.disabled) return addToCart(Number(add.dataset.add));

      const thumb = e.target.closest(".thumb");
      if (thumb) {
        $("#modal-image").src = thumb.dataset.src;
        document.querySelectorAll(".thumb").forEach((t) => t.classList.toggle("is-active", t === thumb));
        return;
      }

      const qty = e.target.closest("[data-qty]");
      if (qty) return changeQty(Number(qty.dataset.id), Number(qty.dataset.qty));

      if (e.target.closest("[data-close]")) return closeModal();
      if (e.target.closest("[data-cart-close]")) return closeCart();
    });

    $("#cart-open").addEventListener("click", openCart);
    $("#cart-clear").addEventListener("click", () => {
      state.cart = [];
      saveCart();
      renderCart();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#modal").hidden) closeModal();
      else if (!$("#cart").hidden) closeCart();
    });
  }

  renderFilters();
  renderGrid();
  renderCart();
  initContacts();
  initHeader();
  bindEvents();
})();
