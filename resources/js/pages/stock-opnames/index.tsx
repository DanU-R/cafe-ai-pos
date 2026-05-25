import { Head, router, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Opname = {
    id: number;
    opname_code: string;
    opname_date: string | null;
    status: string;
    user: string | null;
    approver: string | null;
    approved_at: string | null;
    items_count: number;
    note: string | null;
};

type Props = { opnames: Opname[] };

export default function StockOpnameIndex({ opnames }: Props) {
    function approve(opname: Opname): void {
        if (confirm(`Approve ${opname.opname_code}? Stok akan disesuaikan.`)) {
            router.post(`/stock-opnames/${opname.id}/approve`);
        }
    }

    return (
        <>
            <Head title="Stock Opname" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Stock Opname</h1>
                        <p className="text-sm text-muted-foreground">Hitung fisik stok produk dan bahan baku, lalu approve adjustment.</p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/stock-opnames/create"><Plus className="mr-2 h-4 w-4" /> Buat Opname</Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat opname</CardTitle>
                        <CardDescription>{opnames.length} dokumen</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {opnames.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada stock opname.</div>
                        ) : opnames.map((opname) => (
                            <div key={opname.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-medium">{opname.opname_code}</p>
                                        <Badge variant={opname.status === 'approved' ? 'default' : 'secondary'}>{opname.status}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{opname.opname_date} · {opname.items_count} item · dibuat {opname.user ?? '-'}</p>
                                    {opname.approver && <p className="text-sm text-muted-foreground">Approved: {opname.approver} · {opname.approved_at}</p>}
                                    {opname.note && <p className="text-sm text-muted-foreground">{opname.note}</p>}
                                </div>
                                {opname.status === 'draft' && <Button onClick={() => approve(opname)}>Approve</Button>}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
