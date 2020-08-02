const css = require("css");
const layout = require("./layout.js");

// 词法分析 tokenization 语法分析
let currentToken = null; // tag 是当做一个 token 处理的，不论其有多复杂
let currentAttribute = null;
let currentTextNode = null;

let stack = [{ type: "document", children: [] }]; // 栈中放一个根节点。当 HTML 配对良好，栈为空。有一个初始根节点，以便把树拿出来

let rules = []; // 暂存 CSS 规则

function addCSSRules(text) {
  const ast = css.parse(text);
  // console.log(JSON.stringify(ast, null, 4));
  rules.push(...ast.stylesheet.rules);
}

// 假设 selector 都是简单选择器
// 简单选择器：.class选择器  #id选择器  tagname选择器
// 忽略这种连起来写的复合选择器（对一个元素进行判断，互相之间是&&的关系。例如找一个class是a，id是a的div） div.a#a (tagname选择器在前) 同时假设 class 不会写多个
// 要支持这种复合选择器，用正则拆分一下，补充进去就可以
function match(element, selector) {
  // console.log("😊", element, selector)
  // 用 attributes 判断当前节点是否是文本节点。如果是，不用匹配。
  if (!selector || !element.attributes) return false;
  // 用 if 结构拆分三种简单选择器
  if (selector.charAt(0) === "#") {
    const attr = element.attributes.filter(attr => attr.name === "id")[0];
    if (attr && attr.value === selector.replace("#", "")) {
      return true;
    }
  } else if (selector.charAt(0) === ".") {
    // 省略的逻辑：用空格分开 attr, 有一个匹配到，就认为该 element 具有这个 class
    const attr = element.attributes.filter(attr => attr.name === "class")[0];
    if (attr && attr.value === selector.replace(".", "")) {
      return true;
    }
  } else { // tag name
    // console.log("😊", element, selector)
    if (element.tagName === selector) return true;
  }
  return false;
}

// 当前元素 element；父元素们 elements；CSS规则 rules
function computeCSS(element) {
  // console.log(rules);
  // console.log("computing CSS for the element", element)
  const elements = stack.slice().reverse(); // 栈的情况是不断变化的。获取当前的副本。关键：reverse。因为标签匹配是从当前元素开始逐级往外匹配。父=>子  子=>父

  if (!element.computedStyle) {
    element.computedStyle = {};
  }

  for (const rule of rules) {
    // 得到复合选择器，如 #myid,div,body
    const selectorParts = rule.selectors[0].split(" ").reverse(); // 见 CSS ast 的结构。仅处理选择器中用空格分隔的情况，忽略逗号的情况。reverse一下，和父元素的reverse对应。

    if (!match(element, selectorParts[0])) continue;

    let matched = false;

    let j = 1; // j 表示当前选择器的位置; i 表示当前元素的位置。
    for (let i = 0; i < elements.length; i++) {
      if (match(elements[i], selectorParts[j])) {
        // 当元素能够匹配到选择器，让 j 自增
        j++;
      }
    }
    // 如果所有的选择器都被匹配到了
    if (j >= selectorParts.length) {
      matched = true;
    }
    // 当元素和选择器匹配，把相应的 CSS 规则加上去
    if (matched) {
      // console.log("element", element, "matched rule ", rule)
      const sp = specificity(rule.selectors[0]); // 当前的 selector 的 specificity
      const { computedStyle } = element;
      for (const declaration of rule.declarations) {
        // console.log("😊" + JSON.stringify(declaration, null, 4))
        if (!computedStyle[declaration.property]) {
          computedStyle[declaration.property] = {};
        }
        // CSS 优先级specificity判断
        // console.log("😊" + JSON.stringify(computedStyle[declaration.property], null, 4))
        // 比较 "property 上的 specificity"  和  "当前 selector 的 specificity"
        // 首先看 property 上的 specificity 是否存在
        if (!computedStyle[declaration.property].specificity) {
          computedStyle[declaration.property].value = declaration.value;
          computedStyle[declaration.property].specificity = sp;
        } else if (compare(computedStyle[declaration.property].specificity, sp) < 0) { // 如果后来的declaration优先级更低，高优先级的旧的覆盖新的
          computedStyle[declaration.property].value = declaration.value;
          computedStyle[declaration.property].specificity = sp;
        }
        // computedStyle[declaration.property].value = declaration.value; 不判断优先级，后面的总是覆盖前面的
      }
      // console.log("😊" + JSON.stringify(element.computedStyle))
      // console.log("😊" + JSON.stringify(rule, null, 4))
    }
  }
}

function specificity(selector) {
  const p = [0, 0, 0, 0];
  const selectorParts = selector.split(" ") // 同样假设这里是复合选择器，选择单个元素用的 (即假设只有简单选择器)。要扩展复合选择器，同样加正则。
  for (const part of selectorParts) {
    if (part.charAt(0) === "#") {
      p[1] += 1;
    } else if (part.charAt(0) === ".") {
      p[2] += 1;
    } else {
      p[3] += 1;
    }
  }
  return p;
}
// 四元组，高位优先比较
function compare(sp1, sp2) {
  if (sp1[0] - sp2[0]) {
    return sp1[0] - sp2[0];
  }
  if (sp1[1] - sp2[1]) {
    return sp1[1] - sp2[1];
  }
  if (sp1[2] - sp2[2]) {
    return sp1[2] - sp2[2];
  }
  return sp1[3] - sp2[3];
}

