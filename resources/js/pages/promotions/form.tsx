import { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';

type Promotion = {
    id: number;
    name: string;
    code: string;
    type: string;
    promo_type: string;
    target_id: number | null;
    value: string;
    minimum_spend: string;
    starts_at: string | null;
    ends_at: string | null;
    start_time: string | null;
    end_time: string | null;
    active_days: string[] | null;
    is_active: boolean;
};

type Props = { promotion?: Promotion };

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function PromotionForm({ promotion }: Props) {
    const form = useForm({
        name: promotion?.name ?? '',
        code: promotion?.code ?? '',
        type: promotion?.type ?? 'fixed',
        promo_type: promotion?.promo_type ?? 'global',
        target_id: promotion?.target_id?.toString() ?? '',
        value: promotion?.value ?? '0',
        minimum_spend: promotion?.minimum_spend ?? '0',
        starts_at: promotion?.starts_at ?? '',
        ends_at: promotion?.ends_at ?? '',
        start_time: promotion?.start_time?.slice(0, 5) ?? '',
        end_time: promotion?.end_time?.slice(0, 5) ?? '',
        active_days: promotion?.active_days ?? [],
        is_active: promotion?.is_active ?? true,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (promotion) form.put(`/promotions/${promotion.id}`); else form.post('/promotions');
    }

    function toggleDay(day: string, checked: boolean) {
        form.setData('active_days', checked ? [...form.data.active_days, day] : form.data.active_days.filter((item) => item !== day));
    }

    return (
        <>
            <Head title={promotion ? 'Edit Promo' : 'Tambah Promo'} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card className="max-w-2xl">
                    <CardHeader><CardTitle>{promotion ? 'Edit Promo' : 'Tambah Promo'}</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4">
                            <div className="grid gap-2"><Label>Nama</Label><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /><InputError message={form.errors.name} /></div>
                            <div className="grid gap-2"><Label>Kode</Label><Input value={form.data.code} onChange={(e) => form.setData('code', e.target.value.toUpperCase())} /><InputError message={form.errors.code} /></div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2"><Label>Tipe Diskon</Label><Select value={form.data.type} onValueChange={(v) => form.setData('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Nominal</SelectItem><SelectItem value="percent">Persen</SelectItem></SelectContent></Select><InputError message={form.errors.type} /></div>
                                <div className="grid gap-2"><Label>Tipe Promo</Label><Select value={form.data.promo_type} onValueChange={(v) => form.setData('promo_type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="global">Global</SelectItem><SelectItem value="product_specific">Produk</SelectItem><SelectItem value="category_specific">Kategori</SelectItem><SelectItem value="bogo">BOGO</SelectItem><SelectItem value="happy_hour">Happy Hour</SelectItem></SelectContent></Select><InputError message={form.errors.promo_type} /></div>
                            </div>
                            <div className="grid gap-2"><Label>Target ID (produk/kategori, opsional)</Label><Input type="number" value={form.data.target_id} onChange={(e) => form.setData('target_id', e.target.value)} /><InputError message={form.errors.target_id} /></div>
                            <div className="grid gap-2"><Label>Nilai</Label><Input type="number" value={form.data.value} onChange={(e) => form.setData('value', e.target.value)} /><InputError message={form.errors.value} /></div>
                            <div className="grid gap-2"><Label>Minimum Belanja</Label><Input type="number" value={form.data.minimum_spend} onChange={(e) => form.setData('minimum_spend', e.target.value)} /><InputError message={form.errors.minimum_spend} /></div>
                            <div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label>Mulai</Label><Input type="date" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} /></div><div className="grid gap-2"><Label>Selesai</Label><Input type="date" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} /></div></div>
                            <div className="grid gap-2 sm:grid-cols-2"><div className="grid gap-2"><Label>Jam Mulai</Label><Input type="time" value={form.data.start_time} onChange={(e) => form.setData('start_time', e.target.value)} /></div><div className="grid gap-2"><Label>Jam Selesai</Label><Input type="time" value={form.data.end_time} onChange={(e) => form.setData('end_time', e.target.value)} /></div></div>
                            <div className="grid gap-2"><Label>Hari Aktif</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{days.map((day) => <label key={day} className="flex items-center gap-2 text-sm"><Checkbox checked={form.data.active_days.includes(day)} onCheckedChange={(checked) => toggleDay(day, Boolean(checked))} />{day}</label>)}</div><InputError message={form.errors.active_days} /></div>
                            <div className="flex items-center gap-2"><Checkbox checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', Boolean(checked))} /><Label>Aktif</Label></div>
                            <div className="flex gap-2"><Button disabled={form.processing}>{promotion ? 'Simpan' : 'Tambah'}</Button><Button asChild variant="outline"><Link href="/promotions">Batal</Link></Button></div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PromotionForm.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
