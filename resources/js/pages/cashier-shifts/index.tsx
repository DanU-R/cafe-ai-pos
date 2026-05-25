import { FormEvent } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
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
import { dashboard } from '@/routes';

type OpenShift = {
    id: number;
    shift_code: string;
    opened_at: string | null;
    opening_cash: string;
    expected_cash: number;
    expected_bca: number;
    expected_qris: number;
    cash_sales: number;
    bca_sales: number;
    qris_sales: number;
    cash_movements: number;
    note: string | null;
} | null;

type Shift = {
    id: number;
    shift_code: string;
    cashier: string | null;
    opened_at: string | null;
    closed_at: string | null;
    opening_cash: string;
    expected_cash: string;
    actual_cash: string | null;
    expected_bca: string;
    actual_bca: string | null;
    expected_qris: string;
    actual_qris: string | null;
    cash_difference: string | null;
    status: string;
    note: string | null;
};

type Props = {
    openShift: OpenShift;
    shifts: Shift[];
};

function formatRupiah(value: number | string | null) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));
}

export default function CashierShiftIndex({ openShift, shifts }: Props) {
    const openForm = useForm({
        opening_cash: '',
        note: '',
    });
    const closeForm = useForm({
        actual_cash: '',
        actual_bca: '',
        actual_qris: '',
        note: '',
    });

    function submitOpenShift(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        openForm.post('/cashier-shifts', {
            preserveScroll: true,
            onSuccess: () => openForm.reset(),
        });
    }

    function closeShift(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!openShift) {
            return;
        }

        closeForm.patch(`/cashier-shifts/${openShift.id}`, {
            preserveScroll: true,
            onSuccess: () => closeForm.reset(),
        });
    }

    const actualCashDifference = Number(closeForm.data.actual_cash || 0) - Number(openShift?.expected_cash ?? 0);
    const actualBcaDifference = Number(closeForm.data.actual_bca || 0) - Number(openShift?.expected_bca ?? 0);
    const actualQrisDifference = Number(closeForm.data.actual_qris || 0) - Number(openShift?.expected_qris ?? 0);

    function refreshExpectedCash() {
        router.reload({ only: ['openShift', 'shifts'] });
    }

    return (
        <>
            <Head title="Shift Kasir" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Shift Kasir
                        </h1>
                        <p className="text-muted-foreground">
                            Buka shift, hitung kas, lalu tutup shift kasir.
                        </p>
                    </div>
                    <Badge variant={openShift ? 'secondary' : 'outline'}>
                        {openShift ? 'Shift terbuka' : 'Belum buka shift'}
                    </Badge>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat shift</CardTitle>
                            <CardDescription>
                                Data shift terbaru tampil paling atas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-hidden rounded-lg border">
                                <div className="grid grid-cols-[1fr_140px_160px_160px_120px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-xl:hidden">
                                    <div>Kode</div>
                                    <div>Kasir</div>
                                    <div>Expected</div>
                                    <div>Selisih total</div>
                                    <div>Status</div>
                                </div>

                                {shifts.length > 0 ? (
                                    shifts.map((shift) => (
                                        <div
                                            key={shift.id}
                                            className="grid gap-3 border-b px-4 py-4 last:border-b-0 xl:grid-cols-[1fr_140px_160px_160px_120px] xl:items-center"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {shift.shift_code}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {shift.opened_at}
                                                    {shift.closed_at
                                                        ? ` → ${shift.closed_at}`
                                                        : ''}
                                                </div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {shift.cashier ?? '-'}
                                            </div>
                                            <div className="text-sm">
                                                {formatRupiah(shift.expected_cash)}
                                                <div className="text-xs text-muted-foreground">
                                                    BCA {formatRupiah(shift.expected_bca)} · QRIS {formatRupiah(shift.expected_qris)}
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                {shift.cash_difference === null
                                                    ? '-'
                                                    : formatRupiah(
                                                          shift.cash_difference,
                                                      )}
                                            </div>
                                            <div>
                                                <Badge
                                                    variant={
                                                        shift.status === 'open'
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                >
                                                    {shift.status === 'open'
                                                        ? 'Open'
                                                        : 'Closed'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                        Belum ada shift.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>
                                {openShift ? 'Tutup shift' : 'Buka shift'}
                            </CardTitle>
                            <CardDescription>
                                {openShift
                                    ? 'Masukkan kas aktual saat closing.'
                                    : 'Masukkan kas awal sebelum transaksi.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {openShift ? (
                                <form onSubmit={closeShift} className="grid gap-4">
                                    <div className="rounded-lg border p-3 text-sm">
                                        <div className="font-medium">
                                            {openShift.shift_code}
                                        </div>
                                        <div className="text-muted-foreground">
                                            Buka: {openShift.opened_at}
                                        </div>
                                        <div className="mt-3 grid gap-2">
                                            <div className="flex justify-between">
                                                <span>Kas awal</span>
                                                <span>
                                                    {formatRupiah(
                                                        openShift.opening_cash,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Penjualan tunai</span>
                                                <span>
                                                    {formatRupiah(
                                                        openShift.cash_sales,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-between font-semibold">
                                                <span>Mutasi kas drawer</span>
                                                <span>{formatRupiah(openShift.cash_movements)}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold">
                                                <span>Expected cash</span>
                                                <span>{formatRupiah(openShift.expected_cash)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Expected BCA/EDC</span>
                                                <span>{formatRupiah(openShift.expected_bca)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Expected QRIS</span>
                                                <span>{formatRupiah(openShift.expected_qris)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="actual_cash">
                                            Kas aktual
                                        </Label>
                                        <Input
                                            id="actual_cash"
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={closeForm.data.actual_cash}
                                            onChange={(event) =>
                                                closeForm.setData(
                                                    'actual_cash',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0"
                                            required
                                        />
                                        {closeForm.errors.actual_cash && (
                                            <p className="text-sm text-destructive">
                                                {closeForm.errors.actual_cash}
                                            </p>
                                        )}
                                        {closeForm.data.actual_cash !== '' && (
                                            <p className="text-sm text-muted-foreground">
                                                Selisih cash: {formatRupiah(actualCashDifference)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="actual_bca">BCA/EDC aktual</Label>
                                        <Input
                                            id="actual_bca"
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={closeForm.data.actual_bca}
                                            onChange={(event) => closeForm.setData('actual_bca', event.target.value)}
                                            placeholder="0"
                                            required
                                        />
                                        {closeForm.errors.actual_bca && (
                                            <p className="text-sm text-destructive">{closeForm.errors.actual_bca}</p>
                                        )}
                                        {closeForm.data.actual_bca !== '' && (
                                            <p className="text-sm text-muted-foreground">
                                                Selisih BCA: {formatRupiah(actualBcaDifference)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="actual_qris">QRIS aktual</Label>
                                        <Input
                                            id="actual_qris"
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={closeForm.data.actual_qris}
                                            onChange={(event) => closeForm.setData('actual_qris', event.target.value)}
                                            placeholder="0"
                                            required
                                        />
                                        {closeForm.errors.actual_qris && (
                                            <p className="text-sm text-destructive">{closeForm.errors.actual_qris}</p>
                                        )}
                                        {closeForm.data.actual_qris !== '' && (
                                            <p className="text-sm text-muted-foreground">
                                                Selisih QRIS: {formatRupiah(actualQrisDifference)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="close_note">
                                            Catatan
                                        </Label>
                                        <Input
                                            id="close_note"
                                            value={closeForm.data.note}
                                            onChange={(event) =>
                                                closeForm.setData(
                                                    'note',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Opsional"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full"
                                            onClick={refreshExpectedCash}
                                        >
                                            Refresh kas
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={closeForm.processing}
                                        >
                                            Tutup shift
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={submitOpenShift} className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="opening_cash">
                                            Kas awal
                                        </Label>
                                        <Input
                                            id="opening_cash"
                                            type="number"
                                            min="0"
                                            step="100"
                                            value={openForm.data.opening_cash}
                                            onChange={(event) =>
                                                openForm.setData(
                                                    'opening_cash',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="0"
                                            required
                                        />
                                        {openForm.errors.opening_cash && (
                                            <p className="text-sm text-destructive">
                                                {openForm.errors.opening_cash}
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="open_note">
                                            Catatan
                                        </Label>
                                        <Input
                                            id="open_note"
                                            value={openForm.data.note}
                                            onChange={(event) =>
                                                openForm.setData(
                                                    'note',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Opsional"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={openForm.processing}
                                    >
                                        Buka shift
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

CashierShiftIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Shift Kasir',
            href: '/cashier-shifts',
        },
    ],
};
