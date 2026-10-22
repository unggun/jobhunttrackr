<script lang="ts" module>
	import type { ApplicationStatus } from '#lib/applications.ts';

	export const STATUS_STYLES: Record<ApplicationStatus, string> = {
		saved: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
		applied: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
		screening: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
		interviewing: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
		offer: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
		accepted: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950',
		rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
		withdrawn: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
		ghosted: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
	};

	export const STATUS_DOTS: Record<ApplicationStatus, string> = {
		saved: 'bg-zinc-400',
		applied: 'bg-sky-500',
		screening: 'bg-violet-500',
		interviewing: 'bg-amber-500',
		offer: 'bg-emerald-500',
		accepted: 'bg-emerald-600',
		rejected: 'bg-rose-500',
		withdrawn: 'bg-zinc-400',
		ghosted: 'bg-zinc-400'
	};
</script>

<script lang="ts">
	import { STATUS_LABELS } from '#lib/applications.ts';

	let { status }: { status: ApplicationStatus } = $props();
</script>

<span
	class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap {STATUS_STYLES[
		status
	]}"
>
	{STATUS_LABELS[status]}
</span>
