// The block for abstract classes of text blocks
import { RootMathBlock, RootMathCommand } from './mathBlock.js';
import { VanillaSymbol } from './mathElements.js';

export class RootTextBlock extends RootMathBlock {
    keystroke(key, e, ctrlr) {
        if (key === 'Spacebar' || key === 'Shift-Spacebar')
            return;
        super.keystroke(key, e, ctrlr);
        return;
    }
    write(cursor, ch) {
        cursor.show().deleteSelection();
        if (ch === '$')
            new RootMathCommand(cursor).createLeftOf(cursor);
        else {
            new VanillaSymbol(ch, ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : undefined).createLeftOf(cursor);
        }
    }
}
