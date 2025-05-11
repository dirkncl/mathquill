// Point base class of edit tree-related objects
export class Point {
    parent;
    left;
    right;
    ancestors;
    constructor(parent, leftward, rightward) {
        this.parent = parent;
        this.left = leftward;
        this.right = rightward;
    }
    static copy(pt) {
        return new Point(pt.parent, pt.left, pt.right);
    }
}
