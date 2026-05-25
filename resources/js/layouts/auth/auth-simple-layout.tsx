import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-slate-100 p-6 text-neutral-950 dark:bg-slate-950 dark:text-neutral-50 md:p-10">
            <div className="w-full max-w-md">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 sm:p-10">
                    <div className="mb-8 flex flex-col items-center gap-4 text-center">
                        <div className="inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50 px-4 py-2 text-sm font-semibold tracking-wide text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                            <span className="mr-2 text-lg" aria-hidden="true">
                                ☕
                            </span>
                            Cafe AI <span className="ml-1 text-amber-600 dark:text-amber-300">POS</span>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                                {title}
                            </h1>
                            <p className="text-sm leading-6 text-neutral-500 dark:text-neutral-400">
                                {description}
                            </p>
                        </div>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
