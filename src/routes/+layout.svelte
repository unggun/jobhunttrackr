<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	onMount(() => {
		// Dates are formatted on the server, so tell it which time zone this browser is in.
		const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (timeZone && timeZone !== data.timeZone) {
			document.cookie = `tz=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`;
			invalidateAll();
		}
	});

	function isTyping(target: EventTarget | null) {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
		);
	}

	function onkeydown(event: KeyboardEvent) {
		if (!data.user || isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
			return;
		}
		if (event.key === 'n') {
			event.preventDefault();
			goto(resolve('/applications/new'));
		} else if (event.key === '/') {
			const search = document.querySelector<HTMLInputElement>('[data-search]');
			if (search) {
				event.preventDefault();
				search.focus();
			}
		}
	}

	const navLink = (active: boolean) =>
		`rounded-md px-2.5 py-1.5 text-sm font-medium ${
			active
				? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
				: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
		}`;
</script>

<svelte:window {onkeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<header
		class="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 print:hidden"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
			<nav class="flex items-center gap-1">
				<a
					href={resolve('/applications')}
					class="mr-2 font-semibold tracking-tight whitespace-nowrap"
				>
					Job Hunt Tracker
				</a>
				<a
					href={resolve('/applications')}
					class="hidden sm:block {navLink(page.url.pathname === '/applications')}"
				>
					Applications
				</a>
			</nav>
			<div class="flex items-center gap-3">
				<a
					href={resolve('/applications/new')}
					class="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
					title="Shortcut: N"
				>
					Add
				</a>
				<form method="post" action="/logout" class="flex items-center gap-2">
					{#if data.user.image}
						<img src={data.user.image} alt="" class="hidden size-7 rounded-full sm:block" />
					{/if}
					<button
						class="text-sm whitespace-nowrap text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
					>
						Sign out
					</button>
				</form>
			</div>
		</div>
	</header>
{/if}

{@render children()}
