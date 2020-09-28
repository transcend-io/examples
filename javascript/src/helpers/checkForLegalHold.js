/**
 * Check user against legal hold
 * Is there a reason why we can't fulfill this request right now?
 *
 * Since this is a demo, it just checks for name+legalhold@example.com
 */
module.exports = async function checkForLegalHold(email) {
  const flag = email.split('@')[0].split('+')[1];
  return ['legalhold'].includes(flag);
};
