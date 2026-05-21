import { Head, Link, router } from '@inertiajs/react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

type Category = {
    id: number;
    name: string;
    products_count: number;
    created_at: string;
};

type Props = {
    categories: Category[];
};

export default function CategoryIndex({ categories }: Props) {
    function destroy(category: Category) {
        if (!confirm(`Hapus kategori ${category.name}?`)) {
            return;
        }

        router.delete(`/categories/${category.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Kategori" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Kategori
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola kategori menu untuk data awal POS Cafe.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/categories/create">
                            <Plus className="size-4" />
                            Tambah kategori
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar kategori</CardTitle>
                        <CardDescription>
                            Kategori dipakai untuk mengelompokkan produk/menu.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-[1fr_120px_160px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-sm:hidden">
                                <div>Nama</div>
                                <div>Produk</div>
                                <div className="text-right">Aksi</div>
                            </div>

                            {categories.length > 0 ? (
                                categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_120px_160px] sm:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {category.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground sm:hidden">
                                                {category.products_count} produk
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground max-sm:hidden">
                                            {category.products_count} produk
                                        </div>
                                        <div className="flex gap-2 sm:justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={`/categories/${category.id}/edit`}
                                                >
                                                    <Edit className="size-4" />
                                                    Edit
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => destroy(category)}
                                            >
                                                <Trash2 className="size-4" />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    Belum ada kategori.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CategoryIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Kategori',
            href: '/categories',
        },
    ],
};
