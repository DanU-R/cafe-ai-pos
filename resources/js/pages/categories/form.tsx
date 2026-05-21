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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

type Category = {
    id: number;
    name: string;
};

type Props = {
    category?: Category;
};

export default function CategoryForm({ category }: Props) {
    const isEditing = Boolean(category);
    const form = useForm({
        name: category?.name ?? '',
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (category) {
            form.put(`/categories/${category.id}`, {
                preserveScroll: true,
            });

            return;
        }

        form.post('/categories', {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title={isEditing ? 'Edit Kategori' : 'Tambah Kategori'} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {isEditing ? 'Edit Kategori' : 'Tambah Kategori'}
                    </h1>
                    <p className="text-muted-foreground">
                        Simpan kategori menu untuk mengelompokkan produk POS.
                    </p>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Data kategori</CardTitle>
                        <CardDescription>
                            Gunakan nama singkat seperti Kopi, Non Kopi, Makanan,
                            atau Dessert.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama kategori</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    placeholder="Contoh: Kopi"
                                    required
                                    autoFocus
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href="/categories">Batal</Link>
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    {isEditing ? 'Simpan perubahan' : 'Simpan kategori'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CategoryForm.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Kategori',
            href: '/categories',
        },
        {
            title: 'Form',
            href: '/categories/create',
        },
    ],
};
