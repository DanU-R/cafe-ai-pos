import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

type Props = {
    generatedDescription?: string;
    generationError?: string;
};

const toneOptions = [
    'Hangat dan ramah',
    'Premium dan elegan',
    'Santai dan anak muda',
    'Sehat dan natural',
    'Manis dan menggugah selera',
];

export default function MenuDescription({
    generatedDescription,
    generationError,
}: Props) {
    const form = useForm({
        name: '',
        ingredients: '',
        tone: toneOptions[0],
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.post('/ai/menu-description', {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="AI Generate Deskripsi Menu" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div className="max-w-3xl space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
                        <Sparkles className="size-4" />
                        Laravel AI SDK
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        AI Generate Deskripsi Menu
                    </h1>
                    <p className="text-muted-foreground">
                        Masukkan detail menu kafe, lalu AI akan membuat deskripsi
                        singkat untuk katalog POS.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detail menu</CardTitle>
                            <CardDescription>
                                Gunakan bahan utama yang paling menonjol agar
                                hasil lebih spesifik.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="grid gap-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nama menu</Label>
                                    <Input
                                        id="name"
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Contoh: Es Kopi Susu Aren"
                                        required
                                        autoFocus
                                    />
                                    <InputError message={form.errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="ingredients">
                                        Bahan utama
                                    </Label>
                                    <Input
                                        id="ingredients"
                                        value={form.data.ingredients}
                                        onChange={(event) =>
                                            form.setData(
                                                'ingredients',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Contoh: espresso, susu segar, gula aren"
                                        required
                                    />
                                    <InputError
                                        message={form.errors.ingredients}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="tone">Gaya bahasa</Label>
                                    <Select
                                        value={form.data.tone}
                                        onValueChange={(value) =>
                                            form.setData('tone', value)
                                        }
                                    >
                                        <SelectTrigger
                                            id="tone"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Pilih gaya bahasa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {toneOptions.map((tone) => (
                                                <SelectItem
                                                    key={tone}
                                                    value={tone}
                                                >
                                                    {tone}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.tone} />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full sm:w-fit"
                                    disabled={form.processing}
                                >
                                    {form.processing && <Spinner />}
                                    Generate deskripsi
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Hasil generate</CardTitle>
                            <CardDescription>
                                Deskripsi muncul di sini setelah AI selesai.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {generationError ? (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                                    {generationError}
                                </div>
                            ) : generatedDescription ? (
                                <div className="rounded-lg border bg-muted/40 p-4 text-sm leading-6">
                                    {generatedDescription}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed p-4 text-sm leading-6 text-muted-foreground">
                                    Belum ada hasil. Isi form, lalu tekan
                                    generate.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

MenuDescription.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'AI Generate Deskripsi Menu',
            href: '/ai/menu-description',
        },
    ],
};
