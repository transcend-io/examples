// Pin the analytics account. This is the fix for try 4 in the story.
//
// An approved host is still approved. A skimmer can send data to the store's
// own analytics host under its own account. This override blocks analytics
// requests that name any account but the store's.
//
// Overrides are synchronous. They run on every matching request.
AirgapPlayground.recipes.register({
  id: 'pin-analytics-account',
  title: 'Pin the analytics account',
  description:
    'Block analytics requests that name an account other than the store account.',
  overrides: [
    {
      matcher: /^https:\/\/www\.google-analytics\.com\//,
      override(request) {
        const STORE_ACCOUNT = 'store-4821';
        if (
          request.URLs.some(
            (url) => url?.searchParams.get('account') !== STORE_ACCOUNT,
          )
        ) {
          request.block();
        }
      },
    },
  ],
});
