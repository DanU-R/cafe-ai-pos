import { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Product = { id: number; name: string; stock: number };
type RawMaterial = { id: number; name: string; unit: string; stock: string };
type Item = { type: 'product' | 'raw_material'; id: string; counted_stock: string; note: string };
type Props = { products: Product[]; rawMaterials: RawMaterial[] };

export default function StockOpnameForm({ products, rawMaterials }: Props) {
    const form = useForm({ opname_date: new Date().toISOString().slice(0, 10), note: '', items: [{ type: 'product', id: '', counted_stock: '0', note: '' }] as Item[] });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post('/stock-opnames');
    }

    function updateItem(index: number, key: keyof Item, value: string): void {
        form.setData('items', form.data.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value, ...(key === 'type' ? { id: '' } : {}) } : item));
    }

    return (
        <>
            <Head title="Buat Stock Opname" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card className="max-w-5xl">
                    <CardHeader><CardTitle>Buat Stock Opname</CardTitle><CardDescription>Simpan draft, lalu approve untuk apply adjustment.</CardDescription></CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2"><Label>Tanggal</Label><Input type="date" value={form.data.opname_date} onChange={(event) => form.setData('opname_date', event.target.value)} /><InputError message={form.errors.opname_date} /></div>
                            <div className="grid gap-3"><div className="flex items-center justify-between"><Label>Item opname</Label><Button type="button" variant="outline" onClick={() => form.setData('items', [...form.data.items, { type: 'product', id: '', counted_stock: '0', note: '' }])}>Tambah item</Button></div>{form.data.items.map((item, index) => <div key={index} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[150px_1fr_140px_1fr_auto]"><Select value={item.type} onValueChange={(value) => updateItem(index, 'type', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product">Produk</SelectItem><SelectItem value="raw_material">Bahan baku</SelectItem></SelectContent></Select><Select value={item.id} onValueChange={(value) => updateItem(index, 'id', value)}><SelectTrigger><SelectValue placeholder="Pilih item" /></SelectTrigger><SelectContent>{item.type === 'product' ? products.map((product) => <SelectItem key={product.id} value={String(product.id)}>{product.name} · stok {product.stock}</SelectItem>) : rawMaterials.map((material) => <SelectItem key={material.id} value={String(material.id)}>{material.name} · {material.stock} {material.unit}</SelectItem>)}</SelectContent></Select><Input type="number" step="0.001" min="0" value={item.counted_stock} onChange={(event) => updateItem(index, 'counted_stock', event.target.value)} /><Input value={item.note} placeholder="Catatan" onChange={(event) => updateItem(index, 'note', event.target.value)} /><Button type="button" variant="outline" disabled={form.data.items.length === 1} onClick={() => form.setData('items', form.data.items.filter((_, itemIndex) => itemIndex !== index))}>Hapus</Button></div>)}<InputError message={form.errors.items} /></div>
                            <div className="grid gap-2"><Label>Catatan dokumen</Label><Input value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} /><InputError message={form.errors.note} /></div>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" asChild><Link href="/stock-opnames">Batal</Link></Button><Button disabled={form.processing}>Simpan Draft</Button></div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
