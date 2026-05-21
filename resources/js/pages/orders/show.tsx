import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
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

type OrderItem = {
    id: number;
    product_name: string;
    price: string;
    qty: number;
    subtotal: string;
};

type Order = {
    id: number;
    order_code: string;
    created_at: string | null;
    user?: {
        name: string;
    } | null;
    items: OrderItem[];
    total: string;
    paid_amount: string;
    change_amount: string;
    payment_method: string;
    status: string;
};

type Props = {
    order: Order;
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

export default function OrderShow({ order }: Props) {
    return (
        <>
            <Head title={`Detail ${order.order_code}`} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Detail Order
                        </h1>
                        <p className="text-muted-foreground">
                            Ringkasan transaksi {order.order_code}.
                        </p>
                    </div>
                    <Button variant="outline" asChild className="w-full sm:w-fit">
                        <Link href="/orders">
                            <ArrowLeft className="size-4" />
                            Kembali ke riwayat transaksi
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Item transaksi</CardTitle>
                            <CardDescription>
                                Nama dan harga memakai snapshot saat checkout.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border">
                                <div className="grid grid-cols-[1fr_140px_90px_140px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-md:hidden">
                                    <div>Produk</div>
                                    <div>Harga</div>
                                    <div>Qty</div>
                                    <div className="text-right">Subtotal</div>
                                </div>

                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1fr_140px_90px_140px] md:items-center"
                                    >
                                        <div className="font-medium">
                                            {item.product_name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatCurrency(item.price)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {item.qty}
                                        </div>
                                        <div className="font-medium md:text-right">
                                            {formatCurrency(item.subtotal)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>{order.order_code}</CardTitle>
                            <CardDescription>
                                {formatDate(order.created_at)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-1">
                                <div className="text-sm text-muted-foreground">Kasir</div>
                                <div className="font-medium">{order.user?.name ?? '-'}</div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-muted-foreground">Payment method</span>
                                <Badge variant="secondary">{order.payment_method}</Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge>{order.status}</Badge>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between gap-3">
                                    <span>Total</span>
                                    <span className="font-semibold">{formatCurrency(order.total)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                    <span>Uang bayar</span>
                                    <span>{formatCurrency(order.paid_amount)}</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                    <span>Kembalian</span>
                                    <span>{formatCurrency(order.change_amount)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

OrderShow.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Riwayat Transaksi',
            href: '/orders',
        },
        {
            title: 'Detail Order',
            href: '#',
        },
    ],
};
