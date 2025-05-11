// Abstract classes of text blocks
import { EditableField } from '../abstractFields.js';
import { RootTextBlock } from './textBlock.js';

export class TextField extends EditableField {
    static RootBlock = RootTextBlock;
    __mathquillify() {
        return super.__mathquillify('mq-editable-field', 'mq-text-mode');
    }
    latex(latex) {
        if (typeof latex !== 'undefined') {
            var insideDollar = getStringInDollarSigns(latex)
            //latex = latex.split('$')[0] + '$'+ latex.replace(/\$([^$]+)\$/g, '$1')
            //latex = latex.split('$')[0] + '$'+ insideDollar
            //latex = latex.split('$')[0] + '$'+ (/\$([^$]+)\$/g).exec(latex)[1]
            //latex = latex.replace(/\$([^$]+)\$/g, '$1')
            //console.log(hasRegexInDollar(latex, /[a-z]+/))
            //latex = latex.replace(/\$([^$]+)\$/g, function (m, g) {
            //  return '$' + g             
            //})
              //if(hasRegexInDollar(latex, /[a-z]+/)) {
              //  console.log(latex)
              //}else {console.log(latex)}  
              latex = latex.replace(/\$([^$]+)\$/g, function (m, g) {
                return '$' + g             
              })
            
            
            this.__controller.renderLatexText(latex);
            if (this.__controller.blurred) {
              this.__controller.cursor.hide().parent?.blur();
            }
            return this;
        }
        return this.__controller.exportLatex();
    }
}
function hasRegexInDollar(str, regex) {
  const dollarRegex = /\$([^$]+)\$/gm;
  let match;

  while ((match = dollarRegex.exec(str)) !== null) {
    if (regex.test(match[1])) {
      return true;
    }
  }
  return false;
}

function getStringInDollarSigns(text) {
  const regex = /\$([^$]+)\$/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}