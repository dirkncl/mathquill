import { otherDir } from './constants.js';

export const RootBlockMixin = (_) => {
    _.moveOutOf = (dir) => _.controller?.handle('moveOutOf', dir);
    _.deleteOutOf = (dir) => _.controller?.handle('deleteOutOf', dir);
    _.selectOutOf = (dir) => _.controller?.handle('selectOutOf', dir);
    _.upOutOf = () => _.controller?.handle('upOutOf');
    _.downOutOf = () => _.controller?.handle('downOutOf');
    _.reflow = () => _.controller?.handle('edit');
};
// Editability methods called by the cursor for editing, cursor movements, and selection of the MathQuill tree.
// These all take in a direction and the cursor.
// The MathCommand and TextBlock classes use this mixin.
export const deleteSelectTowardsMixin = (Base) => class extends Base {
    moveTowards(dir, cursor, updown) {
        const nodeAtEnd = (updown && this[`${updown}Into`]) || this.ends[otherDir(dir)];
        if (nodeAtEnd)
            cursor.insAtDirEnd(otherDir(dir), nodeAtEnd);
        if (cursor.parent)
            cursor.controller.aria.queueDirEndOf(otherDir(dir)).queue(cursor.parent, true);
    }
    deleteTowards(dir, cursor) {
        if (this.isEmpty())
            cursor[dir] = this.remove()[dir];
        else
            this.moveTowards(dir, cursor);
    }
    selectTowards(dir, cursor) {
        cursor[otherDir(dir)] = this;
        cursor[dir] = this[dir];
    }
};
export const DelimsMixin = (Base) => class extends Base {
    delims;
    content;
    addToElements(el) {
        super.addToElements(el);
        const children = this.elements.children();
        this.delims = [children.firstElement, children.lastElement];
        this.content = children.contents[1];
    }
};
