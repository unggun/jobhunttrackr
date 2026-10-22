<script lang="ts">
	import { resolve } from '$app/paths';
	import { placeLabel } from '#lib/applications.ts';
	import { formatDate, formatDateTime, formatRelativeDay } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let app = $derived(data.application);
</script>

<svelte:head>
	<title>Prep: {app.role} at {app.company} · Job Hunt Tracker</title>
</svelte:head>

<!-- A single page to read before an interview, and print-friendly. -->
<main class="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
	<div class="flex items-center justify-between print:hidden">
		<a
			href={resolve('/applications/[id]', { id: app.id })}
			class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
			>← Back to application</a
		>
		<button class="btn-secondary" onclick={() => print()}>Print</button>
	</div>

	<header class="mt-4">
		<p class="text-sm font-medium tracking-wide text-zinc-500 uppercase">Interview prep</p>
		<h1 class="text-3xl font-semibold tracking-tight">{app.role}</h1>
		<p class="text-xl text-zinc-600 dark:text-zinc-400">{app.company}</p>
		<p class="mt-2 text-sm text-zinc-500">
			{[
				placeLabel(app),
				app.salary,
				app.appliedAt && `applied ${formatDate(app.appliedAt, data.timeZone)}`
			]
				.filter(Boolean)
				.join(' · ')}
		</p>
	</header>

	{#if data.nextRound}
		<section
			class="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40"
		>
			<p class="text-sm font-medium text-amber-800 dark:text-amber-300">Next up</p>
			<p class="mt-1 text-lg font-semibold">{data.nextRound.name}</p>
			<p class="text-sm text-zinc-700 dark:text-zinc-300">
				{#if data.nextRound.scheduledAt}
					{formatDateTime(data.nextRound.scheduledAt, data.timeZone)}
					({formatRelativeDay(data.nextRound.scheduledAt, data.timeZone)})
				{:else}
					No date set
				{/if}
				{data.nextRound.interviewers ? ` · with ${data.nextRound.interviewers}` : ''}
			</p>
			{#if data.nextRound.prepNotes}
				<p class="mt-3 text-sm whitespace-pre-wrap">{data.nextRound.prepNotes}</p>
			{/if}
		</section>
	{/if}

	<section class="mt-8">
		<h2 class="border-b border-zinc-200 pb-2 text-lg font-semibold dark:border-zinc-800">
			What they're looking for
		</h2>
		{#if data.postingHtml}
			<!-- Rendered by renderMarkdown, which escapes raw HTML and unsafe links. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<div class="prose-posting mt-3">{@html data.postingHtml}</div>
		{:else}
			<p class="mt-3 text-sm text-zinc-500">No copy of the job posting was saved.</p>
		{/if}
	</section>

	{#if app.answers.length}
		<section class="mt-8 break-inside-avoid">
			<h2 class="border-b border-zinc-200 pb-2 text-lg font-semibold dark:border-zinc-800">
				What you told them
			</h2>
			<dl class="mt-3 space-y-4">
				{#each app.answers as answer (answer.id)}
					<div>
						<dt class="text-sm font-medium">{answer.question}</dt>
						<dd class="mt-0.5 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
							{answer.answer}
						</dd>
					</div>
				{/each}
			</dl>
		</section>
	{/if}

	{#if data.pastRounds.length}
		<section class="mt-8 break-inside-avoid">
			<h2 class="border-b border-zinc-200 pb-2 text-lg font-semibold dark:border-zinc-800">
				Earlier rounds
			</h2>
			<ul class="mt-3 space-y-3">
				{#each data.pastRounds as round (round.id)}
					<li class="text-sm">
						<p class="font-medium">
							{round.name}
							<span class="font-normal text-zinc-500"
								>{round.scheduledAt ? `· ${formatDate(round.scheduledAt, data.timeZone)}` : ''}
								{round.interviewers ? `· with ${round.interviewers}` : ''}</span
							>
						</p>
						{#if round.feedback}
							<p class="mt-0.5 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
								{round.feedback}
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if app.notes}
		<section class="mt-8 break-inside-avoid">
			<h2 class="border-b border-zinc-200 pb-2 text-lg font-semibold dark:border-zinc-800">
				Your notes
			</h2>
			<p class="mt-3 text-sm whitespace-pre-wrap">{app.notes}</p>
		</section>
	{/if}
</main>
