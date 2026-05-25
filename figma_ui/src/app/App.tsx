import { useState } from "react";
import { CartPanel } from "./components/pos/CartPanel";
import { ProductGrid } from "./components/pos/ProductGrid";
import { SmartCommandBar } from "./components/pos/SmartCommandBar";
import { UpsellRulesEditor } from "./components/pos/UpsellRulesEditor";
import { PRODUCTS, INITIAL_UPSELL_RULES } from "./components/pos/mockData";
import type { CartItem, Product, UpsellRule, ParsedItem } from "./components/pos/types";

let idCounter = 0;
function genId() {
  return `cart-${++idCounter}`;
}

export default function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: genId(),
      productId: "p1",
      name: "Kopi Susu Gula Aren",
      quantity: 1,
      basePrice: 32000,
      modifiers: [{ id: "m1", name: "Less Sugar", price: 0 }],
    },
  ]);

  const [upsellRules, setUpsellRules] = useState<UpsellRule[]>(INITIAL_UPSELL_RULES);
  const [rulesEditorOpen, setRulesEditorOpen] = useState(false);

  const addToCart = (product: Product, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.modifiers.length === 0
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...prev,
        {
          id: genId(),
          productId: product.id,
          name: product.name,
          quantity: qty,
          basePrice: product.price,
          modifiers: [],
        },
      ];
    });
  };

  const handleAddProduct = (productOrId: Product | string) => {
    const product =
      typeof productOrId === "string"
        ? PRODUCTS.find((p) => p.id === productOrId)
        : productOrId;
    if (product) addToCart(product);
  };

  const handleCommandConfirm = (items: ParsedItem[]) => {
    for (const item of items) {
      addToCart(item.product, item.quantity);
    }
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemove = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  return (
    <div className="size-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Top nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs" style={{ fontWeight: 700 }}>
              ☕
            </span>
          </div>
          <span className="text-gray-900" style={{ fontWeight: 700 }}>
            KasirKu POS
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
            <span className="text-xs text-violet-700" style={{ fontWeight: 600 }}>
              AS
            </span>
          </div>
          <span>Andi · Kasir</span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden min-h-0">
        {/* Left: Product menu */}
        <div className="flex-1 overflow-hidden min-w-0">
          <ProductGrid onAddToCart={handleAddProduct} />
        </div>

        {/* Right: Smart Command Bar + Cart */}
        <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col gap-3 min-h-0">
          <SmartCommandBar onConfirm={handleCommandConfirm} />
          <div className="flex-1 min-h-0">
            <CartPanel
              items={cartItems}
              upsellRules={upsellRules}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              onAddProduct={handleAddProduct}
              onOpenRulesEditor={() => setRulesEditorOpen(true)}
            />
          </div>
        </div>
      </div>

      {/* Upsell Rules Editor Sheet */}
      <UpsellRulesEditor
        open={rulesEditorOpen}
        onOpenChange={setRulesEditorOpen}
        rules={upsellRules}
        onRulesChange={setUpsellRules}
      />
    </div>
  );
}