// 状态机创建完所有状态后，要把它在同一个出口输出
// emit 函数接受所有从状态机产生的 token，有开始标签，结束标签，自封闭标签
// 对文本节点的处理：相邻的文本节点会被合并；遇到其他类型的标签，当前文本节点会被清除。
// 文本标签的处理方式，与自封闭标签的处理，相同的地方是，不会真的入栈；不同的地方是，文本 token 是一个个地过来的，多个文本节点需要被合并。
function emit(token) {
  // console.log(token);
  // if (token.type === "text") return; // 先忽略文本节点

  // 每次新的 token 来了，先取出栈顶元素
  let top = stack[stack.length - 1];

  // 如果来的是 stateTag token, 进行入栈操作。不是把 token 直接入栈，而是入栈一个 element。tag 是 <> 标签，它表示的是 element。startTag endTag 对应同一个 element
  if (token.type === "startTag") {
    let element = {
      type: "element",
      children: [],
      attributes: [],
    };

    element.tagName = token.tagName;
    // 把所有属性，除了 type tagname，都 push 进 element 的属性池
    for (const prop in token) {
      if (prop !== "type" && prop !== "tagName") {
        element.attributes.push({
          name: prop,
          value: token[prop],
        });
      }
    }

    computeCSS(element);

    // 构建树的关系
    top.children.push(element); // 栈顶元素的 children 是当前 element
    // element.parent = top;

    if (!token.isSelfClosing) { // 自封闭标签没必要进栈匹配
      stack.push(element);
    }
    currentTextNode = null;

  } else if (token.type === "endTag") { // 匹配则退栈，不匹配则报错。
    if (top.tagName !== token.tagName) {
      throw new Error("Tag start end doesn't match!"); // 真实浏览器会做容错操作，此处省略
    } else {
      // CSS: 遇到 style 标签，执行添加 CSS 规则的操作。HTML 解析遇到 style 标签的结束标签时，就已经可以拿到 style 标签的文本子节点了。
      if (top.tagName === "style") {
        // 只考虑 style 标签，内联 CSS 写法。不考虑 link, import 等等，避免网络请求、异步处理
        addCSSRules(top.children[0].content); // style标签.文本节点.CSS内容
      }
      layout(top); // 此时已经获取 flex 布局所需的子元素？？？
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type === "text") {
    // 若当前没有文本节点，创建一个新的，放入子节点位置；已经有的话，完善 content
    if (currentTextNode === null) {
      currentTextNode = {
        type: "text",
        content: "",
      }
      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
  // console.log("---------------------------------------------------", stack.length)
}

const EOF = Symbol("EOF"); // EOF: end of file. 利用 symbol 的唯一性。

// html 三种标签：开始、结束、自封闭标签
// HTML 已经设计好了状态，参考标准里的 tokenization 章节，一共 80 多个，用状态机的方式描述词法。
function data(char) {
  if (char === "<") {
    return tagOpen;
  } else if (char === EOF) {
    emit({
      type: "EOF"
    });
    return;
  } else {
    // 文本节点，emit 一个 text token
    emit({
      type: "text",
      content: char,
    })
    return data;
  }
}

function tagOpen(char) {
  if (char === "/") {
    return endTagOpen;
  } else if (char.match(/^[a-zA-Z]$/)) { // 是字母，则要么开始标签，要么自封闭标签
    currentToken = {
      type: "startTag", // 给该标签设置初始值。如果是自封闭tag,用额外的 isSelfClosing 变量来标识
      tagName: "",
    }
    return tagName(char); // 收集 tagname
  } else {
    return;
  }
}

function endTagOpen(char) {
  if (char.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: "endTag",
      tagName: "",
    }
    return tagName(char); // 同样，寻找 tagname。因为该 char 同样要被 tagName 使用，其也是 tagname 的一部分。故而使用了 reConsume 的逻辑，把该 char 直接传给下一个状态。否则该 char 被吞掉，下一个状态函数拿到的参数就是下一个 char 如，h => t (html)
  } else if (char === ">") {
    // "/>"" 报错 这是 HTML 不是 react
  } else if (char === EOF) {
    // 报错
  } else {

  }
}

function tagName(char) {
  // tag name 以空白符结束，后面跟属性。即 tag name 以左尖括号开始，以空白符结束。HTML里有效的空白符有四种: tab符 换行符 禁止符 空格
  if (char.match(/^[\t\n\f ]$/)) { // \f prohibited
    // <html prop
    return beforeAttributeName;
  } else if (char === "/") {
    // <hr/>
    return selfClosingStartTag;
  } else if (char.match(/^[a-zA-Z]$/)) {
    // still it's in tag name
    currentToken.tagName += char//.toLowerCase();
    return tagName;
  } else if (char === ">") {
    // 结束这个 tag，回到 data 状态，以便解析下一个标签
    emit(currentToken);
    return data;
  } else {
    return tagName;
  }
}

// 属性值分为 单引号，双引号，无引号三种写法，需要较多状态去处理
// 处理属性的方式跟标签类似
// 属性结束时，把属性的 name value 加到标签 token 上，最后 emit 的还是标签 token

// "<html " 此时该进入处理属性的状态  
function beforeAttributeName(char) {
  if (char.match(/^[\t\n\f ]$/)) { // 当标签结束
    return beforeAttributeName;
  } else if (char === "/" || char === ">" || char === EOF) {
    // 属性结束
    return afterAttributeName(char);
  } else if (char === "=") {
    // 属性开始的时候，不会直接就是等号，报错
    // return
  } else {
    // 遇到字符，创建新的属性
    currentAttribute = {
      name: "",
      value: ""
    }
    return attributeName(char);
  }
}

function attributeName(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === EOF) { // 一个完整的属性结束 "<div class='abc' "
    return afterAttributeName(char);
  } else if (char === "=") { // class= 可以进入获取value的状态
    return beforeAttributeValue;
  } else if (char === "\u0000") { // null

  } else if (char === "\"" || char === "'" || char === "<") { // 双引号 单引号 <

  } else {
    currentAttribute.name += char;
    return attributeName;
  }
}

function beforeAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/) || char === "/" || char === ">" || char === EOF) {
    return beforeAttributeValue; //?
  } else if (char === "\"") {
    return doubleQuotedAttributeValue; // <html attribute="
  } else if (char === "\'") {
    return singleQuotedAttributeValue; // <html attribute='
  } else if (char === ">") {
    // return data
  } else {
    return UnquotedAttributeValue(char); // <html attribute=
  }
}

