<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		APPLICATION_STATUSES,
		STATUS_LABELS,
		type ApplicationStatus
	} from '#lib/applications.ts';
	import { STATUS_STYLES } from './StatusBadge.svelte';

	let {
		id,
		status,
		action = '?/status',
		label
	}: { id: string; status: ApplicationStatus; action?: string; label: string } = $props();

	let form: HTMLFormElement;
</script>

<!-- Changing the select saves straight away, so updating a status is one click. -->
<form
	method="post"
	{action}
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
	bind:this={form}
>
	<input type="hidden" name="id" value={id} />
	<select
		name="status"
		aria-label={label}
		value={status}
		onchange={() => form.requestSubmit()}
		class="cursor-pointer rounded-full border-0 py-0.5 pr-7 pl-2.5 text-xs font-medium focus:ring-2 focus:ring-zinc-400 {STATUS_STYLES[
			status
		]}"
	>
		{#each APPLICATION_STATUSES as option (option)}
			<option value={option}>{STATUS_LABELS[option]}</option>
		{/each}
	</select>
	<noscript><button class="text-xs underline">Save</button></noscript>
</form>
