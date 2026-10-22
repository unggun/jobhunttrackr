<script lang="ts">
	let { text, label = 'Copy' }: { text: string; label?: string } = $props();

	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<button
	type="button"
	onclick={copy}
	class="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
	aria-label={label}
>
	{copied ? 'Copied' : 'Copy'}
</button>
