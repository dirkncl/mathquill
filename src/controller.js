// Controller for a MathQuill instance, on which services are registered.
import { otherDir } from './constants.js';
import { Cursor } from './cursor.js';
import { TNode } from './tree/node.js';
import { Fragment } from './tree/fragment.js';
import { MathCommand, Bracket } from './commands/mathElements.js';
import { HorizontalScroll } from './services/scrollHoriz.js';
import { LatexControllerExtension } from './services/latex.js';
import { MouseEventController } from './services/mouse.js';
import { FocusBlurEvents } from './services/focusBlur.js';
import { ExportText } from './services/exportText.js';
import { TextAreaController } from './services/textarea.js';
import { Aria } from './services/aria.js';

export class ControllerBase {
    id;
    root;
    container;
    options;
    cursor;
    apiClass;
    KIND_OF_MQ = '';
    editable = false;
    blurred;
    textareaSpan;
    textarea;
    mathspeakSpan;
    mathspeakId;
    aria;
    ariaLabel;
    ariaPostLabel;
    _ariaAlertTimeout;
    constructor(root, container, options) {
        this.id = root.id;
        this.root = root;
        this.container = container;
        this.options = options;
        this.cursor = new Cursor(root, options, this);
        this.aria = new Aria(this);
        this.ariaLabel = 'Math Input';
        this.ariaPostLabel = '';
    }
    handle(name, dir) {
        const handlers = this.options.handlers;
        if (handlers?.[name]) {
            if (dir === 'left' || dir === 'right')
                handlers[name](dir, this.apiClass);
            else
                handlers[name](this.apiClass);
        }
    }
    notify(e) {
        if (e === 'move' || e === 'upDown')
            this.cursor.show().clearSelection();
        if (e !== 'upDown')
            this.cursor.upDownCache = {};
        if (e === 'edit')
            this.cursor.show().deleteSelection();
        if (e !== 'select')
            this.cursor.endSelection();
        return this;
    }
    // The textarea mixin overrides this.
    selectionChanged() {
        /* do nothing */
    }
    containerHasFocus() {
        return document.activeElement && this.container.contains(document.activeElement);
    }
    setAriaLabel(ariaLabel) {
        const oldAriaLabel = this.getAriaLabel();
        if (typeof ariaLabel === 'string' && ariaLabel !== '')
            this.ariaLabel = ariaLabel;
        else if (this.editable)
            this.ariaLabel = 'Math Input';
        else
            this.ariaLabel = '';
        // If this field does not have focus, update its computed mathspeak value.  Check for focus because updating the
        // aria-label attribute of a focused element will cause most screen readers to announce the new value.  If the
        // field does have focus at the time, it will be updated once a blur event occurs.
        if (this.ariaLabel !== oldAriaLabel && !this.containerHasFocus())
            this.updateMathspeak();
        return this;
    }
    getAriaLabel() {
        if (this.ariaLabel !== 'Math Input')
            return this.ariaLabel;
        else if (this.editable)
            return 'Math Input';
        else
            return '';
    }
    setAriaPostLabel(ariaPostLabel, timeout) {
        if (typeof ariaPostLabel === 'string' && ariaPostLabel !== '') {
            if (ariaPostLabel !== this.ariaPostLabel && typeof timeout === 'number') {
                if (this._ariaAlertTimeout)
                    clearTimeout(this._ariaAlertTimeout);
                this._ariaAlertTimeout = setTimeout(() => {
                    if (this.containerHasFocus()) {
                        // Voice the new label, but do not update mathspeak content to prevent double-speech.
                        this.aria.alert(this.root.mathspeak().trim() + ' ' + ariaPostLabel.trim());
                    }
                    else {
                        // This mathquill does not have focus, so update its mathspeak.
                        this.updateMathspeak();
                    }
                }, timeout);
            }
            this.ariaPostLabel = ariaPostLabel;
        }
        else {
            if (this._ariaAlertTimeout)
                clearTimeout(this._ariaAlertTimeout);
            this.ariaPostLabel = '';
        }
        return this;
    }
    getAriaPostLabel() {
        return this.ariaPostLabel || '';
    }
    exportMathSpeak() {
        return this.root.mathspeak();
    }
    updateMathspeak(_emptyContent = false) {
        // This is defined here so that it can be called above without jumping through a lot of hoops to pacify
        // typescript.  The method defined in services/textarea.ts will override this, and it is what will actually be
        // called above.
    }
}
export class Controller extends ExportText(TextAreaController(LatexControllerExtension(FocusBlurEvents(MouseEventController(HorizontalScroll(ControllerBase)))))) {
    constructor(root, container, options) {
        super(root, container, options);
        root.controller = this;
    }
    escapeDir(dir, _key, e) {
        if (dir !== 'left' && dir !== 'right')
            throw new Error('a direction was not passed');
        const cursor = this.cursor;
        // only prevent default of Tab if not in the root editable
        if (cursor.parent !== this.root)
            e.preventDefault();
        // want to be a noop if in the root editable (in fact, Tab has an unrelated
        // default browser action if so)
        if (cursor.parent === this.root)
            return;
        cursor.parent?.moveOutOf(dir, cursor);
        this.aria.alert();
        return this.notify('move');
    }
    moveDir(dir) {
        if (dir !== 'left' && dir !== 'right')
            throw new Error('a direction was not passed');
        const cursor = this.cursor, updown = cursor.options.leftRightIntoCmdGoes;
        if (cursor.selection) {
            const end = cursor.selection.ends[dir];
            if (end)
                cursor.insDirOf(dir, end);
        }
        else if (cursor[dir])
            cursor[dir].moveTowards(dir, cursor, updown);
        else
            cursor.parent?.moveOutOf(dir, cursor, updown);
        return this.notify('move');
    }
    moveLeft() {
        return this.moveDir('left');
    }
    moveRight() {
        return this.moveDir('right');
    }
    // moveUp and moveDown have almost identical algorithms:
    // - first check left and right, if so insAtLeft/RightEnd of them
    // - else check the parent's 'upOutOf'/'downOutOf' property:
    //   + if it's a function, call it with the cursor as the sole argument and
    //     use the return value as if it were the value of the property
    //   + if it's a TNode, jump up or down into it:
    //     - if there is a cached Point in the block, insert there
    //     - else, seekHoriz within the block to the current x-coordinate (to be
    //       as close to directly above/below the current position as possible)
    //   + unless it's exactly `true`, stop bubbling
    moveUpDown(dir) {
        const cursor = this.notify('upDown').cursor;
        const dirInto = `${dir}Into`, dirOutOf = `${dir}OutOf`;
        if (cursor.right?.[dirInto])
            cursor.insAtLeftEnd(cursor.right[dirInto]);
        else if (cursor.left?.[dirInto])
            cursor.insAtRightEnd(cursor.left[dirInto]);
        else {
            cursor.parent?.bubble((ancestor) => {
                if (ancestor[dirOutOf]) {
                    if (typeof ancestor[dirOutOf] === 'function')
                        ancestor[dirOutOf](cursor);
                    if (ancestor[dirOutOf] instanceof TNode)
                        cursor.jumpUpDown(ancestor, ancestor[dirOutOf]);
                    if (ancestor[dirOutOf] !== true)
                        return false;
                }
                return true;
            });
        }
        return this;
    }
    moveUp() {
        return this.moveUpDown('up');
    }
    moveDown() {
        return this.moveUpDown('down');
    }
    deleteDir(dir) {
        if (dir !== 'left' && dir !== 'right')
            throw new Error('a direction was not passed');
        const cursor = this.cursor;
        // FIXME: This should be done in the methods of the objects that need this.
        if (cursor[dir]) {
            if (cursor[dir] instanceof Bracket) {
                if (cursor[dir].parent) {
                    this.aria.queue(cursor[dir].parent
                        .chToCmd(cursor[dir].sides[otherDir(dir)].ch, cursor.options)
                        .mathspeak({ createdLeftOf: cursor }));
                }
                // Speak the current element if it has no blocks, but don't for text block commands as the
                // deleteTowards method in the TextCommand class is responsible for speaking the new character under the
                // cursor.
            }
            else if (cursor[dir] instanceof MathCommand &&
                !cursor[dir].blocks.length &&
                cursor[dir].parent?.ctrlSeq !== '\\text') {
                this.aria.queue(cursor[dir]);
            }
        }
        else if (cursor.parent?.parent && cursor.parent.parent instanceof TNode) {
            if (cursor.parent.parent instanceof Bracket) {
                if (cursor.parent.parent.parent) {
                    this.aria.queue(cursor.parent.parent.parent
                        .chToCmd(cursor.parent.parent.sides[dir].ch, cursor.options)
                        .mathspeak({ createdLeftOf: cursor }));
                }
            }
            else if (cursor.parent.parent instanceof MathCommand &&
                cursor.parent.parent.blocks.length &&
                cursor.parent.parent.mathspeakTemplate.length) {
                if (cursor.parent.parent.upInto && cursor.parent.parent.downInto) {
                    // likely a fraction, and we just backspaced over the slash
                    this.aria.queue(cursor.parent.parent.mathspeakTemplate[1]);
                }
                else {
                    this.aria.queue(dir === 'left'
                        ? cursor.parent.parent.mathspeakTemplate[0]
                        : (cursor.parent.parent.mathspeakTemplate.at(-1) ?? ''));
                }
            }
            else {
                this.aria.queue(cursor.parent.parent);
            }
        }
        const hadSelection = cursor.selection;
        this.notify('edit'); // Shows the cursor and deletes a selection if present.
        if (!hadSelection) {
            if (cursor[dir])
                cursor[dir].deleteTowards(dir, cursor);
            else
                cursor.parent?.deleteOutOf(dir, cursor);
        }
        // Call the contactWeld for a SupSub so that it can deal with having its base deleted.
        cursor.right?.postOrder('contactWeld', cursor);
        cursor.left?.siblingDeleted?.(cursor.options, 'right');
        cursor.right?.siblingDeleted?.(cursor.options, 'left');
        cursor.parent?.bubble('reflow');
        return this;
    }
    ctrlDeleteDir(dir) {
        if (dir !== 'left' && dir !== 'right')
            throw new Error('a direction was not passed');
        const cursor = this.cursor;
        if (!cursor[dir] || cursor.selection)
            return this.deleteDir(dir);
        this.notify('edit');
        let fragmentRemoved;
        if (dir === 'left')
            fragmentRemoved = new Fragment(cursor.parent?.ends.left, cursor.left).remove();
        else
            fragmentRemoved = new Fragment(cursor.right, cursor.parent?.ends.right).remove();
        cursor.controller.aria.queue(fragmentRemoved);
        if (cursor.parent)
            cursor.insAtDirEnd(dir, cursor.parent);
        // Call the contactWeld for a SupSub so that it can deal with having its base deleted.
        cursor.right?.postOrder('contactWeld', cursor);
        cursor.left?.siblingDeleted?.(cursor.options, 'right');
        cursor.right?.siblingDeleted?.(cursor.options, 'left');
        cursor.parent?.bubble('reflow');
        return this;
    }
    backspace() {
        return this.deleteDir('left');
    }
    deleteForward() {
        return this.deleteDir('right');
    }
    incrementalSelectionOpen = false;
    // startIncrementalSelection, selectDirIncremental, and finishIncrementalSelection should only be called by
    // withIncrementalSelection because they must be called in sequence.
    // Start a selection.
    startIncrementalSelection() {
        if (this.incrementalSelectionOpen)
            throw new Error('multiple selections cannot be simultaneously open');
        this.incrementalSelectionOpen = true;
        this.notify('select');
        if (!this.cursor.anticursor)
            this.cursor.startSelection();
    }
    // Update the selection model stored in the cursor without modifying the selection DOM.
    selectDirIncremental(dir) {
        if (!this.incrementalSelectionOpen)
            throw new Error('a selection is not open');
        if (dir !== 'left' && dir !== 'right')
            throw new Error('a direction was not passed');
        const cursor = this.cursor, seln = cursor.selection;
        const node = cursor[dir];
        if (node) {
            // if node we're selecting towards is inside selection (hence retracting)
            // and is on the *far side* of the selection (hence is only node selected)
            // and the anticursor is *inside* that node, not just on the other side
            if (seln && seln.ends[dir] === node && cursor.anticursor?.[otherDir(dir)] !== node) {
                node.unselectInto(dir, cursor);
            }
            else
                node.selectTowards(dir, cursor);
        }
        else
            cursor.parent?.selectOutOf(dir, cursor);
    }
    // Update selection DOM to match cursor model.
    finishIncrementalSelection() {
        if (!this.incrementalSelectionOpen)
            throw new Error('a selection is not open');
        this.cursor.clearSelection();
        if (!this.cursor.select())
            this.cursor.show();
        if (this.cursor.selection) {
            // Clear first.  A selection can fire several times, and if not cleared it would result in repeated speech.
            this.aria.clear().queue(this.cursor.selection.join('mathspeak', ' ').trim() + ' selected');
        }
        this.incrementalSelectionOpen = false;
    }
    // Used to build a selection incrementally in a loop. Calls the passed callback with a selectDir function that may
    // be called many times, and defers updating the view until the incremental selection is complete.
    //
    // Wraps up calling
    //
    //     this.startIncrementalSelection()
    //     this.selectDirIncremental(dir) // possibly many times
    //     this.finishIncrementalSelection()
    //
    // with extra error handling and invariant enforcement.
    withIncrementalSelection(cb) {
        try {
            this.startIncrementalSelection();
            try {
                cb((dir) => {
                    this.selectDirIncremental(dir);
                });
            }
            finally {
                // Since a selection has been started, attempt to finish it even if the callback throws an error.
                this.finishIncrementalSelection();
            }
        }
        finally {
            // Mark the selection as closed even if finishIncrementalSelection throws an error. Makes a possible error
            // in finishIncrementalSelection more recoverable.
            this.incrementalSelectionOpen = false;
        }
    }
    selectDir(dir) {
        this.withIncrementalSelection((selectDir) => {
            selectDir(dir);
        });
    }
    selectLeft() {
        this.selectDir('left');
    }
    selectRight() {
        this.selectDir('right');
    }
    selectAll() {
        this.notify('move').cursor.insAtRightEnd(this.root);
        while (this.cursor.left)
            this.selectLeft();
        this.withIncrementalSelection((selectDir) => {
            while (this.cursor.left)
                selectDir('left');
        });
    }
    selectToBlockEndInDir(dir) {
        this.withIncrementalSelection((selectDir) => {
            while (this.cursor[dir])
                selectDir(dir);
        });
    }
    selectToRootEndInDir(dir) {
        const cursor = this.cursor;
        this.withIncrementalSelection((selectDir) => {
            while (cursor[dir] || cursor.parent !== this.root) {
                selectDir(dir);
            }
        });
    }
}
