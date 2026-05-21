/**
 * Custom Jest transform for .vue files.
 *
 * Preprocesses v-bind() CSS expressions to use CSS var() instead,
 * which @vue/vue3-jest cannot compile in test environments.
 *
 * Transforms:   v-bind('Colors.Background')
 *       into:   var(--colors-background)
 */

const vueJest = require('@vue/vue3-jest')

const transformer = typeof vueJest === 'function'
  ? vueJest()
  : typeof vueJest.createTransformer === 'function'
    ? vueJest.createTransformer()
    : vueJest

/** Convert a dotted v-bind expression (e.g. "Colors.Background") to a CSS var name (e.g. "colors-background") */
function exprToCssVar(expr) {
  return '--' + expr
    .split('.')
    .map(part => part.replace(/([A-Z])/g, '-$1').toLowerCase())
    .join('-')
}

function preprocess(source) {
  return source.replace(
    /v-bind\('([^']+)'\)/g,
    (_, expr) => `var(${exprToCssVar(expr)})`
  )
}

module.exports = {
  process(source, filename, config) {
    return transformer.process(preprocess(source), filename, config)
  },
  processAsync(source, filename, config) {
    const asyncFn = transformer.processAsync || transformer.process
    return asyncFn(preprocess(source), filename, config)
  },
}
