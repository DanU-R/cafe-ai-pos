import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

type Props = { purchases: Purchase[] };

function formatRupiah(value: number | string): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value));
}

export default function RawMaterialPurchaseIndex({ purchases }: Props) {
    return (
        <>
            <Head title="Pembelian Bahan Baku" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Pembelian Bahan Baku</h1>
                        <p className="text-sm text-muted-foreground">Restock bahan baku dan audit pergerakan stok.</p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/raw-material-purchases/create"><Plus className="mr-2 h-4 w-4" /> Tambah Pembelian</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat pembelian</CardTitle>
                        <CardDescription>{purchases.length} transaksi</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {purchases.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada pembelian bahan baku.</div>
                        ) : purchases.map((purchase) => (
                            <div key={purchase.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{purchase.purchase_code}</p>
                                        <Badge>{purchase.status}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{purchase.purchase_date} · {purchase.supplier ?? 'Tanpa supplier'} · {purchase.items_count} item</p>
                                    {purchase.note && <p className="text-sm text-muted-foreground">{purchase.note}</p>}
                                </div>
                                <div className="text-right font-semibold">{formatRupiah(purchase.total_amount)}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
