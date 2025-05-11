// Selection "singleton" class
// Sort of a singleton, since there should only be one per editable math textbox, but any one HTML document can contain
// many such textboxes, so any one JS environment could actually contain many instances.
import { VNode } from './tree/vNode.js';
import { Fragment } from './tree/fragment.js';

export class Selection extends Fragment {
    constructor(withDir, oppDir, dir = 'left') {
        super(withDir, oppDir, dir);
        const wrapper = document.createElement('span');
        wrapper.classList.add('mq-selection');
        this.elements.first.before(wrapper);
        wrapper.append(...this.elements.contents);
        this.elements = new VNode(wrapper);
    }
    adopt(parent, leftward, rightward) {
        const children = this.elements.children();
        this.elements.first.replaceWith(...children.contents);
        this.elements = children;
        return super.adopt(parent, leftward, rightward);
    }
    clear() {
        this.elements.first.replaceWith(...this.elements.first.childNodes);
        return this;
    }
    join(methodName, separator = '') {
        return this.fold('', (fold, child) => fold + separator + child[methodName]());
    }
}
