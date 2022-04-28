/**
 * Enrich the identity of a data subject. i.e. map an email address to a username
 *
 * @returns User identifiers
 */
module.exports = function enrichUser(/* userIdentifier */) {
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
};
