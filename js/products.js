/*
 * КАТАЛОГ ТОВАРОВ
 * ----------------
 * Чтобы добавить товар, скопируйте любой блок { ... } и измените поля:
 *   id          — уникальный номер (просто следующее число)
 *   name        — название
 *   category    — одна из категорий из списка CATEGORIES ниже
 *   price       — цена в сумах (число, без пробелов), например 3500000.
 *                 Пока цена не вписана (null), на сайте будет «Цена по запросу».
 *   oldPrice    — старая цена для скидки (необязательно, можно удалить строку)
 *   material    — металл / материал
 *   stones      — камни (необязательно)
 *   description — описание
 *   images      — список фотографий; первая показывается в каталоге.
 *                 Положите файлы в папку images/products/ и укажите путь.
 *   isNew       — true, если нужно показать метку «Новинка» (необязательно)
 *   inStock     — false, если товара нет в наличии (необязательно)
 *   uz          — перевод на узбекский: name, material, stones, description.
 *                 Если перевода нет, на узбекской версии покажется русский текст.
 */

// Категории: ключ — латиницей, затем название на русском и узбекском
const CATEGORIES = {
  rings: { ru: "Кольца", uz: "Uzuklar" },
  earrings: { ru: "Серьги", uz: "Sirg'alar" },
  necklaces: { ru: "Колье и подвески", uz: "Marjon va osmalar" },
  bracelets: { ru: "Браслеты", uz: "Bilaguzuklar" },
};

const PRODUCTS = [
  {
    id: 1,
    name: "Кольцо «Утренняя роса»",
    category: "rings",
    price: null,
    material: "Золото 585",
    stones: "Бриллиант 0,15 карат",
    description:
      "Изящное помолвочное кольцо с круглым бриллиантом в классической крапановой закрепке. Тонкая шинка подчёркивает блеск камня.",
    images: ["images/products/ring.svg", "images/products/ring-2.svg"],
    isNew: true,
    uz: {
      name: "«Ertalabki shabnam» uzugi",
      material: "585 probali oltin",
      stones: "Brilliant 0,15 karat",
      description:
        "Klassik kraponli mahkamlagichdagi dumaloq brilliantli nafis unashtiruv uzugi. Ingichka halqa toshning yaltirashini ta'kidlaydi.",
    },
  },
  {
    id: 2,
    name: "Серьги «Капли»",
    category: "earrings",
    price: null,
    material: "Серебро 925 с позолотой",
    stones: "Жемчуг пресноводный",
    description:
      "Лёгкие серьги-подвески с натуральным жемчугом. Подойдут и к вечернему платью, и к повседневному образу.",
    images: ["images/products/earrings.svg"],
    uz: {
      name: "«Tomchilar» sirg'alari",
      material: "Zarhal qoplangan 925 probali kumush",
      stones: "Chuchuk suv marvaridi",
      description:
        "Tabiiy marvaridli yengil osma sirg'alar. Kechki ko'ylakka ham, kundalik obrazga ham mos keladi.",
    },
  },
  {
    id: 3,
    name: "Подвеска «Сердце»",
    category: "necklaces",
    price: null,
    material: "Серебро 925",
    stones: "Фианит",
    description:
      "Нежная подвеска в форме сердца на тонкой цепочке длиной 45 см. Отличный подарок близкому человеку.",
    images: ["images/products/necklace.svg"],
    uz: {
      name: "«Yurak» osmasi",
      material: "925 probali kumush",
      stones: "Fianit",
      description:
        "45 sm uzunlikdagi ingichka zanjirga taqilgan yurak shaklidagi nozik osma. Yaqin insonga ajoyib sovg'a.",
    },
  },
  {
    id: 4,
    name: "Браслет «Звенья»",
    category: "bracelets",
    price: null,
    material: "Золото 585",
    description:
      "Массивный браслет из полированных звеньев с надёжным замком-карабином. Длина 18 см.",
    images: ["images/products/bracelet.svg"],
    uz: {
      name: "«Halqalar» bilaguzugi",
      material: "585 probali oltin",
      description:
        "Ishonchli karabin qulfli, sayqallangan halqalardan iborat yirik bilaguzuk. Uzunligi 18 sm.",
    },
  },
  {
    id: 5,
    name: "Кольцо «Изумрудный сад»",
    category: "rings",
    price: null,
    material: "Белое золото 585",
    stones: "Изумруд, бриллианты",
    description:
      "Кольцо с насыщенно-зелёным изумрудом огранки «овал» в обрамлении россыпи мелких бриллиантов.",
    images: ["images/products/ring-2.svg", "images/products/ring.svg"],
    uz: {
      name: "«Zumrad bog'» uzugi",
      material: "585 probali oq oltin",
      stones: "Zumrad, brilliantlar",
      description:
        "Mayda brilliantlar bilan o'ralgan «oval» kesimli to'q yashil zumradli uzuk.",
    },
  },
  {
    id: 6,
    name: "Колье «Жемчужная нить»",
    category: "necklaces",
    price: null,
    material: "Серебро 925",
    stones: "Жемчуг пресноводный",
    description:
      "Классическое колье из подобранного вручную жемчуга. Длина 42 см, застёжка из серебра.",
    images: ["images/products/necklace.svg"],
    inStock: false,
    uz: {
      name: "«Marvarid shodasi» marjoni",
      material: "925 probali kumush",
      stones: "Chuchuk suv marvaridi",
      description:
        "Qo'lda saralangan marvaridlardan klassik marjon. Uzunligi 42 sm, qisqichi kumushdan.",
    },
  },
];
