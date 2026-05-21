import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
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
    function printReceipt(): void {
        window.print();
    }

    return (
        <>
            <Head title={`Detail ${order.order_code}`}>
                <style>{`
                    @media print {
                        @page {
                            size: 80mm auto;
                            margin: 6mm;
                        }

                        body * {
                            visibility: hidden;
                        }

                        .receipt-print-area,
                        .receipt-print-area * {
                            visibility: visible;
                        }

                        .receipt-print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 72mm;
                            margin: 0;
                            padding: 0;
                            border: 0 !important;
                            background: white !important;
                            box-shadow: none !important;
                            color: black !important;
                            font-size: 11px;
                        }
                    }
                `}</style>
            </Head>

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4 print:block print:overflow-visible print:p-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Detail Order
                        </h1>
                        <p className="text-muted-foreground">
                            Ringkasan transaksi {order.order_code}.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            type="button"
                            onClick={printReceipt}
                            className="w-full sm:w-fit"
                        >
                            <Printer className="size-4" />
                            Cetak Struk
                        </Button>
                        <Button
                            variant="outline"
                            asChild
                            className="w-full sm:w-fit"
                        >
                            <Link href="/orders">
                                <ArrowLeft className="size-4" />
                                Kembali ke riwayat transaksi
                            </Link>
                        </Button>
                    </div>
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

                    <Card className="receipt-print-area h-fit">
                        <CardHeader className="text-center print:gap-1 print:p-0 print:pb-3">
                            <CardTitle className="print:text-base">
                                AI POS Cafe
                            </CardTitle>
                            <CardDescription className="print:text-[11px] print:text-black">
                                Struk pembayaran
                            </CardDescription>
                        </CardHeader>
                        <CardContent
                            data-testid="print-receipt"
                            className="grid gap-4 print:gap-2 print:p-0 print:text-black"
                        >
                            <div className="grid gap-1 border-b pb-3 text-sm print:gap-0.5 print:border-black print:pb-2 print:text-[11px]">
                                <div className="flex justify-between gap-3">
                                    <span>Kode</span>
                                    <span className="font-medium">{order.order_code}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Tanggal</span>
                                    <span>{formatDate(order.created_at)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Kasir</span>
                                    <span>{order.user?.name ?? '-'}</span>
                                </div>
                            </div>
                            <div className="grid gap-2 border-b pb-3 print:gap-1 print:border-black print:pb-2">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="grid gap-1 text-sm print:text-[11px]"
                                    >
                                        <div className="font-medium">
                                            {item.product_name}
                                        </div>
                                        <div className="flex justify-between gap-3 text-muted-foreground print:text-black">
                                            <span>
                                                {formatCurrency(item.price)} x {item.qty}
                                            </span>
                                            <span>
                                                {formatCurrency(item.subtotal)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-2 text-sm print:gap-1 print:text-[11px]">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground print:text-black">
                                        Payment method
                                    </span>
                                    <Badge variant="secondary">{order.payment_method}</Badge>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground print:text-black">
                                        Status
                                    </span>
                                    <Badge>{order.status}</Badge>
                                </div>
                            </div>

                            <div className="border-t pt-4 print:border-black print:pt-2">
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

                            <p className="border-t pt-4 text-center text-sm text-muted-foreground print:border-black print:pt-2 print:text-[11px] print:text-black">
                                Terima kasih
                            </p>
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
