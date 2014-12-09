(function() {
    'use strict';

    // identify our elements with these class names
    var phoneElementClassName = 'voipgrid-phone-number';

    // using an object to check if tagName is disallowed is faster when using `tagName in {}` than using `Array.indexOf(tagname)`
    var blockedTagNames = (function() {
        // tag list based on:
        // https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5/HTML5_element_list
        var tags = [
            'TITLE',
            'BASE',
            'LINK',
            'META',
            'STYLE',
            'SCRIPT',
            'TEMPLATE',
            'PRE',
            'FIGURE',
            'DATA',
            'TIME',
            'CODE',
            'VAR',
            'SAMP',
            'KBD',
            'SUB',
            'SUP',
            'RUBY',
            'RT',
            'RP',
            'BDI',
            'BR',
            'WBR',
            'IMG',
            'EMBED',
            'OBJECT',
            'PARAM',
            'VIDEO',
            'AUDIO',
            'SOURCE',
            'TRACK',
            'CANVAS',
            'MAP',
            'AREA',
            'SVG',
            'MATH',
            'INPUT',
            'BUTTON',
            'SELECT',
            'DATALIST',
            'OPTGROUP',
            'OPTION',
            'TEXTAREA',
            'KEYGEN',
            'PROGRESS',
            'METER',
            'DETAILS',
            'SUMMARY',
            'MENUITEM',
            'MENU',
        ];

        var disallowed = {};
        for(var i = 0; i < tags.length; i++) {
            disallowed[tags[i]] = null;
        }

        return disallowed;
    })();

    var blockedRoles = (function() {
        // role list based on:
        // http://www.w3.org/TR/wai-aria/roles#landmark_roles
        var roles = [
            'button',
            'checkbox',
            'command',
            'input',
            'radio',
            'range',
            'slider',
            'option',
            'search',
            'textbox',
            'timer',
        ];

        var disallowed = {};
        for(var i = 0; i < roles.length; i++) {
            disallowed[roles[i]] = null;
        }

        return disallowed;
    })();

    /**
     * Skip elements which *probably* wouldn't (or shouldn't) contain a phone number.
     */
    function isBlockedElement(element) {

        if(element.tagName.toUpperCase() in blockedTagNames) {
            return true;
        }

        // check for attributes on *element*
        if($(element).is('[contenteditable="true"]') ||
                $(element).is('[aria-labelledby]') ||
                ($(element).is('[role]') && $(element).attr('role').toLowerCase() in blockedRoles)) {
            return true;
        } else {
            // check for attributes on *parents*
            var closest_role_element = $(element).closest('[role]');
            if(!!$(element).closest('[contenteditable="true"]').length ||
                    !!$(element).closest('[aria-labelledby]').length ||
                    (!!closest_role_element.length && $(closest_role_element[0]).attr('role').toLowerCase() in blockedRoles)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Test if `node` should even be processed.
     */
    window.skipNode = function(node) {
        // nodetype 1 == HTML element
        if(node.nodeType == 1 && isBlockedElement(node)) {
            return true;
        }

        // nodetype 3 == Text node
        if(node.nodeType == 3) {
            // skip empty nodes
            if(node.data.trim().length === 0) {
                return true;
            }
        }

        var parentElement = node.parentElement;
        if(parentElement) {
            // skip invisible elements,
            // Sizzle: an element is invisible when it has no height or width
            if(!(parentElement.offsetWidth > 0 || parentElement.offsetHeight > 0)) {
                return true;
            }

            // skip existing numbers with an icon
            if($(parentElement).hasClass(phoneElementClassName)) {
                return true;
            }

            if(isBlockedElement(parentElement)) {
                return true;
            }
        }

        return false;
    };

    /**
     * Walk the DOM and apply fn for every node.
     */
    window.walkTheDOM = function (node, fn) {
        if(node) do {
            if(skipNode(node)) {
                continue;
            }

            // in case fn replaces node, skip it
            var returnNode = fn(node);
            if(returnNode != node) {
                node = returnNode;
                continue;
            }

            walkTheDOM(node.firstChild, fn);
        } while((node = node.nextSibling));
    };
})();
