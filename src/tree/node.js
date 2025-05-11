// TNode base class of edit tree-related objects
import { iterator, mqCmdId, mqBlockId } from '../constants.js';
import { Selection } from '../selection.js';
import { VNode } from './vNode.js';
import { Fragment } from './fragment.js';

const prayOverridden = (name) => {
    throw new Error(`"${name}" should be overridden or never called on this node`);
};
// MathQuill virtual-DOM tree-node abstract base class
// Only doing tree node manipulation via these adopt/disown methods guarantees well-formedness of the tree.
export class TNode {
    static id = 0;
    static byId = new Map();
    static uniqueNodeId = () => ++TNode.id;
    elements = new VNode();
    id;
    parent;
    ends = {};
    left;
    right;
    controller;
    ctrlSeq = '';
    siblingDeleted;
    siblingCreated;
    sub;
    sup;
    isSymbol;
    isSupSubLeft;
    ariaLabel;
    mathspeakName;
    mathspeakTemplate;
    upInto;
    downInto;
    upOutOf;
    downOutOf;
    bubble = iterator((yield_) => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        for (let ancestor = this; ancestor; ancestor = ancestor.parent) {
            if (yield_(ancestor) === false)
                break;
        }
        return this;
    });
    postOrder = iterator((yield_) => {
        (function recurse(descendant) {
            descendant.eachChild(recurse);
            yield_(descendant);
            return true;
        })(this);
        return this;
    });
    constructor() {
        this.id = TNode.uniqueNodeId();
        TNode.byId.set(this.id, this);
    }
    dispose() {
        TNode.byId.delete(this.id);
    }
    toString() {
        return `{{ MathQuill TNode #${this.id.toString()} }}`;
    }
    addToElements(el) {
        this.elements.add(el);
    }
    domify(vNode) {
        // Convert html string to DOM contents and add elements to all corresponding TNodes.
        const localVNode = vNode instanceof VNode ? vNode : new VNode(this.html());
        const addToElements = (el) => {
            if (el instanceof HTMLElement) {
                const cmdId = parseInt(el.getAttribute(mqCmdId) ?? '0');
                const blockId = parseInt(el.getAttribute(mqBlockId) ?? '0');
                if (cmdId)
                    TNode.byId.get(cmdId)?.addToElements(el);
                if (blockId)
                    TNode.byId.get(blockId)?.addToElements(el);
            }
            for (let child = el.firstChild; child; child = child.nextSibling) {
                addToElements(child);
            }
        };
        localVNode.contents.forEach((element) => {
            addToElements(element);
        });
        return localVNode;
    }
    createDir(dir, cursor) {
        if (dir !== 'left' && dir !== 'right')
            throw new Error('a direction was not passed');
        this.domify();
        this.elements.insDirOf(dir, cursor.element);
        if (cursor.parent)
            cursor[dir] = this.adopt(cursor.parent, cursor.left, cursor.right);
        return this;
    }
    createLeftOf(el) {
        this.createDir('left', el);
    }
    selectChildren(leftEnd, rightEnd) {
        return new Selection(leftEnd, rightEnd);
    }
    isEmpty() {
        return !this.ends.left && !this.ends.right;
    }
    isStyleBlock() {
        return false;
    }
    children() {
        return new Fragment(this.ends.left, this.ends.right);
    }
    eachChild(method, order) {
        const children = this.children();
        children.each(method, order);
        return this;
    }
    foldChildren(fold, fn) {
        return this.children().fold(fold, fn);
    }
    withDirAdopt(dir, parent, withDir, oppDir) {
        new Fragment(this, this).withDirAdopt(dir, parent, withDir, oppDir);
        return this;
    }
    adopt(parent, leftward, rightward) {
        new Fragment(this, this).adopt(parent, leftward, rightward);
        return this;
    }
    disown() {
        new Fragment(this, this).disown();
        return this;
    }
    remove() {
        this.elements.remove();
        this.postOrder('dispose');
        return this.disown();
    }
    // Methods that deal with the browser DOM events from interaction with the typist.
    keystroke(key, e, ctrlr) {
        const cursor = ctrlr.cursor;
        switch (key) {
            case 'Ctrl-Shift-Backspace':
            case 'Ctrl-Backspace':
                ctrlr.ctrlDeleteDir('left');
                break;
            case 'Shift-Backspace':
            case 'Backspace':
                ctrlr.backspace();
                break;
            // Esc -> go one block right if it exists, else escape right.
            case 'Escape':
                ctrlr.escapeDir('right', key, e);
                return;
            // Shift-Escape -> go one block left if it exists, else escape left.
            case 'Shift-Escape':
                ctrlr.escapeDir('left', key, e);
                return;
            // End -> move to the end of the current block.
            case 'End':
                if (cursor.parent) {
                    ctrlr.notify('move').cursor.insAtRightEnd(cursor.parent);
                    ctrlr.aria.queue('end of').queue(cursor.parent, true);
                }
                break;
            // Ctrl-End -> move all the way to the end of the root block.
            case 'Ctrl-End':
                ctrlr.notify('move').cursor.insAtRightEnd(ctrlr.root);
                ctrlr.aria.queue('end of').queue(ctrlr.ariaLabel).queue(ctrlr.root).queue(ctrlr.ariaPostLabel);
                break;
            // Shift-End -> select to the end of the current block.
            case 'Shift-End':
                ctrlr.selectToBlockEndInDir('right');
                break;
            // Ctrl-Shift-End -> select to the end of the root block.
            case 'Ctrl-Shift-End':
                ctrlr.selectToRootEndInDir('right');
                break;
            // Home -> move to the start of the root block or the current block.
            case 'Home':
                if (cursor.parent) {
                    ctrlr.notify('move').cursor.insAtLeftEnd(cursor.parent);
                    ctrlr.aria.queue('beginning of').queue(cursor.parent, true);
                }
                break;
            // Ctrl-Home -> move to the start of the current block.
            case 'Ctrl-Home':
                ctrlr.notify('move').cursor.insAtLeftEnd(ctrlr.root);
                ctrlr.aria.queue('beginning of').queue(ctrlr.ariaLabel).queue(ctrlr.root).queue(ctrlr.ariaPostLabel);
                break;
            // Shift-Home -> select to the start of the current block.
            case 'Shift-Home':
                ctrlr.selectToBlockEndInDir('left');
                break;
            // Ctrl-Shift-Home -> move to the start of the root block.
            case 'Ctrl-Shift-Home':
                ctrlr.selectToRootEndInDir('left');
                break;
            case 'Left':
                ctrlr.moveLeft();
                break;
            case 'Shift-Left':
                ctrlr.selectLeft();
                break;
            case 'Ctrl-Left':
                break;
            case 'Right':
                ctrlr.moveRight();
                break;
            case 'Shift-Right':
                ctrlr.selectRight();
                break;
            case 'Ctrl-Right':
                break;
            case 'Up':
                ctrlr.moveUp();
                break;
            case 'Down':
                ctrlr.moveDown();
                break;
            case 'Shift-Up':
                ctrlr.withIncrementalSelection((selectDir) => {
                    if (cursor.left) {
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        while (cursor.left)
                            selectDir('left');
                    }
                    else {
                        selectDir('left');
                    }
                });
                break;
            case 'Shift-Down':
                ctrlr.withIncrementalSelection((selectDir) => {
                    if (cursor.right) {
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                        while (cursor.right)
                            selectDir('right');
                    }
                    else {
                        selectDir('right');
                    }
                });
                break;
            case 'Ctrl-Up':
            case 'Ctrl-Down':
                break;
            case 'Ctrl-Shift-Delete':
            case 'Ctrl-Delete':
                ctrlr.ctrlDeleteDir('right');
                break;
            case 'Shift-Delete':
            case 'Delete':
                ctrlr.deleteForward();
                break;
            case 'Meta-A':
            case 'Ctrl-A':
                ctrlr.selectAll();
                break;
            // The remaining key strokes are only of benefit to screen reader users.
            // speak parent block that has focus
            case 'Ctrl-Alt-Up':
                if (cursor.parent?.parent && cursor.parent.parent instanceof TNode)
                    ctrlr.aria.queue(cursor.parent.parent);
                else
                    ctrlr.aria.queue('nothing above');
                break;
            // speak current block that has focus
            case 'Ctrl-Alt-Down':
                if (cursor.parent && cursor.parent instanceof TNode)
                    ctrlr.aria.queue(cursor.parent);
                else
                    ctrlr.aria.queue('block is empty');
                break;
            // speak left-adjacent block
            case 'Ctrl-Alt-Left':
                if (cursor.parent?.parent?.ends.left)
                    ctrlr.aria.queue(cursor.parent.parent.ends.left);
                else
                    ctrlr.aria.queue('nothing to the left');
                break;
            // speak right-adjacent block
            case 'Ctrl-Alt-Right':
                if (cursor.parent?.parent?.ends.right)
                    ctrlr.aria.queue(cursor.parent.parent.ends.right);
                else
                    ctrlr.aria.queue('nothing to the right');
                break;
            // speak selection
            case 'Ctrl-Alt-Shift-Down':
                if (cursor.selection)
                    ctrlr.aria.queue(cursor.selection.join('mathspeak', ' ').trim() + ' selected');
                else
                    ctrlr.aria.queue('nothing selected');
                break;
            // speak ARIA post label (evaluation or error)
            case 'Ctrl-Alt-=':
            case 'Ctrl-Alt-Shift-Right':
                if (ctrlr.ariaPostLabel.length)
                    ctrlr.aria.queue(ctrlr.ariaPostLabel);
                else
                    ctrlr.aria.queue('no answer');
                break;
            default:
                return;
        }
        ctrlr.aria.alert();
        e.preventDefault();
        ctrlr.scrollHoriz();
    }
    html() {
        return '';
    }
    text() {
        return '';
    }
    latex() {
        return '';
    }
    focus() {
        /* do nothing */
    }
    blur(_cursor) {
        /* do nothing */
    }
    seek(_left, _cursor) {
        /* do nothing */
    }
    writeLatex(_cursor, _latex) {
        /* do nothing */
    }
    finalizeInsert(_options, _cursor) {
        /* do nothing */
    }
    write(_cursor, _ch) {
        /* do nothing */
    }
    replaces(_fragment) {
        /* do nothing */
    }
    setOptions(_options) {
        return this;
    }
    chToCmd(_ch, _options) {
        return this;
    }
    mathspeak(_options) {
        return '';
    }
    getController() {
        // Navigate up the tree to find the controller.
        return (function getCursor(node) {
            if (node.controller)
                return node.controller;
            if (node.parent)
                return getCursor(node.parent);
        })(this);
    }
    // called by Controller::escapeDir, moveDir
    moveOutOf(_dir, _cursor, _updown) {
        prayOverridden('moveOutOf');
    }
    // called by Controller::moveDir
    moveTowards(_dir, _cursor, _updown) {
        prayOverridden('moveTowards');
    }
    // called by Controller::deleteDir
    deleteOutOf(_dir, _cursor) {
        prayOverridden('deleteOutOf');
    }
    // called by Controller::deleteDir
    deleteTowards(_dir, _cursor) {
        prayOverridden('deleteTowards');
    }
    // called by Controller::selectDir
    unselectInto(_dir, _cursor) {
        prayOverridden('unselectInto');
    }
    // called by Controller::selectDir
    selectOutOf(_dir, _cursor) {
        prayOverridden('selectOutOf');
    }
    // called by Controller::selectDir
    selectTowards(_dir, _cursor) {
        prayOverridden('selectTowards');
    }
}
