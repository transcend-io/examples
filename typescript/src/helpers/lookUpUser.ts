/**
 * Look inside a database and return the person's user profiles
 *
 * @param userIdentifier - User identifier to lookup
 * @returns User data
 */
module.exports = function lookUpUser(userIdentifier) {
  return [
    {
      profileId: userIdentifier,
      profileData: {
        name: 'Ben Farrell',
        interests: 'Privacy Tech',
      },
    },
  ];
};
