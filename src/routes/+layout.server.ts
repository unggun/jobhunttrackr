import { isValidTimeZone } from '#lib/format.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies }) => {
	const timeZone = cookies.get('tz');
	return {
		user: locals.user ? { name: locals.user.name, image: locals.user.image } : null,
		timeZone: isValidTimeZone(timeZone) ? timeZone : 'UTC'
	};
};
