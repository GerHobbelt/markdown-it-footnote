/*! markdown-it-footnote 3.0.3-10 https://github.com//GerHobbelt/markdown-it-footnote @license MIT */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('assert')) :
  typeof define === 'function' && define.amd ? define(['assert'], factory) :
  (global = global || self, global.markdownitFootnote = factory(global.assert));
}(this, (function (assert) { 'use strict';

  // Process footnotes

  function anchorFnDefault(n, excludeSubId, baseInfo) {
    const env = baseInfo.env;
    assert.strict.ok(env != null);
    let prefix = '';

    if (typeof env.docId === 'string' && env.docId.length > 0) {
      prefix = '-' + env.docId + '-';
    }

    return prefix + n;
  }

  function captionFnDefault(n, baseInfo) {
    //return '[' + n + ']';
    return '' + n;
  }

  function headerFnDefault(category, baseInfo) {
    switch (category) {
      case 'aside':
        return 'Side Notes';

      case 'section':
        return 'Section Notes';

      case 'end':
        return 'Endnotes';

      default:
        // used for error category, e.g. 'Error::Unused'
        return category;
    }
  }

  function determine_footnote_symbol(idx, info, baseInfo) {
    const plugin_options = baseInfo.plugin_options;
    assert.strict.ok(plugin_options != null); // rule to construct the printed label:
    //
    //     mark = labelOverride  /* || info.label */  || idx;

    const label = info.labelOverride;

    if (label) {
      return label;
    }

    if (plugin_options.numberSequence == null || plugin_options.numberSequence.length === 0) {
      return '' + idx;
    }

    const len = plugin_options.numberSequence.length;

    if (idx >= len) {
      // is last slot numeric or alphanumerically?
      const slot = plugin_options.numberSequence[len - 1];

      if (Number.isFinite(slot)) {
        const delta = idx - len + 1;
        return '' + (slot + delta);
      } // non-numerical last slot --> duplicate, triplicate, etc.


      const dupli = idx / len | 0; // = int(x mod N)

      const remainder = idx % len;
      const core = plugin_options.numberSequence[remainder];
      let str = '' + core;

      for (let i = 1; i < dupli; i++) {
        str += core;
      }

      return str;
    }

    return '' + plugin_options.numberSequence[idx];
  }

  const bunched_mode_classes = ['', 'footnote-bunched-ref-ref', 'footnote-bunched-ref-text'];

  function generateFootnoteRefHtml(id, caption, refId, bunched_footnote_ref_mode, renderInfo) {
    let localOverride = renderInfo.tokens[renderInfo.idx].meta.text;

    if (localOverride) {
      localOverride = `<span class="footnote-ref-extra-text">${localOverride}</span>`;
    }

    return `<a class="footnote-ref ${bunched_mode_classes[bunched_footnote_ref_mode]}" href="#fn${id}" id="fnref${refId}">${localOverride || ''}<sup class="footnote-ref">${caption}</sup></a>` + (bunched_footnote_ref_mode !== 0 ? `<sup class="footnote-ref-combiner ${bunched_mode_classes[bunched_footnote_ref_mode]}">${renderInfo.plugin_options.refCombiner || ''}</sup>` : '');
  }

  function generateFootnoteSectionStartHtml(renderInfo) {
    const tok = renderInfo.tokens[renderInfo.idx];
    assert.strict.ok(tok != null);
    assert.strict.ok(tok.meta != null);
    const header = tok.markup ? `<h3 class="footnotes-header">${tok.markup}</h3>` : '';
    let category = tok.meta.category;
    assert.strict.ok(category.length > 0); // `category` can contain CSS class illegal characters, e.g. when category = 'Error::Unused':

    category = category.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return `<hr class="footnotes-sep footnotes-category-${category}" id="fnsection-hr-${tok.meta.sectionId}"${renderInfo.options.xhtmlOut ? ' /' : ''}><aside class="footnotes footnotes-category-${category}" id="fnsection-${tok.meta.sectionId}">${header}<ul class="footnotes-list">\n`;
  }

  function generateFootnoteSectionEndHtml(renderInfo) {
    return '</ul>\n</aside>\n';
  }

  function generateFootnoteStartHtml(id, caption, renderInfo) {
    // allow both a JavaWScript --> CSS approach via `data-footnote-caption`
    // and a classic CSS approach while a display:inline-block SUP presenting
    // the LI 'button' instead:
    return `<li tabindex="-1" id="fn${id}" class="footnote-item" data-footnote-caption="${caption}"><span class="footnote-caption"><sup class="footnote-caption">${caption}</sup></span><span class="footnote-content">`;
  }

  function generateFootnoteEndHtml(renderInfo) {
    return '</span></li>\n';
  }

  function generateFootnoteBackRefHtml(id, refId, renderInfo) {
    const tok = renderInfo.tokens[renderInfo.idx];
    assert.strict.ok(tok != null);
    assert.strict.ok(tok.meta != null);
    /* ↩ with escape code to prevent display as Apple Emoji on iOS */

    return ` <a href="#fnref${refId}" class="footnote-backref footnote-backref-${tok.meta.subId} footnote-backref-R${tok.meta.backrefCount - tok.meta.subId - 1}">\u21a9\uFE0E</a>`;
  }

  const default_plugin_options = {
    // atDocumentEnd: false,               -- obsoleted option of the original plugin
    anchorFn: anchorFnDefault,
    captionFn: captionFnDefault,
    headerFn: headerFnDefault,
    mkLabel: determine_footnote_symbol,
    // see also https://www.editage.com/insights/footnotes-in-tables-part-1-choice-of-footnote-markers-and-their-sequence
    // why asterisk/star is not part of the default footnote marker sequence.
    //
    // For similar reasons, we DO NOT include the section § symbol in this list.
    //
    // when numberSequnce is NULL/empty, a regular numerical numbering is assumed.
    // Otherwise, the array is indexed; when there are more footnotes than entries in
    // the numberSequence array, the entries are re-used, but doubled/trippled, etc.
    //
    // When the indexing in this array hits a NUMERIC value (as last entry), any higher
    // footnotes are NUMBERED starting at that number.
    //
    // NOTE: as we can reference the same footnote from multiple spots, we do not depend
    // on CSS counter() approaches by default, but providee this mechanism in the plugin
    // code itself.
    numberSequence: ['†', '‡', '††', '‡‡', '¶', 1],
    // Overrides the footnode mode when set to one of the following:
    //
    // Recognized 'modes':
    // '>': aside note (default for inline notes)
    // ':': end node
    // '=': section note (default for regular referenced notes)
    //
    // Also accepts these keywords: 'aside', 'section', 'end'
    //
    modeOverride: null,
    // list section notes and endnotes in order of:
    //
    // 0: first *appearance* in the text
    // 1: first *reference* in the text
    // 2: *definition* in the text
    // 3: sorted alphanumerically by *coded* label,
    //    i.e. *numeric* labels are sorted in numeric order (so `10` comes AFTER `7`!),
    //    while all others are sorted using `String.localeCompare()`. When labels have
    //    a *numeric leading*, e.g. `71geo` --> `71`, that part is sorted numerically first.
    //
    //    Here 'coded label' means the label constructed from the reference ids and label overrides
    //    as used in the markdown source, using the expression
    //           labelOverride || reference || id
    //    which gives for these examples (assuming them to be the only definitions in your input):
    //           [^refA]: ...      -->  null || 'refA' || 1
    //           [^refB LBL]: ...  -->  'LBL' || 'refB' || 2
    // 4: sorted alphanumerically by *printed* label
    //    which is like mode 3, but now for the label as will be seen in the *output*!
    sortOrder: 4,
    // what to print between bunched-together footnote references, i.e. the '+' in `blabla¹⁺²`
    refCombiner: ','
  };
  function footnote_plugin(md, plugin_options) {
    const parseLinkLabel = md.helpers.parseLinkLabel,
          isSpace = md.utils.isSpace;
    plugin_options = Object.assign({}, default_plugin_options, plugin_options);

    function determine_mode(mode, default_mode) {
      let override = null;

      if (plugin_options.modeOverride) {

        if ('>:='.includes(plugin_options.modeOverride)) {
          override = plugin_options.modeOverride;
        }
      }

      if ('>:='.includes(mode)) {
        return {
          mode: override || mode,
          fromInput: true
        };
      }

      return {
        mode: override || default_mode,
        fromInput: false
      };
    }

    function render_footnote_n(tokens, idx, excludeSubId) {
      const mark = tokens[idx].meta.id;
      assert.strict.ok(Number.isFinite(mark));
      assert.strict.ok(mark > 0);
      let n = '' + mark; // = mark.toString();

      assert.strict.ok(n.length > 0);

      if (!excludeSubId && tokens[idx].meta.subId > 0) {
        n += '-' + tokens[idx].meta.subId;
      }

      return n;
    }

    function render_footnote_mark(renderInfo) {
      const token = renderInfo.tokens[renderInfo.idx];
      assert.strict.ok(token != null);
      assert.strict.ok(renderInfo.env.footnotes != null);
      assert.strict.ok(renderInfo.env.footnotes.list != null);
      const info = renderInfo.env.footnotes.list[token.meta.id];
      assert.strict.ok(info != null);
      const mark = plugin_options.mkLabel(token.meta.id, info, renderInfo);
      assert.strict.ok(mark.length > 0);
      return mark;
    }

    function render_footnote_anchor_name(renderInfo) {
      const n = render_footnote_n(renderInfo.tokens, renderInfo.idx, true);
      return plugin_options.anchorFn(n, true, renderInfo);
    }

    function render_footnote_anchor_nameRef(renderInfo) {
      const n = render_footnote_n(renderInfo.tokens, renderInfo.idx, false);
      return plugin_options.anchorFn(n, false, renderInfo);
    }

    function render_footnote_caption(renderInfo) {
      const n = render_footnote_mark(renderInfo);
      return plugin_options.captionFn(n, renderInfo);
    }

    function render_footnote_ref(tokens, idx, options, env, self) {
      const renderInfo = {
        tokens,
        idx,
        options,
        env,
        plugin_options,
        self
      };
      const id = render_footnote_anchor_name(renderInfo);
      const caption = render_footnote_caption(renderInfo);
      const refId = render_footnote_anchor_nameRef(renderInfo); // check if multiple footnote references are bunched together:
      // IFF they are, we should separate them with commas.
      //
      // Exception: when next token has an extra text (`meta.text`) the
      // bunching together is not a problem as them the output will render
      // like this: `bla<sup>1</sup><a>text<sup>2</sup></a>`, ergo a look
      // like this: `bla¹text²` instead of bunched footnotes references ¹ and ²
      // that would (without the extra comma injection) look like `bla¹²` instead
      // of `x¹⁺²` (here '+' instead of ',' comma, but you get the idea -- there's no
      // Unicode superscript-comma so that's why I used unicode superscript-plus
      // in this 'ascii art' example).
      //

      const next_token = tokens[idx + 1] || {};
      const next_token_meta = next_token.meta || {};
      const bunched_footnote_ref_mode = next_token.type === 'footnote_ref' ? !next_token_meta.text ? 1 : 2 : 0;
      return generateFootnoteRefHtml(id, caption, refId, bunched_footnote_ref_mode, renderInfo);
    }

    function render_footnote_block_open(tokens, idx, options, env, self) {
      const renderInfo = {
        tokens,
        idx,
        options,
        env,
        plugin_options,
        self
      };
      return generateFootnoteSectionStartHtml(renderInfo);
    }

    function render_footnote_block_close(tokens, idx, options, env, self) {
      return generateFootnoteSectionEndHtml();
    }

    function render_footnote_reference_open(tokens, idx, options, env, self) {
      return '';
    }

    function render_footnote_reference_close() {
      return '';
    }

    function render_footnote_mark_end_of_block() {
      return '';
    }

    function render_footnote_open(tokens, idx, options, env, self) {
      const renderInfo = {
        tokens,
        idx,
        options,
        env,
        plugin_options,
        self
      };
      const id = render_footnote_anchor_name(renderInfo);
      const caption = render_footnote_caption(renderInfo); // allow both a JavaScript --> CSS approach via `data-footnote-caption`
      // and a classic CSS approach while a display:inline-block SUP presenting
      // the LI 'button' instead:

      return generateFootnoteStartHtml(id, caption);
    }

    function render_footnote_close(tokens, idx, options, env, self) {
      return generateFootnoteEndHtml();
    }

    function render_footnote_anchor_backref(tokens, idx, options, env, self) {
      const renderInfo = {
        tokens,
        idx,
        options,
        env,
        plugin_options,
        self
      };
      const tok = tokens[idx];
      assert.strict.ok(tok != null);
      assert.strict.ok(tok.meta != null);
      const id = render_footnote_anchor_name(renderInfo);
      let refId = render_footnote_n(tokens, idx, false);
      refId = plugin_options.anchorFn(refId, false, renderInfo);
      return generateFootnoteBackRefHtml(id, refId, renderInfo);
    }

    md.renderer.rules.footnote_ref = render_footnote_ref;
    md.renderer.rules.footnote_block_open = render_footnote_block_open;
    md.renderer.rules.footnote_block_close = render_footnote_block_close;
    md.renderer.rules.footnote_reference_open = render_footnote_reference_open;
    md.renderer.rules.footnote_reference_close = render_footnote_reference_close;
    md.renderer.rules.footnote_mark_end_of_block = render_footnote_mark_end_of_block;
    md.renderer.rules.footnote_open = render_footnote_open;
    md.renderer.rules.footnote_close = render_footnote_close;
    md.renderer.rules.footnote_anchor = render_footnote_anchor_backref;

    function obtain_footnote_info_slot(env, label, at_definition) {
      // inline blocks have their own *child* environment in markdown-it v10+.
      // As the footnotes must live beyond the lifetime of the inline block env,
      // we must patch them into the `parentState.env` for the footnote_tail
      // handler to be able to access them afterwards!
      while (env.parentState) {
        env = env.parentState.env;
        assert.strict.ok(env != null);
      }

      if (!env.footnotes) {
        env.footnotes = {
          // map label tto ID:
          refs: {},
          // store footnote info indexed by ID
          list: [],
          // remap ID to re-ordered ID (determines placement order for section notes and endnotes)
          idMap: [0],
          idMapCounter: 0,
          // and a counter for the generated sections (including asides); see the demo/test which
          // uses the generated `#fnsection-DDD` identifiers to hack/fix the styling, for example.
          sectionCounter: 0
        };
      } // When label is NULL, this is a request from in INLINE NOTE.
      // NOTE: IDs are index numbers, BUT they start at 1 instead of 0 to make life easier in check code:


      let footnoteId;
      let infoRec; // label as index: prepend ':' to avoid conflict with Object.prototype members

      if (label == null || !env.footnotes.refs[':' + label]) {
        footnoteId = Math.max(1, env.footnotes.list.length);
        infoRec = {
          id: footnoteId,
          label,
          labelOverride: null,
          mode: null,
          content: null,
          tokens: null,
          count: 0
        };
        env.footnotes.list[footnoteId] = infoRec;

        if (label != null) {
          env.footnotes.refs[':' + label] = footnoteId;
        }
      } else {
        footnoteId = env.footnotes.refs[':' + label];
        infoRec = env.footnotes.list[footnoteId];
        assert.strict.ok(!!infoRec, 'expects non-NULL footnote info record');
      }

      const idMap = env.footnotes.idMap; // now check if the idMap[] has been set up already as well. This depends on
      // when WE are invoked (`at_definition`) and the configured `options.sortOrder`:

      switch (plugin_options.sortOrder) {
        // 0: first *appearance* in the text
        default:
        case 0:
          // basically, this means: order as-is
          if (!idMap[footnoteId]) {
            idMap[footnoteId] = ++env.footnotes.idMapCounter;
          }

          break;
        // 1: first *reference* in the text

        case 1:
          if (!at_definition && !idMap[footnoteId]) {
            // first reference is now!
            idMap[footnoteId] = ++env.footnotes.idMapCounter;
          }

          break;
        // 2: *definition* in the text

        case 2:
          if (at_definition && !idMap[footnoteId]) {
            // definition is now!
            idMap[footnoteId] = ++env.footnotes.idMapCounter;
          }

          break;
        // 3: sorted alphanumerically by label (inline footnotes will end up at the top, before all other notes)

        case 3:
        case 4:
          // just note the footnoteId now; this must be re-ordered later when we have collected all footnotes.
          //
          // set it up when we get there...
          break;
      }

      return infoRec;
    }

    function find_end_of_block_marker(state, startIndex) {
      let idx, len;
      const tokens = state.tokens;

      for (idx = startIndex, len = tokens.length; idx < len; idx++) {
        if (tokens[idx].type === 'footnote_mark_end_of_block') {
          return idx;
        }
      } // Punch a slot into the token stream (at the very end)
      // for consistency with footnote_mark_end_of_block():


      const token = new state.Token('footnote_mark_end_of_block', '', 0);
      token.hidden = true;
      tokens.push(token);
      return tokens.length - 1;
    }

    function update_end_of_block_marker(state, footnoteId) {
      // inject marker into parent = block level token stream to announce the advent of an (inline) footnote:
      // because the markdown_it code uses a for() loop to go through the parent nodes while parsing the
      // 'inline' chunks, we CANNOT safely inject a marker BEFORE the chunk, only AFTERWARDS:
      const parentState = state.env.parentState;
      const parentIndex = state.env.parentTokenIndex;
      const markerTokenIndex = find_end_of_block_marker(parentState, parentIndex + 1);
      const token = parentState.tokens[markerTokenIndex];

      if (!token.meta) {
        token.meta = {
          footnote_list: []
        };
      }

      token.meta.footnote_list.push(footnoteId);
    } // Mark end of paragraph/heading/whatever BLOCK (or rather: START of the next block!)


    function footnote_mark_end_of_block(state, startLine, endLine, silent) {
      if (!silent && state.tokens.length > 0) {
        const token = state.push('footnote_mark_end_of_block', '', 0);
        token.hidden = true;
      }

      return false;
    } // Process footnote block definition


    function footnote_def(state, startLine, endLine, silent) {
      let oldBMark,
          oldTShift,
          oldSCount,
          oldParentType,
          pos,
          token,
          initial,
          offset,
          ch,
          posAfterColon,
          start = state.bMarks[startLine] + state.tShift[startLine],
          max = state.eMarks[startLine]; // line should be at least 6 chars - "[^x]: " or "[^x]:> "

      if (start + 5 > max) {
        return false;
      }

      if (state.src.charCodeAt(start) !== 0x5B
      /* [ */
      ) {
          return false;
        }

      if (state.src.charCodeAt(start + 1) !== 0x5E
      /* ^ */
      ) {
          return false;
        }

      for (pos = start + 2; pos < max; pos++) {
        if (state.src.charCodeAt(pos) === 0x0A
        /* LF */
        ) {
            return false;
          }

        if (state.src.charCodeAt(pos) === 0x5D
        /* ] */
        ) {
            break;
          }
      }

      const labelEnd = pos;

      if (pos === start + 2) {
        return false;
      } // no empty footnote labels


      if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A
      /* : */
      ) {
          return false;
        }

      const mode_rec = determine_mode(state.src[pos + 1], '='); // default mode is section_note mode.

      if (mode_rec.fromInput) {
        pos++;
      }

      const mode = mode_rec.mode;

      if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x20
      /* space */
      ) {
          return false;
        }

      if (silent) {
        return true;
      }

      pos++;
      const labelInfo = decode_label(state.src.slice(start + 2, labelEnd), true);

      if (!labelInfo) {
        return false;
      }

      assert.strict.ok(!labelInfo.extraText); // Now see if we already have a footnote ID for this footnote label:
      // fetch it if we have one and otherwise produce a new one so everyone
      // can use this from now on.
      //
      // This scenario is possible when the footnote *definition* comes BEFORE
      // the first actual footnote *use* (*reference*). This is UNUSUAL when people
      // write texts, but it is *not impossible*, particularly now that we have
      // specified-by-design that endnotes can be marked as such (`[^label]:: note text`)
      // and freely mixed with sidenotes (`[^label]:> note text`) and section
      // notes (`[^label]:= note text` (explicit mode) or `[^label]: note text`
      // (implicit mode)), where *section notes* will placed at the spot in the text
      // flow where they were *defined*. Again, highly irregular, BUT someone MAY
      // feel the need to place some section note *definitions* ABOVE their first
      // use point.
      //

      const infoRec = obtain_footnote_info_slot(state.env, labelInfo.label, true);

      if (labelInfo.labelOverride) {
        infoRec.labelOverride = labelInfo.labelOverride;
      }

      infoRec.mode = mode;
      infoRec.content = state.src.slice(pos, max);
      token = state.push('footnote_reference_open', '', 1);
      token.meta = {
        id: infoRec.id
      };
      token.hidden = true;
      oldBMark = state.bMarks[startLine];
      oldTShift = state.tShift[startLine];
      oldSCount = state.sCount[startLine];
      oldParentType = state.parentType;
      posAfterColon = pos;
      initial = offset = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);

      while (pos < max) {
        ch = state.src.charCodeAt(pos);

        if (isSpace(ch)) {
          if (ch === 0x09) {
            offset += 4 - offset % 4;
          } else {
            offset++;
          }
        } else {
          break;
        }

        pos++;
      }

      state.tShift[startLine] = pos - posAfterColon;
      state.sCount[startLine] = offset - initial;
      state.bMarks[startLine] = posAfterColon;
      state.blkIndent += 4;
      state.parentType = 'footnote';

      if (state.sCount[startLine] < state.blkIndent) {
        state.sCount[startLine] += state.blkIndent;
      }

      state.md.block.tokenize(state, startLine, endLine, true);
      state.parentType = oldParentType;
      state.blkIndent -= 4;
      state.tShift[startLine] = oldTShift;
      state.sCount[startLine] = oldSCount;
      state.bMarks[startLine] = oldBMark;
      token = state.push('footnote_reference_close', '', -1);
      token.meta = {
        id: infoRec.id
      };
      return true;
    } // Process inline footnotes (^[...] or ^[>...])


    function footnote_inline(state, silent) {
      let labelStart,
          labelEnd,
          token,
          tokens,
          max = state.posMax,
          start = state.pos;

      if (start + 2 >= max) {
        return false;
      }

      if (state.src.charCodeAt(start) !== 0x5E
      /* ^ */
      ) {
          return false;
        }

      if (state.src.charCodeAt(start + 1) !== 0x5B
      /* [ */
      ) {
          return false;
        }

      labelStart = start + 2; // NOTE: inline notes are automatically considered to be ASIDE notes,
      // UNLESS otherwise specified!
      //
      // Recognized 'modes':
      // '>': aside note (default for inline notes)
      // ':': end node
      // '=': section note (default for regular referenced notes)
      //
      // (Also note https://v4.chriskrycho.com/2015/academic-markdown-and-citations.html:
      // our notes look like this: `[^ref]:` while Academic MarkDown references look
      // like this: `[@Belawog2012]` i.e. no '^' in there. Hence these can safely co-exist.)
      //

      const mode_rec = determine_mode(state.src[start + 2], '>'); // default mode is aside ~ sidenote mode.

      if (mode_rec.fromInput) {
        labelStart++;
      }

      const mode = mode_rec.mode;
      labelEnd = parseLinkLabel(state, start + 1); // parser failed to find ']', so it's not a valid note

      if (labelEnd < 0) {
        return false;
      } // We found the end of the link, and know for a fact it's a valid link;
      // so all that's left to do is to call tokenizer.
      //


      if (!silent) {
        // WARNING: claim our footnote slot for there MAY be nested footnotes
        // discovered in the next inline.parse() call below!
        const infoRec = obtain_footnote_info_slot(state.env, null, true);
        infoRec.mode = mode;
        infoRec.count++;
        token = state.push('footnote_ref', '', 0);
        token.meta = {
          id: infoRec.id
        };
        state.md.inline.parse(state.src.slice(labelStart, labelEnd), state.md, state.env, tokens = []); // Now fill our previously claimed slot:

        infoRec.content = state.src.slice(labelStart, labelEnd);
        infoRec.tokens = tokens; // inject marker into parent = block level token stream to announce the advent of an (inline) footnote:
        // because the markdown_it code uses a for() loop to go through the parent nodes while parsing the
        // 'inline' chunks, we CANNOT safely inject a marker BEFORE the chunk, only AFTERWARDS:

        update_end_of_block_marker(state, infoRec.id); //md.block.ruler.enable('footnote_mark_end_of_block');
      }

      state.pos = labelEnd + 1;
      state.posMax = max;
      return true;
    } // Check if this is a valid ffootnote reference label.
    //
    // Also see if there's a label OVERRIDE text or marker ('@') provided.
    //
    // Return the parsed label record.


    function decode_label(label, extra_text_is_labelOverride) {
      var _m$;

      if (!label) {
        return null;
      }

      const m = label.match(/^(@?)(\S+)(?:\s+(.+))?$/); // label with OPTIONAL override text...

      if (!m) {
        return null;
      }

      assert.strict.ok(m[2].length > 0);
      let extraText = (_m$ = m[3]) == null ? void 0 : _m$.trim(); // label [output] override?

      let override = null;

      if (m[1]) {
        override = m[2];
      }

      if (extra_text_is_labelOverride && extraText) {
        override = extraText;
        extraText = null;
      }

      return {
        label: m[2],
        labelOverride: override,
        extraText
      };
    } // Process footnote references with text ([^label ...])


    function footnote_ref_with_text(state, silent) {
      let pos,
          footnoteSubId,
          token,
          max = state.posMax,
          start = state.pos; // should be at least 6 chars - "[^l x]"

      if (start + 5 > max) {
        return false;
      }

      if (state.src.charCodeAt(start) !== 0x5B
      /* [ */
      ) {
          return false;
        }

      if (state.src.charCodeAt(start + 1) !== 0x5E
      /* ^ */
      ) {
          return false;
        }

      for (pos = start + 2; pos < max; pos++) {
        if (state.src.charCodeAt(pos) === 0x0A
        /* linefeed */
        ) {
            return false;
          }

        if (state.src.charCodeAt(pos) === 0x5D
        /* ] */
        ) {
            break;
          }
      }

      if (pos === start + 2) {
        return false;
      } // no empty footnote labels


      if (pos >= max) {
        return false;
      }

      pos++;
      const labelInfo = decode_label(state.src.slice(start + 2, pos - 1), false);

      if (!labelInfo || !labelInfo.extraText) {
        return false;
      }

      assert.strict.ok(labelInfo.extraText.length > 0);
      const infoRec = obtain_footnote_info_slot(state.env, labelInfo.label, false);

      if (labelInfo.labelOverride) {
        infoRec.labelOverride = labelInfo.labelOverride;
      }

      if (!silent) {
        footnoteSubId = infoRec.count;
        infoRec.count++;
        token = state.push('footnote_ref', '', 0);
        token.meta = {
          id: infoRec.id,
          subId: footnoteSubId,
          text: labelInfo.extraText
        };
        update_end_of_block_marker(state, infoRec.id); //md.block.ruler.enable('footnote_mark_end_of_block');
      }

      state.pos = pos;
      state.posMax = max;
      return true;
    } // Process footnote references ([^...])


    function footnote_ref(state, silent) {
      let pos,
          footnoteSubId,
          token,
          max = state.posMax,
          start = state.pos; // should be at least 4 chars - "[^x]"

      if (start + 3 > max) {
        return false;
      }

      if (state.src.charCodeAt(start) !== 0x5B
      /* [ */
      ) {
          return false;
        }

      if (state.src.charCodeAt(start + 1) !== 0x5E
      /* ^ */
      ) {
          return false;
        }

      for (pos = start + 2; pos < max; pos++) {
        //if (state.src.charCodeAt(pos) === 0x20) { return false; }
        if (state.src.charCodeAt(pos) === 0x0A) {
          return false;
        }

        if (state.src.charCodeAt(pos) === 0x5D
        /* ] */
        ) {
            break;
          }
      }

      if (pos === start + 2) {
        return false;
      } // no empty footnote labels


      if (pos >= max) {
        return false;
      }

      pos++;
      const labelInfo = decode_label(state.src.slice(start + 2, pos - 1), true);

      if (!labelInfo) {
        return false;
      }

      assert.strict.ok(!labelInfo.extraText);
      const infoRec = obtain_footnote_info_slot(state.env, labelInfo.label, false);

      if (labelInfo.labelOverride) {
        infoRec.labelOverride = labelInfo.labelOverride;
      }

      if (!silent) {
        footnoteSubId = infoRec.count;
        infoRec.count++;
        token = state.push('footnote_ref', '', 0);
        token.meta = {
          id: infoRec.id,
          subId: footnoteSubId
        };
        update_end_of_block_marker(state, infoRec.id); //md.block.ruler.enable('footnote_mark_end_of_block');
      }

      state.pos = pos;
      state.posMax = max;
      return true;
    }

    function place_footnote_definitions_at(state, token_idx, footnote_id_list, category, baseInfo) {
      if (footnote_id_list.length === 0) {
        return; // nothing to inject...
      }

      let inject_tokens = [];
      assert.strict.ok(baseInfo.env.footnotes.list != null);
      const footnote_spec_list = baseInfo.env.footnotes.list;
      let token = new state.Token('footnote_block_open', '', 1);
      token.markup = plugin_options.headerFn(category, baseInfo.env, plugin_options);
      token.meta = {
        sectionId: ++baseInfo.env.footnotes.sectionCounter,
        category
      };
      inject_tokens.push(token);

      for (const id of footnote_id_list) {
        const fn = footnote_spec_list[id];
        token = new state.Token('footnote_open', '', 1);
        token.meta = {
          id,
          category
        };
        inject_tokens.push(token);

        if (fn.label == null) {
          // process an inline footnote text:
          token = new state.Token('paragraph_open', 'p', 1);
          token.block = true;
          inject_tokens.push(token);
          token = new state.Token('inline', '', 0);
          token.children = fn.tokens;
          token.content = fn.content;
          inject_tokens.push(token);
          token = new state.Token('paragraph_close', 'p', -1);
          token.block = true;
          inject_tokens.push(token);
        } else {
          // process a labeled footnote:
          inject_tokens = inject_tokens.concat(fn.tokens || []);
        } //let lastParagraph;
        //if (inject_tokens[inject_tokens.length - 1].type === 'paragraph_close') {
        //  lastParagraph = inject_tokens.pop();
        //} else {
        //  lastParagraph = null;
        //}


        const cnt = fn.count;
        assert.strict.ok(cnt >= 0);

        for (let j = 0; j < cnt; j++) {
          token = new state.Token('footnote_anchor', '', 0);
          token.meta = {
            id,
            subId: j,
            backrefCount: cnt,
            category
          };
          inject_tokens.push(token);
        } //if (lastParagraph) {
        //  inject_tokens.push(lastParagraph);
        //}


        token = new state.Token('footnote_close', '', -1);
        token.meta = {
          id,
          category
        };
        inject_tokens.push(token);
      }

      token = new state.Token('footnote_block_close', '', -1);
      token.meta = {
        category
      };
      inject_tokens.push(token);
      state.tokens.splice(token_idx, 0, ...inject_tokens);
    }

    function more_footnote_reference_blocks_follow_immediately(tokens, idx) {
      let tok = tokens[idx];

      while (tok && (tok.type === 'footnote_mark_end_of_block' || tok.type === 'footnote_reference_close')) {
        idx++;
        tok = tokens[idx];
      }

      return tok && tok.type === 'footnote_reference_open';
    } // Glue footnote tokens into appropriate slots of token stream.


    function footnote_tail(state, startLine, endLine, silent) {
      let i,
          current,
          insideRef = false;

      if (!state.env.footnotes) {
        // no footnotes at all? --> filter out all 'footnote_mark_end_of_block' chunks:
        state.tokens = state.tokens.filter(function (tok, idx) {
          return tok.type !== 'footnote_mark_end_of_block';
        });
        return;
      }

      const idMap = state.env.footnotes.idMap;
      const baseInfo = {
        options: state.md.options,
        env: state.env,
        plugin_options,
        self: this
      };

      function footnote_print_comparer(idA, idB) {
        return idMap[idA] - idMap[idB];
      } // Rewrite the tokenstream to place the aside-footnotes and section footnotes where they need to be:


      const footnote_spec_list = state.env.footnotes.list; // extract the tokens constituting the footnote/sidenote *content* and
      // store that bunch in `refTokens[:<currentLabel>]` instead, to be injected back into
      // the tokenstream at the appropriate spots.

      state.tokens = state.tokens.filter(function (tok, idx) {
        switch (tok.type) {
          // filter out 'footnote_mark_end_of_block' tokens which follow BLOCKS that do not contain any
          // footnote/sidenote/endnote references:
          case 'footnote_mark_end_of_block':
            if (!tok.meta) return false;
            if (!tok.meta.footnote_list) return false;
            break;

          case 'footnote_reference_open':
            insideRef = true;
            current = [];
            return true;

          case 'footnote_reference_close':
            insideRef = false;
            const infoRec = footnote_spec_list[tok.meta.id];
            infoRec.tokens = current;
            return true;
        }

        if (insideRef) {
          current.push(tok);
        }

        return !insideRef;
      }); // execute configured sorting/mapping (`idMap`):

      switch (plugin_options.sortOrder) {
        // 0: first *appearance* in the text
        default:
        case 0: // 1: first *reference* in the text

        case 1: // 2: *definition* in the text

        case 2:
          // order is specified in the `idMap` already.
          break;
        // 3: sorted alphanumerically by label (inline footnotes will end up at the top, before all other notes)

        case 3:
        case 4:
          // the `idMap[]` array has not been set up and must be produced
          // to turn this into an alphanumerically-by-label sort order, where
          // a `footnoteId` based index will produce the order of appearance.
          const reIdMap = [];

          for (let i = 1; i < footnote_spec_list.length; i++) {
            reIdMap[i - 1] = i;
          }

          reIdMap.sort((idA, idB) => {
            const infoA = footnote_spec_list[idA];
            const infoB = footnote_spec_list[idB];
            assert.strict.ok(infoA);
            assert.strict.ok(infoB); // is any of these an inline footnote, i.e. without any label yet? Produce a fake label for sorting then!
            //
            // As stated elsewhere: inline section_notes and end_notes will end up among everyone else in this sort order mode.

            assert.strict.ok(infoA.id === idA);
            assert.strict.ok(infoB.id === idB); // Split a "sort label" up into its numerical part and the tail. Note that we don't call
            // it 'tail' but 'label', because we will need to compare the ENTIRE LABEL using string comparison
            // when the numeric leaders are identical, so as to ensure that 'labels' such as `00000` will sort
            // as 'higher' than `000`, both of which will be rated as numerically identical!

            function to_atoms(label) {
              // now extract number or numerical leader part.
              //
              // Only accept OBVIOUS, SIMPLE NUMERIC LEADERS! This is about *legibility*
              // of those numrical leaders, not a pedantic "what is possibly legally numeric"
              // challenge. Hence we DO NOT accept leading +/- and only a decimal dot when
              // there's a decimal number BEFORE it, such as in `5.1hack` --> `5.1`, but NOT
              // `.42oz`!
              //
              // Do not use `nmr = +lbl` as that would treat labels such as `0xf4` as hexadecimal numbers,
              // which we DO NOT want to happen.
              const m = label.match(/^\d+(?:\.\d+)?/) || ['x'];
              const nmr = +m[0] || Infinity; // non-numeric labels are rated NUMEICALLY HIGHER than any numerical leader.

              return {
                label,
                number: nmr
              };
            }

            const labelA = plugin_options.sortOrder === 3 ? infoA.labelOverride || infoA.label || '' + infoA.id : plugin_options.mkLabel(infoA.id, infoA, baseInfo);
            const labelB = plugin_options.sortOrder === 3 ? infoB.labelOverride || infoB.label || '' + infoB.id : plugin_options.mkLabel(infoB.id, infoB, baseInfo);
            const atomA = to_atoms(labelA);
            const atomB = to_atoms(labelB);
            const diff = atomA.number - atomB.number;
            return diff || atomA.label.localeCompare(atomB.label); // ^^^^^^^ shorthand for:
            //
            // if (isNaN(diff) || diff === 0) then stringcompare else numeric-difference
          }); // Now turn this into a sort order map:

          for (let prio = 0; prio < reIdMap.length; prio++) {
            const id = reIdMap[prio];
            idMap[id] = prio;
          }

          break;
      }

      let aside_list;
      let section_list = new Set();
      const section_done_list = new Set(); // once a section_note has been printed, it should never appear again!

      const end_list = new Set();
      const used_list = new Set();
      let tokens = state.tokens;

      for (i = 0; i < tokens.length; i++) {
        const tok = tokens[i];

        switch (tok.type) {
          case 'footnote_mark_end_of_block':
            // check the gathered list of footnotes referenced in this block:
            // - dump the ones which are sidenotes
            // - mark the ones which are section- or end-notes.
            //
            // Note: make sure we don't produce duplicates in the collect sets.
            {
              var _tok$meta;

              aside_list = new Set();
              const refd_notes_list = ((_tok$meta = tok.meta) == null ? void 0 : _tok$meta.footnote_list) || [];

              for (const id of refd_notes_list) {
                const footnote = footnote_spec_list[id];

                switch (footnote.mode) {
                  case '>':
                    aside_list.add(id);
                    used_list.add(id);
                    break;

                  case '=':
                    if (!section_done_list.has(id)) {
                      section_list.add(id);
                      section_done_list.add(id);
                      used_list.add(id);
                    }

                    break;

                  default:
                  case ':':
                    end_list.add(id);
                    used_list.add(id);
                    break;
                }
              }

              const aside_ids = [];

              for (const id of aside_list.values()) {
                aside_ids.push(id);
              }

              aside_ids.sort(footnote_print_comparer);
              place_footnote_definitions_at(state, i + 1, aside_ids, 'aside', baseInfo);
              tokens = state.tokens;
            }
            break;

          case 'footnote_reference_close':
            // anywhere a footnote *definition* appeared in the original text is
            // also a place to dump the section_notes gathered to date, so to speak.
            //
            // However, DO detect clusters of footnote definitions and MERGE them
            // together:
            if (more_footnote_reference_blocks_follow_immediately(tokens, i + 1)) {
              continue;
            } else {
              const section_ids = [];

              for (const id of section_list.values()) {
                section_ids.push(id);
              }

              section_ids.sort(footnote_print_comparer);
              place_footnote_definitions_at(state, i + 1, section_ids, 'section', baseInfo);
              tokens = state.tokens; // and reset the tracking set:

              section_list = new Set();
            }

            break;
        }
      } // Now process the endnotes:


      {
        const end_ids = [];

        for (const id of end_list.values()) {
          end_ids.push(id);
        }

        end_ids.sort(footnote_print_comparer);
        place_footnote_definitions_at(state, tokens.length, end_ids, 'end', baseInfo);
        tokens = state.tokens;
      } // Now process the unused footnotes and dump them for diagnostic purposes:

      {
        const unused_ids = [];

        for (let i = 1; i < footnote_spec_list.length; i++) {
          const fn = footnote_spec_list[i];
          const id = fn.id;

          if (!used_list.has(id)) {
            console.error(`ERROR: footnote ID ${id} is defined but never used. Footnote will be added as an ERRONEOUS ENDNOTE to the output, so the situation is easy to diagnose!`, Object.assign({}, fn, {
              tokens: '......'
            }));
            unused_ids.push(id);
          }
        }

        unused_ids.sort(footnote_print_comparer);
        place_footnote_definitions_at(state, tokens.length, unused_ids, 'Error::Unused', baseInfo); //tokens = state.tokens;
      } // Update state_block too as we have rewritten & REPLACED the token array earlier in this call:
      // the reference `state.env.state_block.tokens` is still pointing to the OLD token array!

      state.env.state_block.tokens = state.tokens;
    } // attach ourselves to the start of block handling too


    md.block.ruler.before('table', 'footnote_mark_end_of_block', footnote_mark_end_of_block);
    md.block.ruler.before('reference', 'footnote_def', footnote_def, {
      alt: ['paragraph', 'reference']
    });
    md.inline.ruler.after('image', 'footnote_inline', footnote_inline);
    md.inline.ruler.after('footnote_inline', 'footnote_ref_with_text', footnote_ref_with_text);
    md.inline.ruler.after('footnote_ref_with_text', 'footnote_ref', footnote_ref);
    md.core.ruler.after('inline', 'footnote_tail', footnote_tail);
  }

  return footnote_plugin;

})));
//# sourceMappingURL=markdownItFootnote.umd.js.map
