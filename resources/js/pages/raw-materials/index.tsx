import { Head, Link, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type Material = {
    id: number;
    name: string;
    unit: string;
    stock: string;
    minimum_stock: string;
    cost_per_unit: string;
    is_active: boolean;
};

type Props = {
    materials: Material[];
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

function formatCurrency(value: string): string {
    return currencyFormatter.format(Number(value));
}

export default function RawMaterialIndex({ materials }: Props) {
    function destroy(material: Material): void {
        if (!confirm(`Hapus bahan ${material.name}?`)) {
            return;
        }

        router.delete(`/raw-materials/${material.id}`, { preserveScroll: true });
    }

    return (
        <>
            <Head title="Bahan Baku" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Bahan Baku
                        </h1>
                        <p className="text-muted-foreground">
                            Stok bahan untuk resep/BOM produk POS.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/raw-materials/create">Tambah bahan</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar bahan</CardTitle>
                        <CardDescription>
                            Pantau stok, minimum stok, HPP/unit, dan status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {materials.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Belum ada bahan baku.
                            </div>
                        ) : (
                            materials.map((material) => {
                                const isLow =
                                    Number(material.stock) <=
                                    Number(material.minimum_stock);

                                return (
                                    <div
                                        key={material.id}
                                        className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_140px_160px_170px] lg:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {material.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Unit {material.unit}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                isLow ? 'destructive' : 'default'
                                            }
                                        >
                                            {material.stock} /{' '}
                                            {material.minimum_stock}{' '}
                                            {material.unit}
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {formatCurrency(
                                                material.cost_per_unit,
                                            )}{' '}
                                            / {material.unit}
                                        </div>
                                        <div className="flex gap-2 lg:justify-end">
                                            <Button variant="outline" asChild>
                                                <Link
                                                    href={`/raw-materials/${material.id}/edit`}
                                                >
                                                    Edit
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() =>
                                                    destroy(material)
                                                }
                                            >
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
