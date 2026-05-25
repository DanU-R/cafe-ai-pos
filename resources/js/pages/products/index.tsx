import { Head, Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
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
import { dashboard } from '@/routes';

type StockMovement = {
    id: number;
    type: 'restock' | 'sale' | 'cancel';
    qty: number;
    stock_before: number;
    stock_after: number;
    note?: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
    } | null;
};

type Product = {
    id: number;
    name: string;
    description?: string | null;
    price: string;
    cost_price: string;
    stock: number;
    minimum_stock: number;
    is_active: boolean;
    category?: {
        id: number;
        name: string;
    } | null;
    stock_movements: StockMovement[];
};

type Props = {
    products: Product[];
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function stockVariant(
    product: Product,
): 'default' | 'destructive' | 'secondary' {
    if (product.stock === 0) {
        return 'destructive';
    }

    if (product.stock <= product.minimum_stock) {
        return 'secondary';
    }

    return 'default';
}

function stockLabel(product: Product): string {
    if (product.stock === 0) {
        return 'Stok habis';
    }

    if (product.stock <= product.minimum_stock) {
        return 'Stok menipis';
    }

    return 'Stok aman';
}

function movementLabel(type: StockMovement['type']): string {
    if (type === 'restock') {
        return 'Restock';
    }

    if (type === 'cancel') {
        return 'Cancel';
    }

    return 'Sale';
}

export default function ProductIndex({ products }: Props) {
    const restockForm = useForm({
        product_id: 0,
        qty: 1,
        note: '',
    });

    function destroy(product: Product) {
        if (!confirm(`Hapus produk ${product.name}?`)) {
            return;
        }

        router.delete(`/products/${product.id}`, {
            preserveScroll: true,
        });
    }

    function restock(event: FormEvent<HTMLFormElement>, product: Product) {
        event.preventDefault();

        restockForm.transform((data) => ({
            qty: Number(data.qty),
            note: data.note,
        }));

        restockForm.post(`/products/${product.id}/stock`, {
            preserveScroll: true,
            onSuccess: () => {
                restockForm.reset('note');
                restockForm.setData('qty', 1);
            },
        });
    }

    return (
        <>
            <Head title="Produk/Menu" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Produk/Menu
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola menu kafe untuk data awal POS Cafe.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/products/create">
                            <Plus className="size-4" />
                            Tambah produk
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar produk</CardTitle>
                        <CardDescription>
                            Produk tersambung ke kategori dan siap dipakai tahap
                            POS berikutnya.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            {products.length > 0 ? (
                                products.map((product) => (
                                    <div
                                        key={product.id}
                                        data-testid={`product-card-${product.id}`}
                                        className="grid gap-4 rounded-lg border p-4"
                                    >
                                        <div className="grid gap-3 lg:grid-cols-[1.2fr_150px_140px_150px_110px_150px] lg:items-center">
                                            <div>
                                                <div className="font-medium">
                                                    {product.name}
                                                </div>
                                                {product.description && (
                                                    <div className="line-clamp-2 text-sm text-muted-foreground">
                                                        {product.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {product.category?.name ?? '-'}
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-medium">
                                                    {currencyFormatter.format(
                                                        Number(product.price),
                                                    )}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    HPP{' '}
                                                    {currencyFormatter.format(
                                                        Number(
                                                            product.cost_price,
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid gap-1">
                                                <Badge
                                                    variant={stockVariant(
                                                        product,
                                                    )}
                                                >
                                                    {stockLabel(product)}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {product.stock} tersedia ·
                                                    min {product.minimum_stock}
                                                </span>
                                            </div>
                                            <div>
                                                <Badge
                                                    variant={
                                                        product.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {product.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-2 lg:justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/products/${product.id}/edit`}
                                                    >
                                                        <Edit className="size-4" />
                                                        Edit
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        destroy(product)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />
                                                    Hapus
                                                </Button>
                                            </div>
                                        </div>

                                        <form
                                            onSubmit={(event) =>
                                                restock(event, product)
                                            }
                                            className="grid gap-3 rounded-lg bg-muted/30 p-3 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-end"
                                        >
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`restock-qty-${product.id}`}
                                                >
                                                    Qty restock
                                                </Label>
                                                <Input
                                                    id={`restock-qty-${product.id}`}
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={
                                                        restockForm.data
                                                            .product_id ===
                                                        product.id
                                                            ? restockForm.data
                                                                  .qty
                                                            : 1
                                                    }
                                                    onChange={(event) => {
                                                        restockForm.setData(
                                                            'product_id',
                                                            product.id,
                                                        );
                                                        restockForm.setData(
                                                            'qty',
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        );
                                                    }}
                                                    required
                                                />
                                                {restockForm.data.product_id ===
                                                    product.id && (
                                                    <InputError
                                                        message={
                                                            restockForm.errors
                                                                .qty
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <div className="grid gap-2">
                                                <Label
                                                    htmlFor={`restock-note-${product.id}`}
                                                >
                                                    Catatan restock
                                                </Label>
                                                <Input
                                                    id={`restock-note-${product.id}`}
                                                    value={
                                                        restockForm.data
                                                            .product_id ===
                                                        product.id
                                                            ? restockForm.data
                                                                  .note
                                                            : ''
                                                    }
                                                    onChange={(event) => {
                                                        restockForm.setData(
                                                            'product_id',
                                                            product.id,
                                                        );
                                                        restockForm.setData(
                                                            'note',
                                                            event.target.value,
                                                        );
                                                    }}
                                                    placeholder="Opsional"
                                                />
                                                {restockForm.data.product_id ===
                                                    product.id && (
                                                    <InputError
                                                        message={
                                                            restockForm.errors
                                                                .note
                                                        }
                                                    />
                                                )}
                                            </div>
                                            <Button
                                                type="submit"
                                                disabled={
                                                    restockForm.processing
                                                }
                                                onClick={() =>
                                                    restockForm.setData(
                                                        'product_id',
                                                        product.id,
                                                    )
                                                }
                                            >
                                                Restock
                                            </Button>
                                        </form>

                                        <div className="grid gap-2">
                                            <div className="text-sm font-medium">
                                                Riwayat stok
                                            </div>
                                            {product.stock_movements.length >
                                            0 ? (
                                                <div className="overflow-hidden rounded-lg border">
                                                    {product.stock_movements.map(
                                                        (movement) => (
                                                            <div
                                                                key={
                                                                    movement.id
                                                                }
                                                                data-testid={`stock-movement-${movement.id}`}
                                                                className="grid gap-2 border-b px-3 py-3 text-sm last:border-b-0 md:grid-cols-[100px_80px_120px_1fr_160px] md:items-center"
                                                            >
                                                                <Badge
                                                                    variant={
                                                                        movement.type ===
                                                                        'sale'
                                                                            ? 'secondary'
                                                                            : movement.type ===
                                                                                'cancel'
                                                                              ? 'destructive'
                                                                              : 'default'
                                                                    }
                                                                >
                                                                    {movementLabel(
                                                                        movement.type,
                                                                    )}
                                                                </Badge>
                                                                <div>
                                                                    Qty{' '}
                                                                    {
                                                                        movement.qty
                                                                    }
                                                                </div>
                                                                <div>
                                                                    {
                                                                        movement.stock_before
                                                                    }{' '}
                                                                    →{' '}
                                                                    {
                                                                        movement.stock_after
                                                                    }
                                                                </div>
                                                                <div className="text-muted-foreground">
                                                                    {movement.note ??
                                                                        '-'}{' '}
                                                                    ·{' '}
                                                                    {movement
                                                                        .user
                                                                        ?.name ??
                                                                        'System'}
                                                                </div>
                                                                <div className="text-muted-foreground">
                                                                    {dateFormatter.format(
                                                                        new Date(
                                                                            movement.created_at,
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="rounded-lg border px-3 py-4 text-sm text-muted-foreground">
                                                    Belum ada riwayat stok untuk
                                                    produk ini.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
                                    Belum ada produk.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ProductIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Produk/Menu',
            href: '/products',
        },
    ],
};
