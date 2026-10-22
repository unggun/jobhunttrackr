<script lang="ts" module>
	export type ApplicationFormValues = {
		company?: string | null;
		role?: string | null;
		location?: string | null;
		workMode?: string | null;
		salary?: string | null;
		jobUrl?: string | null;
		applicationUrl?: string | null;
		source?: string | null;
		status?: string | null;
		appliedAt?: Date | string | null;
		posting?: string | null;
		resumeVersion?: string | null;
		notes?: string | null;
		answers?: { question: string; answer: string }[];
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { APPLICATION_STATUSES, STATUS_LABELS, WORK_MODES } from '#lib/applications.ts';
	import { formatDate } from '#lib/format.ts';
	import DateInput from './DateInput.svelte';
	import StatusBadge from './StatusBadge.svelte';
	import type { ApplicationStatus } from '#lib/applications.ts';

	let {
		values = {},
		errors = {},
		timeZone,
		submitLabel,
		action,
		showStatus = true,
		checkDuplicates = false
	}: {
		values?: ApplicationFormValues;
		errors?: Record<string, string[] | undefined>;
		timeZone: string;
		submitLabel: string;
		action?: string;
		showStatus?: boolean;
		checkDuplicates?: boolean;
	} = $props();

	// svelte-ignore state_referenced_locally
	let answers = $state(values.answers?.length ? [...values.answers] : []);
	let saving = $state(false);

	type Match = {
		id: string;
		company: string;
		role: string;
		status: ApplicationStatus;
		appliedAt: string | null;
		sameJobUrl: boolean;
	};
	let matches = $state<Match[]>([]);
	let lookup = { jobUrl: '', company: '' };

	async function findMatches(field: 'jobUrl' | 'company', value: string) {
		if (!checkDuplicates || lookup[field] === value.trim()) return;
		lookup = { ...lookup, [field]: value.trim() };
		if (!lookup.jobUrl && !lookup.company) {
			matches = [];
			return;
		}
		const params = new URLSearchParams(lookup);
		const response = await fetch(`/api/similar?${params}`);
		if (response.ok) matches = await response.json();
	}
</script>

<form
	method="post"
	{action}
	class="space-y-8"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<section class="card space-y-4 p-5">
		<div class="grid gap-4 sm:grid-cols-2">
			<label class="label">
				Company
				<input
					name="company"
					required
					value={values.company ?? ''}
					onblur={(event) => findMatches('company', event.currentTarget.value)}
					class="field"
					autocomplete="off"
				/>
				{#if errors.company}<span class="text-xs text-rose-600">Required</span>{/if}
			</label>
			<label class="label">
				Role
				<input name="role" required value={values.role ?? ''} class="field" autocomplete="off" />
				{#if errors.role}<span class="text-xs text-rose-600">Required</span>{/if}
			</label>
			<label class="label sm:col-span-2">
				Job posting link
				<input
					name="jobUrl"
					type="url"
					value={values.jobUrl ?? ''}
					onblur={(event) => findMatches('jobUrl', event.currentTarget.value)}
					placeholder="https://"
					class="field"
				/>
			</label>
		</div>

		{#if matches.length}
			<div
				class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40"
				role="status"
			>
				<p class="font-medium text-amber-900 dark:text-amber-200">
					{matches.some((match) => match.sameJobUrl)
						? 'You already track this job posting.'
						: 'You already have applications at this company.'}
				</p>
				<ul class="mt-2 space-y-1">
					{#each matches as match (match.id)}
						<li class="flex flex-wrap items-center gap-2">
							<a
								href={resolve('/applications/[id]', { id: match.id })}
								class="font-medium underline"
								target="_blank">{match.role} at {match.company}</a
							>
							<StatusBadge status={match.status} />
							{#if match.appliedAt}
								<span class="text-zinc-500"
									>applied {formatDate(new Date(match.appliedAt), timeZone)}</span
								>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="grid gap-4 sm:grid-cols-3">
			{#if showStatus}
				<label class="label">
					Status
					<select name="status" class="field" value={values.status ?? 'applied'}>
						{#each APPLICATION_STATUSES as status (status)}
							<option value={status}>{STATUS_LABELS[status]}</option>
						{/each}
					</select>
				</label>
			{/if}
			<label class="label">
				Applied on
				<DateInput name="appliedAt" type="date" value={values.appliedAt} {timeZone} class="field" />
			</label>
			<label class="label">
				Work mode
				<select name="workMode" class="field" value={values.workMode ?? ''}>
					<option value="">Not specified</option>
					{#each WORK_MODES as mode (mode)}
						<option value={mode}>{mode[0].toUpperCase() + mode.slice(1)}</option>
					{/each}
				</select>
			</label>
			<label class="label">
				Location
				<input name="location" value={values.location ?? ''} class="field" />
			</label>
			<label class="label">
				Salary
				<input name="salary" value={values.salary ?? ''} class="field" />
			</label>
			<label class="label">
				Found via
				<input
					name="source"
					value={values.source ?? ''}
					placeholder="LinkedIn, referral…"
					class="field"
				/>
			</label>
			<label class="label sm:col-span-2">
				Application form link
				<input
					name="applicationUrl"
					type="url"
					value={values.applicationUrl ?? ''}
					placeholder="If different from the posting"
					class="field"
				/>
			</label>
			<label class="label">
				Resume version
				<input name="resumeVersion" value={values.resumeVersion ?? ''} class="field" />
			</label>
		</div>
	</section>

	<section class="card p-5">
		<h2 class="font-semibold">Job posting</h2>
		<p class="mt-0.5 text-sm text-zinc-500">
			Paste the description so you still have it when the posting is taken down. Markdown works.
		</p>
		<textarea name="posting" rows="10" class="field font-mono text-xs"
			>{values.posting ?? ''}</textarea
		>
	</section>

	<section class="card p-5">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="font-semibold">Form answers</h2>
				<p class="mt-0.5 text-sm text-zinc-500">What you filled in on the application form.</p>
			</div>
			<button
				type="button"
				class="btn-secondary"
				onclick={() => (answers = [...answers, { question: '', answer: '' }])}
			>
				Add answer
			</button>
		</div>
		{#if answers.length}
			<ol class="mt-4 space-y-4">
				{#each answers as answer, index (index)}
					<li class="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
						<div class="flex items-start gap-2">
							<input
								name="question"
								bind:value={answer.question}
								placeholder="Question"
								aria-label="Question {index + 1}"
								class="field mt-0 font-medium"
							/>
							<button
								type="button"
								class="mt-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
								onclick={() => (answers = answers.filter((_, i) => i !== index))}
							>
								Remove
							</button>
						</div>
						<textarea
							name="answer"
							bind:value={answer.answer}
							rows="3"
							placeholder="Your answer"
							aria-label="Answer {index + 1}"
							class="field"></textarea>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="card p-5">
		<label class="label">
			Notes
			<textarea name="notes" rows="4" class="field">{values.notes ?? ''}</textarea>
		</label>
	</section>

	<div class="flex items-center gap-3">
		<button class="btn" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
	</div>
</form>
