<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		APPLICATION_STATUSES,
		BOARD_STATUSES,
		CLOSED_STATUSES,
		STATUS_LABELS,
		needsFollowUp,
		placeLabel,
		type ApplicationStatus
	} from '#lib/applications.ts';
	import { formatDateTime, formatRelativeDay } from '#lib/format.ts';
	import StatusBadge, { STATUS_DOTS } from '#lib/components/StatusBadge.svelte';
	import StatusSelect from '#lib/components/StatusSelect.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const total = $derived(Object.values(data.counts).reduce((sum, count) => sum + count, 0));
	const activeCount = $derived(
		APPLICATION_STATUSES.filter((status) => !CLOSED_STATUSES.includes(status)).reduce(
			(sum, status) => sum + data.counts[status],
			0
		)
	);

	/** This page's query string with some search params changed. */
	function withParams(changes: Record<string, string | null>) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a throwaway copy, not state
		const params = new URLSearchParams(page.url.searchParams.toString());
		for (const [key, value] of Object.entries(changes)) {
			if (value === null) params.delete(key);
			else params.set(key, value);
		}
		return params.toString();
	}

	// Board: drag a card to another column to change its status.
	let moved = $state<Record<string, ApplicationStatus>>({});
	let dragging = $state<string | null>(null);
	let dropTarget = $state<ApplicationStatus | null>(null);

	const statusOf = (app: { id: string; status: ApplicationStatus }) => moved[app.id] ?? app.status;

	async function moveTo(id: string, status: ApplicationStatus) {
		moved[id] = status;
		const body = new FormData();
		body.set('id', id);
		body.set('status', status);
		await fetch('?/status', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		await invalidateAll();
		delete moved[id];
	}

	let searchTimer: ReturnType<typeof setTimeout>;
	function onsearch(event: Event & { currentTarget: HTMLInputElement }) {
		const value = event.currentTarget.value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(resolve(`/applications?${withParams({ q: value || null })}`), {
				replace: true,
				reset: false
			});
		}, 200);
	}
</script>

