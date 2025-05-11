class AssertionError extends Error {
    constructor(opts) {
        if (!opts)
            opts = {};
        super(`${opts.explanation ?? ''} ${opts.message ?? ''}`);
    }
}
const fail = (opts) => {
    throw new AssertionError(opts);
};
export const assert = {
    ok(thing, message) {
        if (thing)
            return;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        fail({ message, explanation: `expected ${thing} to be truthy` });
    },
    equal(thing1, thing2, message) {
        if (thing1 === thing2)
            return;
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        fail({ message, explanation: `expected (${thing1}) to equal (${thing2})` });
    },
    throws(fn, message) {
        try {
            fn();
        }
        catch {
            return;
        }
        fail({ message, explanation: `expected ${fn.toString()} to throw an error` });
    },
    fail(message) {
        fail({ message, explanation: 'generic fail' });
    }
};
