import "./styles.css";

function $create(elName) {
  return document.createElement(elName);
}
function $setAttr(el, key, value) {
  return el.setAttribute(key, value);
}

let debug = false;
const Logger = {
  prefixString() {
    return `</> quill-html-edit-button: `;
  },
  get log() {
    if (!debug) {
      return (...any) => {};
    }
    const boundLogFn = console.log.bind(console, this.prefixString());
    return boundLogFn;
  }
};

class htmlEditButton {
  constructor(quill, options) {
    debug = options && options.debug;
    Logger.log("logging enabled");
    // Add button to all quill toolbar instances
    const toolbarModule = quill.getModule("toolbar");
    if (!toolbarModule) {
      throw new Error(
        'quill.htmlEditButton requires the "toolbar" module to be included too'
      );
    }
    this.registerDivModule();
    let toolbarEl = toolbarModule.container;
    const buttonContainer = $create("span");
    $setAttr(buttonContainer, "class", "ql-formats");
    const button = $create("button");
    button.innerHTML = options.buttonHTML || "&lt;&gt;";
    button.title = options.buttonTitle || "Show HTML source";
    button.onclick = function(e) {
      e.preventDefault();
      launchPopupEditor(quill, options);
    };
    buttonContainer.appendChild(button);
    toolbarEl.appendChild(buttonContainer);
  }

  registerDivModule() {
    // To allow divs to be inserted into html editor
    // obtained from issue: https://github.com/quilljs/quill/issues/2040
    var Block = Quill.import("blots/block");
    class Div extends Block {}
    Div.tagName = "div";
    Div.blotName = "div";
    Div.allowedChildren = Block.allowedChildren;
    Div.allowedChildren.push(Block);
    Quill.register(Div);
  }
}

