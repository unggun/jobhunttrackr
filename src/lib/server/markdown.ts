import { Marked, type Tokens } from 'marked';

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const SAFE_URL = /^(https?:|mailto:)/i;

// Job postings come from pasted text or from Claude, so treat them as untrusted:
// raw HTML is shown as text, only http(s) and mailto links survive, and images are dropped.
const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		html({ text }: Tokens.HTML | Tokens.Tag) {
			return escapeHtml(text);
		},
		link({ href, tokens }: Tokens.Link) {
			const text = this.parser.parseInline(tokens);
			if (!SAFE_URL.test(href)) return text;
			return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${text}</a>`;
		},
		image({ text }: Tokens.Image) {
			return escapeHtml(text);
		}
	}
});

export function renderMarkdown(source: string | null | undefined): string {
	if (!source?.trim()) return '';
	return marked.parse(source, { async: false });
}
