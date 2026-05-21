import { Head, Link, router } from '@inertiajs/react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

type Product = {
    id: number;
    name: string;
    description?: string | null;
    price: string;
    is_active: boolean;
    category?: {
        id: number;
        name: string;
    } | null;
};

type Props = {
    products: Product[];
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function ProductIndex({ products }: Props) {
    function destroy(product: Product) {
        if (!confirm(`Hapus produk ${product.name}?`)) {
            return;
        }

        router.delete(`/products/${product.id}`, {
            preserveScroll: true,
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
                            Produk tersambung ke kategori dan siap dipakai tahap POS
                            berikutnya.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-[1.2fr_160px_140px_120px_160px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-lg:hidden">
                                <div>Nama</div>
                                <div>Kategori</div>
                                <div>Harga</div>
                                <div>Status</div>
                                <div className="text-right">Aksi</div>
                            </div>

                            {products.length > 0 ? (
                                products.map((product) => (
                                    <div
                                        key={product.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[1.2fr_160px_140px_120px_160px] lg:items-center"
                                    >
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
                                        <div className="text-sm font-medium">
                                            {currencyFormatter.format(
                                                Number(product.price),
                                            )}
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
                                                onClick={() => destroy(product)}
                                            >
                                                <Trash2 className="size-4" />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
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
