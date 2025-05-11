// Extension to the Controller that allows exporting of math in a human-readable text format.
export const ExportText = (Base) => class extends Base {
    exportText() {
        return this.root.foldChildren('', (text, child) => text + child.text());
    }
};
