/**
 * Look inside a database and return the person's user profiles
 */
module.exports = async function lookUpUser(userIdentifier) {
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

/**
 * Look inside a database and return the person's user profiles
 */
module.exports = async function enricherUser(userIdentifier) {
  return {
    googleAnalyticsInternalId: [
        {
          value: 'SOME-GOOGLE-ANALYTICS-ID',
          name: 'googleAnalyticsInternalId',
        },
     ],
    idfa: [
      {
        value: 'b62bbf1f-7641-4224-88a2-12b0eaea6caf',
        name: 'idfa',
      },
    ]
  };
};
