import { Head, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';

type LowStockProduct = {
    id: number;
    name: string;
    category: string;
    stock: number;
    minimum_stock: number;
    suggested_restock: number;
};

type Props = {
    filters: {
        status: string;
    };
    summary: {
        low_stock_count: number;
        empty_stock_count: number;
        suggested_restock_total: number;
    };
    products: LowStockProduct[];
};

export default function LowStockReport({ filters, summary, products }: Props) {
    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(
            '/reports/low-stock',
            { status: formData.get('status')?.toString() ?? filters.status },
            { preserveScroll: true },
        );
    }

    const exportUrl = `/reports/low-stock/export?status=${encodeURIComponent(filters.status)}`;

    return (
        <>
            <Head title="Alert Stok Minimum" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Alert Stok Minimum
                        </h1>
                        <p className="text-muted-foreground">
                            Produk yang perlu restock cepat.
                        </p>
                    </div>
                    <Button
                        asChild
                        variant="outline"
                        className="w-full sm:w-fit"
                    >
                        <a href={exportUrl}>
                            <Download className="size-4" />
                            Export CSV
                        </a>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter</CardTitle>
                        <CardDescription>
                            Tampilkan stok kosong atau stok menipis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={submit}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    name="status"
                                    defaultValue={filters.status || 'all'}
                                >
                                    <SelectTrigger
                                        id="status"
                                        className="w-full sm:w-56"
                                    >
                                        <SelectValue placeholder="Semua alert" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Semua alert
                                        </SelectItem>
                                        <SelectItem value="empty">
                                            Stok kosong
                                        </SelectItem>
                                        <SelectItem value="low">
                                            Stok menipis
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit">Terapkan</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardDescription>Stok menipis</CardDescription>
                            <CardTitle>{summary.low_stock_count}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Stok kosong</CardDescription>
                            <CardTitle>{summary.empty_stock_count}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>
                                Total saran restock
                            </CardDescription>
                            <CardTitle>
                                {summary.suggested_restock_total}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar produk perlu restock</CardTitle>
                        <CardDescription>
                            Saran restock dihitung dari minimum stok dikurangi
                            stok saat ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3">
                            {products.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Semua stok aman.
                                </div>
                            ) : (
                                products.map((product) => (
                                    <div
                                        key={product.id}
                                        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_130px_130px_150px] md:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {product.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {product.category}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                product.stock === 0
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {product.stock === 0
                                                ? 'Stok kosong'
                                                : 'Stok menipis'}
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {product.stock} /{' '}
                                            {product.minimum_stock}
                                        </div>
                                        <div className="font-semibold">
                                            Restock {product.suggested_restock}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

LowStockReport.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Alert Stok Minimum',
            href: '/reports/low-stock',
        },
    ],
};
