import { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

type Customer = { id: number; name: string; phone: string | null; email: string | null; points: number; is_active: boolean; note: string | null };
type Props = { customer?: Customer };

export default function CustomerForm({ customer }: Props) {
    const form = useForm({ name: customer?.name ?? '', phone: customer?.phone ?? '', email: customer?.email ?? '', points: customer?.points ?? 0, is_active: customer?.is_active ?? true, note: customer?.note ?? '' });
    function submit(e: FormEvent): void { e.preventDefault(); customer ? form.put(`/customers/${customer.id}`) : form.post('/customers'); }
    return <><Head title="Form Customer" /><div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4"><Card className="max-w-2xl"><CardHeader><CardTitle>{customer ? 'Edit' : 'Tambah'} Customer</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label>Nama</Label><Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} /></div><div className="grid gap-2"><Label>Telepon</Label><Input value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} /></div><div className="grid gap-2"><Label>Email</Label><Input value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} /></div><div className="grid gap-2"><Label>Poin</Label><Input type="number" value={form.data.points} onChange={(e) => form.setData('points', Number(e.target.value))} /></div><div className="flex justify-end gap-2"><Button asChild variant="outline"><Link href="/customers">Batal</Link></Button><Button disabled={form.processing}>Simpan</Button></div></form></CardContent></Card></div></>;
}

CustomerForm.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
