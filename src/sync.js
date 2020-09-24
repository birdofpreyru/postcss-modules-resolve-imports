'use strict';

/**
 * Notes about postcss plugin's api
 *
 * Containers are iterated with .walk* methods.
 * - Rule is actually a selector.
 * - AtRule usually is rule, that starts from '@'.
 * - Decl are actually css rules (keys prop, value).
 *
 * @see  http://api.postcss.org/AtRule.html#walkRules
 */

const postcss = require('postcss');
const resolveDeps = require('./resolveDeps');

const extractPlugin = () => ({
  postcssPlugin: 'extract-plugin',
  Root: resolveDeps,
});
extractPlugin.postcss = true;

module.exports = resolveImportsPlugin;
module.exports.postcss = true;

/**
 * dangerouslyPrevailCyclicDepsWarnings
 * icssExports
 * resolve.alias
 * resolve.extensions
 * resolve.modules
 */
function resolveImportsPlugin({icssExports, resolve = {}} = {}) {
  return {
    postcssPlugin: 'postcss-modules-resolve-imports',
    Root: resolveImports,
  };

  function resolveImports(ast, result) {
    if (result.result) ({result} = result);
    const graph = {};
    const processor = createProcessor(result.processor.plugins);
    const rootPath = ast.source.input.file;
    const rootTree = ast.clone({nodes: []});

    resolveDeps(ast, {opts: {from: rootPath, graph, resolve, rootPath, rootTree}, processor});

    if (icssExports) {
      const exportRule = postcss.rule({
        raws: {
          before: '',
          between: '\n',
          semicolon: true,
          after: '\n',
        },
        selector: ':export',
      });

      Object.keys(ast.exports).forEach(className =>
        exportRule.append({
          prop: className,
          value: ast.exports[className],
          raws: {before: '\n  '},
        }));

      rootTree.prepend(exportRule);
    }

    rootTree.exports = ast.exports;
    result.root = rootTree;
  }
}

function createProcessor(plugins) {
  const selfposition = plugins.findIndex(bySelfName);
  const precedingPlugins = plugins.slice(0, selfposition);

  return postcss(precedingPlugins.concat(extractPlugin));
}

function bySelfName(plugin) {
  return plugin.postcssPlugin === 'postcss-modules-resolve-imports';
}
