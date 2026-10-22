<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>Connect {data.clientName} · Job Hunt Tracker</title>
</svelte:head>

<main class="flex min-h-[70vh] items-center justify-center px-4">
	<div class="card w-full max-w-md p-8">
		<h1 class="text-xl font-semibold">Connect {data.clientName}?</h1>
		{#if data.redirectHost}
			<p class="mt-1 truncate text-sm text-zinc-500">Returns you to {data.redirectHost}</p>
		{/if}

		<p class="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
			{data.clientName} will be able to:
		</p>
		<ul class="mt-2 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-200">
			<li>• See your applications, answers and interview rounds</li>
			<li>• Log new applications and the answers you submitted</li>
			<li>• Update statuses and add interview rounds</li>
		</ul>
		<p class="mt-4 text-xs text-zinc-500">
			It can't delete anything. You only need to approve once: it stays connected while you keep
			using it.
		</p>

		{#if form?.message}
			<p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{form.message}</p>
		{/if}

		<form method="post" class="mt-6 flex gap-3">
			<input type="hidden" name="oauth_query" value={data.oauthQuery} />
			<button formaction="?/deny" class="btn-secondary flex-1">Deny</button>
			<button formaction="?/allow" class="btn flex-1">Allow</button>
		</form>
	</div>
</main>
