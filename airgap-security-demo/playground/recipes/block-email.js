// Block a third-party request that carries an email address.
//
// The check looks at the URL and at the request body. Airgap exposes a body
// only for fetch, XMLHttpRequest (non-GET), sendBeacon, and form POST. It does
// not expose bodies for image or script loads, or for navigation form data.
AirgapPlayground.recipes.register({
  id: 'block-email',
  title: 'Block email in a request',
  description:
    'Block requests to other hosts when the URL or body holds an email address.',
  overrides: [
    {
      override(request) {
        const EMAIL = /[^\s@"]+@[^\s@"]+\.[a-z]{2,}/i;
        const firstParty = request.URLs.every(
          (url) => url?.hostname === location.hostname,
        );
        let url = String(request.url);
        try {
          url = decodeURIComponent(url);
        } catch (error) {
          // Keep the raw URL.
        }
        const body =
          typeof request.requestInit?.body === 'string'
            ? request.requestInit.body
            : '';
        if (!firstParty && (EMAIL.test(url) || EMAIL.test(body))) {
          request.block();
        }
      },
    },
  ],
});
