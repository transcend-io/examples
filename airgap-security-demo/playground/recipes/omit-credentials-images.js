// Let shoppers' images load without your cookies.
//
// A store page shows images from hosts that users supply, such as reviews and
// avatars. Load them, but never send the store's cookies.
//
// omitCredentials() drops cookies and auth. It does not remove the referrer.
// Pair it with a referrer policy if the referrer matters.
AirgapPlayground.recipes.register({
  id: 'omit-credentials-images',
  title: 'Load user images without cookies',
  description:
    'Call omitCredentials() on images from other hosts, so no cookies go with them.',
  overrides: [
    {
      override(request) {
        if (
          request.type === 'DOM:image' &&
          !request.URLs.every((url) => url?.hostname === location.hostname)
        ) {
          request.omitCredentials();
        }
      },
    },
  ],
});
