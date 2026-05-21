import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

type Category = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: string;
    is_active: boolean;
    category: Category;
};

type CartItem = {
    product: Product;
    qty: number;
};

type CheckoutSuccess = {
    order_code: string;
} | null;

type Props = {
    categories: Category[];
    products: Product[];
    checkoutSuccess?: CheckoutSuccess;
};

function formatRupiah(value: number | string) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));
}

export default function PosIndex({ categories, products, checkoutSuccess }: Props) {
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
    const [cart, setCart] = useState<CartItem[]>([]);

    const form = useForm({
        paid_amount: '',
        items: [] as { product_id: number; qty: number }[],
    });

    const filteredProducts = useMemo(() => {
        if (selectedCategoryId === 'all') {
            return products;
        }

        return products.filter((product) => product.category_id === selectedCategoryId);
    }, [products, selectedCategoryId]);

    const total = cart.reduce((sum, item) => sum + Number(item.product.price) * item.qty, 0);
    const paidAmount = Number(form.data.paid_amount || 0);
    const changeAmount = Math.max(paidAmount - total, 0);

    function addToCart(product: Product) {
        setCart((currentCart) => {
            const existingItem = currentCart.find((item) => item.product.id === product.id);

            if (existingItem) {
                return currentCart.map((item) =>
                    item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item,
                );
            }

            return [...currentCart, { product, qty: 1 }];
        });
    }

    function increaseQty(productId: number) {
        setCart((currentCart) =>
            currentCart.map((item) =>
                item.product.id === productId ? { ...item, qty: item.qty + 1 } : item,
            ),
        );
    }

    function decreaseQty(productId: number) {
        setCart((currentCart) =>
            currentCart
                .map((item) =>
                    item.product.id === productId ? { ...item, qty: item.qty - 1 } : item,
                )
                .filter((item) => item.qty > 0),
        );
    }

    function removeItem(productId: number) {
        setCart((currentCart) => currentCart.filter((item) => item.product.id !== productId));
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            items: cart.map((item) => ({
                product_id: item.product.id,
                qty: item.qty,
            })),
        }));

        form.post('/pos/checkout', {
            preserveScroll: true,
            onSuccess: () => {
                setCart([]);
                form.reset('paid_amount');
            },
        });
    }

    return (
        <>
            <Head title="Kasir/POS" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Kasir/POS</h1>
                        <p className="text-sm text-muted-foreground">
                            Pilih produk aktif, susun cart, lalu checkout tunai.
                        </p>
                    </div>
                    <Badge variant="secondary">{products.length} produk aktif</Badge>
                </div>

                {checkoutSuccess && (
                    <Alert>
                        <AlertTitle>Checkout berhasil</AlertTitle>
                        <AlertDescription>
                            Order berhasil disimpan dengan kode {checkoutSuccess.order_code}.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="grid gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Filter kategori</CardTitle>
                                <CardDescription>Pilih kategori untuk mempercepat kasir mencari menu.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant={selectedCategoryId === 'all' ? 'default' : 'outline'}
                                        onClick={() => setSelectedCategoryId('all')}
                                    >
                                        Semua
                                    </Button>
                                    {categories.map((category) => (
                                        <Button
                                            key={category.id}
                                            type="button"
                                            variant={selectedCategoryId === category.id ? 'default' : 'outline'}
                                            onClick={() => setSelectedCategoryId(category.id)}
                                        >
                                            {category.name}
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                            {filteredProducts.length === 0 ? (
                                <Card className="sm:col-span-2 2xl:col-span-3">
                                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                        Tidak ada produk aktif pada kategori ini.
                                    </CardContent>
                                </Card>
                            ) : (
                                filteredProducts.map((product) => (
                                    <Card key={product.id} className="flex flex-col">
                                        <CardHeader className="gap-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <CardTitle className="text-base">{product.name}</CardTitle>
                                                    <CardDescription>{product.category.name}</CardDescription>
                                                </div>
                                                <Badge>{formatRupiah(product.price)}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="mt-auto grid gap-3">
                                            {product.description && (
                                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                                    {product.description}
                                                </p>
                                            )}
                                            <Button type="button" onClick={() => addToCart(product)}>
                                                Tambah ke cart
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    <Card className="h-fit xl:sticky xl:top-4">
                        <CardHeader>
                            <CardTitle>Cart</CardTitle>
                            <CardDescription>Qty dan total sementara. Server tetap hitung ulang saat checkout.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="grid gap-5">
                                {form.errors.items && (
                                    <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                        {form.errors.items}
                                    </p>
                                )}

                                <div className="grid gap-3">
                                    {cart.length === 0 ? (
                                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                            Cart masih kosong.
                                        </div>
                                    ) : (
                                        cart.map((item) => (
                                            <div key={item.product.id} className="grid gap-3 rounded-lg border p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium">{item.product.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatRupiah(item.product.price)} × {item.qty}
                                                        </p>
                                                    </div>
                                                    <p className="font-semibold">
                                                        {formatRupiah(Number(item.product.price) * item.qty)}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => decreaseQty(item.product.id)}
                                                            aria-label={`Kurangi ${item.product.name}`}
                                                        >
                                                            <Minus className="h-4 w-4" />
                                                        </Button>
                                                        <span className="min-w-8 text-center font-medium">{item.qty}</span>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => increaseQty(item.product.id)}
                                                            aria-label={`Tambah ${item.product.name}`}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(item.product.id)}
                                                        aria-label={`Hapus ${item.product.name}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="grid gap-3 rounded-lg bg-muted p-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Total belanja</span>
                                        <span className="font-semibold">{formatRupiah(total)}</span>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="paid_amount">Uang bayar</Label>
                                        <Input
                                            id="paid_amount"
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={form.data.paid_amount}
                                            onChange={(event) => form.setData('paid_amount', event.target.value)}
                                            placeholder="50000"
                                        />
                                        {form.errors.paid_amount && (
                                            <p className="text-sm text-destructive">{form.errors.paid_amount}</p>
                                        )}
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Kembalian</span>
                                        <span className="font-semibold">{formatRupiah(changeAmount)}</span>
                                    </div>
                                </div>

                                <Button type="submit" disabled={form.processing || cart.length === 0}>
                                    {form.processing ? 'Memproses...' : 'Checkout'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

PosIndex.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
