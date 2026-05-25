import { FormEvent, ReactNode } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
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

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

type Summary = {
    gross_sales: string;
    discounts: string;
    net_sales: string;
    transactions: number;
    cancelled_transactions: number;
};

type Order = {
    id: number;
    order_code: string;
    created_at: string | null;
    cashier?: string | null;
    subtotal_amount: string;
    discount_amount: string;
    total: string;
    status: string;
};

type TopProduct = {
    product_name: string;
    sold_qty: number;
    gross_sales: string;
};

type Props = {
    filters: {
        date: string;
    };
    summary: Summary;
    orders: Order[];
    topProducts: TopProduct[];
};

function formatCurrency(value: string | number): string {
    return currencyFormatter.format(Number(value));
}

function formatDate(value: string | null): string {
    return value ? dateFormatter.format(new Date(value)) : '-';
}

export default function SalesReport({
    filters,
    summary,
    orders,
    topProducts,
}: Props) {
    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(
            '/reports/sales',
            {
                date: formData.get('date')?.toString() ?? filters.date,
            },
            { preserveScroll: true },
        );
    }

    return (
        <>
            <Head title="Laporan Penjualan" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Laporan Penjualan
                        </h1>
                        <p className="text-muted-foreground">
                            Ringkasan omzet, diskon, transaksi, dan produk laris
                            harian.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter</CardTitle>
                        <CardDescription>
                            Pilih tanggal laporan.
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

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                            <CardDescription>Transaksi sukses</CardDescription>
                            <CardTitle>{summary.transactions}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Transaksi batal</CardDescription>
                            <CardTitle>
                                {summary.cancelled_transactions}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaksi</CardTitle>
                            <CardDescription>
                                Daftar order pada tanggal terpilih.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {orders.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Belum ada transaksi.
                                </div>
                            ) : (
                                orders.map((order) => (
                                    <Link
                                        key={order.id}
                                        href={`/orders/${order.id}`}
                                        className="grid gap-2 rounded-lg border p-4 hover:bg-muted/50 md:grid-cols-[1fr_120px_120px_120px] md:items-center"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {order.order_code}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(order.created_at)} ·{' '}
                                                {order.cashier ?? '-'}
                                            </p>
                                        </div>
                                        <div className="text-sm">
                                            Diskon{' '}
                                            {formatCurrency(
                                                order.discount_amount,
                                            )}
                                        </div>
                                        <div className="font-semibold">
                                            {formatCurrency(order.total)}
                                        </div>
                                        <Badge
                                            variant={
                                                order.status === 'cancelled'
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                        >
                                            {order.status}
                                        </Badge>
                                    </Link>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Produk laris</CardTitle>
                            <CardDescription>
                                Top 5 berdasarkan qty terjual.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3">
                            {topProducts.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada penjualan.
                                </p>
                            ) : (
                                topProducts.map((product, index) => (
                                    <div
                                        key={product.product_name}
                                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                #{index + 1}{' '}
                                                {product.product_name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {product.sold_qty} terjual
                                            </p>
                                        </div>
                                        <p className="font-semibold">
                                            {formatCurrency(
                                                product.gross_sales,
                                            )}
                                        </p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

SalesReport.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
