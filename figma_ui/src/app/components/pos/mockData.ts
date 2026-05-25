import type { Product, UpsellRule } from "./types";

export const PRODUCTS: Product[] = [
  { id: "p1",  name: "Kopi Susu Gula Aren", price: 32000, category: "Minuman", emoji: "☕" },
  { id: "p2",  name: "Americano",           price: 28000, category: "Minuman", emoji: "🖤" },
  { id: "p3",  name: "Matcha Latte",        price: 35000, category: "Minuman", emoji: "🍵" },
  { id: "p4",  name: "Es Teh Tarik",        price: 18000, category: "Minuman", emoji: "🧋" },
  { id: "p5",  name: "Croissant Butter",    price: 25000, category: "Makanan", emoji: "🥐" },
  { id: "p6",  name: "Banana Bread",        price: 22000, category: "Makanan", emoji: "🍞" },
  { id: "p7",  name: "Kentang Goreng",      price: 20000, category: "Makanan", emoji: "🍟" },
  { id: "p8",  name: "Roti Bakar Keju",     price: 18000, category: "Makanan", emoji: "🧀" },
  { id: "p9",  name: "Cheesecake",          price: 38000, category: "Dessert", emoji: "🎂" },
  { id: "p10", name: "Tiramisu",            price: 42000, category: "Dessert", emoji: "🍮" },
];

export const CATEGORIES = ["Semua", "Minuman", "Makanan", "Dessert"];

export const INITIAL_UPSELL_RULES: UpsellRule[] = [
  { id: "r1", triggerProductId: "p1", recommendedProductId: "p5" },
  { id: "r2", triggerProductId: "p2", recommendedProductId: "p5" },
  { id: "r3", triggerProductId: "p3", recommendedProductId: "p9" },
  { id: "r4", triggerProductId: "p7", recommendedProductId: "p4" },
];
