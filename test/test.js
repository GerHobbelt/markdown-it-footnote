/* eslint-env mocha, es6 */

import assert from 'assert';
import testgen from '@gerhobbelt/markdown-it-testgen';
import path from 'path';
import fs from 'fs';
import markdown_it from '@gerhobbelt/markdown-it';

import { fileURLToPath } from 'url';

// see https://nodejs.org/docs/latest-v13.x/api/esm.html#esm_no_require_exports_module_exports_filename_dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import plugin from '../dist/markdownitFootnote.js';


// Most of the rest of this is inlined from generate(), but modified
// so we can pass in an `env` object
function generate(fixturePath, md, env) {
  testgen.load(fixturePath, {}, function (data) {
    data.meta = data.meta || {};

    const desc = data.meta.desc || path.relative(fixturePath, data.file);

    (data.meta.skip ? describe.skip : describe)(desc, function () {
      data.fixtures.forEach(function (fixture) {
        it(fixture.header + ' [#' + (fixture.first.range[0] - 1) + ']', function () {
          const test_env = Object.assign({}, env || {});
          const rv = md.render(fixture.first.text, test_env);
          const html_rv = `<html>
          <head>
          ${ data.meta.css || ''}
          </head>
          <body>
          ${rv}
          `;
          const diagnostic_filename_base = path.join(__dirname, fixture.header.slice(0, 64).replace(/[^0-9a-z]+/gi, ' ').trim().replace(/ /g, '_'));
          fs.writeFileSync(diagnostic_filename_base + '.html', html_rv, 'utf8');
          delete test_env.state_block.env;
          fs.writeFileSync(diagnostic_filename_base + '.dump.json', JSON.stringify(test_env, null, 2), 'utf8');
          // add variant character after "↩", so we don't have to worry about
          // invisible characters in tests
          assert.strictEqual(
            rv,
            fixture.second.text.replace(/\u21a9(?!\ufe0e)/g, '\u21a9\ufe0e')
          );
        });
      });
    });
  });
}


if (0) {


  describe('footnote.txt', function () {
    const md = markdown_it({ linkify: true }).use(plugin);

  // Check that defaults work correctly
    generate(path.join(__dirname, 'fixtures/footnote.txt'), md);
  });

  describe('custom docId in env', function () {
    const md = markdown_it({ linkify: true }).use(plugin);

  // Now check that using `env.documentId` works to prefix IDs
    generate(path.join(__dirname, 'fixtures/footnote-prefixed.txt'), md, { docId: 'test-doc-id' });
  });

  describe('custom footnote ids and labels', function () {
    const md = markdown_it({
      linkify: true,
      html: true,
      typographer: true
    }).use(plugin, {
      anchor: function (n, excludeSubId, tokens, idx, options, env, slf) {
        const token = tokens[idx];
        if (token.meta.label) {
          n = '-' + token.meta.label;
        }
        if (!excludeSubId && token.meta.subId > 0) {
          n += '~' + token.meta.subId;
        }
        return n;
      },

      caption: function (n, tokens, idx, options, env, slf) {
        const token = tokens[idx];

        return '{' + (token.meta.label || n) + '}';
      }
    });

    generate(path.join(__dirname, 'fixtures/custom-footnotes.txt'), md);
  });

}


describe('footnotes get parked at the end of the containing section', function () {
  const md = markdown_it({ linkify: true }).use(plugin, {
    atDocumentEnd: false
  });

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/footnotes-at-end-of-each-section.txt'), md);
});
