/**
 * Check user against legal hold
 * Is there a reason why we can't fulfill this request right now?
 *
 * Since this is a demo, it just checks for name+legalhold@example.com
 *
 * @param email - Email to check
 * @returns True if on legal hold
 */
export function checkForLegalHold(email: string): boolean {
  const flag = email.split('@')[0].split('+')[1];
  return ['legalhold'].includes(flag);
}
