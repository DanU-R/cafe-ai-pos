import { useState } from "react";
import { Trash2, Minus, Plus, ShoppingBag, Receipt, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { AiUpsellBox } from "./AiUpsellBox";
import { PRODUCTS } from "./mockData";
import type { CartItem, UpsellRule } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function itemTotal(item: CartItem) {
  const modTotal = item.modifiers.reduce((s, m) => s + m.price, 0);
  return (item.basePrice + modTotal) * item.quantity;
}

interface CartPanelProps {
  items: CartItem[];
  upsellRules: UpsellRule[];
  onQuantityChange: (itemId: string, delta: number) => void;
  onRemove: (itemId: string) => void;
  onAddProduct: (productId: string) => void;
  onOpenRulesEditor: () => void;
}

export function CartPanel({
  items,
  upsellRules,
  onQuantityChange,
  onRemove,
  onAddProduct,
  onOpenRulesEditor,
}: CartPanelProps) {
  const [dismissedRuleId, setDismissedRuleId] = useState<string | null>(null);

  const subtotal = items.reduce((s, item) => s + itemTotal(item), 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;

  // Derive active upsell from dynamic rules
  const activeRule = items
    .slice()
    .reverse()
    .map((item) => upsellRules.find((r) => r.triggerProductId === item.productId))
    .find((r) => r && r.id !== dismissedRuleId);

  const upsellSuggestion = (() => {
    if (!activeRule) return null;
    const triggerProduct = PRODUCTS.find((p) => p.id === activeRule.triggerProductId);
    const recommended = PRODUCTS.find((p) => p.id === activeRule.recommendedProductId);
    if (!triggerProduct || !recommended || triggerProduct.id === recommended.id) return null;
    return {
      product: recommended,
      reason: `Pelanggan yang memesan ${triggerProduct.name} sering menambah`,
      triggerProductName: triggerProduct.name,
    };
  })();

  const handleAddUpsell = (productId: string) => {
    setDismissedRuleId(null);
    onAddProduct(productId);
  };

  // Reset dismiss when items change significantly
  const itemIds = items.map((i) => i.id).join(",");
  const [prevItemIds, setPrevItemIds] = useState(itemIds);
  if (itemIds !== prevItemIds) {
    setPrevItemIds(itemIds);
    setDismissedRuleId(null);
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-gray-500" />
          <h2 className="text-gray-900" style={{ fontWeight: 600 }}>
            Pesanan
          </h2>
          {items.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {items.reduce((s, i) => s + i.quantity, 0)} item
            </span>
          )}
        </div>
        <button
          onClick={onOpenRulesEditor}
          title="Atur aturan AI Upsell"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Cart body */}
      <ScrollArea className="flex-1 px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Keranjang masih kosong</p>
            <p className="text-xs text-gray-300">
              Pilih produk atau ketik perintah di atas
            </p>
          </div>
        ) : (
          <div className="py-3">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex items-start gap-3 py-3 px-1 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-shrink-0">
                    <button
                      onClick={() => onQuantityChange(item.id, -1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <motion.span
                      key={item.quantity}
                      initial={{ scale: 1.4, color: "#7c3aed" }}
                      animate={{ scale: 1, color: "#1f2937" }}
                      transition={{ duration: 0.2 }}
                      className="w-5 text-center text-sm"
                      style={{ fontWeight: 600 }}
                    >
                      {item.quantity}
                    </motion.span>
                    <button
                      onClick={() => onQuantityChange(item.id, 1)}
                      className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }}>
                      {item.name}
                    </p>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Price + remove */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm text-gray-800" style={{ fontWeight: 600 }}>
                      {formatPrice(itemTotal(item))}
                    </span>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* AI Upsell Box */}
            <AnimatePresence>
              {upsellSuggestion && (
                <AiUpsellBox
                  suggestion={upsellSuggestion}
                  onAddToCart={handleAddUpsell}
                  onDismiss={() => setDismissedRuleId(activeRule?.id ?? null)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Order summary + checkout */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 px-5 py-4 space-y-3 flex-shrink-0"
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>PPN 11%</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-gray-900" style={{ fontWeight: 700 }}>
                <span>Total</span>
                <motion.span
                  key={total}
                  initial={{ scale: 1.06, color: "#7c3aed" }}
                  animate={{ scale: 1, color: "#111827" }}
                  transition={{ duration: 0.25 }}
                  className="text-lg"
                >
                  {formatPrice(total)}
                </motion.span>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 active:bg-black text-white rounded-xl py-3.5 transition-colors cursor-pointer">
              <Receipt className="w-4 h-4" />
              <span style={{ fontWeight: 600 }}>Proses Pembayaran</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
