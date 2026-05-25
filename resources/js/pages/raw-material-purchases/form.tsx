import { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Supplier = { id: number; name: string };
type RawMaterial = { id: number; name: string; unit: string; stock: string; cost_per_unit: string };
type Item = { raw_material_id: string; qty: string; unit_cost: string };
type Props = { suppliers: Supplier[]; rawMaterials: RawMaterial[] };

export default function RawMaterialPurchaseForm({ suppliers, rawMaterials }: Props) {
    const form = useForm({ supplier_id: '', purchase_date: new Date().toISOString().slice(0, 10), note: '', items: [{ raw_material_id: '', qty: '1', unit_cost: '0' }] as Item[] });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post('/raw-material-purchases');
    }

    function updateItem(index: number, key: keyof Item, value: string): void {
        form.setData('items', form.data.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
    }

    return (
        <>
            <Head title="Tambah Pembelian Bahan" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card className="max-w-4xl">
                    <CardHeader><CardTitle>Tambah Pembelian Bahan Baku</CardTitle><CardDescription>Stok bahan otomatis bertambah setelah disimpan.</CardDescription></CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2"><Label>Tanggal</Label><Input type="date" value={form.data.purchase_date} onChange={(event) => form.setData('purchase_date', event.target.value)} /><InputError message={form.errors.purchase_date} /></div>
                            <div className="grid gap-2"><Label>Supplier</Label><Select value={form.data.supplier_id} onValueChange={(value) => form.setData('supplier_id', value)}><SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger><SelectContent>{suppliers.map((supplier) => <SelectItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</SelectItem>)}</SelectContent></Select><InputError message={form.errors.supplier_id} /></div>
                            <div className="grid gap-3"><div className="flex items-center justify-between"><Label>Item bahan</Label><Button type="button" variant="outline" onClick={() => form.setData('items', [...form.data.items, { raw_material_id: '', qty: '1', unit_cost: '0' }])}>Tambah item</Button></div>{form.data.items.map((item, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_120px_160px_auto]"><Select value={item.raw_material_id} onValueChange={(value) => updateItem(index, 'raw_material_id', value)}><SelectTrigger><SelectValue placeholder="Bahan baku" /></SelectTrigger><SelectContent>{rawMaterials.map((material) => <SelectItem key={material.id} value={String(material.id)}>{material.name} · {material.stock} {material.unit}</SelectItem>)}</SelectContent></Select><Input type="number" step="0.001" min="0.001" value={item.qty} onChange={(event) => updateItem(index, 'qty', event.target.value)} /><Input type="number" min="0" value={item.unit_cost} onChange={(event) => updateItem(index, 'unit_cost', event.target.value)} /><Button type="button" variant="outline" disabled={form.data.items.length === 1} onClick={() => form.setData('items', form.data.items.filter((_, itemIndex) => itemIndex !== index))}>Hapus</Button></div>)}<InputError message={form.errors.items} /></div>
                            <div className="grid gap-2"><Label>Catatan</Label><Input value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} /><InputError message={form.errors.note} /></div>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" asChild><Link href="/raw-material-purchases">Batal</Link></Button><Button disabled={form.processing}>Simpan</Button></div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
