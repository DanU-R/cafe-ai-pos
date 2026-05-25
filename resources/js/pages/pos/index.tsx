import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Minus, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PinAuthorizationModal from '@/components/pin-authorization-modal';
import ReceiptTemplate, { ReceiptOrder } from '@/components/pos/ReceiptTemplate';
import AppLayout from '@/layouts/app-layout';

type Category = { id: number; name: string };

type ProductModifier = {
    id: number;
    product_id: number;
    name: string;
    price: string;
};

type Product = {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: string;
    stock: number;
    minimum_stock: number;
    is_active: boolean;
    category: Category;
    modifiers?: ProductModifier[];
};

type CartItem = {
    id: string;
    product: Product;
    qty: number;
    modifiers: ProductModifier[];
};

type DiningTable = {
    id: number;
    name: string;
    capacity: number;
    status: string;
};

type Customer = {
    id: number;
    name: string;
    phone: string | null;
    points: number;
};

type CheckoutSuccess = { order_code: string } | null;

type ParsedCartItem = {
    product_id: number;
    quantity: number;
    modifier_ids: number[];
};

type AiUpsellRecommendation = {
    product_id: number;
    reason: string;
};

type PosSettings = {
    tax_percent: string;
    service_charge_percent: string;
    qris_base_string: string;
};

type Props = {
    categories: Category[];
    products: Product[];
    diningTables: DiningTable[];
    customers: Customer[];
    settings: PosSettings;
    checkoutSuccess?: CheckoutSuccess;
};

type PageProps = {
    auth?: {
        user?: {
            name?: string;
        };
    };
};

const RECEIPT_SNAPSHOT_KEY = 'pos.receiptSnapshot';

function rupiahAmount(value: number | string | null | undefined): number {
    return Math.round(Number(value ?? 0));
}

function formatRupiah(value: number | string) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(rupiahAmount(value));
}

function getCategoryIcon(category: Category): string {
    const label = category.name.toLowerCase();

    if (/(coffee|kopi)/.test(label)) {
        return '☕';
    }

    if (/(non-coffee|minuman|drink|tea|teh|juice|jus|susu)/.test(label)) {
        return '🥤';
    }

    if (/(pastry|roti|bread|croissant)/.test(label)) {
        return '🥐';
    }

    if (/(snack|kentang|fries|chips|gorengan)/.test(label)) {
        return '🍟';
    }

    if (/(dessert|cake|kue|puding|pudding)/.test(label)) {
        return '🍰';
    }

    if (/(food|makanan|pasta|mie|nasi)/.test(label)) {
        return '🍝';
    }

    return '🍽️';
}

