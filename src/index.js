import MathQuill from './publicapi.js';

import { MQ_VERSION } from './version.js';

import display_css from './css/display.css' with {type:'css'};
import font_css from './css/font.css' with {type:'css'};
import editable_css from './css/editable.css' with {type:'css'};
import math_css from './css/math.css' with {type:'css'};
import selections_css from './css/selections.css' with {type:'css'};
import textarea_css from './css/textarea.css' with {type:'css'};
import matrixed_css from './css/matrixed.css' with {type:'css'};

globalThis.document.adoptedStyleSheets.push(display_css, font_css, editable_css, math_css, selections_css, textarea_css, matrixed_css);


MathQuill.VERSION = MQ_VERSION;

export { MathQuill }

export default MathQuill

globalThis.MathQuill = MathQuill;