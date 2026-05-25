import { Head, Link } from '@inertiajs/react';
import { Edit, Plus } from 'lucide-react';
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

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'cashier';
    created_at: string;
};

type Props = {
    users: ManagedUser[];
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function roleLabel(role: ManagedUser['role']): string {
    if (role === 'super_admin') {
        return 'Super admin';
    }

    return role === 'admin' ? 'Admin' : 'Kasir';
}

export default function UserIndex({ users }: Props) {
    return (
        <>
            <Head title="Manajemen User" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Manajemen User
                        </h1>
                        <p className="text-muted-foreground">
                            Kelola akun admin dan kasir POS.
                        </p>
                    </div>
                    <Button asChild className="w-full sm:w-fit">
                        <Link href="/users/create">
                            <Plus className="size-4" />
                            Tambah user
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Daftar user</CardTitle>
                        <CardDescription>
                            Ubah role dan reset password user.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3">
                            {users.length === 0 ? (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Belum ada user.
                                </div>
                            ) : (
                                users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_160px_180px_110px] md:items-center"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {user.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {user.email}
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                user.role === 'admin'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {roleLabel(user.role)}
                                        </Badge>
                                        <div className="text-sm text-muted-foreground">
                                            {dateFormatter.format(
                                                new Date(user.created_at),
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={`/users/${user.id}/edit`}
                                            >
                                                <Edit className="size-4" />
                                                Edit
                                            </Link>
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Manajemen User',
            href: '/users',
        },
    ],
};
