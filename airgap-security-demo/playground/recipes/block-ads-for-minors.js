// Block ad and sale-of-data requests for a child.
//
// This follows the example in the age-based consent docs. The playground treats
// every visitor as a minor when this recipe is on. In your page, replace
// isMinor() with your own age check.
AirgapPlayground.recipes.register({
  id: 'block-ads-for-minors',
  title: 'Block ad requests for minors',
  description:
    'Treat the visitor as a minor and block requests tagged Advertising or SaleOfInfo.',
  overrides: [
    {
      override(request) {
        const MINOR_RESTRICTED = ['Advertising', 'SaleOfInfo'];
        const isMinor = () => true;
        if (
          isMinor() &&
          MINOR_RESTRICTED.some((purpose) => request.purposes.has(purpose))
        ) {
          request.block();
        }
      },
    },
  ],
});
