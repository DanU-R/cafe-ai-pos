import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
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

type CategoryOption = {
    id: number;
    name: string;
};

type Product = {
    id: number;
    category_id: number;
    name: string;
    description?: string | null;
    price: string;
    is_active: boolean;
};

type Props = {
    categories: CategoryOption[];
    generatedDescription?: string | null;
    product?: Product;
};

export default function ProductForm({
    categories,
    generatedDescription,
    product,
}: Props) {
    const isEditing = Boolean(product);
    const form = useForm({
        category_id: product?.category_id ? String(product.category_id) : '',
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        is_active: product?.is_active ?? true,
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
        };

        form.transform((data) => ({
            ...data,
            category_id: Number(data.category_id),
        }));

        if (product) {
            form.put(`/products/${product.id}`, options);

            return;
        }

        form.post('/products', options);
    }

    function useGeneratedDescription() {
        if (!generatedDescription) {
            return;
        }

        form.setData('description', generatedDescription);
    }

    return (
        <>
            <Head title={isEditing ? 'Edit Produk/Menu' : 'Tambah Produk/Menu'} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {isEditing ? 'Edit Produk/Menu' : 'Tambah Produk/Menu'}
                    </h1>
                    <p className="text-muted-foreground">
                        Simpan data menu yang akan dipakai di POS Cafe.
                    </p>
                </div>

                <Card className="max-w-3xl">
                    <CardHeader>
                        <CardTitle>Data produk</CardTitle>
                        <CardDescription>
                            Lengkapi kategori, nama produk, deskripsi, harga, dan
                            status aktif.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="category_id">Kategori</Label>
                                <Select
                                    value={form.data.category_id}
                                    onValueChange={(value) =>
                                        form.setData('category_id', value)
                                    }
                                >
                                    <SelectTrigger id="category_id" className="w-full">
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={String(category.id)}
                                            >
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.category_id} />
                                {categories.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Belum ada kategori. Buat kategori dulu sebelum
                                        menambah produk.
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama produk</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    placeholder="Contoh: Es Kopi Susu Aren"
                                    required
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <Label htmlFor="description">Deskripsi</Label>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={useGeneratedDescription}
                                            disabled={!generatedDescription}
                                        >
                                            <Sparkles className="size-4" />
                                            Pakai hasil AI terakhir
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href="/ai/menu-description">
                                                Generate deskripsi
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                <textarea
                                    id="description"
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Deskripsi singkat produk/menu"
                                    rows={5}
                                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <InputError message={form.errors.description} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="price">Harga</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={form.data.price}
                                    onChange={(event) =>
                                        form.setData('price', event.target.value)
                                    }
                                    placeholder="Contoh: 18000"
                                    required
                                />
                                <InputError message={form.errors.price} />
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <Checkbox
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData('is_active', checked === true)
                                    }
                                />
                                <div className="grid gap-1">
                                    <Label htmlFor="is_active">Produk aktif</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Produk aktif siap ditampilkan pada tahap POS
                                        berikutnya.
                                    </p>
                                </div>
                            </div>
                            <InputError message={form.errors.is_active} />

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href="/products">Batal</Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        form.processing || categories.length === 0
                                    }
                                >
                                    {isEditing ? 'Simpan perubahan' : 'Simpan produk'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ProductForm.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Produk/Menu',
            href: '/products',
        },
        {
            title: 'Form',
            href: '/products/create',
        },
    ],
};
