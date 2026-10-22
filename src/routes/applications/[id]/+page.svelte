<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { APPLICATION_STATUSES, STATUS_LABELS } from '#lib/applications.ts';
	import { formatDate, formatDateTime, formatRelativeDay } from '#lib/format.ts';
	import CopyButton from '#lib/components/CopyButton.svelte';
	import ExternalLink from '#lib/components/ExternalLink.svelte';
	import InterviewRoundForm from '#lib/components/InterviewRoundForm.svelte';
	import StatusBadge, { STATUS_DOTS } from '#lib/components/StatusBadge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let app = $derived(data.application);

	let addingRound = $state(false);
	let editingRound = $state<string | null>(null);

	const OUTCOME_STYLES = {
		pending: 'text-zinc-500',
		passed: 'text-emerald-700 dark:text-emerald-400',
		failed: 'text-rose-700 dark:text-rose-400',
		cancelled: 'text-zinc-400 line-through'
	} as const;
	const OUTCOME_LABELS = {
		pending: 'Upcoming',
		passed: 'Passed',
		failed: 'Not passed',
		cancelled: 'Cancelled'
	} as const;

	const details = $derived(
		[
			['Location', app.location],
			['Work mode', app.workMode && app.workMode[0].toUpperCase() + app.workMode.slice(1)],
			['Salary', app.salary],
			['Found via', app.source],
			['Applied', app.appliedAt && formatDate(app.appliedAt, data.timeZone)],
			['Resume', app.resumeVersion]
		].filter(([, value]) => value) as [string, string][]
	);
</script>

