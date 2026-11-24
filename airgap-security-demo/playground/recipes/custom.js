// Your scratch file. Turn it on with ?recipes=custom or the checkbox in the
// playground, then reload. Edit the override below, or add your own.
//
// Keep it synchronous. An override cannot wait for a network call.
// Reference: https://docs.transcend.io/docs/consent-management/reference/airgap/api
//
// The example blocks any request whose URL names a health condition. It backs
// the "health data in ad pixel URLs" preset.
AirgapPlayground.recipes.register({
  id: 'custom',
  title: 'Your recipe (recipes/custom.js)',
  description:
    'Your own override. The example blocks URLs that carry a health condition.',
  overrides: [
    {
      override(request) {
        const HEALTH_TERMS = /(?:condition|diagnosis|symptom)=/i;
        if (HEALTH_TERMS.test(String(request.url))) {
          request.block();
        }
      },
    },
  ],
});