export default function PosIndex({ categories, products, diningTables, customers, settings, checkoutSuccess }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
    const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
    const [smartCommand, setSmartCommand] = useState('');
    const [smartCommandError, setSmartCommandError] = useState<string | null>(null);
    const [isParsingSmartCommand, setIsParsingSmartCommand] = useState(false);
    const [upsellRecommendations, setUpsellRecommendations] = useState<AiUpsellRecommendation[]>([]);
    const [isLoadingUpsellRecommendations, setIsLoadingUpsellRecommendations] = useState(false);
    const [lastCompletedOrder, setLastCompletedOrder] = useState<ReceiptOrder | null>(null);
    const page = usePage<PageProps>();

    const form = useForm({
        paid_amount: '',
        discount_amount: '',
        service_type: 'takeaway',
        dining_table_id: '',
        customer_id: '',
        customer_name: '',
        tax_percent: settings.tax_percent,
        service_charge_percent: settings.service_charge_percent,
        payments: [{ method: 'cash', amount: '', reference: '' }],
        manager_pin: '',
        items: [] as { product_id: number; qty: number; modifier_ids?: number[] }[],
    });

    const filteredProducts = useMemo(() => {
        if (selectedCategoryId === 'all') {
            return products;
        }

        return products.filter((product) => product.category_id === selectedCategoryId);
    }, [products, selectedCategoryId]);

    const cartProductIds = useMemo(
        () => Array.from(new Set(cart.map((item) => item.product.id))).sort((a, b) => a - b),
        [cart],
    );
    const cartProductIdKey = cartProductIds.join(':');
    const cartProductIdSet = useMemo(() => new Set(cartProductIds), [cartProductIdKey]);
    const visibleUpsellRecommendations = upsellRecommendations.filter(
        (recommendation) => !cartProductIdSet.has(recommendation.product_id),
    );

    const subtotal = rupiahAmount(cart.reduce((sum, item) => sum + cartItemUnitPrice(item) * item.qty, 0));
    const discountAmount = Math.min(rupiahAmount(form.data.discount_amount || 0), subtotal);
    const taxableAmount = Math.max(rupiahAmount(subtotal - discountAmount), 0);
    const taxAmount = rupiahAmount((taxableAmount * Number(form.data.tax_percent || 0)) / 100);
    const serviceChargeAmount = rupiahAmount((taxableAmount * Number(form.data.service_charge_percent || 0)) / 100);
    const total = Math.max(rupiahAmount(taxableAmount + taxAmount + serviceChargeAmount), 0);
    const paidAmount = rupiahAmount(form.data.payments.reduce((sum, payment) => sum + rupiahAmount(payment.amount || 0), 0));
    const changeAmount = Math.max(rupiahAmount(paidAmount - total), 0);
    const qrisPaymentAmount = rupiahAmount(
        form.data.payments
            .filter((payment) => payment.method === 'qris')
            .reduce((sum, payment) => sum + rupiahAmount(payment.amount || 0), 0),
    );
    const qrisDynamicString = useMemo(
        () => generateQrisDynamicString(settings.qris_base_string, qrisPaymentAmount || total),
        [settings.qris_base_string, qrisPaymentAmount, total],
    );

    useEffect(() => {
        if (cartProductIds.length === 0) {
            setUpsellRecommendations([]);
            setIsLoadingUpsellRecommendations(false);

            return;
        }

        const abortController = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setIsLoadingUpsellRecommendations(true);

            try {
                const response = await fetch('/api/pos/upsell-recommendations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ cart_product_ids: cartProductIds }),
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    setUpsellRecommendations([]);

                    return;
                }

                const data = (await response.json()) as { recommendations?: AiUpsellRecommendation[] };

                setUpsellRecommendations(
                    (data.recommendations ?? [])
                        .filter((recommendation) => !cartProductIdSet.has(recommendation.product_id))
                        .slice(0, 2),
                );
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    setUpsellRecommendations([]);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoadingUpsellRecommendations(false);
                }
            }
        }, 1000);

        return () => {
            abortController.abort();
            window.clearTimeout(timeoutId);
        };
    }, [cartProductIdKey, products]);

    useEffect(() => {
        if (!checkoutSuccess?.order_code) {
            return;
        }

        const storedSnapshot = window.sessionStorage.getItem(RECEIPT_SNAPSHOT_KEY);

        if (!storedSnapshot) {
            return;
        }

        try {
            const snapshot = JSON.parse(storedSnapshot) as ReceiptOrder;
            setLastCompletedOrder({ ...snapshot, orderCode: checkoutSuccess.order_code });
            window.sessionStorage.removeItem(RECEIPT_SNAPSHOT_KEY);
        } catch {
            window.sessionStorage.removeItem(RECEIPT_SNAPSHOT_KEY);
        }
    }, [checkoutSuccess?.order_code]);

    useEffect(() => {
        if (!lastCompletedOrder) {
            return;
        }

        const timeoutId = window.setTimeout(() => window.print(), 500);

        return () => window.clearTimeout(timeoutId);
    }, [lastCompletedOrder]);

    function crc16CcittFalse(payload: string): string {
        let crc = 0xffff;

        for (let index = 0; index < payload.length; index += 1) {
            crc ^= payload.charCodeAt(index) << 8;

            for (let bit = 0; bit < 8; bit += 1) {
                crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xffff;
            }
        }

        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    function parseEmvTlv(payload: string): { tag: string; length: number; value: string; raw: string }[] | null {
        const tags: { tag: string; length: number; value: string; raw: string }[] = [];
        let offset = 0;

        while (offset < payload.length) {
            const tag = payload.slice(offset, offset + 2);
            const lengthText = payload.slice(offset + 2, offset + 4);
            const length = Number(lengthText);
            const valueStart = offset + 4;
            const valueEnd = valueStart + length;

            if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText) || valueEnd > payload.length) {
                return null;
            }

            const value = payload.slice(valueStart, valueEnd);
            tags.push({ tag, length, value, raw: `${tag}${lengthText}${value}` });
            offset = valueEnd;
        }

        return tags;
    }

    function buildEmvTag(tag: string, value: string): string {
        return `${tag}${value.length.toString().padStart(2, '0')}${value}`;
    }

    function generateQrisDynamicString(baseString: string, amount: number): string {
        const cleanBaseString = baseString.trim();
        const cleanPayload = cleanBaseString.replace(/6304[0-9A-Fa-f]{4}$/, '');
        const amountValue = String(rupiahAmount(amount));

        if (!cleanPayload || amount <= 0) {
            return cleanPayload;
        }

        const tags = parseEmvTlv(cleanPayload);

        if (tags === null) {
            const fallbackPayload = cleanPayload.replace(/010211/, '010212').replace(/54\d{2}\d+(?:\.\d+)?/, '');
            const fallbackWithAmount = `${fallbackPayload}${buildEmvTag('54', amountValue)}6304`;

            return `${fallbackWithAmount}${crc16CcittFalse(fallbackWithAmount)}`;
        }

        const nextTags = tags
            .filter((tag) => tag.tag !== '54' && tag.tag !== '63')
            .map((tag) => (tag.tag === '01' ? { ...tag, value: '12', raw: buildEmvTag('01', '12') } : tag));
        const payloadWithAmount = `${nextTags.map((tag) => tag.raw).join('')}${buildEmvTag('54', amountValue)}6304`;

        return `${payloadWithAmount}${crc16CcittFalse(payloadWithAmount)}`;
    }

    function cartItemUnitPrice(item: CartItem): number {
        return rupiahAmount(item.product.price) + item.modifiers.reduce((sum, modifier) => sum + rupiahAmount(modifier.price), 0);
    }

    function cartItemKey(product: Product, modifiers: ProductModifier[]): string {
        return [product.id, ...modifiers.map((modifier) => modifier.id).sort((a, b) => a - b)].join(':');
    }

    function addToCart(product: Product, modifiers: ProductModifier[] = []) {
        if (product.stock <= 0) {
            return;
        }

        const id = cartItemKey(product, modifiers);

        setCart((currentCart) => {
            const existingItem = currentCart.find((item) => item.id === id);

            if (existingItem) {
                return currentCart.map((item) =>
                    item.id === id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item,
                );
            }

            return [...currentCart, { id, product, qty: 1, modifiers }];
        });
    }

    async function parseSmartCommand(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const command = smartCommand.trim();

        if (!command) {
            return;
        }

        setSmartCommandError(null);
        setIsParsingSmartCommand(true);

        try {
            const response = await fetch('/api/pos/parse-natural-language', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ command }),
            });

            const data = (await response.json()) as { items?: ParsedCartItem[]; message?: string };

            if (!response.ok) {
                throw new Error(data.message ?? 'Perintah belum bisa diproses.');
            }

            if (!data.items || data.items.length === 0) {
                throw new Error('Tidak ada menu yang cocok dengan perintah.');
            }

            let addedCount = 0;

            data.items.forEach((item) => {
                const product = products.find((candidate) => candidate.id === item.product_id);

                if (!product) {
                    return;
                }

                const modifiers = (product.modifiers ?? []).filter((modifier) => item.modifier_ids.includes(modifier.id));

                for (let count = 0; count < item.quantity; count += 1) {
                    addToCart(product, modifiers);
                    addedCount += 1;
                }
            });

            if (addedCount === 0) {
                throw new Error('Produk hasil AI tidak tersedia di POS.');
            }

            setSmartCommand('');
        } catch (error) {
            setSmartCommandError(error instanceof Error ? error.message : 'Perintah belum bisa diproses.');
        } finally {
            setIsParsingSmartCommand(false);
        }
    }

    function selectProduct(product: Product) {
        if ((product.modifiers?.length ?? 0) > 0) {
            setSelectedModifierIds([]);
            setModifierProduct(product);

            return;
        }

        addToCart(product);
    }

    function confirmModifiers() {
        if (!modifierProduct) {
            return;
        }

        const modifiers = (modifierProduct.modifiers ?? []).filter((modifier) => selectedModifierIds.includes(modifier.id));

        addToCart(modifierProduct, modifiers);
        setModifierProduct(null);
        setSelectedModifierIds([]);
    }

    function increaseQty(itemId: string) {
        setCart((currentCart) =>
            currentCart.map((item) =>
                item.id === itemId ? { ...item, qty: Math.min(item.qty + 1, item.product.stock) } : item,
            ),
        );
    }

    function decreaseQty(itemId: string) {
        setCart((currentCart) =>
            currentCart.map((item) => (item.id === itemId ? { ...item, qty: item.qty - 1 } : item)).filter((item) => item.qty > 0),
        );
    }

    function removeItem(itemId: string) {
        setCart((currentCart) => currentCart.filter((item) => item.id !== itemId));
    }

    function addPayment() {
        form.setData('payments', [...form.data.payments, { method: 'cash', amount: '', reference: '' }]);
    }

    function removePayment(index: number) {
        if (form.data.payments.length === 1) {
            return;
        }

        form.setData('payments', form.data.payments.filter((_, paymentIndex) => paymentIndex !== index));
    }

    function updatePayment(index: number, field: 'method' | 'amount' | 'reference', value: string) {
        form.setData(
            'payments',
            form.data.payments.map((payment, paymentIndex) =>
                paymentIndex === index ? { ...payment, [field]: value } : payment,
            ),
        );
    }

    function createReceiptSnapshot(): ReceiptOrder {
        const selectedCustomer = customers.find((customer) => String(customer.id) === form.data.customer_id);
        const customerName = selectedCustomer?.name ?? form.data.customer_name.trim();

        return {
            orderCode: checkoutSuccess?.order_code,
            dateTime: new Intl.DateTimeFormat('id-ID', {
                dateStyle: 'short',
                timeStyle: 'short',
            }).format(new Date()),
            cashier: page.props.auth?.user?.name,
            customerName: customerName || undefined,
            serviceType: form.data.service_type,
            items: cart.map((item) => ({
                name: item.product.name,
                qty: item.qty,
                unitPrice: cartItemUnitPrice(item),
                modifiers: item.modifiers.map((modifier) => ({
                    name: modifier.name,
                    price: rupiahAmount(modifier.price),
                })),
                lineTotal: cartItemUnitPrice(item) * item.qty,
            })),
            subtotal,
            discountAmount,
            taxAmount,
            serviceChargeAmount,
            total,
            payments: form.data.payments.map((payment) => ({
                method: payment.method,
                amount: rupiahAmount(payment.amount || 0),
                reference: payment.reference || undefined,
            })),
            paidAmount,
            changeAmount,
        };
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (discountAmount > 0 && form.data.manager_pin === '') {
            setIsPinModalOpen(true);

            return;
        }

        checkout();
    }

    function checkout(managerPin = form.data.manager_pin) {
        const receiptSnapshot = createReceiptSnapshot();

        form.transform((data) => ({
            ...data,
            paid_amount: String(paidAmount),
            dining_table_id: data.service_type === 'dine_in' ? data.dining_table_id : '',
            payments: data.payments.map((payment) => ({
                method: payment.method,
                amount: payment.amount,
                reference: payment.reference,
            })),
            manager_pin: managerPin,
            items: cart.map((item) => ({
                product_id: item.product.id,
                qty: item.qty,
                modifier_ids: item.modifiers.map((modifier) => modifier.id),
            })),
        }));

        form.post('/pos/checkout', {
            preserveScroll: true,
            onSuccess: () => {
                window.sessionStorage.setItem(RECEIPT_SNAPSHOT_KEY, JSON.stringify(receiptSnapshot));
                setCart([]);
                form.reset(
                    'paid_amount',
                    'discount_amount',
                    'service_type',
                    'dining_table_id',
                    'customer_id',
                    'customer_name',
                    'tax_percent',
                    'service_charge_percent',
                    'payments',
                    'manager_pin',
                );
            },
        });
    }

    function approveDiscount(pin: string): void {
        form.setData('manager_pin', pin);
        setIsPinModalOpen(false);
        checkout(pin);
    }

    return (
        <>
            <Head title="Kasir/POS" />
            <Dialog open={modifierProduct !== null} onOpenChange={(open) => !open && setModifierProduct(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pilih add-on</DialogTitle>
                        <DialogDescription>{modifierProduct?.name} punya add-on opsional.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                        {(modifierProduct?.modifiers ?? []).map((modifier) => (
                            <label key={modifier.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                                <span className="flex items-center gap-3">
                                    <Checkbox
                                        checked={selectedModifierIds.includes(modifier.id)}
                                        onCheckedChange={(checked) =>
                                            setSelectedModifierIds((current) =>
                                                checked ? [...current, modifier.id] : current.filter((id) => id !== modifier.id),
                                            )
                                        }
                                    />
                                    {modifier.name}
                                </span>
                                <span>{formatRupiah(modifier.price)}</span>
                            </label>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setModifierProduct(null)}>Batal</Button>
                        <Button type="button" onClick={confirmModifiers}>Tambah ke cart</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <PinAuthorizationModal
                open={isPinModalOpen}
                action="pos.manual_discount"
                title="Otorisasi diskon manual"
                description="Diskon manual membutuhkan PIN admin/manager."
                onCancel={() => setIsPinModalOpen(false)}
                onApproved={approveDiscount}
            />

            <ReceiptTemplate order={lastCompletedOrder} />

            <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-50 p-4">
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white">☕</div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900">KasirKu POS</h1>
                            <p className="text-sm text-gray-500">Pilih menu, review pesanan, checkout.</p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="w-fit rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                        {products.length} produk aktif
                    </Badge>
                </div>

                {checkoutSuccess && (
                    <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                        <AlertTitle>Checkout berhasil</AlertTitle>
                        <AlertDescription>Order berhasil disimpan dengan kode {checkoutSuccess.order_code}.</AlertDescription>
                    </Alert>
                )}

                <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.95fr)_380px]">
                    <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
                        <Card className="rounded-2xl border-gray-100 bg-white shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" size="sm" className="rounded-full" variant={selectedCategoryId === 'all' ? 'default' : 'outline'} onClick={() => setSelectedCategoryId('all')}>Semua</Button>
                                    {categories.map((category) => (
                                        <Button key={category.id} type="button" size="sm" className="rounded-full" variant={selectedCategoryId === category.id ? 'default' : 'outline'} onClick={() => setSelectedCategoryId(category.id)}>
                                            {category.name}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="min-h-0 overflow-y-auto pr-1">
                            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                {filteredProducts.length === 0 ? (
                                    <Card className="rounded-2xl border-dashed border-gray-200 bg-white sm:col-span-2 2xl:col-span-3">
                                        <CardContent className="py-12 text-center text-sm text-gray-400">Tidak ada produk aktif pada kategori ini.</CardContent>
                                    </Card>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <button key={product.id} type="button" onClick={() => selectProduct(product)} disabled={product.stock <= 0} className="group flex flex-col items-start rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60">
                                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-50 text-gray-700 transition-colors group-hover:bg-gray-100">
                                                {getCategoryIcon(product.category)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 text-sm font-semibold leading-tight text-gray-800">{product.name}</p>
                                                <p className="mt-1 text-xs text-gray-400">{product.category.name}</p>
                                                {product.description && <p className="mt-2 line-clamp-2 text-xs text-gray-500">{product.description}</p>}
                                            </div>
                                            <div className="mt-4 flex w-full items-center justify-between gap-2">
                                                <span className="text-sm font-bold text-gray-900">{formatRupiah(product.price)}</span>
                                                <span className="text-xs text-gray-400">Stok {product.stock}</span>
                                            </div>
                                            {product.stock === 0 ? <Badge variant="destructive" className="mt-2">Habis</Badge> : product.stock <= product.minimum_stock ? <Badge variant="secondary" className="mt-2">Menipis</Badge> : null}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
                        <Card className="overflow-hidden rounded-2xl border-gray-100 bg-white shadow-sm">
                            <CardContent className="p-0">
                                <form onSubmit={parseSmartCommand} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-pink-500">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <Input value={smartCommand} onChange={(event) => setSmartCommand(event.target.value)} placeholder='Contoh: "2 kopi susu dan 1 croissant"' disabled={isParsingSmartCommand} className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
                                    <Button type="submit" size="sm" className="rounded-lg bg-violet-600 hover:bg-violet-700" disabled={isParsingSmartCommand || smartCommand.trim() === ''}>{isParsingSmartCommand ? '...' : 'Enter'}</Button>
                                </form>
                                {smartCommandError && <div className="border-t border-gray-100 px-4 py-3 text-sm text-destructive">{smartCommandError}</div>}
                            </CardContent>
                        </Card>

                        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-gray-100 bg-white shadow-sm">
                            <CardHeader className="border-b border-gray-100 px-5 py-4">
                                <CardTitle className="text-base font-semibold text-gray-900">Pesanan</CardTitle>
                                <CardDescription>{cart.reduce((sum, item) => sum + item.qty, 0)} item</CardDescription>
                            </CardHeader>
                            <CardContent className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                                {form.errors.items && <p className="mb-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{form.errors.items}</p>}
                                {cart.length === 0 ? (
                                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 text-center text-sm text-gray-400">
                                        <span className="text-3xl">🛍️</span>
                                        Keranjang masih kosong
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {cart.map((item) => (
                                            <div key={item.id} className="group flex items-start gap-3 rounded-xl px-1 py-3 transition-colors hover:bg-gray-50">
                                                <div className="mt-0.5 flex flex-shrink-0 items-center gap-1.5">
                                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => decreaseQty(item.id)} aria-label={`Kurangi ${item.product.name}`}><Minus className="h-3 w-3" /></Button>
                                                    <span className="w-5 text-center text-sm font-semibold text-gray-800">{item.qty}</span>
                                                    <Button type="button" variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => increaseQty(item.id)} disabled={item.qty >= item.product.stock} aria-label={`Tambah ${item.product.name}`}><Plus className="h-3 w-3" /></Button>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-gray-800">{item.product.name}</p>
                                                    <p className="text-xs text-gray-400">{formatRupiah(item.product.price)} × {item.qty}</p>
                                                    {item.modifiers.length > 0 && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {item.modifiers.map((modifier) => <Badge key={modifier.id} variant="secondary" className="rounded-full text-[10px]">{modifier.name} +{formatRupiah(modifier.price)}</Badge>)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-shrink-0 items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-800">{formatRupiah(cartItemUnitPrice(item) * item.qty)}</span>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-gray-300 hover:text-red-500" onClick={() => removeItem(item.id)} aria-label={`Hapus ${item.product.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                                                </div>
                                            </div>
                                        ))}

                                        {(isLoadingUpsellRecommendations || visibleUpsellRecommendations.length > 0) && (
                                            <div className="mt-3 space-y-3">
                                                {isLoadingUpsellRecommendations && visibleUpsellRecommendations.length === 0 ? (
                                                    <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs text-violet-600">Mencari rekomendasi...</div>
                                                ) : (
                                                    visibleUpsellRecommendations.map((recommendation) => {
                                                        const product = products.find((candidate) => candidate.id === recommendation.product_id);

                                                        if (!product) {
                                                            return null;
                                                        }

                                                        return (
                                                            <div key={recommendation.product_id} className="relative rounded-xl bg-gradient-to-br from-violet-400 via-pink-400 to-orange-400 p-[1px]">
                                                                <div className="rounded-[11px] bg-violet-50 px-4 py-3">
                                                                    <div className="mb-2 flex items-center gap-1.5">
                                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100"><Sparkles className="h-3 w-3 text-violet-600" /></div>
                                                                        <span className="text-xs font-semibold uppercase tracking-wider text-violet-700">AI Suggestion</span>
                                                                    </div>
                                                                    <p className="mb-3 text-xs leading-relaxed text-violet-600/80">{recommendation.reason}</p>
                                                                    <div className="flex items-center gap-3 rounded-lg border border-violet-100 bg-white px-3 py-2.5 shadow-sm">
                                                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-lg">☕</div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate text-sm font-medium text-gray-800">{product.name}</p>
                                                                            <p className="text-xs font-semibold text-violet-600">{formatRupiah(product.price)}</p>
                                                                        </div>
                                                                        <Button type="button" size="sm" className="h-8 rounded-lg bg-violet-600 px-3 text-xs hover:bg-violet-700" onClick={() => addToCart(product, [])} disabled={product.stock <= 0}><Plus className="h-3 w-3" /> Add</Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </section>

                    <Card className="h-fit overflow-hidden rounded-2xl border-gray-100 bg-white shadow-sm xl:sticky xl:top-4">
                        <CardHeader className="border-b border-gray-100 px-5 py-4">
                            <CardTitle className="text-base font-semibold text-gray-900">Checkout</CardTitle>
                            <CardDescription>Server tetap hitung ulang saat checkout.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5">
                            <form onSubmit={submit} className="grid gap-5">
                                <div className="grid gap-3 rounded-2xl border border-gray-100 p-3">
                                    <div className="grid gap-2">
                                        <Label htmlFor="service_type">Tipe layanan</Label>
                                        <Select value={form.data.service_type} onValueChange={(value) => form.setData('service_type', value)}>
                                            <SelectTrigger id="service_type" className="w-full"><SelectValue placeholder="Pilih tipe layanan" /></SelectTrigger>
                                            <SelectContent><SelectItem value="takeaway">Takeaway</SelectItem><SelectItem value="dine_in">Dine-in</SelectItem><SelectItem value="delivery">Delivery</SelectItem></SelectContent>
                                        </Select>
                                        {form.errors.service_type && <p className="text-sm text-destructive">{form.errors.service_type}</p>}
                                    </div>
                                    {form.data.service_type === 'dine_in' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="dining_table_id">Meja</Label>
                                            <Select value={form.data.dining_table_id} onValueChange={(value) => form.setData('dining_table_id', value)}>
                                                <SelectTrigger id="dining_table_id" className="w-full"><SelectValue placeholder="Pilih meja" /></SelectTrigger>
                                                <SelectContent>{diningTables.map((table) => <SelectItem key={table.id} value={String(table.id)}>{table.name} · {table.capacity} kursi</SelectItem>)}</SelectContent>
                                            </Select>
                                            {form.errors.dining_table_id && <p className="text-sm text-destructive">{form.errors.dining_table_id}</p>}
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label htmlFor="customer_id">Customer/member</Label>
                                        <Select value={form.data.customer_id} onValueChange={(value) => form.setData('customer_id', value)}>
                                            <SelectTrigger id="customer_id" className="w-full"><SelectValue placeholder="Pilih member (opsional)" /></SelectTrigger>
                                            <SelectContent>{customers.map((customer) => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name} · {customer.points} poin</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="customer_name">Nama pelanggan (opsional)</Label>
                                        <Input id="customer_name" value={form.data.customer_name} onChange={(event) => form.setData('customer_name', event.target.value)} placeholder="Nama pelanggan" />
                                        {form.errors.customer_name && <p className="text-sm text-destructive">{form.errors.customer_name}</p>}
                                    </div>
                                </div>

                                <div className="grid gap-3 rounded-2xl bg-gray-50 p-4">
                                    <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{formatRupiah(subtotal)}</span></div>
                                    <div className="grid gap-2"><Label htmlFor="discount_amount">Diskon</Label><Input id="discount_amount" type="number" min="0" step="100" value={form.data.discount_amount} onChange={(event) => form.setData('discount_amount', event.target.value)} placeholder="0" />{form.errors.discount_amount && <p className="text-sm text-destructive">{form.errors.discount_amount}</p>}</div>
                                    <div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="tax_percent">Pajak (%)</Label><Input id="tax_percent" type="number" min="0" max="100" value={form.data.tax_percent} onChange={(event) => form.setData('tax_percent', event.target.value)} /></div><div className="grid gap-2"><Label htmlFor="service_charge_percent">Service (%)</Label><Input id="service_charge_percent" type="number" min="0" max="100" value={form.data.service_charge_percent} onChange={(event) => form.setData('service_charge_percent', event.target.value)} /></div></div>
                                    <div className="flex justify-between text-sm"><span>Pajak</span><span>{formatRupiah(taxAmount)}</span></div>
                                    <div className="flex justify-between text-sm"><span>Service charge</span><span>{formatRupiah(serviceChargeAmount)}</span></div>
                                    <div className="flex justify-between text-base font-bold text-gray-900"><span>Total</span><span>{formatRupiah(total)}</span></div>
                                </div>

                                <div className="grid gap-3">
                                    <div className="flex items-center justify-between gap-3"><Label>Pembayaran</Label><Button type="button" variant="outline" size="sm" onClick={addPayment}><Plus className="size-4" />Tambah</Button></div>
                                    {form.data.payments.map((payment, index) => (
                                        <div key={index} className="grid gap-2 rounded-xl border border-gray-100 bg-white p-3">
                                            <div className="grid gap-2 sm:grid-cols-[120px_1fr]"><Select value={payment.method} onValueChange={(value) => updatePayment(index, 'method', value)}><SelectTrigger><SelectValue placeholder="Metode" /></SelectTrigger><SelectContent><SelectItem value="cash">Tunai</SelectItem><SelectItem value="card">Kartu</SelectItem><SelectItem value="qris">QRIS</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent></Select><Input type="number" min="0" step="100" value={payment.amount} onChange={(event) => updatePayment(index, 'amount', event.target.value)} placeholder="50000" /></div>
                                            <div className="flex gap-2"><Input value={payment.reference} onChange={(event) => updatePayment(index, 'reference', event.target.value)} placeholder="Referensi non-tunai (opsional)" />{form.data.payments.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(index)} aria-label="Hapus pembayaran"><Trash2 className="size-4" /></Button>}</div>
                                        </div>
                                    ))}
                                    {form.errors.paid_amount && <p className="text-sm text-destructive">{form.errors.paid_amount}</p>}
                                    {form.errors.payments && <p className="text-sm text-destructive">{form.errors.payments}</p>}
                                    <div className="flex justify-between text-sm"><span>Total bayar</span><span className="font-semibold">{formatRupiah(paidAmount)}</span></div>
                                    <div className="flex justify-between text-sm"><span>Kembalian</span><span className="font-semibold">{formatRupiah(changeAmount)}</span></div>
                                    {form.data.payments.some((payment) => payment.method === 'qris') && (
                                        <div className="grid gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                                            <div className="font-semibold text-gray-800">QRIS dynamic string</div>
                                            <div className="break-all rounded-lg bg-white p-2 font-mono">{qrisDynamicString}</div>
                                            <div>Nominal QRIS: {formatRupiah(qrisPaymentAmount || total)}</div>
                                        </div>
                                    )}
                                </div>
 
                                <Button type="submit" className="rounded-xl bg-gray-900 py-6 hover:bg-gray-800" disabled={form.processing || cart.length === 0}>{form.processing ? 'Memproses...' : 'Proses Pembayaran'}</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

PosIndex.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
