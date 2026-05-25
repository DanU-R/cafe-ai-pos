import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

type Customer = { id: number; name: string; phone: string | null; email: string | null; points: number; is_active: boolean };
type Props = { customers: Customer[] };

export default function CustomerIndex({ customers }: Props) {
    return <><Head title="Customer" /><div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Customer/Member</h1><Button asChild><Link href="/customers/create">Tambah</Link></Button></div><Card><CardHeader><CardTitle>Data customer</CardTitle></CardHeader><CardContent className="grid gap-3">{customers.map((customer) => <div key={customer.id} className="grid gap-1 rounded-lg border p-3 md:grid-cols-5"><div className="font-medium">{customer.name}</div><div>{customer.phone ?? '-'}</div><div>{customer.email ?? '-'}</div><div>{customer.points} poin</div><Button asChild variant="outline"><Link href={`/customers/${customer.id}/edit`}>Edit</Link></Button></div>)}</CardContent></Card></div></>;
}

CustomerIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
