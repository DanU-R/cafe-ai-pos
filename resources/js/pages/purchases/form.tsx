import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';

type Supplier = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    name: string;
    stock: number;
    cost_price: string;
};

type PurchaseItem = {
    product_id: string;
    qty: number;
    unit_cost: string;
};

type Props = {
    suppliers: Supplier[];
    products: Product[];
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

function formatRupiah(value: number | string): string {
    return currencyFormatter.format(Number(value));
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export default function PurchaseForm({ suppliers, products }: Props) {
    const form = useForm({
        supplier_id: '',
        purchase_date: today(),
        note: '',
        items: [
            {
                product_id: '',
                qty: 1,
                unit_cost: '',
            },
        ] as PurchaseItem[],
    });

    const total = form.data.items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.unit_cost || 0),
        0,
    );

    function addItem(): void {
        form.setData('items', [
            ...form.data.items,
            {
                product_id: '',
                qty: 1,
                unit_cost: '',
            },
        ]);
    }

    function removeItem(index: number): void {
        if (form.data.items.length === 1) {
            return;
        }

        form.setData(
            'items',
            form.data.items.filter((_, itemIndex) => itemIndex !== index),
        );
    }

    function updateItem(
        index: number,
        field: keyof PurchaseItem,
        value: string | number,
    ): void {
        form.setData(
            'items',
            form.data.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            ),
        );
    }

    function selectProduct(index: number, productId: string): void {
        const product = products.find((item) => String(item.id) === productId);

        form.setData(
            'items',
            form.data.items.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          product_id: productId,
                          unit_cost: item.unit_cost || product?.cost_price || '',
                      }
                    : item,
            ),
        );
    }

    function productStock(productId: string): string {
        const product = products.find((item) => String(item.id) === productId);

        if (!product) {
            return '-';
        }

        return `${product.stock} stok saat ini`;
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            supplier_id: data.supplier_id || null,
            items: data.items.map((item) => ({
                product_id: Number(item.product_id),
                qty: Number(item.qty),
                unit_cost: Number(item.unit_cost),
            })),
        }));

        form.post('/purchases', {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Tambah Pembelian Stok" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Tambah Pembelian Stok
                    </h1>
                    <p className="text-muted-foreground">
                        Pilih supplier, produk, jumlah, dan harga modal baru.
                    </p>
                </div>

                <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data pembelian</CardTitle>
                            <CardDescription>
                                Produk aktif bisa dipilih. Stok bertambah setelah disimpan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="supplier_id">Supplier</Label>
                                    <Select
                                        value={form.data.supplier_id}
                                        onValueChange={(value) =>
                                            form.setData('supplier_id', value)
                                        }
                                    >
                                        <SelectTrigger id="supplier_id" className="w-full">
                                            <SelectValue placeholder="Pilih supplier opsional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((supplier) => (
                                                <SelectItem
                                                    key={supplier.id}
                                                    value={String(supplier.id)}
                                                >
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.supplier_id} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="purchase_date">Tanggal</Label>
                                    <Input
                                        id="purchase_date"
                                        type="date"
                                        value={form.data.purchase_date}
                                        onChange={(event) =>
                                            form.setData(
                                                'purchase_date',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError message={form.errors.purchase_date} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="note">Catatan</Label>
                                <textarea
                                    id="note"
                                    value={form.data.note}
                                    onChange={(event) =>
                                        form.setData('note', event.target.value)
                                    }
                                    className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    placeholder="Nomor invoice atau catatan pembelian"
                                />
                                <InputError message={form.errors.note} />
                            </div>

                            <div className="grid gap-3">
                                <div className="flex items-center justify-between gap-3">
                                    <Label>Item pembelian</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addItem}
                                    >
                                        <Plus className="size-4" />
                                        Tambah item
                                    </Button>
                                </div>

                                {form.data.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="grid gap-3 rounded-lg border p-3"
                                    >
                                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_120px_160px_44px]">
                                            <div className="grid gap-2">
                                                <Label>Produk</Label>
                                                <Select
                                                    value={item.product_id}
                                                    onValueChange={(value) =>
                                                        selectProduct(index, value)
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Pilih produk" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map((product) => (
                                                            <SelectItem
                                                                key={product.id}
                                                                value={String(product.id)}
                                                            >
                                                                {product.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <div className="text-xs text-muted-foreground">
                                                    {productStock(item.product_id)}
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Qty</Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.qty}
                                                    onChange={(event) =>
                                                        updateItem(
                                                            index,
                                                            'qty',
                                                            Number(event.target.value),
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Harga modal</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="100"
                                                    value={item.unit_cost}
                                                    onChange={(event) =>
                                                        updateItem(
                                                            index,
                                                            'unit_cost',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="15000"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                {form.data.items.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(index)}
                                                        aria-label="Hapus item"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium">
                                            Subtotal:{' '}
                                            {formatRupiah(
                                                Number(item.qty || 0) *
                                                    Number(item.unit_cost || 0),
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <InputError message={form.errors.items} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-fit xl:sticky xl:top-4">
                        <CardHeader>
                            <CardTitle>Ringkasan</CardTitle>
                            <CardDescription>
                                Cek total pembelian sebelum simpan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="flex justify-between text-sm">
                                <span>Total item</span>
                                <span className="font-semibold">
                                    {form.data.items.length} produk
                                </span>
                            </div>
                            <div className="flex justify-between text-lg font-semibold">
                                <span>Total</span>
                                <span>{formatRupiah(total)}</span>
                            </div>
                            <div className="flex flex-col-reverse gap-2">
                                <Button variant="outline" asChild>
                                    <Link href="/purchases">Batal</Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing || products.length === 0}
                                >
                                    Simpan pembelian
                                </Button>
                            </div>
                            {products.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada produk aktif untuk dibeli.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </form>
            </div>
        </>
    );
}

PurchaseForm.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pembelian Stok',
            href: '/purchases',
        },
        {
            title: 'Form',
            href: '/purchases/create',
        },
    ],
};
