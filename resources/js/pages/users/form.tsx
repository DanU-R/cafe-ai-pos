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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { dashboard } from '@/routes';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'admin' | 'cashier';
    has_manager_pin?: boolean;
};

type Props = {
    managedUser?: ManagedUser;
    canManageManagerPins?: boolean;
};

export default function UserForm({ managedUser, canManageManagerPins = false }: Props) {
    const isEditing = Boolean(managedUser);
    const form = useForm({
        name: managedUser?.name ?? '',
        email: managedUser?.email ?? '',
        role: managedUser?.role ?? 'cashier',
        password: '',
        manager_pin: '',
    });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const options = { preserveScroll: true };

        if (managedUser) {
            form.put(`/users/${managedUser.id}`, options);

            return;
        }

        form.post('/users', options);
    }

    return (
        <>
            <Head title={isEditing ? 'Edit User' : 'Tambah User'} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {isEditing ? 'Edit User' : 'Tambah User'}
                    </h1>
                    <p className="text-muted-foreground">
                        Simpan akun admin atau kasir.
                    </p>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Data user</CardTitle>
                        <CardDescription>
                            Password wajib saat tambah user. Kosongkan saat edit
                            jika tidak ingin reset password.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama</Label>
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

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                                <InputError message={form.errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={form.data.role}
                                    onValueChange={(value) =>
                                        form.setData(
                                            'role',
                                            value as 'super_admin' | 'admin' | 'cashier',
                                        )
                                    }
                                >
                                    <SelectTrigger id="role" className="w-full">
                                        <SelectValue placeholder="Pilih role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_admin">
                                            Super admin
                                        </SelectItem>
                                        <SelectItem value="admin">
                                            Admin
                                        </SelectItem>
                                        <SelectItem value="cashier">
                                            Kasir
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.role} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    {isEditing ? 'Password baru' : 'Password'}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={form.data.password}
                                    onChange={(event) =>
                                        form.setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required={!isEditing}
                                />
                                <InputError message={form.errors.password} />
                            </div>

                            {canManageManagerPins && (
                                <div className="grid gap-2 rounded-lg border p-3">
                                    <Label htmlFor="manager_pin">PIN manager/admin</Label>
                                    <Input
                                        id="manager_pin"
                                        type="password"
                                        inputMode="numeric"
                                        value={form.data.manager_pin}
                                        onChange={(event) =>
                                            form.setData(
                                                'manager_pin',
                                                event.target.value,
                                            )
                                        }
                                        placeholder={
                                            managedUser?.has_manager_pin
                                                ? 'Isi hanya untuk mengganti PIN'
                                                : 'Opsional, 4-8 digit'
                                        }
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Hanya super admin dapat set/ganti PIN. Hash tidak ditampilkan.
                                    </p>
                                    <InputError message={form.errors.manager_pin} />
                                </div>
                            )}

                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button variant="outline" asChild>
                                    <Link href="/users">Batal</Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={form.processing}
                                >
                                    {isEditing
                                        ? 'Simpan perubahan'
                                        : 'Simpan user'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

UserForm.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Manajemen User',
            href: '/users',
        },
        {
            title: 'Form',
            href: '/users/create',
        },
    ],
};
