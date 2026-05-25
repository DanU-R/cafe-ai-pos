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

type Supplier = {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    is_active: boolean;
    purchases_count: number;
};

type Props = {
    suppliers: Supplier[];
};

export default function SupplierIndex({ suppliers }: Props) {
    function destroy(supplier: Supplier): void {
        if (!confirm(`Hapus supplier ${supplier.name}?`)) {
            return;
        }

        router.delete(`/suppliers/${supplier.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Supplier" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Supplier
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola pemasok untuk pembelian stok.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/suppliers/create">
                            <Plus className="size-4" />
                            Tambah supplier
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar supplier</CardTitle>
                        <CardDescription>
                            Supplier aktif bisa dipilih saat pembelian stok.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-[1fr_180px_120px_180px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-lg:hidden">
                                <div>Supplier</div>
                                <div>Kontak</div>
                                <div>Status</div>
                                <div className="text-right">Aksi</div>
                            </div>

                            {suppliers.length > 0 ? (
                                suppliers.map((supplier) => (
                                    <div
                                        key={supplier.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_180px_120px_180px] lg:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {supplier.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {supplier.address ?? '-'}
                                            </div>
                                            <div className="text-sm text-muted-foreground lg:hidden">
                                                {supplier.purchases_count} pembelian
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            <div>{supplier.phone ?? '-'}</div>
                                            <div>{supplier.email ?? '-'}</div>
                                        </div>
                                        <div>
                                            <Badge
                                                variant={
                                                    supplier.is_active
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                            >
                                                {supplier.is_active
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
                                                    href={`/suppliers/${supplier.id}/edit`}
                                                >
                                                    <Edit className="size-4" />
                                                    Edit
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() =>
                                                    destroy(supplier)
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    Belum ada supplier.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupplierIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Supplier',
            href: '/suppliers',
        },
    ],
};
