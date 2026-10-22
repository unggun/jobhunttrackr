<script lang="ts">
	import { resolve } from '$app/paths';
	import { APPLICATION_STATUSES, STATUS_LABELS } from '#lib/applications.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
</script>

<svelte:head>
	<title>Applications · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-semibold">Applications</h1>
		<a
			href={resolve('/applications/new')}
			class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
			>Add application</a
		>
	</div>

	<form class="mt-6 flex flex-wrap gap-2" data-sveltekit-keepfocus>
		<input
			name="q"
			value={data.search}
			placeholder="Search company or role"
			class="min-w-0 flex-1 rounded-lg border-zinc-300 text-sm"
		/>
		<select name="status" class="rounded-lg border-zinc-300 text-sm" value={data.status ?? ''}>
			<option value="">All statuses</option>
			{#each APPLICATION_STATUSES as status (status)}
				<option value={status}>{STATUS_LABELS[status]}</option>
			{/each}
		</select>
		<button class="rounded-lg border border-zinc-300 bg-white px-3 text-sm">Filter</button>
	</form>

	{#if data.applications.length}
		<ul class="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
			{#each data.applications as app (app.id)}
				<li>
					<a
						href={resolve('/applications/[id]', { id: app.id })}
						class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50"
					>
						<div class="min-w-0">
							<p class="truncate font-medium">{app.role}</p>
							<p class="truncate text-sm text-zinc-500">
								{app.company}{app.location ? ` · ${app.location}` : ''}
							</p>
						</div>
						<div class="shrink-0 text-right">
							<span class="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium">
								{STATUS_LABELS[app.status]}
							</span>
							{#if app.appliedAt}
								<p class="mt-1 text-xs text-zinc-400">{dateFormat.format(app.appliedAt)}</p>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-10 text-center text-zinc-500">
			{data.search || data.status
				? 'No applications match.'
				: 'No applications yet. Add your first one.'}
		</p>
	{/if}
</main>