function launchPopupEditor(quill, options) {
  const qleditor = quill.container.querySelector(".ql-editor");
  const htmlFromEditor = qleditor.innerHTML;
  const popupContainer = $create("div");
  const overlayContainer = $create("div");
  const msg = options.msg || 'Edit HTML here, when you click "Update" the editor\'s contents will be replaced';
  const cancelText = options.cancelText || "Cancel";
  const okText = options.okText || "Update";

  $setAttr(overlayContainer, "class", "ql-html-overlayContainer");
  $setAttr(popupContainer, "class", "ql-html-popupContainer");
  const popupTitle = $create("i");
  $setAttr(popupTitle, "class", "ql-html-popupTitle");
  popupTitle.innerText = msg;
  const textContainer = $create("div");
  textContainer.appendChild(popupTitle);
  $setAttr(textContainer, "class", "ql-html-textContainer");
  const codeBlock = $create("pre");
  $setAttr(codeBlock, "data-language", "xml");
  codeBlock.innerText = formatHTML(htmlFromEditor);
  const htmlEditor = $create("div");
  $setAttr(htmlEditor, "class", "ql-html-textArea");
  const buttonCancel = $create("button");
  buttonCancel.innerHTML = cancelText;
  $setAttr(buttonCancel, "class", "ql-html-buttonCancel");
  const buttonOk = $create("button");
  buttonOk.innerHTML = okText;
  $setAttr(buttonOk, "class", "ql-html-buttonOk");
  const buttonGroup = $create("div");
  $setAttr(buttonGroup, "class", "ql-html-buttonGroup");

  buttonGroup.appendChild(buttonCancel);
  buttonGroup.appendChild(buttonOk);
  htmlEditor.appendChild(codeBlock);
  textContainer.appendChild(htmlEditor);
  textContainer.appendChild(buttonGroup);
  popupContainer.appendChild(textContainer);
  overlayContainer.appendChild(popupContainer);
  // document.body.appendChild(overlayContainer);
  
  overlayContainer.style.width = quill.getModule('toolbar').container.offsetWidth + 'px';
  htmlEditor.style.height = qleditor.offsetHeight + 'px';
  
  quill.container.appendChild(overlayContainer);
  
  quill.getModule('toolbar').container.style.display='none';
  qleditor.style.display='none';
  
  
  var editor = new Quill(htmlEditor, {
    modules: { syntax: options.syntax },
  });

  buttonCancel.onclick = function() {
    // document.body.removeChild(overlayContainer);
    quill.container.removeChild(overlayContainer);
  
    quill.getModule('toolbar').container.style.display='';
    qleditor.style.display='';
  };
  // overlayContainer.onclick = buttonCancel.onclick;
  
  popupContainer.onclick = function(e) {
     // e.preventDefault();
     // e.stopPropagation();
  };
  buttonOk.onclick = function() {
    const output = editor.container.querySelector(".ql-editor").innerText;
    const noNewlines = output
    .replace(/\s+/g, " ") // convert multiple spaces to a single space. This is how HTML treats them
    .replace(/(<[^\/<>]+>)\s+/g, "$1") // remove spaces after the start of a new tag
    .replace(/<\/(p|ol|ul)>\s/g, "</$1>") // remove spaces after the end of lists and paragraphs, they tend to break quill
    .replace(/\s<(p|ol|ul)>/g, "<$1>") // remove spaces before the start of lists and paragraphs, they tend to break quill
    .replace(/<\/li>\s<li>/g, "</li><li>") // remove spaces between list items, they tend to break quill
    .replace(/\s<\//g, "</") // remove spaces before the end of tags
    .replace(/(<[^\/<>]+>)\s(<[^\/<>]+>)/g, "$1$2") // remove space between multiple starting tags
    .trim();
    qleditor.innerHTML = noNewlines;
    // document.body.removeChild(overlayContainer);
    quill.container.removeChild(overlayContainer);
    quill.getModule('toolbar').container.style.display='';
    qleditor.style.display='';
  };
}

// Adapted FROM jsfiddle here: https://jsfiddle.net/buksy/rxucg1gd/
function formatHTML(code) {
  "use strict";
  let stripWhiteSpaces = true;
  let stripEmptyLines = true;
  const whitespace = " ".repeat(2); // Default indenting 4 whitespaces
  let currentIndent = 0;
  const newlineChar = "\n";
  let prevChar = null;
  let char = null;
  let nextChar = null;

  let result = "";
  for (let pos = 0; pos <= code.length; pos++) {
    prevChar = char;
    char = code.substr(pos, 1);
    nextChar = code.substr(pos + 1, 1);

    const isBrTag = code.substr(pos, 4) === "<br>";
    const isOpeningTag = char === "<" && nextChar !== "/" && !isBrTag;
    const isClosingTag = char === "<" && nextChar === "/" && !isBrTag;
    const isTagEnd = prevChar === ">" && char !== "<" && currentIndent > 0;
    const isTagNext = !isBrTag && !isOpeningTag && !isClosingTag && isTagEnd && code.substr(pos, code.substr(pos).indexOf("<")).trim() === "";
    if (isBrTag) {
      // If opening tag, add newline character and indention
      result += newlineChar;
      currentIndent--;
      pos += 4;
    }
    if (isOpeningTag) {
      // If opening tag, add newline character and indention
      result += newlineChar + whitespace.repeat(currentIndent);
      currentIndent++;
    }
    // if Closing tag, add newline and indention
    else if (isClosingTag) {
      // If there're more closing tags than opening
      if (--currentIndent < 0) currentIndent = 0;
      result += newlineChar + whitespace.repeat(currentIndent);
    }
    // remove multiple whitespaces
    else if (stripWhiteSpaces === true && char === " " && nextChar === " ")
      char = "";
    // remove empty lines
    else if (stripEmptyLines === true && char === newlineChar) {
      //debugger;
      if (code.substr(pos, code.substr(pos).indexOf("<")).trim() === "")
        char = "";
    }
    if(isTagEnd && !isTagNext) {
      result += newlineChar + whitespace.repeat(currentIndent);
    }

    result += char;
  }
  Logger.log("formatHTML", {
    before: code,
    after: result
  });
  return result;
}

window.htmlEditButton = htmlEditButton;
export default htmlEditButton;
export { htmlEditButton };
