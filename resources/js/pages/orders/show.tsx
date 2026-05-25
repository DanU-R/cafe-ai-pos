import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft, GitBranch, Printer, Shuffle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import PinAuthorizationModal from '@/components/pin-authorization-modal';
import { dashboard } from '@/routes';

type OrderItemModifier = {
    id: number;
    name: string;
    price: string;
};

type OrderItem = {
    id: number;
    product_name: string;
    price: string;
    qty: number;
    refunded_qty: number;
    subtotal: string;
    modifiers: OrderItemModifier[];
};

type OrderPayment = {
    id: number;
    method: string;
    amount: string;
    reference: string | null;
};

type OrderRefund = {
    id: number;
    refund_code: string;
    created_at: string | null;
    amount: string;
    method: string;
    reason?: string | null;
};

type Order = {
    id: number;
    order_code: string;
    created_at: string | null;
    user?: {
        name: string;
    } | null;
    items: OrderItem[];
    subtotal_amount: string;
    discount_amount: string;
    total: string;
    paid_amount: string;
    change_amount: string;
    payment_method: string;
    service_type: string;
    dining_table?: {
        id: number;
        name: string;
    } | null;
    cashier_shift?: {
        shift_code: string;
    } | null;
    customer_name: string | null;
    payments: OrderPayment[];
    refunds: OrderRefund[];
    status: string;
};

type AvailableTable = {
    id: number;
    name: string;
    capacity: number;
};

