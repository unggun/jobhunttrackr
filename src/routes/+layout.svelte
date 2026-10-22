<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<header class="border-b border-zinc-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<a href={resolve('/applications')} class="font-semibold text-zinc-900">Job Hunt Tracker</a>
			<form method="post" action="/logout" class="flex items-center gap-3">
				{#if data.user.image}
					<img src={data.user.image} alt="" class="size-7 rounded-full" />
				{/if}
				<span class="hidden text-sm text-zinc-600 sm:inline">{data.user.name}</span>
				<button class="text-sm text-zinc-500 hover:text-zinc-900">Sign out</button>
			</form>
		</div>
	</header>
{/if}

{@render children()}
