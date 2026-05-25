import { Head, router } from '@inertiajs/react';
import type { FormEvent } from 'react';
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

type Summary = {
    gross_sales: string;
    discounts: string;
    net_sales: string;
    cost: string;
    profit: string;
    transactions: number;
};

type ProductProfit = {
    product_name: string;
    sold_qty: number;
    revenue: string;
    cost: string;
    profit: string;
};

type Props = {
    filters: {
        date: string;
    };
    summary: Summary;
    products: ProductProfit[];
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

function formatCurrency(value: string): string {
    return currencyFormatter.format(Number(value));
}

export default function ProfitReport({ filters, summary, products }: Props) {
    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(
            '/reports/profit',
            { date: formData.get('date')?.toString() ?? filters.date },
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="Laporan Profit" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Laporan Profit
                    </h1>
                    <p className="text-muted-foreground">
                        Hitung laba dari omzet bersih dikurangi HPP produk.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter</CardTitle>
                        <CardDescription>
                            Pilih tanggal laporan profit.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={submit}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="date">Tanggal</Label>
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    defaultValue={filters.date}
                                />
                            </div>
                            <Button type="submit">Terapkan</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
                    <Card>
                        <CardHeader>
                            <CardDescription>Omzet kotor</CardDescription>
                            <CardTitle>
                                {formatCurrency(summary.gross_sales)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Diskon</CardDescription>
                            <CardTitle>
                                {formatCurrency(summary.discounts)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Omzet bersih</CardDescription>
                            <CardTitle>
                                {formatCurrency(summary.net_sales)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>HPP</CardDescription>
                            <CardTitle>
                                {formatCurrency(summary.cost)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Profit</CardDescription>
                            <CardTitle>
                                {formatCurrency(summary.profit)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Transaksi</CardDescription>
                            <CardTitle>{summary.transactions}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Profit per produk</CardTitle>
                        <CardDescription>
                            Revenue item dikurangi HPP berdasarkan qty terjual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3">
                            {products.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Belum ada transaksi pada tanggal ini.
                                </div>
                            ) : (
                                products.map((product) => (
                                    <div
                                        key={product.product_name}
                                        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_100px_150px_150px_150px] md:items-center"
                                    >
                                        <div className="font-medium">
                                            {product.product_name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {product.sold_qty} terjual
                                        </div>
                                        <div>
                                            {formatCurrency(product.revenue)}
                                        </div>
                                        <div>
                                            {formatCurrency(product.cost)}
                                        </div>
                                        <div className="font-semibold">
                                            {formatCurrency(product.profit)}
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

ProfitReport.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Laporan Profit',
            href: '/reports/profit',
        },
    ],
};
