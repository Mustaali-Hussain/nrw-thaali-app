/*
 * Convert a username to a fake email for Supabase auth.
 * Supabase requires an email, but our users log in with usernames.
 * This creates a deterministic internal email that users never see.
 */
export function usernameToEmail(username) {
    return `${username.trim().toLowerCase()}@nrw-thaali.local`
}