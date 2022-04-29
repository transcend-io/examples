/**
 * Enrich the identity of a data subject. i.e. map an email address to a username
 *
 * @returns User identifiers
 */
export function enrichUser(/* userIdentifier */): {
  /** email */ email: {
    /** Value of the email */
    value: string;
  }[];
  /** phone */
  phone: {
    /** country code of the phone */
    countryCode: string;
    /** value of the phone */
    value: string;
  }[];
} {
  return {
    email: [
      {
        value: 'test+enriched@transcend.io',
      },
      {
        value: 'test+access@transcend.io',
      },
    ],
    phone: [
      {
        countryCode: 'US',
        value: '+16126883289',
      },
    ],
    // googleAnalyticsInternalId: [
    //   {
    //     value: 'SOME-GOOGLE-ANALYTICS-ID',
    //   },
    // ],
    // idfa: [
    //   {
    //     value: 'b62bbf1f-7641-4224-88a2-12b0eaea6caf',
    //   },
    // ],
  };
}
