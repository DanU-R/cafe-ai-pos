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

type RecipeRow = {
    raw_material_id: string;
    qty: string;
};

type RawMaterialOption = {
    id: number;
    name: string;
    unit: string;
    stock: string;
};

type Product = {
    id: number;
    category_id: number;
    name: string;
    description?: string | null;
    price: string;
    cost_price: string;
    stock: number;
    minimum_stock: number;
    is_active: boolean;
    recipes?: { raw_material_id: number; qty: string }[];
};

type Props = {
    categories: CategoryOption[];
    rawMaterials: RawMaterialOption[];
    generatedDescription?: string | null;
    product?: Product;
};

export default function ProductForm({
    categories,
    rawMaterials,
    generatedDescription,
    product,
}: Props) {
    const isEditing = Boolean(product);
    const form = useForm({
        category_id: product?.category_id ? String(product.category_id) : '',
        name: product?.name ?? '',
        description: product?.description ?? '',
        price: product?.price ?? '',
        cost_price: product?.cost_price ?? '',
        stock: product?.stock ?? 0,
        minimum_stock: product?.minimum_stock ?? 0,
        is_active: product?.is_active ?? true,
        recipes:
            product?.recipes?.map((recipe) => ({
                raw_material_id: String(recipe.raw_material_id),
                qty: recipe.qty,
            })) ?? ([] as RecipeRow[]),
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
        };

        form.transform((data) => ({
            ...data,
            category_id: Number(data.category_id),
            stock: Number(data.stock),
            minimum_stock: Number(data.minimum_stock),
            recipes: data.recipes.map((recipe) => ({
                raw_material_id: Number(recipe.raw_material_id),
                qty: recipe.qty,
            })),
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

    function addRecipe(): void {
        form.setData('recipes', [
            ...form.data.recipes,
            { raw_material_id: '', qty: '1' },
        ]);
    }

    function removeRecipe(index: number): void {
        form.setData(
            'recipes',
            form.data.recipes.filter((_, rowIndex) => rowIndex !== index),
        );
    }

    function updateRecipe(
        index: number,
        key: keyof RecipeRow,
        value: string,
    ): void {
        form.setData(
            'recipes',
            form.data.recipes.map((recipe, rowIndex) =>
                rowIndex === index ? { ...recipe, [key]: value } : recipe,
            ),
        );
    }

    return (
        <>
            <Head
                title={isEditing ? 'Edit Produk/Menu' : 'Tambah Produk/Menu'}
            />

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
                            Lengkapi kategori, nama produk, deskripsi, harga,
                            stok, dan status aktif.
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
                                    <SelectTrigger
                                        id="category_id"
                                        className="w-full"
                                    >
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
                                        Belum ada kategori. Buat kategori dulu
                                        sebelum menambah produk.
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
                                    <Label htmlFor="description">
                                        Deskripsi
                                    </Label>
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
                                    className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
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
                                        form.setData(
                                            'price',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Contoh: 18000"
                                    required
                                />
                                <InputError message={form.errors.price} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="cost_price">Modal/HPP</Label>
                                <Input
                                    id="cost_price"
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={form.data.cost_price}
                                    onChange={(event) =>
                                        form.setData(
                                            'cost_price',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Contoh: 10000"
                                    required
                                />
                                <InputError message={form.errors.cost_price} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="stock">Stok</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={form.data.stock}
                                        onChange={(event) =>
                                            form.setData(
                                                'stock',
                                                Number(event.target.value),
                                            )
                                        }
                                        placeholder="Contoh: 20"
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
                                        step="1"
                                        value={form.data.minimum_stock}
                                        onChange={(event) =>
                                            form.setData(
                                                'minimum_stock',
                                                Number(event.target.value),
                                            )
                                        }
                                        placeholder="Contoh: 5"
                                        required
                                    />
                                    <InputError
                                        message={form.errors.minimum_stock}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 rounded-lg border p-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <Label>Resep/BOM bahan baku</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Opsional. Bahan akan otomatis berkurang saat POS checkout.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addRecipe}
                                        disabled={rawMaterials.length === 0}
                                    >
                                        Tambah bahan
                                    </Button>
                                </div>
                                {form.data.recipes.length === 0 ? (
                                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                        Belum ada resep bahan.
                                    </div>
                                ) : (
                                    form.data.recipes.map((recipe, index) => (
                                        <div
                                            key={index}
                                            className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
                                        >
                                            <Select
                                                value={recipe.raw_material_id}
                                                onValueChange={(value) =>
                                                    updateRecipe(
                                                        index,
                                                        'raw_material_id',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Pilih bahan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {rawMaterials.map((material) => (
                                                        <SelectItem
                                                            key={material.id}
                                                            value={String(material.id)}
                                                        >
                                                            {material.name} ({material.unit})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                min="0.001"
                                                step="0.001"
                                                value={recipe.qty}
                                                onChange={(event) =>
                                                    updateRecipe(
                                                        index,
                                                        'qty',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Qty"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => removeRecipe(index)}
                                            >
                                                Hapus
                                            </Button>
                                        </div>
                                    ))
                                )}
                                <InputError message={form.errors.recipes} />
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                <Checkbox
                                    id="is_active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData(
                                            'is_active',
                                            checked === true,
                                        )
                                    }
                                />
                                <div className="grid gap-1">
                                    <Label htmlFor="is_active">
                                        Produk aktif
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Produk aktif siap ditampilkan pada tahap
                                        POS berikutnya.
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
                                        form.processing ||
                                        categories.length === 0
                                    }
                                >
                                    {isEditing
                                        ? 'Simpan perubahan'
                                        : 'Simpan produk'}
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
