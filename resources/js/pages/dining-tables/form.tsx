import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';

type DiningTable = {
    id: number;
    name: string;
    capacity: number;
    status: string;
    is_active: boolean;
};

type Props = {
    table?: DiningTable;
};

export default function DiningTableForm({ table }: Props) {
    const isEditing = Boolean(table);
    const form = useForm({
        name: table?.name ?? '',
        capacity: String(table?.capacity ?? 2),
        status: table?.status ?? 'available',
        is_active: table?.is_active ?? true,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (table) {
            form.put(`/dining-tables/${table.id}`, {
                preserveScroll: true,
            });

            return;
        }

        form.post('/dining-tables', {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title={isEditing ? 'Edit Meja' : 'Tambah Meja'} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {isEditing ? 'Edit Meja' : 'Tambah Meja'}
                    </h1>
                    <p className="text-muted-foreground">
                        Simpan meja untuk opsi dine-in di POS.
                    </p>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Data meja</CardTitle>
                        <CardDescription>
                            Gunakan nama singkat seperti Meja 1 atau VIP 1.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama meja</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    placeholder="Contoh: Meja 1"
                                    required
                                    autoFocus
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="capacity">Kapasitas</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={form.data.capacity}
                                    onChange={(event) =>
                                        form.setData(
                                            'capacity',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={form.errors.capacity} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={form.data.status}
                                    onValueChange={(value) =>
                                        form.setData('status', value)
                                    }
                                >
                                    <SelectTrigger
                                        id="status"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Pilih status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">
                                            Tersedia
                                        </SelectItem>
                                        <SelectItem value="occupied">
                                            Terisi
                                        </SelectItem>
                                        <SelectItem value="reserved">
                                            Reservasi
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.status} />
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <Checkbox
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData('is_active', checked === true)
                                    }
                                />
                                <Label htmlFor="is_active">Meja aktif</Label>
                            </div>
                            <InputError message={form.errors.is_active} />

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href="/dining-tables">Batal</Link>
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    {isEditing ? 'Simpan perubahan' : 'Simpan meja'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DiningTableForm.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Meja Dine-in',
            href: '/dining-tables',
        },
        {
            title: 'Form',
            href: '/dining-tables/create',
        },
    ],
};
