import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';

type Order = { id: number; order_code: string; service_type: string; customer_name: string | null; kitchen_status: string; items: { product_name: string; qty: number }[] };

type Props = { orders: Order[] };

const nextStatus: Record<string, string> = { queued: 'preparing', preparing: 'ready', ready: 'served' };

export default function KitchenIndex({ orders }: Props) {
    function advance(order: Order): void {
        router.patch(`/kitchen/orders/${order.id}`, { kitchen_status: nextStatus[order.kitchen_status] });
    }

    return (
        <>
            <Head title="Kitchen Display" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <h1 className="text-2xl font-semibold tracking-tight">Kitchen Display</h1>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {orders.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada order dapur aktif.</p> : orders.map((order) => (
                        <Card key={order.id}>
                            <CardHeader><CardTitle>{order.order_code} · {order.kitchen_status}</CardTitle></CardHeader>
                            <CardContent className="grid gap-3">
                                <div className="text-sm text-muted-foreground">{order.service_type} {order.customer_name ? `· ${order.customer_name}` : ''}</div>
                                <ul className="grid gap-1 text-sm">{order.items.map((item, index) => <li key={index}>{item.qty}x {item.product_name}</li>)}</ul>
                                {nextStatus[order.kitchen_status] && <Button onClick={() => advance(order)}>Update ke {nextStatus[order.kitchen_status]}</Button>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}

KitchenIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
