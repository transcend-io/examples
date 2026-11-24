// Block card numbers and session tokens the same way.
//
// These are patterns, not a classifier. The card pattern matches 13 to 19
// digits. The token pattern matches this demo's session token format
// (`sess_` plus letters and digits). Change it to match your own.
AirgapPlayground.recipes.register({
  id: 'block-card-and-tokens',
  title: 'Block card numbers and session tokens',
  description:
    'Block requests to other hosts when the URL or body matches a card number or a session token pattern.',
  overrides: [
    {
      override(request) {
        const CARD = /\b(?:\d[ -]?){13,19}\b/;
        const TOKEN = /\bsess_[a-z0-9]{8,}\b/i;
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
        const text = `${url} ${body}`;
        if (!firstParty && (CARD.test(text) || TOKEN.test(text))) {
          request.block();
        }
      },
    },
  ],
});
