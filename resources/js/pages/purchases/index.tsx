import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
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

type Purchase = {
    id: number;
    purchase_code: string;
    supplier: string | null;
    cashier: string | null;
    purchase_date: string | null;
    total_amount: string;
    items_count: number;
    status: string;
    note: string | null;
};

type Props = {
    purchases: Purchase[];
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
});

function formatRupiah(value: number | string): string {
    return currencyFormatter.format(Number(value));
}

function formatDate(value: string | null): string {
    if (!value) {
        return '-';
    }

    return dateFormatter.format(new Date(value));
}

export default function PurchaseIndex({ purchases }: Props) {
    return (
        <>
            <Head title="Pembelian Stok" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Pembelian Stok
                        </h1>
                        <p className="text-muted-foreground">
                            Catat pembelian dari supplier dan stok produk otomatis naik.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/purchases/create">
                            <Plus className="size-4" />
                            Tambah pembelian
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat pembelian</CardTitle>
                        <CardDescription>
                            Data pembelian stok tersimpan dengan kode unik dan total nilai.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-[150px_130px_1fr_120px_150px_110px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-xl:hidden">
                                <div>Kode</div>
                                <div>Tanggal</div>
                                <div>Supplier</div>
                                <div>Item</div>
                                <div className="text-right">Total</div>
                                <div>Status</div>
                            </div>

                            {purchases.length > 0 ? (
                                purchases.map((purchase) => (
                                    <div
                                        key={purchase.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 xl:grid-cols-[150px_130px_1fr_120px_150px_110px] xl:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {purchase.purchase_code}
                                            </div>
                                            <div className="text-sm text-muted-foreground xl:hidden">
                                                {formatDate(purchase.purchase_date)}
                                            </div>
                                        </div>
                                        <div className="hidden text-sm text-muted-foreground xl:block">
                                            {formatDate(purchase.purchase_date)}
                                        </div>
                                        <div>
                                            <div>{purchase.supplier ?? 'Tanpa supplier'}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Dicatat oleh {purchase.cashier ?? '-'}
                                            </div>
                                            {purchase.note && (
                                                <div className="text-sm text-muted-foreground">
                                                    {purchase.note}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {purchase.items_count} produk
                                        </div>
                                        <div className="font-semibold xl:text-right">
                                            {formatRupiah(purchase.total_amount)}
                                        </div>
                                        <div>
                                            <Badge variant="secondary">
                                                {purchase.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    Belum ada pembelian stok.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PurchaseIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Pembelian Stok',
            href: '/purchases',
        },
    ],
};
