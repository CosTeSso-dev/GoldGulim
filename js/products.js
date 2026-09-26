/*
 * КАТАЛОГ ТОВАРОВ
 * ----------------
 * Чтобы добавить товар, скопируйте любой блок { ... } и измените поля:
 *   id          — уникальный номер (просто следующее число)
 *   name        — название
 *   category    — одна из категорий из списка CATEGORIES ниже
 *   price       — цена в сумах (число, без пробелов)
 *   oldPrice    — старая цена для скидки (необязательно, можно удалить строку)
 *   material    — металл / материал
 *   stones      — камни (необязательно)
 *   description — описание
 *   images      — список фотографий; первая показывается в каталоге.
 *                 Положите файлы в папку images/products/ и укажите путь.
 *   isNew       — true, если нужно показать метку «Новинка» (необязательно)
 *   inStock     — false, если товара нет в наличии (необязательно)
 */

const CATEGORIES = {
  rings: "Кольца",
  earrings: "Серьги",
  necklaces: "Колье и подвески",
  bracelets: "Браслеты",
};

const PRODUCTS = [
  {
    id: 1,
    name: "Кольцо «Утренняя роса»",
    category: "rings",
    price: 3486000,
    material: "Золото 585",
    stones: "Бриллиант 0,15 карат",
    description:
      "Изящное помолвочное кольцо с круглым бриллиантом в классической крапановой закрепке. Тонкая шинка подчёркивает блеск камня.",
    images: ["images/products/ring.svg", "images/products/ring-2.svg"],
    isNew: true,
  },
  {
    id: 2,
    name: "Серьги «Капли»",
    category: "earrings",
    price: 2590000,
    oldPrice: 2940000,
    material: "Серебро 925 с позолотой",
    stones: "Жемчуг пресноводный",
    description:
      "Лёгкие серьги-подвески с натуральным жемчугом. Подойдут и к вечернему платью, и к повседневному образу.",
    images: ["images/products/earrings.svg"],
  },
  {
    id: 3,
    name: "Подвеска «Сердце»",
    category: "necklaces",
    price: 1806000,
    material: "Серебро 925",
    stones: "Фианит",
    description:
      "Нежная подвеска в форме сердца на тонкой цепочке длиной 45 см. Отличный подарок близкому человеку.",
    images: ["images/products/necklace.svg"],
  },
  {
    id: 4,
    name: "Браслет «Звенья»",
    category: "bracelets",
    price: 4480000,
    material: "Золото 585",
    description:
      "Массивный браслет из полированных звеньев с надёжным замком-карабином. Длина 18 см.",
    images: ["images/products/bracelet.svg"],
  },
  {
    id: 5,
    name: "Кольцо «Изумрудный сад»",
    category: "rings",
    price: 6398000,
    material: "Белое золото 585",
    stones: "Изумруд, бриллианты",
    description:
      "Кольцо с насыщенно-зелёным изумрудом огранки «овал» в обрамлении россыпи мелких бриллиантов.",
    images: ["images/products/ring-2.svg", "images/products/ring.svg"],
  },
  {
    id: 6,
    name: "Колье «Жемчужная нить»",
    category: "necklaces",
    price: 3836000,
    material: "Серебро 925",
    stones: "Жемчуг пресноводный",
    description:
      "Классическое колье из подобранного вручную жемчуга. Длина 42 см, застёжка из серебра.",
    images: ["images/products/necklace.svg"],
    inStock: false,
  },
];
