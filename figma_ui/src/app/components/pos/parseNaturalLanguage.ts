import type { Product, ParsedItem } from "./types";

const ID_NUMBERS: Record<string, number> = {
  nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
  sebelas: 11,
  sebuah: 1, sebiji: 1, segelas: 1, secangkir: 1, sepotong: 1, seporsi: 1,
};

// Words to strip that carry no product-matching value
const STOP_WORDS = new Set([
  "tolong", "minta", "pesan", "tambah", "buat", "buatin", "kasih",
  "sama", "dengan", "dan", "plus", "juga", "ya", "dong", "dong",
  "saja", "aja", "lagi", "juga",
]);

const SEPARATORS = /\b(dan|sama|juga|plus|dengan)\b|[,&]/gi;

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreMatch(query: string, productName: string): number {
  const q = normalize(query);
  const p = normalize(productName);

  if (!q) return 0;
  if (q === p) return 1.0;
  if (p.startsWith(q)) return 0.95;
  if (p.includes(q)) return 0.88;
  if (q.includes(p)) return 0.82;

  const qWords = q.split(" ").filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  const pWords = p.split(" ");

  if (qWords.length === 0) return 0;

  let hits = 0;
  for (const qw of qWords) {
    if (pWords.some((pw) => pw.includes(qw) || qw.includes(pw))) {
      hits++;
    }
  }

  return (hits / qWords.length) * 0.75;
}

function extractLeadingQuantity(tokens: string[]): { qty: number; rest: string[] } {
  if (tokens.length === 0) return { qty: 1, rest: [] };

  const num = parseInt(tokens[0], 10);
  if (!isNaN(num) && num > 0) return { qty: num, rest: tokens.slice(1) };

  const wordNum = ID_NUMBERS[tokens[0]];
  if (wordNum !== undefined) return { qty: wordNum, rest: tokens.slice(1) };

  return { qty: 1, rest: tokens };
}

export function parseNaturalLanguage(input: string, products: Product[]): ParsedItem[] {
  const chunks = input
    .split(SEPARATORS)
    .map((c) => c.trim())
    .filter((c) => c.length > 0 && !c.match(/^(dan|sama|juga|plus|dengan)$/i));

  const results: ParsedItem[] = [];

  for (const chunk of chunks) {
    const tokens = normalize(chunk).split(" ").filter(Boolean);
    if (tokens.length === 0) continue;

    const { qty, rest } = extractLeadingQuantity(tokens);
    const meaningful = rest.filter((t) => !STOP_WORDS.has(t));
    const queryText = meaningful.join(" ");

    if (!queryText) continue;

    let bestScore = 0;
    let bestProduct: Product | null = null;

    for (const product of products) {
      const score = scoreMatch(queryText, product.name);
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }

    if (bestProduct && bestScore >= 0.25) {
      // Avoid duplicates: if same product already in results, increase quantity
      const existing = results.find((r) => r.product.id === bestProduct!.id);
      if (existing) {
        existing.quantity += Math.max(1, qty);
      } else {
        results.push({
          product: bestProduct,
          quantity: Math.max(1, qty),
          matchedText: chunk,
          confidence: bestScore >= 0.8 ? "high" : bestScore >= 0.5 ? "medium" : "low",
        });
      }
    }
  }

  return results;
}
