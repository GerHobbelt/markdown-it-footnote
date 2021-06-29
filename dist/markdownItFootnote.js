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
  return '[' + n + ']';
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
    headerFn: headerFnDefault
  });

  function render_footnote_n(tokens, idx, excludeSubId) {
    let n = Number(tokens[idx].meta.id + 1).toString();

    if (!excludeSubId && tokens[idx].meta.subId > 0) {
      n += ':' + tokens[idx].meta.subId;
    }

    return n;
  }

  function render_footnote_anchor_name(tokens, idx, options, env, slf) {
    let n = render_footnote_n(tokens, idx, true);
    return plugin_options.anchorFn(n, true, tokens, idx, options, env, slf);
  }

  function render_footnote_caption(tokens, idx, options, env, slf) {
    let n = render_footnote_n(tokens, idx);
    return plugin_options.captionFn(n, tokens, idx, options, env, slf);
  }

  function render_footnote_ref(tokens, idx, options, env, slf) {
    let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    let caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
    let refid = render_footnote_n(tokens, idx);
    refid = plugin_options.anchorFn(refid, false, tokens, idx, options, env, slf);

    if (tokens[idx].meta.text) {
      return '<a href="#fn' + id + '" id="fnref' + refid + '">' + tokens[idx].meta.text + '<sup class="footnote-ref">' + caption + '</sup></a>';
    }

    return '<sup class="footnote-ref"><a href="#fn' + id + '" id="fnref' + refid + '">' + caption + '</a></sup>';
  }

  function render_footnote_block_open(tokens, idx, options) {
    let header = tokens[idx].markup;
    return (options.xhtmlOut ? '<hr class="footnotes-sep" />\n' : '<hr class="footnotes-sep">\n') + '<section class="footnotes">\n' + (header ? '<h3 class="footnotes-header">' + header + '</h3>' : '') + '<ol class="footnotes-list">\n';
  }

  function render_footnote_block_close() {
    return '</ol>\n</section>\n';
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
    let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
    /*
      if (tokens[idx].meta.subId > 0) {
        id += ':' + tokens[idx].meta.subId;
      }
    */

    return '<li tabindex="-1" id="fn' + id + '" class="footnote-item">';
  }

  function render_footnote_close() {
    return '</li>\n';
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
  md.renderer.rules.footnote_anchor = render_footnote_anchor; // helpers (only used in other rules, no tokens are attached to those)

  md.renderer.rules.footnote_caption = render_footnote_caption;
  md.renderer.rules.footnote_anchor_name = render_footnote_anchor_name;

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
      token.meta = {};
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
      if (state.src.charCodeAt(pos) === 0x20
      /* space */
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

    let aside_note = state.src.charCodeAt(pos + 1) === 0x3E
    /* > */
    ;

    if (aside_note) {
      pos++;
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
    console.error('extracted label = ', {
      label,
      labelEnd,
      pos,
      start
    });
    state.env.footnotes.refs[':' + label] = -1;
    token = state.push('footnote_reference_open', '', 1);
    token.meta = {
      label,
      aside: aside_note
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

    labelStart = start + 2;
    let aside_note = state.src.charCodeAt(start + 2) === 0x3E
    /* > */
    ;

    if (aside_note) {
      labelStart++;
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

      footnoteId = parentEnv.footnotes.list.length;
      token = state.push('footnote_ref', '', 0); //token.meta = { id: footnoteId, subId: 0, label: null };

      token.meta = {
        id: footnoteId
      };
      state.md.inline.parse(state.src.slice(labelStart, labelEnd), state.md, state.env, tokens = []);
      parentEnv.footnotes.list[footnoteId] = {
        content: state.src.slice(labelStart, labelEnd),
        tokens: tokens,
        aside: aside_note
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
        currentLabel,
        lastRefIndex = 0,
        insideRef = false,
        refTokens = {}; // Punch a slot into the token stream (at the very end)
    // for consistency with footnote_mark_end_of_block():
    //footnote_mark_end_of_block(state, startLine, endLine, silent);

    token = new state.Token('footnote_mark_end_of_block', '', 0);
    token.hidden = true;
    state.tokens.push(token);
    console.error('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ TAIL');

    if (!state.env.footnotes) {
      return;
    }

    let oldLen = state.tokens.length; // Rewrite the tokenstream to place the aside-footnotes and section footnotes where they need to be:
    // store that bunch in `refTokens[:<currentLabel>]` instead, to be injected back into
    // the tokenstream at the appropriate spots.

    state.tokens = state.tokens.filter(function (tok, idx) {
      switch (tok.type) {
        case 'footnote_mark_inline_footnote':
          break;

        case 'footnote_reference_open':
          insideRef = true;
          current = [];
          currentLabel = tok.meta.label;
          return true;

        case 'footnote_reference_close':
          insideRef = false; // prepend ':' to avoid conflict with Object.prototype members

          refTokens[':' + currentLabel] = current;
          lastRefIndex = idx;
          return true;
      }

      if (insideRef) {
        current.push(tok);
      }

      return !insideRef;
    });
    console.error({
      lastRefIndex,
      nextRefIndex: lastRefIndex - (oldLen - state.tokens.length - 1),
      atDocumentEnd: plugin_options.atDocumentEnd,
      oldLen,
      tokens_length: state.tokens.length,
      list: state.env.footnotes.list
    });
    lastRefIndex = plugin_options.atDocumentEnd ? state.tokens.length : lastRefIndex - (oldLen - state.tokens.length - 1);
    let list = state.env.footnotes.list;

    if (!list) {
      return;
    }

    let inject_tokens = [];
    token = new state.Token('footnote_block_open', '', 1);
    token.markup = plugin_options.headerFn(state);
    inject_tokens.push(token);

    for (i = 0, l = list.length; i < l; i++) {
      token = new state.Token('footnote_open', '', 1);
      token.meta = {
        id: i,
        label: list[i].label
      };
      inject_tokens.push(token);

      if (list[i].tokens) {
        // process an inline footnote text:
        token = new state.Token('paragraph_open', 'p', 1);
        token.block = true;
        inject_tokens.push(token);
        token = new state.Token('inline', '', 0);
        token.children = list[i].tokens;
        token.content = list[i].content;
        inject_tokens.push(token);
        token = new state.Token('paragraph_close', 'p', -1);
        token.block = true;
        inject_tokens.push(token);
      } else if (list[i].label) {
        // process a labeled footnote:
        inject_tokens = inject_tokens.concat(refTokens[':' + list[i].label] || []);
      } else {
        // nothing to inject
        throw Error('unexpected: should never get here!');
      }

      if (inject_tokens[inject_tokens.length - 1].type === 'paragraph_close') {
        lastParagraph = inject_tokens.pop();
      } else {
        lastParagraph = null;
      }

      t = list[i].count > 0 ? list[i].count : 1;

      for (j = 0; j < t; j++) {
        token = new state.Token('footnote_anchor', '', 0);
        token.meta = {
          id: i,
          subId: j,
          label: list[i].label
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
