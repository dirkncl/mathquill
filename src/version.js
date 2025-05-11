import pkg from '../package.json' with {type: 'json'};

var VERSION = pkg.version;

export const MQ_VERSION = VERSION;
