type ReceiptItem = {
    name: string;
    qty: number;
    unitPrice: number;
    modifiers: { name: string; price: number }[];
    lineTotal: number;
};

type ReceiptPayment = {
    method: string;
    amount: number;
    reference?: string;
};

export type ReceiptOrder = {
    orderCode?: string;
    dateTime: string;
    cashier?: string;
    customerName?: string;
    serviceType?: string;
    items: ReceiptItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    total: number;
    payments: ReceiptPayment[];
    paidAmount: number;
    changeAmount: number;
};

type Props = {
    order: ReceiptOrder | null;
};

function formatRupiah(value: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Math.round(value));
}

function paymentLabel(method: string): string {
    const labels: Record<string, string> = {
        cash: 'Tunai',
        card: 'Kartu',
        qris: 'QRIS',
        transfer: 'Transfer',
        mixed: 'Campuran',
    };

    return labels[method] ?? method;
}

function serviceTypeLabel(serviceType?: string): string {
    const labels: Record<string, string> = {
        takeaway: 'Takeaway',
        dine_in: 'Dine-in',
        delivery: 'Delivery',
    };

    return serviceType ? labels[serviceType] ?? serviceType : '-';
}

export default function ReceiptTemplate({ order }: Props) {
    if (!order) {
        return null;
    }

    return (
        <div id="receipt-print-area" className="hidden bg-white p-2 font-mono text-[10px] leading-tight text-black print:block">
            <div className="text-center">
                <div className="text-xs font-bold uppercase">KasirKu Cafe</div>
                <div>Jl. Cafe No. 1</div>
                <div>Terima kasih atas kunjungan Anda</div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="space-y-0.5">
                <div className="flex justify-between gap-2">
                    <span>No</span>
                    <span className="text-right">{order.orderCode ?? '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>Waktu</span>
                    <span className="text-right">{order.dateTime}</span>
                </div>
                {order.cashier && (
                    <div className="flex justify-between gap-2">
                        <span>Kasir</span>
                        <span className="text-right">{order.cashier}</span>
                    </div>
                )}
                <div className="flex justify-between gap-2">
                    <span>Layanan</span>
                    <span className="text-right">{serviceTypeLabel(order.serviceType)}</span>
                </div>
                {order.customerName && (
                    <div className="flex justify-between gap-2">
                        <span>Customer</span>
                        <span className="text-right">{order.customerName}</span>
                    </div>
                )}
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="space-y-1">
                {order.items.map((item, index) => (
                    <div key={`${item.name}-${index}`}>
                        <div className="font-semibold">{item.name}</div>
                        {item.modifiers.map((modifier) => (
                            <div key={modifier.name} className="pl-2">
                                + {modifier.name} {modifier.price > 0 ? formatRupiah(modifier.price) : ''}
                            </div>
                        ))}
                        <div className="flex justify-between gap-2">
                            <span>
                                {item.qty} x {formatRupiah(item.unitPrice)}
                            </span>
                            <span>{formatRupiah(item.lineTotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="space-y-0.5">
                <div className="flex justify-between gap-2">
                    <span>Subtotal</span>
                    <span>{formatRupiah(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                    <div className="flex justify-between gap-2">
                        <span>Diskon</span>
                        <span>-{formatRupiah(order.discountAmount)}</span>
                    </div>
                )}
                {order.taxAmount > 0 && (
                    <div className="flex justify-between gap-2">
                        <span>Pajak</span>
                        <span>{formatRupiah(order.taxAmount)}</span>
                    </div>
                )}
                {order.serviceChargeAmount > 0 && (
                    <div className="flex justify-between gap-2">
                        <span>Service</span>
                        <span>{formatRupiah(order.serviceChargeAmount)}</span>
                    </div>
                )}
                <div className="flex justify-between gap-2 border-t border-dashed border-black pt-1 text-xs font-bold">
                    <span>Total</span>
                    <span>{formatRupiah(order.total)}</span>
                </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="space-y-0.5">
                {order.payments.map((payment, index) => (
                    <div key={`${payment.method}-${index}`}>
                        <div className="flex justify-between gap-2">
                            <span>{paymentLabel(payment.method)}</span>
                            <span>{formatRupiah(payment.amount)}</span>
                        </div>
                        {payment.reference && <div className="break-all pl-2">Ref: {payment.reference}</div>}
                    </div>
                ))}
                <div className="flex justify-between gap-2">
                    <span>Dibayar</span>
                    <span>{formatRupiah(order.paidAmount)}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>Kembali</span>
                    <span>{formatRupiah(order.changeAmount)}</span>
                </div>
            </div>

            <div className="my-2 border-t border-dashed border-black" />

            <div className="text-center">
                <div>-- Terima Kasih --</div>
                <div>Simpan struk sebagai bukti transaksi</div>
            </div>
        </div>
    );
}
