import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowRight, Check, X, CornerDownLeft, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseNaturalLanguage } from "./parseNaturalLanguage";
import { PRODUCTS } from "./mockData";
import type { ParsedItem } from "./types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

const CONFIDENCE_COLOR: Record<ParsedItem["confidence"], string> = {
  high: "bg-emerald-400",
  medium: "bg-amber-400",
  low: "bg-red-400",
};

const EXAMPLES = [
  "2 kopi susu dan 1 croissant",
  "tiga americano sama banana bread",
  "satu matcha latte dan dua kentang",
];

interface SmartCommandBarProps {
  onConfirm: (items: ParsedItem[]) => void;
}

export function SmartCommandBar({ onConfirm }: SmartCommandBarProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "parsing" | "result" | "empty" | "error">("idle");
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [exampleIdx, setExampleIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(id);
  }, []);

  const handleParse = () => {
    if (!input.trim()) return;
    setStatus("parsing");
    setParsed([]);

    // Simulated processing delay (mimics async AI call)
    setTimeout(() => {
      try {
        const results = parseNaturalLanguage(input, PRODUCTS);
        if (results.length === 0) {
          setStatus("empty");
        } else {
          setParsed(results);
          setStatus("result");
        }
      } catch {
        setStatus("error");
      }
    }, 750);
  };

  const handleConfirm = () => {
    onConfirm(parsed);
    setInput("");
    setStatus("idle");
    setParsed([]);
    inputRef.current?.focus();
  };

  const handleCancel = () => {
    setStatus("idle");
    setParsed([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleParse();
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Input row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setStatus("idle"); }}
          onKeyDown={handleKeyDown}
          placeholder={status === "idle" ? `Contoh: "${EXAMPLES[exampleIdx]}"` : ""}
          disabled={status === "parsing"}
          className="flex-1 text-sm text-gray-700 placeholder:text-gray-300 bg-transparent outline-none disabled:opacity-50"
        />

        <AnimatePresence mode="wait">
          {status === "parsing" ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 text-xs text-violet-500"
              style={{ fontWeight: 500 }}
            >
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 h-1 rounded-full bg-violet-400 block"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
              Memproses...
            </motion.div>
          ) : input.trim() ? (
            <motion.button
              key="enter"
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              onClick={handleParse}
              className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
              style={{ fontWeight: 600 }}
            >
              <CornerDownLeft className="w-3 h-3" />
              Enter
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Result / feedback panel */}
      <AnimatePresence>
        {status === "result" && parsed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-2">
              <p className="text-xs text-gray-400 mb-2" style={{ fontWeight: 500 }}>
                Hasil parsing — konfirmasi sebelum ditambahkan:
              </p>

              {parsed.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <span className="text-base">{item.product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-800 truncate" style={{ fontWeight: 500 }}>
                        {item.quantity > 1 && (
                          <span className="text-violet-600 mr-1">{item.quantity}×</span>
                        )}
                        {item.product.name}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CONFIDENCE_COLOR[item.confidence]}`}
                        title={`Kecocokan: ${item.confidence}`}
                      />
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2 text-sm transition-colors cursor-pointer"
                  style={{ fontWeight: 600 }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Tambah ke Keranjang
                </button>
                <button
                  onClick={handleCancel}
                  className="w-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {(status === "empty" || status === "error") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                {status === "empty"
                  ? "Tidak ada produk yang cocok. Coba kata kunci lain."
                  : "Gagal memproses. Coba lagi."}
              </span>
              <button
                onClick={handleCancel}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
