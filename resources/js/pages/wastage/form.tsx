import { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

type Material = { id: number; name: string; unit: string; stock: string };
type Props = { rawMaterials: Material[] };

export default function WastageForm({ rawMaterials }: Props) {
    const form = useForm({ raw_material_id: '', qty: '', note: '' });
    function submit(e: FormEvent): void { e.preventDefault(); form.post('/wastage'); }
    return <><Head title="Wastage Bahan" /><div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4"><Card className="max-w-2xl"><CardHeader><CardTitle>Catat Wastage Bahan</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4"><div className="grid gap-2"><Label>Bahan</Label><select className="rounded-md border bg-background p-2" value={form.data.raw_material_id} onChange={(e) => form.setData('raw_material_id', e.target.value)}><option value="">Pilih bahan</option>{rawMaterials.map((m) => <option key={m.id} value={m.id}>{m.name} · stok {m.stock} {m.unit}</option>)}</select></div><div className="grid gap-2"><Label>Qty terbuang</Label><Input type="number" step="0.001" value={form.data.qty} onChange={(e) => form.setData('qty', e.target.value)} /></div><div className="grid gap-2"><Label>Catatan</Label><Input value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} /></div><div className="flex justify-end gap-2"><Button asChild variant="outline"><Link href="/raw-materials">Batal</Link></Button><Button disabled={form.processing}>Simpan</Button></div></form></CardContent></Card></div></>;
}

WastageForm.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
