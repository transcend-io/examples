/**
 * Recipe registry. Each file in recipes/ calls `AirgapPlayground.recipes.register`
 * with plain override code, written the way you would paste it into your own
 * page. This file wraps each override so the playground can tell which one fired.
 * The wrapper never appears in the "Copy this config" panel. That panel prints
 * the original code.
 */
(function () {
  const ns = (self.AirgapPlayground = self.AirgapPlayground || {});
  const list = [];
  const hits = [];

  /**
   * @param {object} recipe The recipe.
   * @returns {object[]} Overrides that record a hit when they block or rewrite.
   */
  function wrapOverrides(recipe) {
    return (recipe.overrides || []).map((entry) => {
      if (typeof entry.override !== 'function') return entry;
      const wrapped = {
        override(request, matcher) {
          const original = String(request.url);
          let before = '';
          try {
            before = JSON.stringify(request.urls);
          } catch (error) {
            before = '';
          }
          entry.override.call(this, request, matcher);
          let after = before;
          try {
            after = JSON.stringify(request.urls);
          } catch (error) {
            after = before;
          }
          const blocked = request.blocked === true;
          if (blocked || after !== before) {
            hits.push({
              recipe: recipe.id,
              title: recipe.title,
              url: original,
              action: blocked ? 'blocked' : 'rewrote',
              at: Date.now(),
            });
          }
        },
      };
      if (entry.matcher) wrapped.matcher = entry.matcher;
      return wrapped;
    });
  }

  ns.recipes = {
    list,
    hits,
    register(recipe) {
      list.push(recipe);
    },
    wrapOverrides,
    get(id) {
      return list.filter((recipe) => recipe.id === id)[0];
    },
  };
})();
