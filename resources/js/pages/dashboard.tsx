import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Sparkles } from 'lucide-react';
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
    today_revenue: string;
    today_profit: string;
    today_transactions_count: number;
    low_stock_count: number;
    empty_stock_count: number;
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

type LowStockProduct = {
    id: number;
    name: string;
    category?: {
        name: string;
    } | null;
    stock: number;
    minimum_stock: number;
    suggested_restock: number;
};

type SalesChartPoint = {
    date: string;
    label: string;
    revenue: string;
};

type AiRestockPrediction = {
    item_name: string;
    predicted_days_left: number;
    urgency: 'High' | 'Medium' | 'Low';
    recommendation: string;
};

type Props = {
    summary: Summary;
    recentOrders: RecentOrder[];
    topProducts: TopProduct[];
    salesChart: SalesChartPoint[];
    lowStockProducts: LowStockProduct[];
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

function urgencyBadgeClass(urgency: AiRestockPrediction['urgency']): string {
    if (urgency === 'High') {
        return 'bg-destructive text-white';
    }

    if (urgency === 'Medium') {
        return 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-100';
    }

    return '';
}

export default function Dashboard({
    summary,
    recentOrders,
    topProducts,
    salesChart,
    lowStockProducts,
}: Props) {
    const [restockPredictions, setRestockPredictions] = useState<
        AiRestockPrediction[]
    >([]);
    const [isLoadingRestockPredictions, setIsLoadingRestockPredictions] =
        useState(true);
    const [hasRestockPredictionError, setHasRestockPredictionError] =
        useState(false);

    const maxChartRevenue = Math.max(
        ...salesChart.map((point) => Number(point.revenue)),
        1,
    );

    useEffect(() => {
        const abortController = new AbortController();

        async function loadPredictions() {
            try {
                const response = await fetch('/api/inventory/predictive-restock', {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    setHasRestockPredictionError(true);
                    setRestockPredictions([]);

                    return;
                }

                const data = (await response.json()) as {
                    predictions?: AiRestockPrediction[];
                };

                setRestockPredictions((data.predictions ?? []).slice(0, 15));
                setHasRestockPredictionError(false);
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    setHasRestockPredictionError(true);
                    setRestockPredictions([]);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoadingRestockPredictions(false);
                }
            }
        }

        loadPredictions();

        return () => abortController.abort();
    }, []);

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Ringkasan akurat dari transaksi POS yang sudah
                        completed.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                            <CardDescription>Omzet hari ini</CardDescription>
                            <CardTitle className="text-3xl">
                                {formatCurrency(summary.today_revenue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            KPI penjualan tanggal aktif hari ini.
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardDescription>Profit hari ini</CardDescription>
                            <CardTitle className="text-3xl">
                                {formatCurrency(summary.today_profit)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Estimasi omzet dikurangi HPP produk.
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

                <Card>
                    <CardHeader>
                        <CardTitle>Grafik penjualan 7 hari</CardTitle>
                        <CardDescription>
                            Tren omzet harian dari order completed.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex h-48 items-end gap-2">
                            {salesChart.map((point) => (
                                <div
                                    key={point.date}
                                    className="flex flex-1 flex-col items-center gap-2"
                                >
                                    <div
                                        className="w-full rounded-t bg-primary/80"
                                        style={{
                                            height: `${Math.max((Number(point.revenue) / maxChartRevenue) * 160, 4)}px`,
                                        }}
                                        title={formatCurrency(point.revenue)}
                                    />
                                    <div className="text-xs text-muted-foreground">
                                        {point.label}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="size-5 text-destructive" />
                                    Alert stok rendah
                                </CardTitle>
                                <CardDescription>
                                    Produk dengan stok sama atau di bawah
                                    minimum stok.
                                </CardDescription>
                            </div>
                            <Link
                                href="/reports/low-stock"
                                className="text-sm font-medium text-primary hover:underline"
                            >
                                Lihat laporan restock
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-muted-foreground">
                                    Stok menipis
                                </div>
                                <div className="text-2xl font-semibold">
                                    {summary.low_stock_count}
                                </div>
                            </div>
                            <div className="rounded-lg border p-4">
                                <div className="text-sm text-muted-foreground">
                                    Stok kosong
                                </div>
                                <div className="text-2xl font-semibold">
                                    {summary.empty_stock_count}
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {lowStockProducts.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                                    Semua stok aman.
                                </div>
                            ) : (
                                lowStockProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={`/products/${product.id}/edit`}
                                        className="rounded-lg border p-4 transition hover:bg-muted/50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="font-medium">
                                                    {product.name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {product.category?.name ??
                                                        '-'}
                                                </div>
                                            </div>
                                            <div className="grid gap-2 text-right">
                                                <Badge variant="destructive">
                                                    {product.stock} /{' '}
                                                    {product.minimum_stock}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    Restock{' '}
                                                    {product.suggested_restock}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="size-5 text-primary" />
                            AI Restock Predictions
                        </CardTitle>
                        <CardDescription>
                            Prediksi urgensi restock berbasis stok dan rata-rata
                            pemakaian/penjualan 7 hari.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingRestockPredictions ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Memuat prediksi AI...
                            </div>
                        ) : hasRestockPredictionError ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Prediksi AI belum tersedia.
                            </div>
                        ) : restockPredictions.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Tidak ada item kritis untuk direstock.
                            </div>
                        ) : (
                            <div className="grid gap-3 lg:grid-cols-2">
                                {restockPredictions.map((prediction) => (
                                    <div
                                        key={`${prediction.item_name}-${prediction.urgency}`}
                                        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_120px]"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium">
                                                {prediction.item_name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {prediction.recommendation}
                                            </div>
                                        </div>
                                        <div className="grid content-start gap-2 sm:justify-items-end">
                                            <Badge
                                                variant="secondary"
                                                className={urgencyBadgeClass(
                                                    prediction.urgency,
                                                )}
                                            >
                                                {prediction.urgency}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {prediction.predicted_days_left}{' '}
                                                hari tersisa
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                                                    {formatDate(
                                                        order.created_at,
                                                    )}{' '}
                                                    · {order.user?.name ?? '-'}
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
                                                    {index + 1}.{' '}
                                                    {product.product_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {formatCurrency(
                                                        product.revenue,
                                                    )}
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
