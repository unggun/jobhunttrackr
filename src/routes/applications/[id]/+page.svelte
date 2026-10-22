<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { APPLICATION_STATUSES, STATUS_LABELS } from '#lib/applications.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let app = $derived(data.application);

	const dateFormat = new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short'
	});
</script>

<svelte:head>
	<title>{app.role} at {app.company} · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<a href={resolve('/applications')} class="text-sm text-zinc-500 hover:text-zinc-900"
		>← Applications</a
	>
	<h1 class="mt-2 text-2xl font-semibold">{app.role}</h1>
	<p class="text-zinc-500">
		{app.company}{app.location ? ` · ${app.location}` : ''}{app.workMode
			? ` · ${app.workMode}`
			: ''}
	</p>
	{#if app.jobUrl}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external job posting -->
		<a href={app.jobUrl} target="_blank" rel="noreferrer" class="text-sm text-blue-600 underline"
			>Open job posting</a
		>
	{/if}

	<form method="post" action="?/status" use:enhance class="mt-6 flex flex-wrap items-end gap-2">
		<label class="text-sm font-medium">
			Status
			<select
				name="status"
				value={app.status}
				class="mt-1 block rounded-lg border-zinc-300 text-sm"
			>
				{#each APPLICATION_STATUSES as status (status)}
					<option value={status}>{STATUS_LABELS[status]}</option>
				{/each}
			</select>
		</label>
		<input
			name="note"
			placeholder="Note (optional)"
			class="min-w-0 flex-1 rounded-lg border-zinc-300 text-sm"
		/>
		<button class="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-700"
			>Update</button
		>
	</form>

	<section class="mt-8">
		<h2 class="font-semibold">Timeline</h2>
		<ol class="mt-2 space-y-1 text-sm">
			{#each app.events as event (event.id)}
				<li>
					<span class="text-zinc-400">{dateFormat.format(event.occurredAt)}</span>
					{STATUS_LABELS[event.status]}{event.note ? `: ${event.note}` : ''}
				</li>
			{/each}
		</ol>
	</section>

	{#if app.answers.length}
		<section class="mt-8">
			<h2 class="font-semibold">What you answered</h2>
			<dl class="mt-2 space-y-3">
				{#each app.answers as answer (answer.id)}
					<div>
						<dt class="text-sm font-medium">{answer.question}</dt>
						<dd class="text-sm whitespace-pre-wrap text-zinc-700">{answer.answer}</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/if}

	{#if app.posting}
		<section class="mt-8">
			<h2 class="font-semibold">Job posting</h2>
			<div
				class="mt-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm whitespace-pre-wrap text-zinc-700"
			>
				{app.posting}
			</div>
		</section>
	{/if}

	{#if app.notes}
		<section class="mt-8">
			<h2 class="font-semibold">Notes</h2>
			<p class="mt-2 text-sm whitespace-pre-wrap text-zinc-700">{app.notes}</p>
		</section>
	{/if}
</main>
