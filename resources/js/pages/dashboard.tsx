import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

type Summary = {
    revenue: string;
    transactions_count: number;
};

type RecentOrder = {
    id: number;
    order_code: string;
    created_at: string | null;
    user?: {
        name: string;
    } | null;
    total: string;
    status: string;
};

type TopProduct = {
    product_name: string;
    qty_sold: number;
    revenue: string;
};

type Props = {
    summary: Summary;
    recentOrders: RecentOrder[];
    topProducts: TopProduct[];
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

function formatCurrency(value: string): string {
    return currencyFormatter.format(Number(value));
}

function formatDate(value: string | null): string {
    return value ? dateFormatter.format(new Date(value)) : '-';
}

export default function Dashboard({ summary, recentOrders, topProducts }: Props) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Ringkasan akurat dari transaksi POS yang sudah completed.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardDescription>Omzet</CardDescription>
                            <CardTitle className="text-3xl">
                                {formatCurrency(summary.revenue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Total nilai order dengan status completed.
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardDescription>Jumlah transaksi</CardDescription>
                            <CardTitle className="text-3xl">
                                {summary.transactions_count}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Jumlah order dengan status completed.
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaksi terbaru</CardTitle>
                            <CardDescription>
                                Lima order completed terbaru.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {recentOrders.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        Belum ada transaksi.
                                    </div>
                                ) : (
                                    recentOrders.map((order) => (
                                        <Link
                                            key={order.id}
                                            href={`/orders/${order.id}`}
                                            className="grid gap-2 rounded-lg border p-4 transition hover:bg-muted/50 md:grid-cols-[1fr_160px_110px] md:items-center"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {order.order_code}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatDate(order.created_at)} ·{' '}
                                                    {order.user?.name ?? '-'}
                                                </div>
                                            </div>
                                            <div className="font-medium md:text-right">
                                                {formatCurrency(order.total)}
                                            </div>
                                            <div className="md:text-right">
                                                <Badge>{order.status}</Badge>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Produk terlaris</CardTitle>
                            <CardDescription>
                                Berdasarkan total qty dari order completed.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {topProducts.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        Belum ada produk terjual.
                                    </div>
                                ) : (
                                    topProducts.map((product, index) => (
                                        <div
                                            key={product.product_name}
                                            className="flex items-center justify-between gap-3 rounded-lg border p-4"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {index + 1}. {product.product_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatCurrency(product.revenue)}
                                                </div>
                                            </div>
                                            <Badge variant="secondary">
                                                {product.qty_sold} terjual
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
