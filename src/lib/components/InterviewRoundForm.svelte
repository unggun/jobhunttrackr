<script lang="ts">
	import { enhance } from '$app/forms';
	import { INTERVIEW_OUTCOMES, type InterviewOutcome } from '#lib/applications.ts';
	import DateInput from './DateInput.svelte';

	let {
		round,
		timeZone,
		ondone
	}: {
		round?: {
			id: string;
			name: string;
			scheduledAt: Date | null;
			interviewers: string | null;
			prepNotes: string | null;
			feedback: string | null;
			outcome: InterviewOutcome;
		};
		timeZone: string;
		ondone?: () => void;
	} = $props();

	const OUTCOME_LABELS: Record<InterviewOutcome, string> = {
		pending: 'Not done yet',
		passed: 'Passed',
		failed: 'Not passed',
		cancelled: 'Cancelled'
	};
</script>

<form
	method="post"
	action={round ? '?/updateRound' : '?/addRound'}
	class="grid gap-3 sm:grid-cols-2"
	use:enhance={() =>
		async ({ update, result }) => {
			await update({ reset: !round });
			if (result.type === 'success') ondone?.();
		}}
>
	{#if round}<input type="hidden" name="roundId" value={round.id} />{/if}
	<label class="label">
		Round
		<input
			name="name"
			required
			value={round?.name ?? ''}
			placeholder="Recruiter call, technical, onsite…"
			class="field"
		/>
	</label>
	<label class="label">
		When
		<DateInput
			name="scheduledAt"
			type="datetime-local"
			value={round?.scheduledAt}
			{timeZone}
			class="field"
		/>
	</label>
	<label class="label">
		With
		<input name="interviewers" value={round?.interviewers ?? ''} class="field" />
	</label>
	<label class="label">
		Outcome
		<select name="outcome" value={round?.outcome ?? 'pending'} class="field">
			{#each INTERVIEW_OUTCOMES as outcome (outcome)}
				<option value={outcome}>{OUTCOME_LABELS[outcome]}</option>
			{/each}
		</select>
	</label>
	<label class="label sm:col-span-2">
		Prep notes
		<textarea name="prepNotes" rows="3" class="field">{round?.prepNotes ?? ''}</textarea>
	</label>
	<label class="label sm:col-span-2">
		How it went
		<textarea name="feedback" rows="2" class="field">{round?.feedback ?? ''}</textarea>
	</label>
	<div class="flex gap-2 sm:col-span-2">
		<button class="btn">{round ? 'Save round' : 'Add round'}</button>
		{#if ondone}
			<button type="button" class="btn-secondary" onclick={ondone}>Cancel</button>
		{/if}
	</div>
</form>
