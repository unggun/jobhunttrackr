<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href,
		class: className = '',
		children
	}: { href: string; class?: string; children: Snippet } = $props();
</script>

<!-- Links to job boards and company sites, which open in a new tab. -->
<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external URL -->
<a {href} target="_blank" rel="noreferrer noopener" class={className}>{@render children()}</a>
