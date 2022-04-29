/**
 * Look inside a database and return the person's user profiles
 *
 * @param userIdentifier - User identifier to lookup
 * @returns User data
 */
export function lookUpUser(userIdentifier: string): [
  {
    /** Profile ID */
    profileId: string;
    /** Profile Data */
    profileData: {
      /** Name */
      name: string;
      /** Interests */
      interests: string;
    };
  },
] {
  return [
    {
      profileId: userIdentifier,
      profileData: {
        name: 'Ben Farrell',
        interests: 'Privacy Tech',
      },
    },
  ];
}
