import { Head, Link, router } from '@inertiajs/react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { dashboard } from '@/routes';

type DiningTable = {
    id: number;
    name: string;
    capacity: number;
    status: string;
    is_active: boolean;
    created_at: string;
};

type Props = {
    tables: DiningTable[];
};

function statusLabel(status: string): string {
    return {
        available: 'Tersedia',
        occupied: 'Terisi',
        reserved: 'Reservasi',
    }[status] ?? status;
}

export default function DiningTableIndex({ tables }: Props) {
    function destroy(table: DiningTable) {
        if (!confirm(`Hapus meja ${table.name}?`)) {
            return;
        }

        router.delete(`/dining-tables/${table.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Meja Dine-in" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Meja Dine-in
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola meja untuk pesanan makan di tempat.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/dining-tables/create">
                            <Plus className="size-4" />
                            Tambah meja
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar meja</CardTitle>
                        <CardDescription>
                            Meja aktif tampil di checkout POS dine-in.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-[1fr_120px_140px_120px_180px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium max-lg:hidden">
                                <div>Nama</div>
                                <div>Kapasitas</div>
                                <div>Status</div>
                                <div>Aktif</div>
                                <div className="text-right">Aksi</div>
                            </div>

                            {tables.length > 0 ? (
                                tables.map((table) => (
                                    <div
                                        key={table.id}
                                        className="grid gap-3 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_120px_140px_120px_180px] lg:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {table.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground lg:hidden">
                                                {table.capacity} kursi ·{' '}
                                                {statusLabel(table.status)}
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground max-lg:hidden">
                                            {table.capacity} kursi
                                        </div>
                                        <div>
                                            <Badge variant="secondary">
                                                {statusLabel(table.status)}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Badge
                                                variant={
                                                    table.is_active
                                                        ? 'secondary'
                                                        : 'outline'
                                                }
                                            >
                                                {table.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </div>
                                        <div className="flex gap-2 lg:justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={`/dining-tables/${table.id}/edit`}
                                                >
                                                    <Edit className="size-4" />
                                                    Edit
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => destroy(table)}
                                            >
                                                <Trash2 className="size-4" />
                                                Hapus
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    Belum ada meja.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DiningTableIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Meja Dine-in',
            href: '/dining-tables',
        },
    ],
};
