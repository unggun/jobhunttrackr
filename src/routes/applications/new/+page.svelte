<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { APPLICATION_STATUSES, STATUS_LABELS, WORK_MODES } from '#lib/applications.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const field = 'mt-1 block w-full rounded-lg border-zinc-300 text-sm';
</script>

<svelte:head>
	<title>Add application · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8">
	<a href={resolve('/applications')} class="text-sm text-zinc-500 hover:text-zinc-900"
		>← Applications</a
	>
	<h1 class="mt-2 text-2xl font-semibold">Add application</h1>

	<form method="post" use:enhance class="mt-6 grid gap-4 sm:grid-cols-2">
		<label class="text-sm font-medium">
			Company
			<input name="company" required value={form?.values?.company ?? ''} class={field} />
			{#if form?.errors?.company}<span class="text-red-600">Required</span>{/if}
		</label>
		<label class="text-sm font-medium">
			Role
			<input name="role" required value={form?.values?.role ?? ''} class={field} />
			{#if form?.errors?.role}<span class="text-red-600">Required</span>{/if}
		</label>
		<label class="text-sm font-medium">
			Location
			<input name="location" value={form?.values?.location ?? ''} class={field} />
		</label>
		<label class="text-sm font-medium">
			Work mode
			<select name="workMode" class={field} value={form?.values?.workMode ?? ''}>
				<option value="">Not specified</option>
				{#each WORK_MODES as mode (mode)}
					<option value={mode} class="capitalize">{mode}</option>
				{/each}
			</select>
		</label>
		<label class="text-sm font-medium sm:col-span-2">
			Job posting link
			<input name="jobUrl" type="url" value={form?.values?.jobUrl ?? ''} class={field} />
		</label>
		<label class="text-sm font-medium">
			Status
			<select name="status" class={field} value={form?.values?.status ?? 'applied'}>
				{#each APPLICATION_STATUSES as status (status)}
					<option value={status}>{STATUS_LABELS[status]}</option>
				{/each}
			</select>
		</label>
		<label class="text-sm font-medium">
			Salary
			<input name="salary" value={form?.values?.salary ?? ''} class={field} />
		</label>
		<label class="text-sm font-medium sm:col-span-2">
			Job posting
			<textarea
				name="posting"
				rows="8"
				placeholder="Paste the job description so you still have it when the posting is taken down"
				class={field}>{form?.values?.posting ?? ''}</textarea
			>
		</label>
		<label class="text-sm font-medium sm:col-span-2">
			Notes
			<textarea name="notes" rows="3" class={field}>{form?.values?.notes ?? ''}</textarea>
		</label>
		<div class="sm:col-span-2">
			<button
				class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
				>Save application</button
			>
		</div>
	</form>
</main>
