/**
 * Decides whether a new account may be created.
 * With an allowlist, only listed emails get in. Without one, the first person to sign in
 * becomes the owner and sign-ups close after that.
 */
export function canCreateAccount({
	email,
	allowedEmails,
	existingUsers
}: {
	email: string;
	allowedEmails: string[];
	existingUsers: number;
}) {
	if (allowedEmails.length) return allowedEmails.includes(email.trim().toLowerCase());
	return existingUsers === 0;
}
