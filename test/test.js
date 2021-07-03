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

import plugin from '../dist/markdownItFootnote.modern.js';

function N(n) {
  const rv = '00000' + n;
  return rv.slice(rv.length - 4);
}

// Most of the rest of this is inlined from generate(), but modified
// so we can pass in an `env` object
function generate(fixturePath, md, env, dump_json) {
  testgen.load(fixturePath, {}, function (data) {
    data.meta = data.meta || {};

    const desc = data.meta.desc || path.relative(fixturePath, data.file);

    (data.meta.skip ? describe.skip : describe)(desc, function () {
      data.fixtures.forEach(function (fixture, idx) {
        //if ((fixture.first.range[0] - 1) !== 3) return;

        it(fixture.header + ' [line #' + (fixture.first.range[0] - 1) + ']', function () {
          const test_env = Object.assign({}, env || {});
          const rv = md.render(fixture.first.text, test_env);

          // make this a decent html file, if possible.
          const html_rv = `<html>
          <head>
          ${ data.meta.css || '' }
          </head>
          <body>
          ${rv}
          `;

          const diagnostic_filename_base = fixturePath.replace('fixtures', 'results').replace('.txt', '-LINE' + N(fixture.first.range[0] - 1));

          if (!fs.existsSync(path.dirname(diagnostic_filename_base))) {
            fs.mkdirSync(path.dirname(diagnostic_filename_base));
          }

          fs.writeFileSync(diagnostic_filename_base + '.istwert.html', html_rv, 'utf8');
          delete test_env.state_block.env;
          if (dump_json) {
            fs.writeFileSync(diagnostic_filename_base + '.dump.json', JSON.stringify(test_env, null, 2), 'utf8');
          }
          const sollwert_filepath = diagnostic_filename_base + '.sollwert.html';
          if (!fs.existsSync(sollwert_filepath)) {
            fs.writeFileSync(sollwert_filepath, html_rv, 'utf8');
          }

          let istwert = html_rv.trim();
          let sollwert = fs.readFileSync(sollwert_filepath, 'utf8').trim();

          // add variant character after "↩", so we don't have to worry about
          // invisible characters in tests
          sollwert = sollwert.replace(/\u21a9(?!\ufe0e)?/g, '\u21a9\ufe0e');
          istwert = istwert.replace(/\u21a9(?!\ufe0e)?/g, '\u21a9\ufe0e');

          assert.strictEqual(
            istwert,
            sollwert
          );
        });
      });
    });
  });
}




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
    anchorFn: function (n, excludeSubId, renderInfo) {
      const token = renderInfo.tokens[renderInfo.idx];
      assert.ok(token != null);
      assert.ok(token.meta != null);
      const id = token.meta.id;

      const tokenInfo = renderInfo.env.footnotes.list[id];
      assert.ok(tokenInfo != null);

      n = '-ID-' + id;
      if (tokenInfo.labelOverride) {
        n = '-' + tokenInfo.labelOverride;
      }
      if (!excludeSubId && token.meta.subId > 0) {
        n += '~' + token.meta.subId;
      }
      return n;
    },

    captionFn: function (n, renderInfo) {
      const token = renderInfo.tokens[renderInfo.idx];
      assert.ok(token != null);
      assert.ok(token.meta != null);
      const id = token.meta.id;

      const tokenInfo = renderInfo.env.footnotes.list[id];
      assert.ok(tokenInfo != null);

      return '{' + (tokenInfo.label || n) + '}';
    }
  });

  generate(path.join(__dirname, 'fixtures/custom-footnotes.txt'), md);
});


describe('more feature tests with default plugin settings', function () {
  const md = markdown_it({
    linkify: true,
    html: true,
    typographer: true
  }).use(plugin);

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/more-tests.txt'), md);
});


describe('feature tests with forced side-note plugin config', function () {
  const md = markdown_it({
    linkify: true,
    html: true,
    typographer: true
  }).use(plugin, {
    modeOverride: 'aside',
    refCombiner: '//'
  });

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/more-tests-aside-refcombiner.txt'), md);
});

describe('feature tests with custom captioner: Roman numerals', function () {
  const md = markdown_it({
    linkify: true,
    html: true,
    typographer: true
  }).use(plugin, {
    numberSequence: null,
    mkLabel: (idx, info, baseInfo) => {
      const label = info.labelOverride;
      if (label) {
        return label;
      }
      // now convert idx to a roman number (lower case):
      let rv = '';
      while (idx >= 10) {
        rv += 'x';
        idx -= 10;
      }
      if (idx === 9) {
        rv += 'ix';
        return rv;
      }
      if (idx >= 5) {
        rv += 'v';
        idx -= 5;
        while (idx > 0) {
          rv += 'i';
          idx--;
        }
        return rv;
      }
      return rv + [
        '', 'i', 'ii', 'iii', 'iv'
      ][idx];
    }
  });

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/more-tests-roman.txt'), md);
});




describe('produce a complex test/demo file with many features combined', function () {
  const md = markdown_it({ linkify: true }).use(plugin, {
  });

  // Check that defaults work correctly
  generate(path.join(__dirname, 'fixtures/footnotes-at-end-of-each-section.txt'), md, null, true);
});
