/* eslint-env mocha, es6 */

import assert from 'assert';
import testgen from '@gerhobbelt/markdown-it-testgen';
import path from 'path';
import markdown_it from '@gerhobbelt/markdown-it';

import { fileURLToPath } from 'url';

// see https://nodejs.org/docs/latest-v13.x/api/esm.html#esm_no_require_exports_module_exports_filename_dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import plugin from '../index.js';


// Most of the rest of this is inlined from generate(), but modified
// so we can pass in an `env` object
function generate(fixturePath, md, env) {
  testgen.load(fixturePath, {}, function (data) {
    data.meta = data.meta || {};

    let desc = data.meta.desc || path.relative(fixturePath, data.file);

    (data.meta.skip ? describe.skip : describe)(desc, function () {
      data.fixtures.forEach(function (fixture) {
        it(fixture.header + ' [#' + (fixture.first.range[0] - 1) + ']', function () {
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
  let md = markdown_it({ linkify: true }).use(plugin);

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/footnote.txt'), md);
});

describe('custom docId in env', function () {
  let md = markdown_it({ linkify: true }).use(plugin);

  // Now check that using `env.documentId` works to prefix IDs
  generate(path.join(__dirname, 'fixtures/footnote-prefixed.txt'), md, { docId: 'test-doc-id' });
});

describe('custom footnote ids and labels', function () {
  let md = markdown_it({ linkify: true }).use(plugin, {
    anchor: function (n, excludeSubId, tokens, idx, options, env, slf) {
      let token = tokens[idx];
      if (token.meta.label) {
        n = '-' + token.meta.label;
      }
      if (!excludeSubId && token.meta.subId > 0) {
        n += '~' + token.meta.subId;
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


describe('footnotes get parked at the end of the containing section', function () {
  let md = markdown_it({ linkify: true }).use(plugin, {
    atDocumentEnd: false
  });

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/footnotes-at-end-of-each-section.txt'), md);
});
