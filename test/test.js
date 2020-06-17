/* eslint-env mocha, es6 */

let assert   = require('assert');
let testgen  = require('@gerhobbelt/markdown-it-testgen');
let path     = require('path');

// Most of the rest of this is inlined from generate(), but modified
// so we can pass in an `env` object
function generate(fixturePath, md, env) {
  testgen.load(fixturePath, {}, function (data) {
    data.meta = data.meta || {};

    let desc = data.meta.desc || path.relative(fixturePath, data.file);

    (data.meta.skip ? describe.skip : describe)(desc, function () {
      data.fixtures.forEach(function (fixture) {
        it('line ' + (fixture.first.range[0] - 1), function () {
          // add variant character after "↩", so we don't have to worry about
          // invisible characters in tests
          assert.strictEqual(
            md.render(fixture.first.text, Object.assign({}, env || {})),
            fixture.second.text.replace(/\u21a9(?!\ufe0e)/g, '\u21a9\ufe0e')
          );
        });
      });
    });
  });
}


describe('footnote.txt', function () {
  let md = require('@gerhobbelt/markdown-it')({ linkify: true }).use(require('../'));

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/footnote.txt'), md);
});

describe('custom docId in env', function () {
  let md = require('@gerhobbelt/markdown-it')().use(require('../'));

  // Now check that using `env.documentId` works to prefix IDs
  generate(path.join(__dirname, 'fixtures/footnote-prefixed.txt'), md, { docId: 'test-doc-id' });
});

describe('custom footnote ids and labels', function () {
  let md = require('@gerhobbelt/markdown-it')().use(require('../'), {
    anchor: function (n, tokens, idx, options, env, slf) {
      let token = tokens[idx];
      if (token.meta.label) {
        return '-' + token.meta.label;
      }
      return n;
    },

    caption: function (n, tokens, idx, options, env, slf) {
      let token = tokens[idx];

      return '{' + (token.meta.label || n) + '}';
    }
  });

  generate(path.join(__dirname, 'fixtures/custom-footnotes.txt'), md);
});
