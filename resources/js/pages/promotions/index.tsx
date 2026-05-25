import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Promotion = { id: number; name: string; code: string; type: string; promo_type: string; target_id: number | null; value: string; minimum_spend: string; is_active: boolean };

type Props = { promotions: Promotion[] };

export default function PromotionIndex({ promotions }: Props) {
    return (
        <>
            <Head title="Promo" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><h1 className="text-2xl font-semibold">Promo/Voucher</h1><p className="text-sm text-muted-foreground">Atur promo checkout POS.</p></div>
                    <Button asChild><Link href="/promotions/create">Tambah Promo</Link></Button>
                </div>
                <Card><CardHeader><CardTitle>Daftar Promo</CardTitle></CardHeader><CardContent className="grid gap-3">
                    {promotions.map((promotion) => (
                        <div key={promotion.id} className="grid gap-2 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
                            <div><div className="font-medium">{promotion.name} · {promotion.code}</div><div className="text-sm text-muted-foreground">{promotion.promo_type} · {promotion.type === 'percent' ? `${promotion.value}%` : `Rp ${promotion.value}`} · Min Rp {promotion.minimum_spend}{promotion.target_id ? ` · Target #${promotion.target_id}` : ''}</div></div>
                            <div className="flex gap-2"><Badge variant={promotion.is_active ? 'default' : 'secondary'}>{promotion.is_active ? 'Aktif' : 'Nonaktif'}</Badge><Button asChild variant="outline"><Link href={`/promotions/${promotion.id}/edit`}>Edit</Link></Button></div>
                        </div>
                    ))}
                </CardContent></Card>
            </div>
        </>
    );
}

PromotionIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
