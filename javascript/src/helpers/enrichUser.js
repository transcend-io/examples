/**
 * Enrich the identity of a data subject. i.e. map an email address to a username
 */
module.exports = async function enrichUser(/* userIdentifier */) {
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
        number: '+16126883289',
      },
    ],
    // googleAnalyticsInternalId: [
    //   {
    //     value: 'SOME-GOOGLE-ANALYTICS-ID',
    //     name: 'googleAnalyticsInternalId',
    //   },
    // ],
    // idfa: [
    //   {
    //     value: 'b62bbf1f-7641-4224-88a2-12b0eaea6caf',
    //     name: 'idfa',
    //   },
    // ],
  };
};
