/**
 * Check user against fraud systems
 */
module.exports.checkIfSuspicious = (email, otherIdentifiers) => {
  const flag = email.split('+')[1];
  return flag && ['thefraudster', 'fraud', 'fraudster'].includes(flag);
}

/**
 * Check user against legal holds
 */
module.exports.checkForLegalHolds = (email, otherIdentifiers) => {
  const flag = email.split('+')[1];
  return flag && ['legalhold'].includes(flag);
}
