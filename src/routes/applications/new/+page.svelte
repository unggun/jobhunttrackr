<script lang="ts">
	import { resolve } from '$app/paths';
	import ApplicationForm from '#lib/components/ApplicationForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Add application · Job Hunt Tracker</title>
</svelte:head>

<main class="mx-auto max-w-3xl px-4 py-8">
	<a
		href={resolve('/applications')}
		class="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">← Applications</a
	>
	<h1 class="mt-2 mb-6 text-2xl font-semibold tracking-tight">Add application</h1>
	<ApplicationForm
		values={form?.values}
		errors={form?.errors}
		timeZone={data.timeZone}
		submitLabel="Save application"
		checkDuplicates
	/>
</main>
