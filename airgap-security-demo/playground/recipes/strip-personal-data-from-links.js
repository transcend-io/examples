// Strip personal data from outbound links.
//
// With navigation control on, request overrides apply to links and navigations.
// This override deletes the `email` and `token` query parameters. Write to
// `request.urls[i]` to change the URL.
AirgapPlayground.recipes.register({
  id: 'strip-personal-data-from-links',
  title: 'Strip personal data from outbound links',
  description:
    'Delete the email and token query parameters from links and navigations.',
  overrides: [
    {
      override(request) {
        if (request.type !== 'navigation' && request.type !== 'DOM:link') {
          return;
        }
        request.URLs.forEach((url, i) => {
          if (!url) return;
          ['email', 'token'].forEach((name) => url.searchParams.delete(name));
          request.urls[i] = url.href;
        });
      },
    },
  ],
});
