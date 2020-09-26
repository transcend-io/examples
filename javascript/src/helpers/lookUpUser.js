/**
 * Look inside a database and return the person's user profiles
 */
module.exports = async function lookUpUser(userIdentifier) {
  return [{
    profileId: userIdentifier,
    profileData: {
      name: 'Ben Farrell',
      interests: 'Privacy Tech',
    },
  }];
}