<svelte:head>
	<title>Applications · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto px-4 py-6 {data.view === 'board' ? 'max-w-7xl' : 'max-w-6xl'}">
	{#if data.interviews.length}
		<section class="mb-6">
			<h2 class="mb-2 text-sm font-medium text-zinc-500">Upcoming interviews</h2>
			<ul class="flex gap-3 overflow-x-auto pb-1">
				{#each data.interviews as interview (interview.id)}
					<li class="shrink-0">
						<a
							href={resolve('/applications/[id]/prep', { id: interview.applicationId })}
							class="card block w-64 p-3 hover:border-amber-400 dark:hover:border-amber-600"
						>
							<p class="text-xs font-medium text-amber-700 dark:text-amber-400">
								{formatDateTime(interview.scheduledAt, data.timeZone)}
							</p>
							<p class="mt-1 truncate text-sm font-medium">{interview.name}</p>
							<p class="truncate text-sm text-zinc-500">
								{interview.role} · {interview.company}
							</p>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<div class="flex flex-wrap items-center gap-3">
		<h1 class="mr-auto text-2xl font-semibold tracking-tight">Applications</h1>
		<input
			type="search"
			data-search
			value={data.search}
			oninput={onsearch}
			placeholder="Search company or role   /"
			aria-label="Search company or role"
			class="w-full rounded-lg border-zinc-300 text-sm sm:w-64"
		/>
		<div
			class="flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-700"
			role="group"
			aria-label="View"
		>
			{#each ['list', 'board'] as const as view (view)}
				<a
					href={resolve(`/applications?${withParams({ view: view === 'list' ? null : view })}`)}
					aria-current={data.view === view ? 'page' : undefined}
					class="rounded-md px-3 py-1 capitalize {data.view === view
						? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
						: 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}"
					>{view}</a
				>
			{/each}
		</div>
	</div>

	{#if total === 0}
		<div class="card mt-8 p-10 text-center">
			<p class="text-lg font-medium">No applications yet</p>
			<p class="mt-1 text-sm text-zinc-500">
				Add the first job you applied to, or let Claude log them for you once the MCP connector is
				set up.
			</p>
			<a href={resolve('/applications/new')} class="btn mt-4">Add application</a>
		</div>
	{:else if data.view === 'list'}
		<nav class="mt-4 flex gap-1.5 overflow-x-auto pb-1 text-sm" aria-label="Filter by status">
			{#each [['active', 'Active', activeCount], ['all', 'All', total], ...APPLICATION_STATUSES.filter((status) => data.counts[status] > 0).map( (status) => [status, STATUS_LABELS[status], data.counts[status]] )] as [value, label, count] (value)}
				<a
					href={resolve(
						`/applications?${withParams({ status: value === 'active' ? null : String(value) })}`
					)}
					aria-current={data.filter === value ? 'page' : undefined}
					class="shrink-0 rounded-full border px-3 py-1 {data.filter === value
						? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
						: 'border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'}"
				>
					{label} <span class="opacity-60">{count}</span>
				</a>
			{/each}
		</nav>

		{#if data.applications.length}
			<ul class="card mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
				{#each data.applications as app (app.id)}
					<li class="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
						<a href={resolve('/applications/[id]', { id: app.id })} class="min-w-0 flex-1">
							<p class="truncate font-medium">{app.role}</p>
							<p class="truncate text-sm text-zinc-500">
								{[app.company, placeLabel(app)].filter(Boolean).join(' · ')}
							</p>
						</a>
						{#if needsFollowUp(app)}
							<span
								class="hidden rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 sm:inline dark:bg-orange-950 dark:text-orange-300"
								title="No news for over two weeks. Follow up, or mark it as ghosted."
								>Follow up?</span
							>
						{/if}
						<span class="hidden w-24 text-right text-xs text-zinc-500 sm:block">
							{formatRelativeDay(app.appliedAt ?? app.updatedAt, data.timeZone)}
						</span>
						<StatusSelect
							id={app.id}
							status={app.status}
							label="Status of {app.role} at {app.company}"
						/>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-10 text-center text-zinc-500">No applications match.</p>
		{/if}
	{:else}
		<div class="mt-4 flex gap-3 overflow-x-auto pb-4">
			{#each [...BOARD_STATUSES, 'closed' as const] as column (column)}
				{@const cards = data.applications.filter((app) =>
					column === 'closed' ? CLOSED_STATUSES.includes(statusOf(app)) : statusOf(app) === column
				)}
				<section
					class="flex w-64 shrink-0 flex-col rounded-xl bg-zinc-100 p-2 transition lg:w-auto lg:min-w-0 lg:flex-1 dark:bg-zinc-900/60 {dropTarget ===
					column
						? 'ring-2 ring-zinc-400'
						: ''}"
					aria-label={column === 'closed' ? 'Closed' : STATUS_LABELS[column]}
					ondragover={(event) => {
						if (column === 'closed' || !dragging) return;
						event.preventDefault();
						dropTarget = column;
					}}
					ondragleave={() => (dropTarget = null)}
					ondrop={(event) => {
						event.preventDefault();
						dropTarget = null;
						if (dragging && column !== 'closed') moveTo(dragging, column);
					}}
				>
					<h2 class="flex items-center gap-2 px-1.5 py-1 text-sm font-medium">
						{#if column !== 'closed'}
							<span class="size-2 rounded-full {STATUS_DOTS[column]}"></span>
						{/if}
						{column === 'closed' ? 'Closed' : STATUS_LABELS[column]}
						<span class="text-zinc-400">{cards.length}</span>
					</h2>
					<ul class="mt-1 flex flex-col gap-2">
						{#each cards as app (app.id)}
							<li
								draggable="true"
								ondragstart={() => (dragging = app.id)}
								ondragend={() => (dragging = null)}
								class="card cursor-grab p-3 shadow-xs active:cursor-grabbing {column === 'closed'
									? 'opacity-70'
									: ''} {dragging === app.id ? 'opacity-40' : ''}"
							>
								<a href={resolve('/applications/[id]', { id: app.id })} class="block">
									<p class="text-sm font-medium">{app.role}</p>
									<p class="text-sm text-zinc-500">{app.company}</p>
								</a>
								<div class="mt-2 flex items-center justify-between gap-2">
									{#if column === 'closed'}
										<StatusBadge status={statusOf(app)} />
									{:else if needsFollowUp(app)}
										<span class="text-xs font-medium text-orange-700 dark:text-orange-400"
											>Follow up?</span
										>
									{:else}
										<span></span>
									{/if}
									<span class="text-xs text-zinc-400">
										{formatRelativeDay(app.appliedAt ?? app.updatedAt, data.timeZone)}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
		<p class="text-xs text-zinc-500">Drag a card to another column to change its status.</p>
	{/if}
</main>
