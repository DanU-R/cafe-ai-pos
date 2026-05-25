import { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Material = {
    id: number;
    name: string;
    unit: string;
    stock: string;
    minimum_stock: string;
    cost_per_unit: string;
    is_active: boolean;
};

type Props = {
    material?: Material;
};

export default function RawMaterialForm({ material }: Props) {
    const isEditing = Boolean(material);
    const form = useForm({
        name: material?.name ?? '',
        unit: material?.unit ?? 'gram',
        stock: material?.stock ?? '0',
        minimum_stock: material?.minimum_stock ?? '0',
        cost_per_unit: material?.cost_per_unit ?? '0',
        is_active: material?.is_active ?? true,
    });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (material) {
            form.put(`/raw-materials/${material.id}`, { preserveScroll: true });
            return;
        }

        form.post('/raw-materials', { preserveScroll: true });
    }

    return (
        <>
            <Head title={isEditing ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'} />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {isEditing ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
                    </h1>
                    <p className="text-muted-foreground">
                        Data ini dipakai resep/BOM untuk auto deduct saat POS.
                    </p>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Data bahan</CardTitle>
                        <CardDescription>
                            Isi nama, unit, stok, stok minimum, dan HPP/unit.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama bahan</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="unit">Unit</Label>
                                    <Input
                                        id="unit"
                                        value={form.data.unit}
                                        onChange={(event) =>
                                            form.setData(
                                                'unit',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError message={form.errors.unit} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cost_per_unit">HPP/unit</Label>
                                    <Input
                                        id="cost_per_unit"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.data.cost_per_unit}
                                        onChange={(event) =>
                                            form.setData(
                                                'cost_per_unit',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={form.errors.cost_per_unit}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="stock">Stok</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={form.data.stock}
                                        onChange={(event) =>
                                            form.setData(
                                                'stock',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError message={form.errors.stock} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="minimum_stock">
                                        Stok minimum
                                    </Label>
                                    <Input
                                        id="minimum_stock"
                                        type="number"
                                        min="0"
                                        step="0.001"
                                        value={form.data.minimum_stock}
                                        onChange={(event) =>
                                            form.setData(
                                                'minimum_stock',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <InputError
                                        message={form.errors.minimum_stock}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <Checkbox
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData('is_active', checked === true)
                                    }
                                />
                                <Label htmlFor="is_active">Aktif</Label>
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href="/raw-materials">Batal</Link>
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Simpan bahan
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