<svelte:head>
	<title>{app.role} at {app.company} · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-6">
	<a
		href={resolve('/applications')}
		class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Applications</a
	>

	<div class="mt-2 flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-2xl font-semibold tracking-tight">{app.role}</h1>
				<StatusBadge status={app.status} />
			</div>
			<p class="mt-0.5 text-lg text-zinc-600 dark:text-zinc-400">{app.company}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a href={resolve('/applications/[id]/prep', { id: app.id })} class="btn">Interview prep</a>
			<a href={resolve('/applications/[id]/edit', { id: app.id })} class="btn-secondary">Edit</a>
		</div>
	</div>

	<div class="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
		<div class="min-w-0 space-y-6">
			<section class="card p-5">
				<div class="flex items-center justify-between gap-2">
					<h2 class="font-semibold">Job posting</h2>
					<div class="flex items-center gap-1">
						{#if app.posting}<CopyButton text={app.posting} label="Copy job posting" />{/if}
						{#if app.jobUrl}
							<ExternalLink
								href={app.jobUrl}
								class="rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
								>Open original ↗</ExternalLink
							>
						{/if}
					</div>
				</div>
				{#if data.postingHtml}
					<!-- Rendered by renderMarkdown, which escapes raw HTML and unsafe links. -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					<div class="prose-posting mt-3">{@html data.postingHtml}</div>
					{#if app.postingCapturedAt}
						<p class="mt-4 text-xs text-zinc-400">
							Saved {formatDate(app.postingCapturedAt, data.timeZone)}
						</p>
					{/if}
				{:else}
					<p class="mt-2 text-sm text-zinc-500">
						No copy of the posting yet. <a
							href={resolve('/applications/[id]/edit', { id: app.id })}
							class="underline">Paste it in</a
						> so you have it for interviews.
					</p>
				{/if}
			</section>

			<section class="card p-5">
				<h2 class="font-semibold">Form answers</h2>
				{#if app.answers.length}
					<dl class="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
						{#each app.answers as answer (answer.id)}
							<div class="py-3 first:pt-0 last:pb-0">
								<dt class="flex items-start justify-between gap-2 text-sm font-medium">
									{answer.question}
									<CopyButton text={answer.answer} label="Copy answer to {answer.question}" />
								</dt>
								<dd class="mt-1 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
									{answer.answer}
								</dd>
							</div>
						{/each}
					</dl>
				{:else}
					<p class="mt-2 text-sm text-zinc-500">No answers saved for this application.</p>
				{/if}
			</section>

			<section class="card p-5">
				<div class="flex items-center justify-between">
					<h2 class="font-semibold">Interviews</h2>
					{#if !addingRound}
						<button class="btn-secondary" onclick={() => (addingRound = true)}>Add round</button>
					{/if}
				</div>
				{#if addingRound}
					<div class="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
						<InterviewRoundForm timeZone={data.timeZone} ondone={() => (addingRound = false)} />
					</div>
				{/if}
				{#if app.rounds.length}
					<ol class="mt-4 space-y-3">
						{#each app.rounds as round (round.id)}
							<li class="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
								{#if editingRound === round.id}
									<InterviewRoundForm
										{round}
										timeZone={data.timeZone}
										ondone={() => (editingRound = null)}
									/>
								{:else}
									<div class="flex flex-wrap items-start justify-between gap-2">
										<div>
											<p class="font-medium">{round.name}</p>
											<p class="text-sm text-zinc-500">
												{round.scheduledAt
													? formatDateTime(round.scheduledAt, data.timeZone)
													: 'No date yet'}{round.interviewers
													? ` · with ${round.interviewers}`
													: ''}
											</p>
										</div>
										<div class="flex items-center gap-2 text-sm">
											<span class="font-medium {OUTCOME_STYLES[round.outcome]}"
												>{OUTCOME_LABELS[round.outcome]}</span
											>
											<button
												class="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
												onclick={() => (editingRound = round.id)}>Edit</button
											>
											<form
												method="post"
												action="?/deleteRound"
												use:enhance={({ cancel }) => {
													if (!confirm(`Delete the ${round.name} round?`)) cancel();
												}}
											>
												<input type="hidden" name="roundId" value={round.id} />
												<button
													class="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
													>Delete</button
												>
											</form>
										</div>
									</div>
									{#if round.prepNotes}
										<p class="mt-2 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
											{round.prepNotes}
										</p>
									{/if}
									{#if round.feedback}
										<p class="mt-2 text-sm whitespace-pre-wrap text-zinc-500">
											<span class="font-medium">How it went:</span>
											{round.feedback}
										</p>
									{/if}
								{/if}
							</li>
						{/each}
					</ol>
				{:else if !addingRound}
					<p class="mt-2 text-sm text-zinc-500">No interviews yet.</p>
				{/if}
			</section>

			{#if app.notes}
				<section class="card p-5">
					<h2 class="font-semibold">Notes</h2>
					<p class="mt-2 text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
						{app.notes}
					</p>
				</section>
			{/if}
		</div>

		<!-- Status comes first on phones, where the sidebar would otherwise be at the very bottom. -->
		<aside class="order-first space-y-6 lg:order-none">
			<section class="card p-5">
				<h2 class="font-semibold">Status</h2>
				<form method="post" action="?/status" use:enhance class="mt-3 space-y-2">
					<select name="status" value={app.status} class="field mt-0" aria-label="New status">
						{#each APPLICATION_STATUSES as status (status)}
							<option value={status}>{STATUS_LABELS[status]}</option>
						{/each}
					</select>
					<input name="note" placeholder="Note, e.g. recruiter emailed" class="field" />
					<button class="btn w-full">Update status</button>
				</form>

				<ol class="mt-5 space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-800">
					{#each [...app.events].reverse() as event (event.id)}
						<li class="relative text-sm">
							<span
								class="absolute top-1.5 -left-[1.3rem] size-2 rounded-full {STATUS_DOTS[
									event.status
								]}"
							></span>
							<p class="font-medium">{STATUS_LABELS[event.status]}</p>
							{#if event.note}<p class="text-zinc-600 dark:text-zinc-400">{event.note}</p>{/if}
							<p
								class="text-xs text-zinc-400"
								title={formatDateTime(event.occurredAt, data.timeZone)}
							>
								{formatRelativeDay(event.occurredAt, data.timeZone)}
							</p>
						</li>
					{/each}
				</ol>
			</section>

			<section class="card p-5">
				<h2 class="font-semibold">Details</h2>
				{#if details.length}
					<dl class="mt-3 space-y-2 text-sm">
						{#each details as [label, value] (label)}
							<div class="flex justify-between gap-3">
								<dt class="text-zinc-500">{label}</dt>
								<dd class="text-right">{value}</dd>
							</div>
						{/each}
					</dl>
				{/if}
				{#if app.applicationUrl}
					<ExternalLink
						href={app.applicationUrl}
						class="mt-3 block text-sm text-sky-700 underline dark:text-sky-400"
						>Application form ↗</ExternalLink
					>
				{/if}
			</section>
		</aside>
	</div>
</main>
