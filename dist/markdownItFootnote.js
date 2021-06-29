/*! markdown-it-footnote 3.0.3-9 https://github.com//GerHobbelt/markdown-it-footnote @license MIT */

// Process footnotes
//
////////////////////////////////////////////////////////////////////////////////
// Renderer partials
function anchorFnDefault(n, excludeSubId, tokens, idx, options, env, slf) {
  let prefix = '';

  if (typeof env.docId === 'string' && env.docId.length > 0) {
    prefix = '-' + env.docId + '-';
  }

  return prefix + n;
}

function captionFnDefault(n, tokens, idx, options, env, slf) {
  //return '[' + n + ']';
  return '' + n;
}

function headerFnDefault(state) {
  return '';
}
/*
ref:
  return `<label aria-describedby="fn${id}" role="presentation" class="sidelink" for="fn${id}-content">
<a aria-hidden="true" href="#fn${id}"><output class="highlight fnref" id="fnref${refid}">${caption}
</output></a></label>`;


open:
  return `<aside id="fn${id}" class="sidenote" role="note">
    <output aria-hidden="true" class="highlight" id="fn${id}-content">
    <label role="presentation" for="fnref${id}">`;
}

function render_sidenote_close() {
  return '</label></output></aside>\n';
}

*/


function footnote_plugin(md, plugin_options) {
  let parseLinkLabel = md.helpers.parseLinkLabel,
      isSpace = md.utils.isSpace;
  plugin_options = Object.assign({}, plugin_options, {
    atDocumentEnd: false,
    anchorFn: anchorFnDefault,
    captionFn: captionFnDefault,
    headerFn: headerFnDefault,
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
    numberSequence: ['†', '‡', '††', '‡‡', '¶', 1]
  });

  function determine_footnote_symbol(idx) {
    if (plugin_options.numberSequence == null || plugin_options.numberSequence.length === 0) {
      return idx + 1;
    }

    const len = plugin_options.numberSequence.length;

    if (idx >= len) {
      // is last slot numeric or alphabetical?
      let slot = plugin_options.numberSequence[len - 1];

      if (Number.isFinite(slot)) {
        let delta = idx - len + 1;
        return slot + delta;
      } // non-numerical last slot --> duplicate, triplicate, etc.


      let dupli = idx / len | 0; // = int(x mod N)

      let remainder = idx % len;
      let core = plugin_options.numberSequence[remainder];
      let str = core;

      for (let i = 1; i < dupli; i++) {
        str += core;
      }

      return str;
    }

    return plugin_options.numberSequence[idx];
  }

  function render_footnote_n(tokens, idx, excludeSubId) {
    let mark = tokens[idx].meta.id + 1;
    let n = '' + mark; // = mark.toString();

    if (!excludeSubId && tokens[idx].meta.subId > 0) {
      n += '-' + tokens[idx].meta.subId;
    }

    return n;
  }

  function render_footnote_mark(tokens, idx, env) {
    let token = tokens[idx];
    let info = env.footnotes.list[token.meta.id] || {};
    let labelOverride = info.labelOverride;
    let mark = labelOverride || determine_footnote_symbol(token.meta.id);
    let n = '' + mark; // = mark.toString();

    return n;
  }

  function render_footnote_anchor_name(tokens, idx, options, env, slf) {
    let n = render_footnote_n(tokens, idx, true);
    return plugin_options.anchorFn(n, true, tokens, idx, options, env, slf);
  }

  function render_footnote_anchor_nameRef(tokens, idx, options, env, slf) {
    let n = render_footnote_n(tokens, idx, false);
    return plugin_options.anchorFn(n, false, tokens, idx, options, env, slf);
  }

  function render_footnote_caption(tokens, idx, options, env, slf) {
    let n = render_footnote_mark(tokens, idx, env);
    return plugin_options.captionFn(n, tokens, idx, options, env, slf);
  }

  function render_footnote_ref(tokens, idx, options, env, slf) {
    let id = render_footnote_anchor_name(tokens, idx, options, env, slf);
    let caption = render_footnote_caption(tokens, idx, options, env, slf);
    let refid = render_footnote_anchor_nameRef(tokens, idx, options, env, slf);

    if (tokens[idx].meta.text) {
      return '<a href="#fn' + id + '" id="fnref' + refid + '">' + tokens[idx].meta.text + '<sup class="footnote-ref">' + caption + '</sup></a>';
    }

    return '<sup class="footnote-ref"><a href="#fn' + id + '" id="fnref' + refid + '">' + caption + '</a></sup>';
  }

  function render_footnote_block_open(tokens, idx, options) {
    let header = tokens[idx].markup;
    return (options.xhtmlOut ? '<hr class="footnotes-sep" />\n' : '<hr class="footnotes-sep">\n') + '<section class="footnotes">\n' + (header ? '<h3 class="footnotes-header">' + header + '</h3>' : '') + '<ul class="footnotes-list">\n';
  }

  function render_footnote_block_close() {
    return '</ul>\n</section>\n';
  }

  function render_footnote_reference_open(tokens, idx, options) {
    return '<!-- footnote reference start -->\n';
  }

  function render_footnote_reference_close() {
    return '<!-- footnote reference end -->\n';
  }

  function render_footnote_mark_end_of_block() {
    return '<!-- footnote dump marker -->\n';
  }

  function render_footnote_open(tokens, idx, options, env, slf) {
    let id = render_footnote_anchor_name(tokens, idx, options, env, slf);
    let caption = render_footnote_caption(tokens, idx, options, env, slf); // allow both a JavaWScript --> CSS approach via `data-footnote-caption`
    // and a classic CSS approach while a display:inline-block SUP presenting
    // the LI 'button' instead:

    return `<li tabindex="-1" id="fn${id}" class="footnote-item" data-footnote-caption="${caption}"><span class="footnote-caption"><sup class="footnote-caption">${caption}</sup></span><span class="footnote-content">`;
  }

  function render_footnote_close() {
    return '</span></li>\n';
  }

  function render_footnote_anchor(tokens, idx, options, env, slf) {
    let refid = render_footnote_n(tokens, idx);
    refid = plugin_options.anchorFn(refid, false, tokens, idx, options, env, slf);
    /* ↩ with escape code to prevent display as Apple Emoji on iOS */

    return ' <a href="#fnref' + refid + '" class="footnote-backref">\u21a9\uFE0E</a>';
  }

  md.renderer.rules.footnote_ref = render_footnote_ref;
  md.renderer.rules.footnote_block_open = render_footnote_block_open;
  md.renderer.rules.footnote_block_close = render_footnote_block_close;
  md.renderer.rules.footnote_reference_open = render_footnote_reference_open;
  md.renderer.rules.footnote_reference_close = render_footnote_reference_close;
  md.renderer.rules.footnote_mark_end_of_block = render_footnote_mark_end_of_block;
  md.renderer.rules.footnote_open = render_footnote_open;
  md.renderer.rules.footnote_close = render_footnote_close;
  md.renderer.rules.footnote_anchor = render_footnote_anchor;

  function find_end_of_block_marker(tokens, startIndex) {
    let idx, len;

    for (idx = startIndex, len = tokens.length; idx < len; idx++) {
      if (tokens[idx].type === 'footnote_mark_end_of_block') {
        return idx;
      }
    }

    console.error({
      tok: tokens.slice(startIndex),
      startIndex,
      idx,
      len
    });
    throw Error('Should never get here!');
  }


  function footnote_mark_end_of_block(state, startLine, endLine, silent) {
    if (!silent && state.tokens.length > 0) {
      let token = state.push('footnote_mark_end_of_block', '', 0);
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
        label,
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

    let labelEnd = pos;

    if (pos === start + 2) {
      return false;
    } // no empty footnote labels


    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A
    /* : */
    ) {
        return false;
      }

    let mode = state.src[pos + 1];

    if ('>:='.includes(mode)) {
      pos++;
    } else {
      mode = '='; // default mode is section_note mode.
    }

    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x20
    /* space */
    ) {
        return false;
      }

    if (silent) {
      return true;
    }

    pos++;

    if (!state.env.footnotes) {
      state.env.footnotes = {};
    }

    if (!state.env.footnotes.refs) {
      state.env.footnotes.refs = {};
    }

    label = state.src.slice(start + 2, labelEnd);
    let text;

    if (label.match(/^(\S+)\s+(.+)$/)) {
      label = RegExp.$1;
      text = RegExp.$2;
    }

    console.error('extracted label = ', {
      label,
      text,
      labelEnd,
      pos,
      start
    });
    state.env.footnotes.refs[':' + label] = -1;
    token = state.push('footnote_reference_open', '', 1);
    token.meta = {
      id: -1,
      label,
      labelOverride: text,
      mode
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
    return true;
  } // Process inline footnotes (^[...] or ^[>...])


  function footnote_inline(state, silent) {
    let labelStart,
        labelEnd,
        footnoteId,
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

    let mode = state.src[start + 2];

    if ('>:='.includes(mode)) {
      labelStart++;
    } else {
      mode = '>';
    }

    labelEnd = parseLinkLabel(state, start + 1); // parser failed to find ']', so it's not a valid note

    if (labelEnd < 0) {
      return false;
    } // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //


    if (!silent) {
      // inline blocks have their own *child* environment in markdown-it v10+.
      // As the footnotes must live beyond the lifetime of the inline block env,
      // we must patch them into the `parentState.env` for the footnote_tail
      // handler to be able to access them afterwards!
      let parentState = state.env.parentState;
      let parentEnv = parentState.env;

      if (!parentEnv.footnotes) {
        parentEnv.footnotes = {};
      }

      if (!parentEnv.footnotes.list) {
        parentEnv.footnotes.list = [];
      }

      footnoteId = parentEnv.footnotes.list.length; // WARNING: claim our footnote slot for there MAY be nested footnotes
      // discovered in the next inline.parse() call below!

      parentEnv.footnotes.list[footnoteId] = null;
      token = state.push('footnote_ref', '', 0); //token.meta = { id: footnoteId, subId: 0, label: null };

      token.meta = {
        id: footnoteId,
        mode
      };
      state.md.inline.parse(state.src.slice(labelStart, labelEnd), state.md, state.env, tokens = []); // Now fill our previously claimed slot:

      parentEnv.footnotes.list[footnoteId] = {
        content: state.src.slice(labelStart, labelEnd),
        tokens,
        mode
      }; // inject marker into parent = block level token stream to announce the advent of an (inline) footnote:
      // because the markdown_it code uses a for() loop to go through the parent nodes while parsing the
      // 'inline' chunks, we CANNOT safely inject a marker BEFORE the chunk, only AFTERWARDS:

      let parentIndex = state.env.parentTokenIndex;
      let markerTokenIndex = find_end_of_block_marker(parentState.tokens, parentIndex + 1);
      token = parentState.tokens[markerTokenIndex];
      if (!token.meta) token.meta = {};
      if (!token.meta.footnote_list) token.meta.footnote_list = [];
      token.meta.footnote_list.push(footnoteId); //md.block.ruler.enable('footnote_mark_end_of_block');
    }

    state.pos = labelEnd + 1;
    state.posMax = max;
    return true;
  } // Process footnote references with text ([^label ...])


  function footnote_ref_with_text(state, silent) {
    let label,
        pos,
        footnoteId,
        footnoteSubId,
        token,
        max = state.posMax,
        start = state.pos; // should be at least 6 chars - "[^l x]"

    if (start + 5 > max) {
      return false;
    }

    if (!state.env.footnotes || !state.env.footnotes.refs) {
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
    label = state.src.slice(start + 2, pos - 1);

    if (!label || !label.match(/^(\S+)\s+(.+)$/)) {
      return false;
    }

    label = RegExp.$1;
    let text = RegExp.$2;

    if (typeof state.env.footnotes.refs[':' + label] === 'undefined') {
      return false;
    }

    if (!silent) {
      if (!state.env.footnotes.list) {
        state.env.footnotes.list = [];
      }

      if (state.env.footnotes.refs[':' + label] < 0) {
        footnoteId = state.env.footnotes.list.length;
        state.env.footnotes.list[footnoteId] = {
          label,
          count: 0
        };
        state.env.footnotes.refs[':' + label] = footnoteId;
      } else {
        footnoteId = state.env.footnotes.refs[':' + label];
      }

      footnoteSubId = state.env.footnotes.list[footnoteId].count;
      state.env.footnotes.list[footnoteId].count++;
      token = state.push('footnote_ref', '', 0);
      token.meta = {
        id: footnoteId,
        subId: footnoteSubId,
        label,
        text
      }; //md.block.ruler.enable('footnote_mark_end_of_block');
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  } // Process footnote references ([^...])


  function footnote_ref(state, silent) {
    let label,
        pos,
        footnoteId,
        footnoteSubId,
        token,
        max = state.posMax,
        start = state.pos; // should be at least 4 chars - "[^x]"

    if (start + 3 > max) {
      return false;
    }

    if (!state.env.footnotes || !state.env.footnotes.refs) {
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
      if (state.src.charCodeAt(pos) === 0x20) {
        return false;
      }

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
    label = state.src.slice(start + 2, pos - 1);

    if (typeof state.env.footnotes.refs[':' + label] === 'undefined') {
      return false;
    }

    if (!silent) {
      if (!state.env.footnotes.list) {
        state.env.footnotes.list = [];
      }

      if (state.env.footnotes.refs[':' + label] < 0) {
        footnoteId = state.env.footnotes.list.length;
        state.env.footnotes.list[footnoteId] = {
          label,
          count: 0
        };
        state.env.footnotes.refs[':' + label] = footnoteId;
      } else {
        footnoteId = state.env.footnotes.refs[':' + label];
      }

      footnoteSubId = state.env.footnotes.list[footnoteId].count;
      state.env.footnotes.list[footnoteId].count++;
      token = state.push('footnote_ref', '', 0);
      token.meta = {
        id: footnoteId,
        subId: footnoteSubId,
        label
      }; //md.block.ruler.enable('footnote_mark_end_of_block');
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  } // Glue footnote tokens to end of token stream


  function footnote_tail(state, startLine, endLine, silent) {
    let i,
        l,
        j,
        t,
        lastParagraph,
        token,
        current,
        currentRefToken,
        lastRefIndex = 0,
        insideRef = false,
        refTokens = {};
    console.error('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ TAIL');

    if (!state.env.footnotes) {
      // filter out all 'footnote_mark_end_of_block' chunks:
      state.tokens = state.tokens.filter(function (tok, idx) {
        if (tok.type === 'footnote_mark_end_of_block') {
          return false;
        }

        return true;
      });
      return;
    } // Punch a slot into the token stream (at the very end)
    // for consistency with footnote_mark_end_of_block():
    //footnote_mark_end_of_block(state, startLine, endLine, silent);


    token = new state.Token('footnote_mark_end_of_block', '', 0);
    token.hidden = true;
    state.tokens.push(token); // Rewrite the tokenstream to place the aside-footnotes and section footnotes where they need to be:
    // store that bunch in `refTokens[:<currentLabel>]` instead, to be injected back into
    // the tokenstream at the appropriate spots.

    state.tokens = state.tokens.filter(function (tok, idx) {
      switch (tok.type) {
        case 'footnote_reference_open':
          insideRef = true;
          current = [];
          currentRefToken = tok;

          return true;

        case 'footnote_reference_close':
          insideRef = false; // prepend ':' to avoid conflict with Object.prototype members

          refTokens[':' + currentRefToken.meta.label] = {
            tokens: current,
            meta: currentRefToken.meta
          };
          lastRefIndex = idx;
          return true;
      }

      if (insideRef) {
        current.push(tok);
      }

      return !insideRef;
    });
    lastRefIndex = plugin_options.atDocumentEnd ? state.tokens.length : state.tokens.length;
    let list = state.env.footnotes.list;

    if (!list) {
      return;
    }

    let inject_tokens = [];
    token = new state.Token('footnote_block_open', '', 1);
    token.markup = plugin_options.headerFn(state);
    inject_tokens.push(token);

    for (i = 0, l = list.length; i < l; i++) {
      let fn = list[i];
      token = new state.Token('footnote_open', '', 1);
      token.meta = {
        id: i,
        label: fn.label
      };
      inject_tokens.push(token);

      if (fn.tokens) {
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
      } else if (fn.label) {
        // process a labeled footnote:
        let info = refTokens[':' + fn.label] || {};
        inject_tokens = inject_tokens.concat(info.tokens || []);

        if (info.meta) {
          // also update the global footnote info list:
          fn.labelOverride = info.meta.labelOverride;
          fn.mode = info.meta.mode;
        }
      } else {
        // nothing to inject
        throw Error('unexpected: should never get here!');
      }

      if (inject_tokens[inject_tokens.length - 1].type === 'paragraph_close') {
        lastParagraph = inject_tokens.pop();
      } else {
        lastParagraph = null;
      }

      t = Math.max(fn.count, 1);

      for (j = 0; j < t; j++) {
        token = new state.Token('footnote_anchor', '', 0);
        token.meta = {
          id: i,
          subId: j,
          label: fn.label
        };
        inject_tokens.push(token);
      }

      if (lastParagraph) {
        inject_tokens.push(lastParagraph);
      }

      token = new state.Token('footnote_close', '', -1);
      inject_tokens.push(token);
    }

    token = new state.Token('footnote_block_close', '', -1);
    inject_tokens.push(token);
    state.tokens.splice(lastRefIndex, 0, ...inject_tokens);
  } // attach ourselves to the start of block handling too


  md.block.ruler.before('table', 'footnote_mark_end_of_block', footnote_mark_end_of_block);
  md.block.ruler.before('reference', 'footnote_def', footnote_def, {
    alt: ['paragraph', 'reference']
  });
  md.inline.ruler.after('image', 'footnote_inline', footnote_inline);
  md.inline.ruler.after('footnote_inline', 'footnote_ref_with_text', footnote_ref_with_text);
  md.inline.ruler.after('footnote_ref_with_text', 'footnote_ref', footnote_ref);
  md.core.ruler.after('inline', 'footnote_tail', footnote_tail); //throw 1;

  console.log({
    par: md.block.ruler.__rules__
  });
}

export default footnote_plugin;
//# sourceMappingURL=markdownItFootnote.modern.js.map
