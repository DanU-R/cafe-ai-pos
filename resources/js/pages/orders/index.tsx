import { Head, Link } from '@inertiajs/react';
import { Eye } from 'lucide-react';
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

type Order = {
    id: number;
    order_code: string;
    created_at: string | null;
    user?: {
        name: string;
    } | null;
    total: string;
    paid_amount: string;
    change_amount: string;
    payment_method: string;
    status: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedOrders = {
    data: Order[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

type Props = {
    orders: PaginatedOrders;
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

function decodePaginationLabel(label: string): string {
    return label.replace('&laquo;', '‹').replace('&raquo;', '›');
}

export default function OrderIndex({ orders }: Props) {
    return (
        <>
            <Head title="Riwayat Transaksi" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Riwayat Transaksi
                    </h1>
                    <p className="text-muted-foreground">
                        Lihat order POS yang sudah tersimpan.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar order</CardTitle>
                        <CardDescription>
                            Data ditampilkan ringkas. Detail item tersedia di halaman
                            detail order.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-[1.2fr_170px_150px_120px_120px_120px_130px_120px_110px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-xl:hidden">
                                <div>Kode order</div>
                                <div>Tanggal</div>
                                <div>Kasir</div>
                                <div>Total</div>
                                <div>Uang bayar</div>
                                <div>Kembalian</div>
                                <div>Payment</div>
                                <div>Status</div>
                                <div className="text-right">Aksi</div>
                            </div>

                            {orders.data.length > 0 ? (
                                orders.data.map((order) => (
                                    <div
                                        key={order.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 xl:grid-cols-[1.2fr_170px_150px_120px_120px_120px_130px_120px_110px] xl:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {order.order_code}
                                            </div>
                                            <div className="text-sm text-muted-foreground xl:hidden">
                                                {formatDate(order.created_at)} · {order.user?.name ?? '-'}
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground max-xl:hidden">
                                            {formatDate(order.created_at)}
                                        </div>
                                        <div className="text-sm text-muted-foreground max-xl:hidden">
                                            {order.user?.name ?? '-'}
                                        </div>
                                        <div className="text-sm font-medium">
                                            {formatCurrency(order.total)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatCurrency(order.paid_amount)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatCurrency(order.change_amount)}
                                        </div>
                                        <div>
                                            <Badge variant="secondary">
                                                {order.payment_method}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Badge>{order.status}</Badge>
                                        </div>
                                        <div className="flex xl:justify-end">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/orders/${order.id}`}>
                                                    <Eye className="size-4" />
                                                    Detail
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    Belum ada transaksi.
                                </div>
                            )}
                        </div>

                        {orders.links.length > 3 && (
                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-muted-foreground">
                                    Menampilkan {orders.from ?? 0} - {orders.to ?? 0} dari {orders.total} transaksi
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {orders.links.map((link) => (
                                        <Button
                                            key={`${link.label}-${link.url}`}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            asChild={Boolean(link.url)}
                                            disabled={!link.url}
                                        >
                                            {link.url ? (
                                                <Link href={link.url} preserveScroll>
                                                    {decodePaginationLabel(link.label)}
                                                </Link>
                                            ) : (
                                                <span>{decodePaginationLabel(link.label)}</span>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

OrderIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Riwayat Transaksi',
            href: '/orders',
        },
    ],
};
