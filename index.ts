// Process footnotes
//

import * as assert from 'assert';


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

const default_plugin_options = {
  // atDocumentEnd: false,               -- obsoleted option of the original plugin

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
  numberSequence: [ '†', '‡', '††', '‡‡', '¶', 1 ],

  // Overrides the footnode mode when set to one of the following:
  //
  // Recognized 'modes':
  // '>': aside note (default for inline notes)
  // ':': end node
  // '=': section note (default for regular referenced notes)
  //
  modeOverride: null,

  // list section notes and endnotes in order of:
  //
  // 0: first *appearance* in the text
  // 1: first *reference* in the text
  // 2: *definition* in the text
  // 3: sorted alphabetically by label (inline footnotes will end up at the top, before all other notes)
  sortOrder: 2,
}

export default function footnote_plugin(md, plugin_options) {
  let parseLinkLabel = md.helpers.parseLinkLabel,
      isSpace = md.utils.isSpace;

  plugin_options = Object.assign({}, plugin_options, default_plugin_options);

  function determine_mode(mode: string, default_mode: string) {
    if (plugin_options.modeOverride && '>:='.includes(plugin_options.modeOverride)) {
      return {
        mode: plugin_options.modeOverride,
        fromInput: false
      };
    }
    if ('>:='.includes(mode)) {
      return {
        mode,
        fromInput: true
      };
    }
    return {
      mode: default_mode,
      fromInput: false
    };
  }

  function determine_footnote_symbol(idx) {
    if (plugin_options.numberSequence == null || plugin_options.numberSequence.length === 0) { return idx + 1; }
    const len = plugin_options.numberSequence.length;
    if (idx >= len) {
      // is last slot numeric or alphabetical?
      let slot = plugin_options.numberSequence[len - 1];
      if (Number.isFinite(slot)) {
        let delta = idx - len + 1;
        return slot + delta;
      }

        // non-numerical last slot --> duplicate, triplicate, etc.
      let dupli = (idx / len) | 0;  // = int(x mod N)
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
    let info = env.footnotes.list[token.meta.id];
    let labelOverride = info?.labelOverride;
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
    let id      = render_footnote_anchor_name(tokens, idx, options, env, slf);
    let caption = render_footnote_caption(tokens, idx, options, env, slf);
    let refid   = render_footnote_anchor_nameRef(tokens, idx, options, env, slf);

    // check if multiple footnote references are bunched together:
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
    const bunched_footnote_refs = next_token.type === 'footnote_ref' && !next_token_meta.text;

    if (tokens[idx].meta.text) {
      return '<a href="#fn' + id + '" id="fnref' + refid + '">' +
            tokens[idx].meta.text +
            '<sup class="footnote-ref">' + caption + '</sup></a>' +
            (bunched_footnote_refs ? '<sup class="footnote-ref">,</sup>' : '');
    }

    return `<sup class="footnote-ref"><a href="#fn${ id }" id="fnref${ refid }">${ caption }</a>${ bunched_footnote_refs ? ',' : '' }</sup>`;
  }

  function render_footnote_block_open(tokens, idx, options) {
    let header = tokens[idx].markup;
    return (options.xhtmlOut ? '<hr class="footnotes-sep" />\n' : '<hr class="footnotes-sep">\n') +
         '<section class="footnotes">\n' +
           (header ? '<h3 class="footnotes-header">' + header + '</h3>' : '') +
         '<ul class="footnotes-list">\n';
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
    let caption = render_footnote_caption(tokens, idx, options, env, slf);

    // allow both a JavaWScript --> CSS approach via `data-footnote-caption`
    // and a classic CSS approach while a display:inline-block SUP presenting
    // the LI 'button' instead:
    return `<li tabindex="-1" id="fn${ id }" class="footnote-item" data-footnote-caption="${ caption }"><span class="footnote-caption"><sup class="footnote-caption">${ caption }</sup></span><span class="footnote-content">`;
  }

  function render_footnote_close() {
    return '</span></li>\n';
  }

  function render_footnote_anchor(tokens, idx, options, env, slf) {
    let refid = render_footnote_n(tokens, idx, false);
    refid = plugin_options.anchorFn(refid, false, tokens, idx, options, env, slf);

    /* ↩ with escape code to prevent display as Apple Emoji on iOS */
    return ' <a href="#fnref' + refid + '" class="footnote-backref">\u21a9\uFE0E</a>';
  }


  md.renderer.rules.footnote_ref          = render_footnote_ref;
  md.renderer.rules.footnote_block_open   = render_footnote_block_open;
  md.renderer.rules.footnote_block_close  = render_footnote_block_close;
  md.renderer.rules.footnote_reference_open   = render_footnote_reference_open;
  md.renderer.rules.footnote_reference_close  = render_footnote_reference_close;
  md.renderer.rules.footnote_mark_end_of_block = render_footnote_mark_end_of_block;
  md.renderer.rules.footnote_open         = render_footnote_open;
  md.renderer.rules.footnote_close        = render_footnote_close;
  md.renderer.rules.footnote_anchor       = render_footnote_anchor;

  function obtain_footnote_info_slot(env, label?: string) {
    if (!env.footnotes) { 
      env.footnotes = { 
        // map label tto ID:
        refs: {},  
        // store footnote info indexed by ID
        list: [], 
        //TODO: remap ID to re-ordered ID (determines placement order for section notes and endnotes)
        idMap: [], 
      }; 
    }

    // When label is NULL, this is a request from in INLINE NOTE.

    // NOTE: IDs are index numbers, BUT they start at 1 instead of 0 to make life easier in check code:
    let footnoteId;
    let infoRec;
    // label as index: prepend ':' to avoid conflict with Object.prototype members
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
      console.assert(!!infoRec, "expects non-NULL footnote info record");
    }
    return infoRec;
  }

  function find_end_of_block_marker(state, startIndex) {
    let idx, len;
    let tokens = state.tokens;
    for (idx = startIndex, len = tokens.length; idx < len; idx++) {
      if (tokens[idx].type === 'footnote_mark_end_of_block') { return idx; }
    }
    //console.error({ tok: tokens.slice(startIndex), startIndex, idx, len });
    //throw Error('Should never get here!');

    // Punch a slot into the token stream (at the very end)
    // for consistency with footnote_mark_end_of_block():
    //footnote_mark_end_of_block(state, startLine, endLine, silent);
    let token = new state.Token('footnote_mark_end_of_block', '', 0);
    token.hidden = true;
    //token.meta = {
    //  EndOfFile: true
    //};
    tokens.push(token);
    return tokens.length - 1;
  }

  function update_end_of_block_marker(state, footnoteId) {
    // inject marker into parent = block level token stream to announce the advent of an (inline) footnote:
    // because the markdown_it code uses a for() loop to go through the parent nodes while parsing the
    // 'inline' chunks, we CANNOT safely inject a marker BEFORE the chunk, only AFTERWARDS:
    let parentState = state.env.parentState;
    let parentIndex = state.env.parentTokenIndex;
    let markerTokenIndex = find_end_of_block_marker(parentState, parentIndex + 1);
    let token = parentState.tokens[markerTokenIndex];
    if (!token.meta) token.meta = {};
    if (!token.meta.footnote_list) token.meta.footnote_list = [];
    token.meta.footnote_list.push(footnoteId);
  }

  // Mark end of paragraph/heading/whatever BLOCK (or rather: START of the next block!)
  function footnote_mark_end_of_block(state, startLine, endLine, silent) {
    if (!silent && state.tokens.length > 0) {
      let token = state.push('footnote_mark_end_of_block', '', 0);
      token.hidden = true;
    }
    return false;
  }

  // Process footnote block definition
  function footnote_def(state, startLine, endLine, silent) {
    let oldBMark, oldTShift, oldSCount, oldParentType, pos, label, token,
        initial, offset, ch, posAfterColon,
        start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // line should be at least 6 chars - "[^x]: " or "[^x]:> "
    if (start + 5 > max) { return false; }

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x0A /* LF */) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }
    let labelEnd = pos;

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A /* : */) { return false; }

    let mode_rec = determine_mode(state.src[pos + 1], '=');   // default mode is section_note mode.
    if (mode_rec.fromInput) 
      pos++;
    let mode = mode_rec.mode;

    if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x20 /* space */) { return false; }
    if (silent) { return true; }
    pos++;

    label = state.src.slice(start + 2, labelEnd);
    let text;
    if (label.match(/^(\S+)\s+(.+)$/)) {
      label = RegExp.$1;
      text = RegExp.$2;
    }

    console.error('extracted label = ', { label, text, labelEnd, pos, start });

    // Now see if we already have a footnote ID for this footnote label:
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
    let infoRec = obtain_footnote_info_slot(state.env, label);

    infoRec.labelOverride = text;
    infoRec.mode = mode;

    token = state.push('footnote_reference_open', '', 1);
    token.meta = {
      id: infoRec.id,
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
      id: infoRec.id,
    };

    return true;
  }

  // Process inline footnotes (^[...] or ^[>...])
  function footnote_inline(state, silent) {
    let labelStart,
        labelEnd,
        token,
        tokens,
        max = state.posMax,
        start = state.pos;

    if (start + 2 >= max) { return false; }
    if (state.src.charCodeAt(start) !== 0x5E/* ^ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5B/* [ */) { return false; }

    labelStart = start + 2;

    // NOTE: inline notes are automatically considered to be ASIDE notes,
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
    let mode_rec = determine_mode(state.src[start + 2], '>');   // default mode is aside ~ sidenote mode.
    if (mode_rec.fromInput) 
      labelStart++;
    let mode = mode_rec.mode;

    labelEnd = parseLinkLabel(state, start + 1);

    // parser failed to find ']', so it's not a valid note
    if (labelEnd < 0) { return false; }

    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      // inline blocks have their own *child* environment in markdown-it v10+.
      // As the footnotes must live beyond the lifetime of the inline block env,
      // we must patch them into the `parentState.env` for the footnote_tail
      // handler to be able to access them afterwards!
      let parentState = state.env.parentState;
      let parentEnv = parentState.env;

      // WARNING: claim our footnote slot for there MAY be nested footnotes
      // discovered in the next inline.parse() call below!
      let infoRec = obtain_footnote_info_slot(parentEnv, null);
      infoRec.mode = mode;
      infoRec.count++;

      token = state.push('footnote_ref', '', 0);
      //token.meta = { id: footnoteId, subId: 0, label: null };
      token.meta = {
        id: infoRec.id,
      };

      state.md.inline.parse(
        state.src.slice(labelStart, labelEnd),
        state.md,
        state.env,
        tokens = []
      );

      // Now fill our previously claimed slot:
      infoRec.content = state.src.slice(labelStart, labelEnd);
      infoRec.tokens = tokens;

      // inject marker into parent = block level token stream to announce the advent of an (inline) footnote:
      // because the markdown_it code uses a for() loop to go through the parent nodes while parsing the
      // 'inline' chunks, we CANNOT safely inject a marker BEFORE the chunk, only AFTERWARDS:
      update_end_of_block_marker(state, infoRec.id);

      //md.block.ruler.enable('footnote_mark_end_of_block');
    }

    state.pos = labelEnd + 1;
    state.posMax = max;
    return true;
  }

  // Process footnote references with text ([^label ...])
  function footnote_ref_with_text(state, silent) {
    let label,
        pos,
        footnoteSubId,
        token,
        max = state.posMax,
        start = state.pos;

    // should be at least 6 chars - "[^l x]"
    if (start + 5 > max) { return false; }

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x0A /* linefeed */) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos >= max) { return false; }
    pos++;

    label = state.src.slice(start + 2, pos - 1);
    if (!label || !label.match(/^(\S+)\s+(.+)$/)) { return false; }
    label = RegExp.$1;
    let text = RegExp.$2;

    let infoRec = obtain_footnote_info_slot(state.env, label);

    if (!silent) {
      footnoteSubId = infoRec.count;

      infoRec.count++;

      token = state.push('footnote_ref', '', 0);
      token.meta = {
        id: infoRec.id,
        subId: footnoteSubId,
      };

      update_end_of_block_marker(state, infoRec.id);

      //md.block.ruler.enable('footnote_mark_end_of_block');
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  }

  // Process footnote references ([^...])
  function footnote_ref(state, silent) {
    let label,
        pos,
        footnoteSubId,
        token,
        max = state.posMax,
        start = state.pos;

    // should be at least 4 chars - "[^x]"
    if (start + 3 > max) { return false; }

    if (state.src.charCodeAt(start) !== 0x5B/* [ */) { return false; }
    if (state.src.charCodeAt(start + 1) !== 0x5E/* ^ */) { return false; }

    for (pos = start + 2; pos < max; pos++) {
      if (state.src.charCodeAt(pos) === 0x20) { return false; }
      if (state.src.charCodeAt(pos) === 0x0A) { return false; }
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        break;
      }
    }

    if (pos === start + 2) { return false; } // no empty footnote labels
    if (pos >= max) { return false; }
    pos++;

    label = state.src.slice(start + 2, pos - 1);

    let infoRec = obtain_footnote_info_slot(state.env, label);

    if (!silent) {
      footnoteSubId = infoRec.count;
      
      infoRec.count++;

      token = state.push('footnote_ref', '', 0);
      token.meta = {
        id: infoRec.id,
        subId: footnoteSubId,
      };

      update_end_of_block_marker(state, infoRec.id);

      //md.block.ruler.enable('footnote_mark_end_of_block');
    }

    state.pos = pos;
    state.posMax = max;
    return true;
  }

  // Glue footnote tokens into appropriate slots of token stream.
  function footnote_tail(state, startLine, endLine, silent) {
    let i, l, j, t, lastParagraph, token, tokens, current, currentRefToken,
        insideRef = false,
        refTokens = {};

    console.error('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ TAIL');
    if (!state.env.footnotes) {
      // no footnotes at all? --> filter out all 'footnote_mark_end_of_block' chunks:
      state.tokens = state.tokens.filter(function (tok, idx) {
        return (tok.type !== 'footnote_mark_end_of_block');
      });
      return;
    }

    // Rewrite the tokenstream to place the aside-footnotes and section footnotes where they need to be:
    let aside_list = [];
    let section_list = [];
    let end_list = [];

    let list = state.env.footnotes.list;

    // extract the tokens constituting the footnote/sidenote *content* and
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
        currentRefToken = tok;
/*
        if (tok.meta.mode === '>') {
          aside_list.push(idx);
        }
*/
        return true;

      case 'footnote_reference_close':
        insideRef = false;

        let infoRec = list[tok.meta.id];
        infoRec.tokens = current;

        return true;
      }
      if (insideRef) {
        current.push(tok);
      }
      return !insideRef;
    });

    let inject_tokens = [];

    token = new state.Token('footnote_block_open', '', 1);
    token.markup = plugin_options.headerFn(state);
    inject_tokens.push(token);

    // REMEMBER: we're indexing from 1 for footnote IDs instead of from zero(0),
    // so the first slot (`list[0]`) will be NULL:
    console.error("!!!!!!!!!!!!! list:", list)
    for (i = 1, l = list.length; i < l; i++) {
      let fn = list[i];
      let inject_start_index = inject_tokens.length;

      token      = new state.Token('footnote_open', '', 1);
      token.meta = {
        id: i,
      };
      inject_tokens.push(token);

      if (fn.tokens) {
        // process an inline footnote text:
        token          = new state.Token('paragraph_open', 'p', 1);
        token.block    = true;
        inject_tokens.push(token);

        token          = new state.Token('inline', '', 0);
        token.children = fn.tokens;
        token.content  = fn.content;
        inject_tokens.push(token);

        token          = new state.Token('paragraph_close', 'p', -1);
        token.block    = true;
        inject_tokens.push(token);
      } else if (fn.label) {
        // process a labeled footnote:
        inject_tokens = inject_tokens.concat(fn.tokens || []);
      } else {
        // nothing to inject
        throw Error('unexpected: should never get here!');
      }

      if (inject_tokens[inject_tokens.length - 1].type === 'paragraph_close') {
        lastParagraph = inject_tokens.pop();
      } else {
        lastParagraph = null;
      }

      t = fn.count;
      if (t < 1) {
        console.error(`footnote ID ${i} is defined but never used. Footnote will be removed from the output!`, fn);
        inject_tokens = inject_tokens.slice(0, inject_start_index);
      }
      else {
        for (j = 0; j < t; j++) {
          token = new state.Token('footnote_anchor', '', 0);
          token.meta = {
            id: i,
            subId: j,
          };
          inject_tokens.push(token);
        }

        if (lastParagraph) {
          inject_tokens.push(lastParagraph);
        }

        token = new state.Token('footnote_close', '', -1);
        token.meta = {
          id: i,
        };
        inject_tokens.push(token);
      }
    }

    token = new state.Token('footnote_block_close', '', -1);
    inject_tokens.push(token);
    state.tokens.splice(state.tokens.length, 0, ...inject_tokens);

    // Update state_block too as we have rewritten & REPLACED the token array earlier in this call:
    // the reference `state.env.state_block.tokens` is still pointing to the OLD token array!
    state.env.state_block.tokens = state.tokens;
  }

  // attach ourselves to the start of block handling too
  md.block.ruler.before('table', 'footnote_mark_end_of_block', footnote_mark_end_of_block);

  md.block.ruler.before('reference', 'footnote_def', footnote_def, { alt: [ 'paragraph', 'reference' ] });
  md.inline.ruler.after('image', 'footnote_inline', footnote_inline);
  md.inline.ruler.after('footnote_inline', 'footnote_ref_with_text', footnote_ref_with_text);
  md.inline.ruler.after('footnote_ref_with_text', 'footnote_ref', footnote_ref);
  md.core.ruler.after('inline', 'footnote_tail', footnote_tail);
}
