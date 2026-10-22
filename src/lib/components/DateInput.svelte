<script lang="ts">
	import { toInputValue } from '#lib/format.ts';

	let {
		name,
		type,
		value,
		timeZone,
		class: className = '',
		id
	}: {
		name: string;
		type: 'date' | 'datetime-local';
		value: Date | string | null | undefined;
		timeZone: string;
		class?: string;
		id?: string;
	} = $props();

	// The visible input works in local time; the hidden one sends an exact ISO timestamp,
	// so the server never has to guess the viewer's time zone.
	// svelte-ignore state_referenced_locally
	let local = $state(toInputValue(value ? new Date(value) : null, type, timeZone));
	let iso = $derived.by(() => {
		if (!local) return '';
		const date = new Date(type === 'date' ? `${local}T00:00` : local);
		return Number.isNaN(date.getTime()) ? '' : date.toISOString();
	});
</script>

<input {id} {type} bind:value={local} class={className} />
<input type="hidden" {name} value={iso} />