type Props = {
    order: Order;
    availableTables: AvailableTable[];
    activeStatuses: string[];
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

function rupiahAmount(value: number | string | null | undefined): number {
    return Math.round(Number(value ?? 0));
}

function formatCurrency(value: number | string | null | undefined): string {
    return currencyFormatter.format(rupiahAmount(value));
}

function formatDate(value: string | null): string {
    return value ? dateFormatter.format(new Date(value)) : '-';
}

function serviceTypeLabel(order: Order): string {
    if (order.service_type === 'dine_in') {
        return order.dining_table
            ? `Dine-in · ${order.dining_table.name}`
            : 'Dine-in';
    }

    return 'Takeaway';
}

export default function OrderShow({ order, availableTables, activeStatuses }: Props) {
    const [pendingAction, setPendingAction] = useState<'cancel' | 'refund' | null>(null);
    const [isMoveOpen, setIsMoveOpen] = useState(false);
    const [moveTableId, setMoveTableId] = useState('');
    const [isSplitOpen, setIsSplitOpen] = useState(false);
    const [splitQty, setSplitQty] = useState<Record<number, number>>({});
    const canHospitalityAction = activeStatuses.includes(order.status);
    function printReceipt(): void {
        window.print();
    }

    function cancelOrder(): void {
        if (
            !confirm(`Batalkan order ${order.order_code} dan kembalikan stok?`)
        ) {
            return;
        }

        setPendingAction('cancel');
    }

    function refundOrder(): void {
        const items = order.items
            .filter((item) => item.qty > item.refunded_qty)
            .map((item) => ({
                order_item_id: item.id,
                qty: item.qty - item.refunded_qty,
            }));

        if (items.length === 0) {
            return;
        }

        if (!confirm(`Refund semua sisa item order ${order.order_code}?`)) {
            return;
        }

        setPendingAction('refund');
    }

    function moveTable(): void {
        if (!moveTableId) {
            return;
        }

        router.patch(
            `/orders/${order.id}/move-table`,
            { dining_table_id: moveTableId },
            {
                preserveScroll: true,
                onSuccess: () => setIsMoveOpen(false),
            },
        );
    }

    function splitBill(): void {
        const items = order.items
            .map((item) => ({
                order_item_id: item.id,
                qty: Number(splitQty[item.id] ?? 0),
            }))
            .filter((item) => item.qty > 0);

        if (items.length === 0) {
            return;
        }

        router.post(
            `/orders/${order.id}/split-bill`,
            { items },
            {
                preserveScroll: true,
                onSuccess: () => setIsSplitOpen(false),
            },
        );
    }

    function approveSensitiveAction(pin: string): void {
        if (pendingAction === 'cancel') {
            router.patch(
                `/orders/${order.id}/cancel`,
                { manager_pin: pin },
                { preserveScroll: true },
            );
        }

        if (pendingAction === 'refund') {
            const items = order.items
                .filter((item) => item.qty > item.refunded_qty)
                .map((item) => ({
                    order_item_id: item.id,
                    qty: item.qty - item.refunded_qty,
                }));

            router.post(
                `/orders/${order.id}/refunds`,
                {
                    method: 'cash',
                    reason: 'Refund dari detail order',
                    manager_pin: pin,
                    items,
                },
                { preserveScroll: true },
            );
        }

        setPendingAction(null);
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
            <PinAuthorizationModal
                open={pendingAction !== null}
                action={pendingAction === 'refund' ? 'order.refund' : 'order.cancel'}
                title={pendingAction === 'refund' ? 'Otorisasi refund' : 'Otorisasi pembatalan order'}
                description="Aksi ini membutuhkan PIN admin/manager."
                onCancel={() => setPendingAction(null)}
                onApproved={approveSensitiveAction}
            />
            <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pindah meja</DialogTitle>
                        <DialogDescription>
                            Pilih meja tersedia untuk order {order.order_code}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <select
                            className="rounded-md border bg-background p-2"
                            value={moveTableId}
                            onChange={(event) => setMoveTableId(event.target.value)}
                        >
                            <option value="">Pilih meja</option>
                            {availableTables.map((table) => (
                                <option key={table.id} value={table.id}>
                                    {table.name} · {table.capacity} kursi
                                </option>
                            ))}
                        </select>
                        <Button type="button" onClick={moveTable} disabled={!moveTableId}>
                            Pindahkan
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isSplitOpen} onOpenChange={setIsSplitOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Split bill</DialogTitle>
                        <DialogDescription>
                            Isi qty item yang akan dipindah ke bill baru.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid max-h-[60vh] gap-3 overflow-y-auto">
                        {order.items.map((item) => (
                            <div key={item.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_120px] sm:items-center">
                                <div>
                                    <div className="font-medium">{item.product_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Maks {item.qty} · {formatCurrency(item.price)} / item
                                    </div>
                                </div>
                                <input
                                    className="rounded-md border bg-background p-2"
                                    type="number"
                                    min="0"
                                    max={item.qty}
                                    value={splitQty[item.id] ?? 0}
                                    onChange={(event) =>
                                        setSplitQty((current) => ({
                                            ...current,
                                            [item.id]: Number(event.target.value),
                                        }))
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <Button type="button" onClick={splitBill}>
                        Buat split bill
                    </Button>
                </DialogContent>
            </Dialog>

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
                        {canHospitalityAction && order.service_type === 'dine_in' && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsMoveOpen(true)}
                                className="w-full sm:w-fit"
                            >
                                <Shuffle className="size-4" />
                                Pindah meja
                            </Button>
                        )}
                        {canHospitalityAction && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsSplitOpen(true)}
                                className="w-full sm:w-fit"
                            >
                                <GitBranch className="size-4" />
                                Split bill
                            </Button>
                        )}
                        {order.status === 'completed' &&
                            order.items.some(
                                (item) => item.qty > item.refunded_qty,
                            ) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={refundOrder}
                                    className="w-full sm:w-fit"
                                >
                                    Refund order
                                </Button>
                            )}
                        {order.status !== 'cancelled' && order.status !== 'refunded' && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={cancelOrder}
                                className="w-full sm:w-fit"
                            >
                                <XCircle className="size-4" />
                                Batalkan order
                            </Button>
                        )}
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
                                        <div>
                                            <div className="font-medium">
                                                {item.product_name}
                                            </div>
                                            {item.modifiers.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.modifiers.map((modifier) => (
                                                        <Badge key={modifier.id} variant="secondary">
                                                            {modifier.name} +{formatCurrency(modifier.price)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {formatCurrency(item.price)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {item.qty}
                                            {item.refunded_qty > 0 &&
                                                ` · refund ${item.refunded_qty}`}
                                        </div>
                                        <div className="font-medium md:text-right">
                                            {formatCurrency(item.subtotal)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {order.refunds.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Riwayat refund</CardTitle>
                                <CardDescription>
                                    Refund/retur yang sudah diproses untuk order ini.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-3">
                                {order.refunds.map((refund) => (
                                    <div
                                        key={refund.id}
                                        className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {refund.refund_code}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {formatDate(refund.created_at)} · {refund.method}
                                            </div>
                                        </div>
                                        <div className="font-semibold">
                                            {formatCurrency(refund.amount)}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

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
                                    <span className="font-medium">
                                        {order.order_code}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Tanggal</span>
                                    <span>{formatDate(order.created_at)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Kasir</span>
                                    <span>{order.user?.name ?? '-'}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Layanan</span>
                                    <span>{serviceTypeLabel(order)}</span>
                                </div>
                                {order.customer_name && (
                                    <div className="flex justify-between gap-3">
                                        <span>Pelanggan</span>
                                        <span>{order.customer_name}</span>
                                    </div>
                                )}
                                {order.cashier_shift && (
                                    <div className="flex justify-between gap-3">
                                        <span>Shift</span>
                                        <span>{order.cashier_shift.shift_code}</span>
                                    </div>
                                )}
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
                                                {formatCurrency(item.price)} x{' '}
                                                {item.qty}
                                            </span>
                                            <span>
                                                {formatCurrency(item.subtotal)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid gap-2 text-sm print:gap-1 print:text-[11px]">
                                <div className="grid gap-2 print:gap-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-muted-foreground print:text-black">
                                            Payment method
                                        </span>
                                        <Badge variant="secondary">
                                            {order.payment_method}
                                        </Badge>
                                    </div>
                                    {order.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex justify-between gap-3 text-muted-foreground print:text-black"
                                        >
                                            <span>
                                                {payment.method}
                                                {payment.reference
                                                    ? ` · ${payment.reference}`
                                                    : ''}
                                            </span>
                                            <span>
                                                {formatCurrency(payment.amount)}
                                            </span>
                                        </div>
                                    ))}
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
                                    <span>Subtotal</span>
                                    <span className="font-semibold">
                                        {formatCurrency(order.subtotal_amount)}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                    <span>Diskon</span>
                                    <span>
                                        {formatCurrency(order.discount_amount)}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <span>Total</span>
                                    <span className="font-semibold">
                                        {formatCurrency(order.total)}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                    <span>Uang bayar</span>
                                    <span>
                                        {formatCurrency(order.paid_amount)}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                                    <span>Kembalian</span>
                                    <span>
                                        {formatCurrency(order.change_amount)}
                                    </span>
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
