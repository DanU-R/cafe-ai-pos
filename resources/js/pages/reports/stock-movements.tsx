import { FormEvent, ReactNode } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

type Movement = {
    id: number;
    created_at: string | null;
    product_name: string;
    type: 'restock' | 'sale' | 'cancel';
    qty: number;
    stock_before: number;
    stock_after: number;
    user: string;
    note?: string | null;
};

type Props = {
    filters: {
        date: string;
        type: string;
    };
    summary: {
        restock_qty: number;
        sale_qty: number;
        cancel_qty: number;
        movement_count: number;
    };
    movements: Movement[];
};

function formatDate(value: string | null): string {
    return value ? dateFormatter.format(new Date(value)) : '-';
}

function movementLabel(type: Movement['type']): string {
    if (type === 'restock') {
        return 'Restock';
    }

    if (type === 'cancel') {
        return 'Cancel';
    }

    return 'Sale';
}

export default function StockMovementReport({
    filters,
    summary,
    movements,
}: Props) {
    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        router.get(
            '/reports/stock-movements',
            {
                date: formData.get('date')?.toString() ?? filters.date,
                type: formData.get('type')?.toString() ?? filters.type,
            },
            { preserveScroll: true },
        );
    }

    const exportUrl = `/reports/stock-movements/export?date=${encodeURIComponent(filters.date)}&type=${encodeURIComponent(filters.type)}`;

    return (
        <>
            <Head title="Laporan Stok" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Laporan Stok
                        </h1>
                        <p className="text-muted-foreground">
                            Audit stok masuk, stok keluar, dan stok kembali dari
                            cancel.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <a href={exportUrl}>Export CSV</a>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Filter</CardTitle>
                        <CardDescription>
                            Pilih tanggal dan type movement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={submit}
                            className="flex flex-col gap-3 sm:flex-row sm:items-end"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="date">Tanggal</Label>
                                <Input
                                    id="date"
                                    name="date"
                                    type="date"
                                    defaultValue={filters.date}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Type</Label>
                                <Select
                                    name="type"
                                    defaultValue={filters.type || 'all'}
                                >
                                    <SelectTrigger className="w-full sm:w-48">
                                        <SelectValue placeholder="Semua type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Semua type
                                        </SelectItem>
                                        <SelectItem value="restock">
                                            Restock
                                        </SelectItem>
                                        <SelectItem value="sale">
                                            Sale
                                        </SelectItem>
                                        <SelectItem value="cancel">
                                            Cancel
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit">Terapkan</Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader>
                            <CardDescription>Total movement</CardDescription>
                            <CardTitle>{summary.movement_count}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Qty restock</CardDescription>
                            <CardTitle>{summary.restock_qty}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Qty sale</CardDescription>
                            <CardTitle>{summary.sale_qty}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardDescription>Qty cancel</CardDescription>
                            <CardTitle>{summary.cancel_qty}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Movement</CardTitle>
                        <CardDescription>
                            Histori movement stok pada filter aktif.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        {movements.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Belum ada movement stok.
                            </div>
                        ) : (
                            movements.map((movement) => (
                                <div
                                    key={movement.id}
                                    className="grid gap-2 rounded-lg border p-4 md:grid-cols-[1fr_110px_100px_120px] md:items-center"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {movement.product_name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(movement.created_at)} ·{' '}
                                            {movement.user}
                                        </p>
                                        {movement.note && (
                                            <p className="text-sm text-muted-foreground">
                                                {movement.note}
                                            </p>
                                        )}
                                    </div>
                                    <Badge
                                        variant={
                                            movement.type === 'sale'
                                                ? 'secondary'
                                                : movement.type === 'cancel'
                                                  ? 'destructive'
                                                  : 'default'
                                        }
                                    >
                                        {movementLabel(movement.type)}
                                    </Badge>
                                    <p className="text-sm">
                                        Qty {movement.qty}
                                    </p>
                                    <p className="font-medium">
                                        {movement.stock_before} →{' '}
                                        {movement.stock_after}
                                    </p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

StockMovementReport.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
