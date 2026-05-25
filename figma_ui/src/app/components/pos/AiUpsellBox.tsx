import { Sparkles, X, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { UpsellSuggestion } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

interface AiUpsellBoxProps {
  suggestion: UpsellSuggestion;
  onAddToCart: (productId: string) => void;
  onDismiss: () => void;
}

export function AiUpsellBox({ suggestion, onAddToCart, onDismiss }: AiUpsellBoxProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative rounded-xl p-[1px] mt-3"
        style={{
          background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)",
        }}
      >
        {/* Inner panel */}
        <div className="rounded-[11px] bg-violet-50 px-4 py-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100">
                <Sparkles className="w-3 h-3 text-violet-600" />
              </div>
              <span className="text-xs text-violet-700 tracking-wide uppercase"
                style={{ fontWeight: 600, letterSpacing: "0.06em" }}>
                AI Suggestion
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="w-5 h-5 flex items-center justify-center rounded-full text-violet-400 hover:bg-violet-100 hover:text-violet-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Reason text */}
          <p className="text-xs text-violet-600/80 mb-3 leading-relaxed">
            {suggestion.reason}{" "}
            <span className="text-violet-700" style={{ fontWeight: 500 }}>
              {suggestion.product.name}
            </span>
            :
          </p>

          {/* Product recommendation card */}
          <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 shadow-sm border border-violet-100">
            {/* Emoji avatar */}
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-lg">
              {suggestion.product.emoji}
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }}>
                {suggestion.product.name}
              </p>
              <p className="text-xs text-violet-600" style={{ fontWeight: 600 }}>
                {formatPrice(suggestion.product.price)}
              </p>
            </div>

            {/* Add button */}
            <button
              onClick={() => onAddToCart(suggestion.product.id)}
              className="flex-shrink-0 flex items-center gap-1 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
