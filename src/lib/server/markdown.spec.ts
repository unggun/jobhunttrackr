import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('renders the usual job posting formatting', () => {
		const html = renderMarkdown('## Requirements\n\n- **Svelte**\n- TypeScript');
		expect(html).toContain('<h2>Requirements</h2>');
		expect(html).toContain('<li><strong>Svelte</strong></li>');
	});

	it('shows raw HTML as text', () => {
		const html = renderMarkdown('Hello <script>alert(1)</script> <img src=x onerror=alert(1)>');
		expect(html).not.toContain('<script');
		expect(html).not.toContain('<img');
		expect(html).toContain('&#60;script&#62;');
	});

	it('keeps safe links and drops unsafe ones and images', () => {
		expect(renderMarkdown('[apply](https://acme.com/jobs)')).toContain(
			'<a href="https://acme.com/jobs" target="_blank" rel="noreferrer noopener">apply</a>'
		);
		const unsafe = renderMarkdown('[click](javascript:alert(1)) ![logo](https://t.co/pixel.png)');
		expect(unsafe).not.toContain('<a');
		expect(unsafe).not.toContain('<img');
		expect(unsafe).toContain('click');
	});

	it('returns nothing for empty input', () => {
		expect(renderMarkdown(null)).toBe('');
		expect(renderMarkdown('  ')).toBe('');
	});
});
