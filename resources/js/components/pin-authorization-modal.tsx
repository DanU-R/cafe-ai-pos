import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
    open: boolean;
    action: string;
    title?: string;
    description?: string;
    onCancel: () => void;
    onApproved: (pin: string) => void;
};

export default function PinAuthorizationModal({
    open,
    action,
    title = 'Otorisasi manager',
    description = 'Masukkan PIN admin/manager untuk melanjutkan aksi sensitif.',
    onCancel,
    onApproved,
}: Props) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setError('');
        setProcessing(true);

        const token = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        const response = await fetch('/manager-pin/approve', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            },
            body: JSON.stringify({ action, manager_pin: pin }),
        });

        setProcessing(false);

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            setError(
                payload?.errors?.manager_pin ??
                    payload?.message ??
                    'PIN manager tidak valid.',
            );

            return;
        }

        onApproved(pin);
        setPin('');
    }

    function close(): void {
        setPin('');
        setError('');
        onCancel();
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="manager_pin">PIN manager</Label>
                        <Input
                            id="manager_pin"
                            type="password"
                            inputMode="numeric"
                            autoFocus
                            value={pin}
                            onChange={(event) => setPin(event.target.value)}
                            placeholder="••••"
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={close}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing || pin === ''}>
                            {processing ? 'Memvalidasi...' : 'Setujui'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