function doubleQuotedAttributeValue(char) {
  if (char === "\"") { // 第二个双引号，结束
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return afterQuotedAttributeValue;
  } else if (char === "\u0000") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue;
  }
}

function singleQuotedAttributeValue(char) {
  if (char === "\'") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return afterQuotedAttributeValue;
  } else if (char === "\u0000") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return singleQuotedAttributeValue;
  }
}

// 所有的 属性结束时，把其 Attribute name、value 写到 current token，即当前的标签上
function UnquotedAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/)) { // Unquoted Attribute value 以空白符结束
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return beforeAttributeName; // 因为空白符是结束的标志， “<html maaa=a ” 把相关值挂到token上后，接下的状态可能又是一个新的 attribute name
  } else if (char === "/") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    return selfClosingStartTag; // 同上，自封闭标签的结束
  } else if (char === ">") {
    const { name, value } = currentAttribute;
    currentToken[name] = value;
    emit(currentToken); // 结束
    return data;
  } else if (char === "\u0000") {

  } else if (char === "\"" || char === "'" || char === "<" || char === "=" || char === "`") {

  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return UnquotedAttributeValue;
  }
}

// afterQuotedAttributeValue 状态只能在 double quoted 和 single quoted 之后进入。
// 不能直接接收一个字符 如： "<div id='a'"" 这之后至少得有一个空格才可以，紧挨着如 "<div id='a'class=""" 是不合法的 "<div id='a' class=""" 才行
function afterQuotedAttributeValue(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (char === "/") {
    return selfClosingStartTag;
  } else if (char === ">") { // 标签结束，emit token
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {
    currentAttribute.value += char;
    return doubleQuotedAttributeValue;
  }
}

// 已经 <div/ 了，后面只有跟 > 是有效的，其他的都报错。
function selfClosingStartTag(char) {
  if (char === ">") {
    currentToken.isSelfClosing = true;
    emit(currentToken) // 补?
    return data;
  } else if (char === EOF) {

  } else {

  }
}

function afterAttributeName(char) {
  if (char.match(/^[\t\n\f ]$/)) {
    return afterAttributeName;
  } else if (char === "/") {
    return selfClosingStartTag;
  } else if (char === "=") {
    return beforeAttributeValue;
  } else if (char === ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (char === EOF) {

  } else {
    currentToken[currentAttribute.name] = currentAttribute.value;
    currentAttribute = {
      name: "",
      value: ""
    }
    return attributeName(char);
  }
}

module.exports.parserHTML = function (html) {
  let state = data; // HTML 标准里把初始状态称为 data

  for (const char of html) {
    // console.log('========', state.name, '--', char)
    state = state(char);
    // console.log("---------------------------------------------------", stack.length)
  }
  // HTML 里最后有一个文件终结？？？该位置一些文本节点可能仍然是未结束的状态 ？？？例子？？？所以必须额外给它一个字符，且该字符不能是任何一个有效字符（什么是有效字符？？？）。所以创建一个 eof 的symbol的符号，作为最后一个输入，传给状态机，强制截止。
  state = state(EOF);
  return stack[0];
}