import { useState } from "react";
import { Plus, Trash2, ArrowRight, Settings2, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../ui/sheet";
import { ScrollArea } from "../ui/scroll-area";
import { PRODUCTS } from "./mockData";
import type { UpsellRule } from "./types";

let ruleIdCounter = 100;
function genRuleId() {
  return `r${++ruleIdCounter}`;
}

interface UpsellRulesEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rules: UpsellRule[];
  onRulesChange: (rules: UpsellRule[]) => void;
}

export function UpsellRulesEditor({
  open,
  onOpenChange,
  rules,
  onRulesChange,
}: UpsellRulesEditorProps) {
  const [draft, setDraft] = useState<UpsellRule[]>(rules);

  // Sync draft when sheet opens
  const handleOpenChange = (v: boolean) => {
    if (v) setDraft(rules);
    onOpenChange(v);
  };

  const handleSave = () => {
    onRulesChange(draft);
    onOpenChange(false);
  };

  const updateRule = (id: string, field: keyof Omit<UpsellRule, "id">, value: string) => {
    setDraft((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const addRule = () => {
    setDraft((prev) => [
      ...prev,
      { id: genRuleId(), triggerProductId: PRODUCTS[0].id, recommendedProductId: PRODUCTS[4].id },
    ]);
  };

  const deleteRule = (id: string) => {
    setDraft((prev) => prev.filter((r) => r.id !== id));
  };

  const getProduct = (id: string) => PRODUCTS.find((p) => p.id === id);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <SheetTitle className="text-gray-900">Aturan AI Upsell</SheetTitle>
          </div>
          <SheetDescription className="text-gray-400 text-xs leading-relaxed">
            Tentukan produk mana yang memicu rekomendasi upsell secara otomatis saat ada di keranjang.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-3">
            {draft.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center text-gray-400">
                <Settings2 className="w-8 h-8 text-gray-200" />
                <p className="text-sm">Belum ada aturan upsell</p>
                <p className="text-xs">Tambahkan aturan di bawah</p>
              </div>
            ) : (
              draft.map((rule, idx) => {
                const trigger = getProduct(rule.triggerProductId);
                const recommended = getProduct(rule.recommendedProductId);
                return (
                  <div
                    key={rule.id}
                    className="bg-gray-50 rounded-xl p-3 space-y-3 border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400" style={{ fontWeight: 500 }}>
                        Aturan #{idx + 1}
                      </span>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Trigger selector */}
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Jika keranjang berisi:</p>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                            {trigger?.emoji}
                          </span>
                          <select
                            value={rule.triggerProductId}
                            onChange={(e) => updateRule(rule.id, "triggerProductId", e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-violet-400 transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            {PRODUCTS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-4" />

                      {/* Recommended selector */}
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 mb-1">Rekomendasikan:</p>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
                            {recommended?.emoji}
                          </span>
                          <select
                            value={rule.recommendedProductId}
                            onChange={(e) =>
                              updateRule(rule.id, "recommendedProductId", e.target.value)
                            }
                            className="w-full pl-8 pr-3 py-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-violet-400 transition-colors"
                            style={{ fontWeight: 500 }}
                          >
                            {PRODUCTS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    {trigger && recommended && trigger.id !== recommended.id && (
                      <p className="text-xs text-violet-500 bg-violet-50 rounded-lg px-2.5 py-1.5 leading-relaxed">
                        Saat <strong>{trigger.name}</strong> ada di keranjang → tampilkan{" "}
                        <strong>{recommended.name}</strong> sebagai saran AI.
                      </p>
                    )}
                    {trigger?.id === recommended?.id && (
                      <p className="text-xs text-amber-500 bg-amber-50 rounded-lg px-2.5 py-1.5">
                        Produk trigger dan rekomendasi tidak boleh sama.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={addRule}
            className="mt-4 w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-violet-400 hover:bg-violet-50 text-gray-500 hover:text-violet-600 rounded-xl py-3 text-sm transition-colors cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-4 h-4" />
            Tambah Aturan Baru
          </button>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm transition-colors cursor-pointer"
            style={{ fontWeight: 600 }}
          >
            Simpan Aturan
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
