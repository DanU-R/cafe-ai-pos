import { ChangeEvent, FormEvent, ReactNode, useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import jsQR from 'jsqr';
import { Upload } from 'lucide-react';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';

type Settings = { qris_base_string: string };
type Props = { settings: Settings };
type PageProps = { flash?: { success?: string } };

export default function PaymentSettings({ settings }: Props) {
    const { flash } = usePage<PageProps>().props;
    const form = useForm(settings);
    const qrisImageInputRef = useRef<HTMLInputElement>(null);
    const [qrisReadMessage, setQrisReadMessage] = useState<string | null>(null);

    function showQrReadError(): void {
        alert('Gagal membaca QR. Pastikan gambar jelas.');
    }

    function handleImageUpload(event: ChangeEvent<HTMLInputElement>): void {
        const input = event.target;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;

                const context = canvas.getContext('2d');

                if (!context) {
                    showQrReadError();
                    input.value = '';
                    return;
                }

                context.drawImage(image, 0, 0);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const result = jsQR(imageData.data, imageData.width, imageData.height);

                if (result?.data) {
                    form.setData('qris_base_string', result.data);
                    setQrisReadMessage('QRIS berhasil dibaca. Klik Simpan Pengaturan.');
                } else {
                    setQrisReadMessage(null);
                    showQrReadError();
                }

                input.value = '';
            };

            image.onerror = () => {
                setQrisReadMessage(null);
                showQrReadError();
                input.value = '';
            };

            image.src = String(reader.result);
        };

        reader.onerror = () => {
            setQrisReadMessage(null);
            showQrReadError();
            input.value = '';
        };

        reader.readAsDataURL(file);
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post('/settings/payment', { preserveScroll: true });
    }

    return (
        <>
            <Head title="Setting Pembayaran POS" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <Card className="max-w-3xl">
                    <CardHeader>
                        <CardTitle>Upload gambar QRIS toko</CardTitle>
                        <CardDescription>Unggah gambar QRIS statis toko. Sistem akan membaca data QRIS dari gambar secara lokal di browser.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {flash?.success && (
                            <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                                <AlertTitle>Berhasil</AlertTitle>
                                <AlertDescription>{flash.success}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={submit} className="grid gap-4">
                            <div className="grid gap-3">
                                <input
                                    ref={qrisImageInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                                <button
                                    type="button"
                                    className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center transition hover:border-primary hover:bg-primary/10"
                                    onClick={() => qrisImageInputRef.current?.click()}
                                >
                                    <Upload className="size-8 text-primary" />
                                    <span className="text-base font-semibold">Upload gambar QRIS toko</span>
                                    <span className="max-w-md text-sm text-muted-foreground">
                                        Pilih foto/screenshot QRIS. Gambar hanya dibaca di browser dan tidak dikirim ke server.
                                    </span>
                                </button>
                                {qrisReadMessage && (
                                    <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                                        <AlertTitle>QRIS terbaca</AlertTitle>
                                        <AlertDescription>{qrisReadMessage}</AlertDescription>
                                    </Alert>
                                )}
                                <InputError message={form.errors.qris_base_string} />
                            </div>

                            <details className="rounded-lg border bg-muted/20 p-4">
                                <summary className="cursor-pointer text-sm font-medium">Pengaturan lanjutan</summary>
                                <div className="mt-4 grid gap-2">
                                    <Label htmlFor="qris_base_string">Data QRIS</Label>
                                    <textarea
                                        id="qris_base_string"
                                        className="min-h-36 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        value={form.data.qris_base_string}
                                        onChange={(event) => form.setData('qris_base_string', event.target.value)}
                                        placeholder="Data QRIS akan otomatis muncul setelah upload gambar. Edit manual hanya jika diperlukan."
                                    />
                                    <p className="text-xs text-muted-foreground">Gunakan bagian ini hanya untuk kebutuhan teknis/admin.</p>
                                </div>
                            </details>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={form.processing}>
                                    {form.processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PaymentSettings.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
