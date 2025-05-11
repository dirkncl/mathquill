// The publicly exposed MathQuill API.
import { mqBlockId, EMBEDS } from './constants.js';
import { Options } from './options.js';
import { TNode } from './tree/node.js';
import { saneKeyboardEvents } from './services/saneKeyboardEvents.util.js';
import { Controller } from './controller.js';
import { StaticMath, MathField, InnerMathField } from './commands/math.js';
import { TextField } from './commands/text.js';
import { MQ_VERSION } from './version.js';
// These files need to be imported to construct the library of commands.
import './commands/math/commands.js';
import './commands/math/LatexCommandInput.js';
import './commands/math/basicSymbols.js';
import './commands/math/advancedSymbols.js';


const isBrowser = Object.getPrototypeOf(Object.getPrototypeOf(globalThis)) !== Object.prototype;
// globally exported API object
const mathQuill = {
    origMathQuill: isBrowser ? window.MathQuill : undefined,
    VERSION: MQ_VERSION,
    getInterface() {
        // Function that takes an HTML element and, if it's the root HTML element of a
        // static math or math or text field, returns an API object for it (else, undefined).
        //   const mathfield = MQ.MathField(mathFieldSpan);
        //   assert(MQ(mathFieldSpan).id === mathfield.id);
        //   assert(MQ(mathFieldSpan).id === MQ(mathFieldSpan).id);
        const MQ = (el) => {
            if (!(el instanceof HTMLElement))
                return;
            const blockId = el.querySelector('.mq-root-block')?.getAttribute(mqBlockId) ?? false;
            const ctrlr = blockId ? TNode.byId.get(parseInt(blockId))?.controller : undefined;
            return ctrlr?.apiClass;
        };
        MQ.saneKeyboardEvents = saneKeyboardEvents;
        MQ.config = (opts) => {
            Options.config(Options.prototype, opts);
            return MQ;
        };
        MQ.registerEmbed = (name, options) => {
            if (!/^[a-z][a-z0-9]*$/i.test(name)) {
                throw new Error('Embed name must start with letter and be only letters and digits');
            }
            EMBEDS[name] = options;
        };
        // Export the API functions that MathQuill-ify an HTML element into API objects
        // of each class. If the element had already been MathQuill-ified but into a
        // different kind (or it's not an HTML element), return undefined.
        const createEntrypoint = (kind, APIClass) => {
            function mqEntrypoint(el, opts) {
                if (!(el instanceof HTMLElement))
                    return;
                const mq = MQ(el);
                if (!(el instanceof HTMLElement) || mq instanceof APIClass)
                    return mq;
                const ctrlr = new Controller(new APIClass.RootBlock(), el, new Options());
                ctrlr.KIND_OF_MQ = kind;
                return new APIClass(ctrlr).config(opts ?? {}).__mathquillify();
            }
            return mqEntrypoint;
        };
        MQ.StaticMath = createEntrypoint('StaticMath', StaticMath);
        MQ.StaticMath.prototype = StaticMath.prototype;
        MQ.MathField = createEntrypoint('MathField', MathField);
        MQ.MathField.prototype = MathField.prototype;
        MQ.InnerMathField = createEntrypoint('InnerMathField', InnerMathField);
        MQ.InnerMathField.prototype = InnerMathField.prototype;
        MQ.TextField = createEntrypoint('TextField', TextField);
        MQ.TextField.prototype = TextField.prototype;
        return MQ;
    },
    noConflict() {
        if (!isBrowser)
            return mathQuill;
        window.MathQuill = this.origMathQuill;
        return mathQuill;
    }
};
export default mathQuill;
