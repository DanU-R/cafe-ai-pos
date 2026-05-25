import { FormEvent } from 'react';
import { Head, router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Refund = { id: number; refund_code: string; created_at: string | null; order_code: string; cashier: string; amount: string; method: string; reason?: string | null; items: { product_name: string; qty: number; amount: string }[] };
type Props = { filters: { date: string }; summary: { amount: string; refund_count: number; item_qty: number }; refunds: Refund[] };

const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const formatCurrency = (value: string) => currencyFormatter.format(Number(value));
const formatDate = (value: string | null) => (value ? dateFormatter.format(new Date(value)) : '-');

export default function RefundReport({ filters, summary, refunds }: Props) {
    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        router.get('/reports/refunds', { date: formData.get('date')?.toString() ?? filters.date }, { preserveScroll: true });
    }

    return <>
        <Head title="Laporan Refund" />
        <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
            <div><h1 className="text-2xl font-semibold tracking-tight">Laporan Refund</h1><p className="text-muted-foreground">Audit retur/refund order dan nilai dana kembali.</p></div>
            <Card><CardHeader><CardTitle>Filter</CardTitle><CardDescription>Pilih tanggal refund.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="grid gap-2"><Label htmlFor="date">Tanggal</Label><Input id="date" name="date" type="date" defaultValue={filters.date} /></div><Button type="submit">Terapkan</Button></form></CardContent></Card>
            <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardDescription>Total refund</CardDescription><CardTitle>{formatCurrency(summary.amount)}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Jumlah refund</CardDescription><CardTitle>{summary.refund_count}</CardTitle></CardHeader></Card><Card><CardHeader><CardDescription>Qty item</CardDescription><CardTitle>{summary.item_qty}</CardTitle></CardHeader></Card></div>
            <Card><CardHeader><CardTitle>Refund</CardTitle><CardDescription>Histori refund sesuai filter.</CardDescription></CardHeader><CardContent className="grid gap-3">{refunds.length === 0 ? <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada refund.</div> : refunds.map((refund) => <div key={refund.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_160px_120px]"><div><div className="font-medium">{refund.refund_code} · {refund.order_code}</div><div className="text-sm text-muted-foreground">{formatDate(refund.created_at)} · {refund.cashier}</div>{refund.reason && <div className="text-sm text-muted-foreground">{refund.reason}</div>}<div className="mt-2 flex flex-wrap gap-2">{refund.items.map((item) => <Badge key={`${refund.id}-${item.product_name}`} variant="secondary">{item.product_name} x {item.qty}</Badge>)}</div></div><div className="font-medium lg:text-right">{formatCurrency(refund.amount)}</div><Badge>{refund.method}</Badge></div>)}</CardContent></Card>
        </div>
    </>;
}
