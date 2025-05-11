// Latex Controller Extension
import { Parser } from './parser.util.js';
import { VanillaSymbol, latexMathParser } from '../commands/mathElements.js';
import { RootMathCommand, MathBlock } from '../commands/mathBlock.js';

export const LatexControllerExtension = (Base) => class extends Base {
    exportLatex() {
        return this.root.latex().replace(/(\\[a-z]+) (?![a-z])/gi, '$1');
    }
    writeLatex(latex) {
        const cursor = this.notify('edit').cursor;
        cursor.parent?.writeLatex(cursor, latex);
        return this;
    }
    renderLatexMath(latex) {
        const block = latexMathParser
            .skip(Parser.eof)
            .or(Parser.all.result(false))
            .parse(latex);
        this.root.eachChild('postOrder', 'dispose');
        delete this.root.ends.left;
        delete this.root.ends.right;
        if (block instanceof MathBlock && block.prepareInsertionAt(this.cursor)) {
            block.children().adopt(this.root);
            const html = block.join('html');
            this.root.elements.html(html);
            this.root.domify(this.root.elements.children());
            this.root.finalizeInsert(this.cursor.options, this.cursor);
        }
        else {
            this.root.elements.empty();
        }
        delete this.cursor.selection;
        this.updateMathspeak();
        this.cursor.insAtRightEnd(this.root);
    }
    renderLatexText(latex) {
        this.root.elements
            .children()
            .contents.slice(1)
            .forEach((el) => {
            el.remove();
        });
        this.root.eachChild('postOrder', 'dispose');
        delete this.root.ends.left;
        delete this.root.ends.right;
        delete this.cursor.selection;
        this.cursor.show().insAtRightEnd(this.root);
        // Parser RootMathCommand
        const mathMode = Parser.string('$')
            .then(latexMathParser)
            // because TeX is insane, math mode doesn't necessarily
            // have to end.  So we allow for the case that math mode
            // continues to the end of the stream.
            .skip(Parser.string('$').or(Parser.eof))
            .map((block) => {
            // HACK FIXME: This shouldn't have to have access to cursor
            const rootMathCommand = new RootMathCommand(this.cursor);
            rootMathCommand.createBlocks();
            const rootMathBlock = rootMathCommand.ends.left;
            block.children().adopt(rootMathBlock);
            return rootMathCommand;
        });
        const escapedDollar = Parser.string('\\$').result('$');
        const textChar = escapedDollar.or(Parser.regex(/^[^$]/)).map(VanillaSymbol);
        const latexText = mathMode.or(textChar).many();
        const commands = latexText.skip(Parser.eof).or(Parser.all.result(false)).parse(latex);
        if (commands) {
            for (const command of commands) {
                command.adopt(this.root, this.root.ends.right);
            }
            this.root.elements.lastElement.append(...this.root.domify().contents);
            this.root.finalizeInsert(this.cursor.options, this.cursor);
        }
    }
};
