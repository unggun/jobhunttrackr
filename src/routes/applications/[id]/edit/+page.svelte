<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ApplicationForm from '#lib/components/ApplicationForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let app = $derived(data.application);
</script>

<svelte:head>
	<title>Edit {app.role} at {app.company} · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<a
		href={resolve('/applications/[id]', { id: app.id })}
		class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
		>← {app.role} at {app.company}</a
	>
	<h1 class="mt-2 mb-6 text-2xl font-semibold tracking-tight">Edit application</h1>
	{#key app.id}
		<ApplicationForm
			values={form?.values ?? app}
			errors={form?.errors}
			timeZone={data.timeZone}
			action="?/save"
			submitLabel="Save changes"
			showStatus={false}
		/>
	{/key}

	<form
		method="post"
		action="?/delete"
		class="mt-12 border-t border-zinc-200 pt-6 dark:border-zinc-800"
		use:enhance={({ cancel }) => {
			if (!confirm(`Delete ${app.role} at ${app.company}? This can't be undone.`)) cancel();
		}}
	>
		<button
			class="text-sm font-medium text-rose-600 hover:text-rose-800 dark:text-rose-400"
			type="submit">Delete this application</button
		>
	</form>
</main>
