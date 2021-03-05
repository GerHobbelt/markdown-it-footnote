# markdown-it-footnote

[![Build Status](https://img.shields.io/travis/GerHobbelt/markdown-it-footnote/master.svg?style=flat)](https://travis-ci.org/GerHobbelt/markdown-it-footnote)
[![NPM version](https://img.shields.io/npm/v/@gerhobbelt/markdown-it-footnote.svg?style=flat)](https://www.npmjs.org/package/@gerhobbelt/markdown-it-footnote)
[![Coverage Status](https://img.shields.io/coveralls/GerHobbelt/markdown-it-footnote/master.svg?style=flat)](https://coveralls.io/r/GerHobbelt/markdown-it-footnote?branch=master)

> Footnotes plugin for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

__v2.+ requires `markdown-it` v5.+, see changelog.__

Markup is based on [pandoc](http://johnmacfarlane.net/pandoc/README.html#footnotes) definition.

__Normal footnote__:

```
Here is a footnote reference,[^1] and another.[^longnote]

[^1]: Here is the footnote.

[^longnote]: Here's one with multiple blocks.

    Subsequent paragraphs are indented to show that they
belong to the previous footnote.
```

html:

```html
<p>Here is a footnote reference,<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup> and another.<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup></p>
<p>This paragraph won’t be part of the note, because it
isn’t indented.</p>
<hr class="footnotes-sep">
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn1"  class="footnote-item"><p>Here is the footnote. <a href="#fnref1" class="footnote-backref">↩</a></p>
</li>
<li id="fn2"  class="footnote-item"><p>Here’s one with multiple blocks.</p>
<p>Subsequent paragraphs are indented to show that they
belong to the previous footnote. <a href="#fnref2" class="footnote-backref">↩</a></p>
</li>
</ol>
</section>
```

__Footnote with added text__:

This fork adds support for footnote references having additional text content. This type of footnote reference follows the pattern of `[^l ...]` where _l_ is a one-word label, followed by a space and then some additional text. You might prefer to use this way of referencing a footnote in order to enhance usability in certain accessibility scenarios: when a screen reader user is navigating a document as list of links for example (where the links are presented separately from the surrounding document) it is more useful to hear the footnote link described as "added text [1]" rather than just "[1]".

```
Here is a footnote reference with [^1 added text].

[^1]: Here is the footnote.
```

html:

```html
<p>Here is a footnote reference with <a href="#fn1" id="fnref1">added text<sup class="footnote-ref">[1]</sup></a>.</p>
<hr class="footnotes-sep">
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn1" class="footnote-item"><p>Here is the footnote. <a href="#fnref1" class="footnote-backref">↩</a></p>
</li>
</ol>
</section>
```

__Inline footnote__:

```
Here is an inline note.^[Inlines notes are easier to write, since
you don't have to pick an identifier and move down to type the
note.]
```

html:

```html
<p>Here is an inline note.<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup></p>
<hr class="footnotes-sep">
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn1"  class="footnote-item"><p>Inlines notes are easier to write, since
you don’t have to pick an identifier and move down to type the
note. <a href="#fnref1" class="footnote-backref">↩</a></p>
</li>
</ol>
</section>
```


## Install

node.js, browser:

```bash
npm install @gerhobbelt/markdown-it-footnote --save
bower install @gerhobbelt/markdown-it-footnote --save
```

## Use

```js
var md = require('@gerhobbelt/markdown-it')()
            .use(require('@gerhobbelt/markdown-it-footnote'));

md.render(/*...*/); // See examples above
```

_Differences in browser._ If you load script directly into the page, without
package system, module will add itself globally as `window.markdownitFootnote`.


### Options

`atDocumentEnd`: true/false (default: true) - where to generate the footnotes.



### Customize

If you want to customize the output, you'll need to replace the template
functions. To see which templates exist and their default implementations,
look in [`index.js`](index.js). The API of these template functions is out of
scope for this plugin's documentation; you can read more about it [in the
markdown-it
documentation](https://github.com/markdown-it/markdown-it/blob/master/docs/architecture.md#renderer).

To demonstrate with an example, here is how you might replace the `<hr>` that
this plugin emits by default with an `<h4>` emitted by your own template
function override:

```js
const md = require('markdown-it')().use(require('markdown-it-footnote'));

md.renderer.rules.footnote_block_open = () => (
  '<h4 class="mt-3">Footnotes</h4>\n' +
  '<section class="footnotes">\n' +
  '<ol class="footnotes-list">\n'
);
```


## License

[MIT](https://github.com/GerHobbelt/markdown-it-footnote/blob/master/LICENSE)
