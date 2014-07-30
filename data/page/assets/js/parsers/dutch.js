(function() {
    'use strict';

    window.debug = false;
    // debug = true;

    if(window.parsers === undefined) window.parsers = [];

    // scan data for phone numbers matching the dutch format
    // and return the node in the DOM
    window.parsers.push(['NL', function() {
        var matches;
        var input;
        var buffer;
        var result;
        var pos = 0;
        var peekpos = 0;
        var start = -1;

        var whitespace = '[\\xA0\\x20\\t]';
        var nbsp = '(?:&nbsp;)';
        var nextline = '[\\r\\n\\f]';

        var actions = {
            ignore: function() {
                if(debug) console.log('ignore',  '"' + buffer + '"', '"' + result + '"');
                buffer = '';

                return false;
            },
            keep: function(kept) {
                if(start == -1) {
                    var posInFront = pos - (1 + kept.length);
                    var charsInFront = input.substring(posInFront, (posInFront + 1));
                    if(!charsInFront.trim().length) {
                        // extend charsInFront if it's just a space
                        posInFront -= 1;
                        charsInFront = input.substring(posInFront, (pos - 2)) + charsInFront;
                    }

                    // shift behindpos if &nbsp; is adjacent
                    if(charsInFront.trim() == ';' && input.substring((posInFront - 5), (posInFront + 1)) == '&nbsp;') {
                        posInFront -= 6;
                        charsInFront = input[posInFront];
                        if(!charsInFront.trim().length) {
                            // extend charsInFront if it's just a space
                            posInFront -= 1;
                            charsInFront = input.substring(posInFront, (posInFront + 1)) + charsInFront;
                        }
                    }

                    // perform a few checks to see if we're starting mid-string or if we're "isolated"
                    var ignore = false;

                    // test if we're starting mid-string and allow some cases
                    if(charsInFront.length && !(new RegExp(whitespace + '|' + nextline + '|[(,\'"]').test(charsInFront))) {
                        if(charsInFront.slice(-1) == ';') {
                            // disallow ;
                            ignore = true;
                            if(debug) console.log(';;; > ignore');
                        } else if(charsInFront.slice(-1) == '.') {
                            // allow . if part of t.|tel.
                            if(input.substring((posInFront - 2), (posInFront + 1)).toLowerCase().trim() != 't.' &&
                                    input.substring((posInFront - 4), (posInFront + 1)).toLowerCase().trim() != 'tel.') {
                                ignore = true;
                                if(debug) console.log('... > ignore');
                            }
                        } else if(charsInFront.slice(-1) == ':') {
                            // allow : as long there is not an isolated F in front of it
                            if(input.substring((posInFront - 2), (posInFront + 1)).toLowerCase().trim() == 'f:' ||
                                    input.substring((posInFront - 4), (posInFront + 1)).toLowerCase().trim() == 'fax:') {
                                if(debug) console.log('::: > ignore');
                                ignore = true;
                            }
                        } else {
                            if(input.substring((posInFront - 1), (posInFront + 1)).trim().toLowerCase() != 't') {
                                ignore = true;
                                if(debug) console.log('    > ignore', '"' + input.substring((posInFront - 10), (posInFront + 1)) + '"');
                            }
                        }
                    } else {
                        if(kept == '0') {
                            // prevent matching START on the 0 in: "F. +31(0) xxx"
                            if(input.substring((posInFront - 1), (posInFront + 1)).slice(-1) == '(' &&
                                    input.substring((posInFront + 2), (posInFront + 4)).slice(0, 1) == ')') {
                                ignore = true;
                            }
                        }
                    }

                    if(!ignore) {
                        charsInFront = charsInFront.trim();

                        // test if we're starting mid-sentence and ignore in some cases
                        // has some significant similarities with the code above, but slightly different!!
                        if(charsInFront.length && !(new RegExp(whitespace + '|' + nextline + '|[(,\'"]').test(charsInFront))) {
                            if(charsInFront.slice(-1) == ';') {
                                // disallow ;
                                ignore = true;
                                if(debug) console.log(';;; > ignore');
                            } else if(charsInFront.slice(-1) == '.') {
                                // allow . if part of t.|tel.
                                if(input.substring((posInFront - 2), (posInFront + 1)).toLowerCase().trim() != 't.' &&
                                        input.substring((posInFront - 4), (posInFront + 1)).toLowerCase().trim() != 'tel.') {
                                    ignore = true;
                                    if(debug) console.log('... > ignore');
                                }
                            } else if(charsInFront.slice(-1) == ':') {
                                // allow : as long there is not an isolated F in front of it
                                if(input.substring((posInFront - 2), (posInFront + 1)).toLowerCase().trim() == 'f:' ||
                                        input.substring((posInFront - 4), (posInFront + 1)).toLowerCase().trim() == 'fax:') {
                                    if(debug) console.log('::: > ignore');
                                    ignore = true;
                                }
                            } else {
                                if(input.substring((posInFront - 1), (posInFront + 1)).trim().toLowerCase() == 'f') {
                                    ignore = true;
                                    if(debug) console.log('    > ignore', '"' + input.substring((posInFront - 10), (posInFront + 1)) + '"');
                                } else {
                                    // do not match numbers which are probably part of an IBAN
                                    // codes origin: http://www.betaalvereniging.nl/europees-betalen/sepa-documentatie/bic-afleiden-uit-iban/
                                    if(['ABNA',
                                        'FTSB',
                                        'AEGO',
                                        'ANAA',
                                        'ANDL',
                                        'ARBN',
                                        'ARSN',
                                        'ARTE',
                                        'ASNB',
                                        'ASRB',
                                        'ATBA',
                                        'BBRU',
                                        'BCDM',
                                        'BCIT',
                                        'BICK',
                                        'BKCH',
                                        'BKMG',
                                        'BLGW',
                                        'BMEU',
                                        'BNGH',
                                        'BNPA',
                                        'BOFA',
                                        'BOFS',
                                        'BOTK',
                                        'CHAS',
                                        'CITC',
                                        'CITI',
                                        'COBA',
                                        'DEUT',
                                        'DHBN',
                                        'DLBK',
                                        'DNIB',
                                        'FBHL',
                                        'FLOR',
                                        'FRBK',
                                        'FRGH',
                                        'FVLB',
                                        'GILL',
                                        'HAND',
                                        'HHBA',
                                        'HSBC',
                                        'ICBK',
                                        'INGB',
                                        'INSI',
                                        'ISBK',
                                        'KABA',
                                        'KASA',
                                        'KNAB',
                                        'KOEX',
                                        'KRED',
                                        'LOCY',
                                        'LOYD',
                                        'LPLN',
                                        'MHCB',
                                        'NNBA',
                                        'NWAB',
                                        'OVBN',
                                        'RABO',
                                        'RBOS',
                                        'RBRB',
                                        'SNSB',
                                        'SOGE',
                                        'STAL',
                                        'TEBU',
                                        'TRIO',
                                        'UBSW',
                                        'UGBI',
                                        'VOWA',
                                            'ZWLB'].indexOf(input.substring((posInFront-3), (posInFront+1)).toUpperCase()) > -1) {
                                        ignore = true;
                                    }
                                }
                            }
                        } else {
                            if(kept == '0') {
                                // prevent matching START on the 0 in: "F. &nbsp;+31(0) xxx"
                                if(input.substring((posInFront - 1), (posInFront + 1)).slice(-1) == '(' &&
                                        input.substring((posInFront + 2), (posInFront + 4)).slice(0, 1) == ')') {
                                    ignore = true;
                                }
                            }
                        }
                    }

                    if(ignore) {
                        return actions.ignore();
                    }

                    start = (pos - 1);
                }

                // not all dashes look the same
                if(new RegExp(rules[12].pattern).test(kept)) {
                    kept = '-';
                    if(debug) console.error('force replace matched dash with a standard dash');
                }

                result += kept;
                buffer = '';
                if(debug) console.log('keep', '"' + kept + '"', '->', '"' + result + '"');

                return true;
            },
            end: function(kept) {
                if(kept) {
                    // discard whatever it is triggered the end
                    pos -= kept.length;
                    buffer = buffer.slice(-kept.length);
                }

                var valid = false;

                // only bother validating when a start position is marked
                if(start > -1) {
                    valid = validate(result);
                    if(valid) {
                        matches.push({
                            start: start,
                            end: pos,
                            number: result.replace(new RegExp('[^\\d+]', 'g'), ''),
                        });
                        actions.reset();
                    } else {
                        if(debug) console.error('what to do.. (invalid end)');
                        actions.reset();
                    }
                }

                if(debug) console.log('end',  '"' + result + '"', 'valid:', valid);
                start = -1;
            },
            end_or_ignore: function(kept) {
                // discard whatever it is triggered the end
                pos -= kept.length;
                buffer = buffer.slice(-kept.length);

                var startbuffer = buffer;

                // see if result so far is valid
                var valid = validate(result);

                // at this point, look if a new match could be found up ahead
                var startRules = rulesMap['START'];
                var ruleMatched = false;

                for(var i = 0; i < startRules.length; i++) {
                    var rule = rules[startRules[i]];

                    // add to buffer
                    peekpos = pos;
                    buffer = peek(1);

                    // test buffer until
                    // - pattern matches, or
                    // - buffer length exceeds rule length
                    for(var j = 0 ; j < rule.length && (buffer.length == (j+1)); j++) {
                        if(debug) console.log('attempt', (j + 1), 'on', '"' + buffer + '"');
                        if(new RegExp(rule.pattern).test(buffer)) {
                            if(debug) console.log('"' + rule.pattern + '"', 'matched on', '"' + buffer + '"');

                            ruleMatched = true;
                            break;
                        } else {
                            if(debug) console.log('no match');

                            // increase buffer
                            buffer += peek(1);
                        }
                    }

                    if(ruleMatched) {
                        // a new match can be found ahead, end here
                        if(valid) {
                            // do no pass 'kept' to prevent repeating discarding it
                            actions.end();
                        } else {
                            actions.reset();
                        }
                        break;
                    }
                }

                // undo changes we made
                pos += kept.length;
                peekpos = pos;
                buffer = startbuffer;
            },
            reset: function(kept) {
                if(debug) console.log('reset on', '"' + buffer + '"', pos, peekpos, ', result so far:', '"' + result + '"');

                // re-evaluate from the same position with initial state
                peekpos = pos;

                // clear whatever
                state.reset();
                buffer = '';
                result = '';
                start = -1;
            }
        };

        var state = function() {
            // states used are
            // START
            // INTERNATIONAL
            // AREA
            // LINE
            var states = [];

            var set = function(state) {
                if(current() != state) {
                    states.push(state);
                }
            };

            var replace = function(state) {
                if(replace === true) {
                    states.pop();
                }
                set(state);
            };

            var reset = function() {
                while(states.length > 1) {
                    states.pop();
                }
            };

            var current = function() {
                return states[states.length - 1];
            };

            return {
                set: set,
                replace: replace,
                reset: reset,
                current: current,

                print: function() {
                    console.log(states);
                },
            };
        }();

        var rules = [];
        rules[0] = {
            pattern: '[^\\d]', action: actions.reset, length: 1,
        };
        rules[1] = {
            pattern: nextline, action: actions.end, length: 1,
        };
        rules[13] = {
            // pattern: '^\\b|' + whitespace + nextline + '|$', action: actions.end, length: 1,
            pattern: '^\\b|' + whitespace + nextline + '|' + nbsp + '|$', action: actions.end, length: 6,
        };

        //////////////////////
        // starting characters
        //////////////////////

        // international notation
        rules[2] = {
            pattern: '(^|\\b[\\p{P}|' + whitespace + '|' + nextline + '])\\+',
            filter: '[^\\+]',
            action: actions.keep, length: 3,
            state: 'INTERNATIONAL'
        };
        rules[3] = {
            // pattern: '^00',
            // pattern: '\\b00',
            pattern: '(^|\\b[\\p{P}|' + whitespace + '|' + nextline + '])00',
            action: actions.keep, length: 2,
            state: 'INTERNATIONAL'
        };
        rules[4] = {
            pattern: '^31',
            action: actions.keep, length: 2,
            state: 'AREA'
        };

        // optional (0) behind international notation
        rules[5] = {
            pattern: '^(\\((' + whitespace + '|' + nbsp + ')?0(' + whitespace + '|' + nbsp + ')?\\))',
            // action: actions.ignore, length: 5,
            action: actions.ignore, length: 15,
            state: 'AREA'
        };

        // national notation
        rules[6] = {
            // pattern: '^0',
            // pattern: '\\b0',
            pattern: '(^|\\b[\\p{P}|' + whitespace + '|' + nextline + '])0',
            action: actions.keep, length: 1,
            state: 'AREA'
        };

        // ordinary line number digits
        rules[7] = {
            pattern: '^[\\d]',
            action: actions.keep, length: 1,
            state: 'LINE',
        };

        /////////////////////
        // garbage characters
        /////////////////////

        // whitespace: error out on two next to each other
        rules[8] = {
            pattern: '^((' + whitespace + '|' + nbsp + ')){2}',
            // action: actions.end, length: 2,
            action: actions.end, length: 7,
        };
        // whitespace: allow just one
        rules[9] = {
            pattern: '^((' + whitespace + '|' + nbsp + ')){1}',
            // action: actions.end_or_ignore, length: 1,
            action: actions.end_or_ignore, length: 6,
        };
        // parenthesis: have at least 1 digit between them
        rules[10] = {
            pattern: '^(\\((' + whitespace + '|' + nbsp + ')?\\d{1,})',
            filter: '\\s',
            // action: actions.keep, length: 3,
            action: actions.keep, length: 8,
        };
        rules[11] = {
            pattern: '^((' + whitespace + '|' + nbsp + ')?\\d{1,}\\)',
            filter: '\\s',
            // action: actions.keep, length: 3,
            action: actions.keep, length: 8,
        };
        // hyphen
        rules[12] = {
            pattern: '[-\u2012-\u2015]',
            action: actions.keep, length: 1,
        };

        var rulesMap = {
            'START': [2, 3, 6],
            'INTERNATIONAL': [4],
            'AREA': [7, 12, 5],
            'LINE': [7, 1, 8, 9, 10, 12, 5, 13, 0],
        };

        var peek = function(size) {
            peekpos += size;
            return input.substring(peekpos - size, peekpos);
        };

        var parse = function(text) {
            matches = [];

            input = text;
            result = buffer = '';
            state.set('START');

            for(; pos < input.length;) {
                var startpos = pos;

                // test rules applicable for current state
                var stateRules = rulesMap[state.current()];
                var ruleMatched = false;

                if(debug) console.log('matching rules for state', state.current());
                for(var i = 0; i < stateRules.length; i++) {
                    if(debug) console.warn('result so far: "' + result + '"');

                    var rule = rules[stateRules[i]];

                    if(debug) state.print();

                    // add to buffer
                    peekpos = pos;
                    buffer = peek(1);

                    if(debug) console.log('attempting pattern', '"' + rule.pattern + '"', rule.length, 'times on buffer');

                    // test buffer until
                    // - pattern matches, or
                    // - buffer length exceeds rule length
                    for(var j = 0 ; j < rule.length && (buffer.length == (j+1)); j++) {
                        if(debug) console.log('attempt', (j + 1), 'on', '"' + buffer + '"');
                        if(new RegExp(rule.pattern).test(buffer)) {
                            if(debug) console.log('"' + rule.pattern + '"', 'matched on', '"' + buffer + '"');

                            pos = peekpos;
                            ruleMatched = true;
                            break;
                        } else {
                            if(debug) console.log('no match');
                            // increase buffer
                            buffer += peek(1);
                        }
                    }

                    if(ruleMatched) {
                        // shift pos
                        pos = peekpos;

                        // take action for buffer
                        var kept = buffer;
                        if(rule.filter !== undefined) {
                            kept = kept.replace(new RegExp(rule.filter, 'g'), '');
                        }
                        var switchState = rule.action(kept);

                        // clear buffer
                        buffer = '';

                        // change state if set
                        if(rule.state !== undefined) {
                            if(switchState) {
                                state.set(rule.state);
                            } else {
                                if(debug) console.error('could\'ve switched state, but didn\'t');
                            }
                            if(debug) state.print();
                        }

                        // break to start over testing every rule in order
                        break;
                    }
                }

                // make sure to keep progressing if possible
                if(pos == startpos) {
                    pos++;
                }
            }

            // validate whatever is in the buffer after finished looping
            if(debug) console.warn('check whatsever is in the buffer (' + buffer + ')', input.length, pos, peekpos);
            pos = peekpos;
            actions.end(buffer);

            return matches;
        };

        // validate result,
        // result is guaranteed to have no whitespace, which makes life easy
        var validate = function() {
            var matches = new RegExp('^(?:(?:(?:\\+|00)31)|0)(.*)').exec(result);
            if(!matches) {
                // the number
                // - doesn't start with ((+|00)31|0), or
                // - has no trailing characters, or
                // - has no trailing digits
                if(debug) console.log('invalid: "' + result + '" not ((+|00)31|0)\\d+');

                return false;
            }

            // everything behind ((+|00)31|0)
            var line_number = matches[1];
            // just the digits behind ((+|00)31|0)
            var just_digits = line_number.replace(new RegExp('[^\\d]', 'g'), '');

            // numbers with 079 are not callable numbers, but used for data
            if(just_digits.substring(0, 2) == '79') {
                if(debug) console.log('invalid: data number (079xxxxxxx)');

                return false;
            }

            // there shouldn't be a 00 in the area code: +31005xxxxxx or +31500xxxxxx
            // but allow 0800, 0900
            if(new RegExp('^00|[^89]00').test(just_digits.substring(0, 3))) {
                if(debug) console.log('invalid: impossbile area code behind ((+|00)31|0)');

                return false;
            }

            // check for characters other than '(', ')', '-'
            if(new RegExp('[^\\d\\-\\(\\)]').test(line_number)) {
                if(debug) console.log('invalid: unwanted characters behind ((+|00)31|0)');

                return false;
            }

            // a single hyphen is only allowed on a few positions
            var hyphens = [];
            for (var i = 0; i < line_number.length && hyphens.length < 2; i++) {
                if (line_number[i] == '-') {
                    hyphens.push(i);
                }
            }
            if(hyphens.length == 1) {
                if(hyphens[0] < 1 || hyphens[0] > 3) {
                    if(debug) console.log('invalid: wrong hyphen position');

                    return false;
                }
            } else if(hyphens.length == 2) {
                    if(debug) console.log('invalid: too many hyphens');
                return false;
            }

            // check for bad parentheses
            var nesting = 0;
            for(var j = 0; j < result.length; j++) {
                var c = result.charAt(j);
                if(c == '(') {
                    nesting++;
                } else if(c == ')') {
                    nesting--;
                }
            }
            if(nesting !== 0) {
                if(debug) console.log('invalid: wrong parentheses');
                return false;
            }

            // if result is a service number, more than one length can be valid
            if(just_digits.substring(0, 1) == '8') {
                if(just_digits.substring(0, 3) == '800') {
                    if(debug) console.log('invalid: incorrect length for 0800', just_digits, just_digits, just_digits.length);

                    return just_digits.length == 7 || just_digits.length == 10;
                } else if(!new RegExp('^8([24578]|00)').test(just_digits)) {
                    // 08x service number must be 08([24578]|00)
                    return false;
                }
            } else if(just_digits.substring(0, 1) == '9') {
                if(new RegExp('^9(00|06|09)').test(just_digits)) {
                    if(debug) console.log('invalid: incorrect length for 09(00|06|09)', just_digits, just_digits.length);

                    return just_digits.length == 7 || just_digits.length == 10;
                } else if(!new RegExp('^91').test(just_digits)) {
                    // 09x service number must be 09(1|00|06|09)
                    return false;
                }
            }

            return just_digits.length == 9;
        };

        var isBlockingNode = function(node) {
            var blocking = false;
            if(node) {
                var text = node.textContent.trim().toLowerCase();
                if(text == 'fax' ||
                   text == 'fax.' ||
                   text == 'fax:' ||
                   text == 'f' ||
                   text == 'f.' ||
                        text == 'f:') {
                    blocking = true;
                }
            }

            return blocking;
        };

        // exposed functions
        return {
            parse: parse,
            isBlockingNode: isBlockingNode,
        };
    }]);
})();
