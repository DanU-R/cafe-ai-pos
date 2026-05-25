import { useState } from "react";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { PRODUCTS, CATEGORIES } from "./mockData";
import type { Product } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(price);
}

interface ProductGridProps {
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ onAddToCart }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter((p) => {
    const matchCat = activeCategory === "Semua" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-gray-400 transition-colors">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Cari menu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
              activeCategory === cat
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
            }`}
            style={{ fontWeight: activeCategory === cat ? 600 : 400 }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 pb-2">
        {filtered.map((product) => (
          <motion.button
            key={product.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => onAddToCart(product)}
            className="group flex flex-col items-start bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl mb-3 group-hover:bg-gray-100 transition-colors">
              {product.emoji}
            </div>
            <p className="text-sm text-gray-800 leading-tight mb-1" style={{ fontWeight: 500 }}>
              {product.name}
            </p>
            <p className="text-xs text-gray-900" style={{ fontWeight: 700 }}>
              {formatPrice(product.price)}
            </p>
          </motion.button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center text-gray-400 gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-sm">Produk tidak ditemukan</p>
          </div>
        )}
      </div>
    </div>
  );
}
