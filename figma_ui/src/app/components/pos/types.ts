export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  basePrice: number;
  modifiers: Modifier[];
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description?: string;
}

export interface UpsellSuggestion {
  product: Product;
  reason: string;
  triggerProductName: string;
}

export interface UpsellRule {
  id: string;
  triggerProductId: string;
  recommendedProductId: string;
}

export interface ParsedItem {
  product: Product;
  quantity: number;
  matchedText: string;
  confidence: "high" | "medium" | "low";
}
