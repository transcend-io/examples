/**
 * Check user against fraud systems
 * Is this user suspected of fraud?
 *
 * Since this is a demo, it just checks for name+fraud@example.com
 *
 * @param email - Email to look up
 * @returns True if fraudster
 */
module.exports = function checkIfFraudster(email) {
  const flag = email.split('@')[0].split('+')[1];
  return ['thefraudster', 'fraud', 'fraudster', 'activeuser'].includes(flag);
};
