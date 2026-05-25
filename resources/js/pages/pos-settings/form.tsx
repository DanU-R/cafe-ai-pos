import { FormEvent } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';

type Settings = { tax_percent: string; service_charge_percent: string; receipt_footer: string };
type Props = { settings: Settings };

export default function PosSettingForm({ settings }: Props) {
    const form = useForm(settings);
    function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); form.put('/pos-settings'); }
    return <><Head title="Setting POS" /><div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4"><Card className="max-w-2xl"><CardHeader><CardTitle>Setting POS</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label>Pajak Default (%)</Label><Input type="number" value={form.data.tax_percent} onChange={(e) => form.setData('tax_percent', e.target.value)} /><InputError message={form.errors.tax_percent} /></div><div className="grid gap-2"><Label>Service Charge Default (%)</Label><Input type="number" value={form.data.service_charge_percent} onChange={(e) => form.setData('service_charge_percent', e.target.value)} /><InputError message={form.errors.service_charge_percent} /></div><div className="grid gap-2"><Label>Footer Struk</Label><Input value={form.data.receipt_footer} onChange={(e) => form.setData('receipt_footer', e.target.value)} /><InputError message={form.errors.receipt_footer} /></div><Button disabled={form.processing}>Simpan</Button></form></CardContent></Card></div></>;
}

PosSettingForm.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
