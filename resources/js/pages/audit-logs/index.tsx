import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Log = { id: number; event: string; user: string; auditable_type: string; auditable_id: number | null; created_at: string };
type Props = { logs: Log[] };

export default function AuditLogIndex({ logs }: Props) {
    return (
        <>
            <Head title="Audit Log" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div><h1 className="text-2xl font-semibold">Audit Log</h1><p className="text-sm text-muted-foreground">200 aktivitas terbaru.</p></div>
                <Card><CardHeader><CardTitle>Aktivitas</CardTitle></CardHeader><CardContent className="grid gap-3">
                    {logs.map((log) => <div key={log.id} className="rounded-lg border p-4"><div className="font-medium">{log.event}</div><div className="text-sm text-muted-foreground">{log.user} · {log.auditable_type} #{log.auditable_id ?? '-'} · {log.created_at}</div></div>)}
                </CardContent></Card>
            </div>
        </>
    );
}

AuditLogIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
