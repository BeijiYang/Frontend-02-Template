# 课程笔记（注释）

server.js
```
const http = require("http");

http.createServer((request, response) => {
  let body = [];
  request.on('error', (err) => {
    console.log(err);
  }).on('data', (chunk) => {
    // console.log("on data", chunk.toString())
    console.log("on data")
    body.push(chunk.toString());
    // body.push(chunk);
  }).on('end', () => {
    console.log("on end")
    // body = Buffer.concat(body).toString();
    body = body.join("");
    console.log("body: ", body);
    response.writeHead(200, { 'Content-Type': 'text/html' });
    // response.end(' Hello World\n');
    response.end(
      `<html maaa=a >
<head>
      <style>
body div #myid{
  width:100px;
  background-color: #ff5000;
}
body div img{
  width:30px;
  background-color: #ff1111;
}
  </style>
</head>
<body>
  <div>
      <img id="myid"/>
      <img />
  </div>
</body>
</html>`);
  });
}).listen(8088);

console.log('server running');
```

client.js
```
const net = require("net");
const parser = require("./parser");

class Request {
  constructor(options) {
    const {
      method,
      host,
      port,
      path,
      headers,
      body
    } = options;

    this.method = method || "GET";
    this.host = host;
    this.port = port || 80;
    this.path = path || "/";
    this.body = body || {};
    this.headers = headers || {};
    // http 协议要求必须有 Content-Type header, 否则 body 无法解析，所以也给默认值
    if (!this.headers["Content-Type"]) {
      this.headers["Content-Type"] = "application/x-222-form-urlencoded";
    }
    // body 需要经过编码。有四种常见的编码格式，以下为简单的两种
    if (this.headers["Content-Type"] === "application/json") {
      this.bodyText = JSON.stringify(this.body);
    } else if (this.headers["Content-Type"] === "application/x-222-form-urlencoded") { // 此种 form 格式，body 是 & 符分隔的，key 在等号左，value 在等号右的结构，等号右边的的值需要经过 encodeURIComponent 操作
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&'); // encodeuricomponent ???
    }
    // 这也是必要的header，如果此项length出错，会使得该 http 请求为非法请求。不从外部传，直接在内部读取。
    this.headers["Content-Length"] = this.bodyText.length;
  }

  // 因为 send 函数是 promise 的形式，所以在 send 的过程中，会逐步收到 response ？？？？？？？？？？？答：流式，这是 net 库的行为，跟 promise 无关。
  // 直到最后把 response 构造好之后，再让 promise 得到 resolve ？？
  // 因为这个过程，它（谁？）是会逐步收到信息的，所以有必要设计一个 response parser ，而非直接设计一个 response 类
  // 这样 parser 可以逐步接收 response 信息，来构造 response 对象各个不同的部分
  send(connection) { // connection 是 tcp 链接。如果没有传入，就创造一个
    // console.log(this.headers, this.body)
    return new Promise((resolve, reject) => {
      const parser = new ResponseParser;

      if (connection) {
        connection.write(this.toString());
      } else {
        // 创建新的 TCP 链接
        connection = net.createConnection({
          host: this.host,
          port: this.port,
        }, () => {
          // 创建成功的回调，写入内容
          connection.write(this.toString());
          // console.log(this.toString())
        })
      }

      connection.on('data', (data) => {
        // console.log("data.toString()");
        // console.log(JSON.stringify(data.toString(), null, 2));
        parser.receive(data.toString()); // 收到数据，传给 parser, 根据 parser 状态去 resolve promise
        if (parser.isFinished) {
          // 当 parser 完成，resolve the promise and end the connection.
          // console.log('is finished', parser.response)
          resolve(parser.response);
          connection.end();
        }
      })

      connection.on('error', (err) => {
        console.log(err)
        // reject the promise and end the connection.
        reject(err);
        connect.end(); // 防止已经出错但仍然站着链接
      })
    })
  }

  toString() {
    // 参考 request 模型
    return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`;
  }
}


class ResponseParser {
  // 用常量表示的状态机 不如用函数
  constructor() {
    this.WAITING_STATUS_LINE = 0;
    this.WAITING_STATUS_LINE_END = 1;

    this.WAITING_HEADER_NAME = 2;
    this.WAITING_HEADER_SPACE = 3;
    this.WAITING_HEADER_VALUE = 4;
    this.WAITING_HEADER_LINE_END = 5;
    this.WAITING_HEADER_BLOCK_END = 6;

    this.WAITING_BODY = 7;

    // 初始状态
    this.current = this.WAITING_STATUS_LINE;
    // 用来暂存值
    this.statusLine = "";
    this.headers = {};
    this.headerName = "";
    this.headerValue = "";
    this.bodyParser = null;
  }

  get isFinished() {
    return this.bodyParser && this.bodyParser.isFinished;
  }

  get response() {
    this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/); // ?????????
    return {
      statusCode: RegExp.$1,
      statusText: RegExp.$2,
      headers: this.headers,
      body: this.bodyParser.connect.join(''),
    }
  }

  // ResponseParser 是逐步地接收 response 的文本，设计一个 receive 接口，接收字符串。像状态机一样，处理逐个字符
  receive(string) {
    for (let i = 0; i < string.length; i++) {
      this.receiveChar(string.charAt(i));
    }
  }
  // 状态机
  receiveChar(char) {
    // 初始状态 等待 http 头  request line
    if (this.current === this.WAITING_STATUS_LINE) {
      // 在 request line 结束之前，保存它的每个字符
      if (char === '\r') {
        this.current = this.WAITING_STATUS_LINE_END;
      } else {
        this.statusLine += char;
      }
    } else if (this.current === this.WAITING_STATUS_LINE_END) {
      // 如果是 \n, 则连着 \r\n, request line 结束，开始解析 http 头里的键值对
      if (char === "\n") { // 还有什么别的可能情况？？？？
        this.current = this.WAITING_HEADER_NAME;
      }
      // request line 结束，开始处理请求头里的 key  value 
    } else if (this.current === this.WAITING_HEADER_NAME) { // key
      if (char === ':') {
        this.current = this.WAITING_HEADER_SPACE;
      } else if (char === '\r') { // 空行！！没有 key value 对
        this.current = this.WAITING_HEADER_BLOCK_END;
        if (this.headers['Transfer-Encoding'] === 'chunked') {  // 根据不同的 header 创建不同的 bodyparser，所以在 header 结束时，即在 WAITING_HEADER_NAME 状态时，找到 \r，即找到 block end 的时候，已经收到所有 headers，在里面找到 transfer-encoding 的值。
          this.bodyParser = new TrunkedBodyParser(); // transfer-encoding 有很多值，其中 node 的默认值为 chunked。选其作为案例。
        }
      } else {
        this.headerName += char;
      }
    } else if (this.current === this.WAITING_HEADER_SPACE) {
      if (char === ' ') {
        this.current = this.WAITING_HEADER_VALUE;
      }
    } else if (this.current === this.WAITING_HEADER_VALUE) { // value 
      if (char === '\r') {
        this.current = this.WAITING_HEADER_LINE_END;
        this.headers[this.headerName] = this.headerValue;
        this.headerName = '';
        this.headerValue = '';
      } else {
        this.headerValue += char;
      }
      // 本行 header 结束，即一对 key value
    } else if (this.current === this.WAITING_HEADER_LINE_END) {
      // this.headers[this.headerName] = this.headerValue;
      // this.headerName = '';
      // this.headerValue = '';
      if (char === '\n') {
        this.current = this.WAITING_HEADER_NAME; // ? 。。。 
      }
      // 请求头结束
    } else if (this.current === this.WAITING_HEADER_BLOCK_END) {
      if (char === '\n') {
        this.current = this.WAITING_BODY;
      }
    } else if (this.current === this.WAITING_BODY) {
      // console.log(JSON.stringify(char));
      this.bodyParser.receiveChar(char);
    }
  }
}

// trunked body 的结构是，每个trunk，先是长度（那个十六进制数），后面跟着一个 trunk 的内容。
// 遇到长度为 0 的 trunk，整个 body 就结束。
class TrunkedBodyParser {
  constructor() {
    // 以下两个状态，处理 👆 那个长度。
    this.WAITING_LENGTH = 0;
    this.WAITING_LENGTH_LINE_END = 1;

    this.READING_TRUNK = 2;
    this.WAITING_NEW_LINE = 3;
    this.WAITING_NEW_LINE_END = 4;

    this.length = 0;
    this.connect = [];
    this.isFinished = false;

    this.current = this.WAITING_LENGTH;
  }

  receiveChar(char) {
    // d\r\n Hello World\n\r\n0\r\n\r\n
    if (this.current === this.WAITING_LENGTH) {
      if (char === '\r') { // 找到 \r 的时候，说明已经读到了一个 length。
        if (this.length === 0) { // 如果此时 length 为 0，说明遇到了一个长度为 0 的 trunk。就设置 isfinished
          this.isFinished = true;
        }
        this.current = this.WAITING_LENGTH_LINE_END; // 否则就设置状态为 WAITING_LENGTH_LINE_END
      } else {
        // 因为 length 是十六进制，所以说要给原来的值乘以 16 ？？？？？？， 把最后一位空出来？？？，再把读进来的这一位加上去。
        this.length *= 16 // ???
        this.length += parseInt(char, 16); // 开头那个十六进制数的字符串 d， 意思是 13。  hello world 长度14的问题？？？？？？
      }
    } else if (this.current === this.WAITING_LENGTH_LINE_END) { // 跟另一个状态机一样， 这里是处理 \r\n 的双换行符的
      if (char === '\n' && !this.isFinished) { // 加上第二个条件后，解决了 response.body 是' Hello World\n\r\n'而非' Hello World\n'的问题
        this.current = this.READING_TRUNK;
      }
    } else if (this.current === this.READING_TRUNK) {
      this.connect.push(char); // 保存 trunk 里的字符
      this.length--;
      if (this.length === 0) {
        this.current = this.WAITING_NEW_LINE;
      }
    } else if (this.current === this.WAITING_NEW_LINE) {
      if (char === '\r') {
        this.current = this.WAITING_NEW_LINE_END;
      }
    } else if (this.current === this.WAITING_NEW_LINE_END) {
      if (char === '\n') {
        this.current = this.WAITING_LENGTH;
      }
    }

  }
}


void async function () { // void 立即执行函数
  const request = new Request({
    method: "POST", // for http
    host: "127.0.0.1",// for ip
    port: "8088",// for tcp
    path: "/", // for http
    headers: { // for content of http
      ["X-Foo2"]: "customed", //这个 key 为什么写成这样??? 用 js 对象描述 headers
    },
    body: { // content of http
      name: "Rocky",
    }
  });

  const response = await request.send();
  // console.log("-----=======-------", JSON.stringify(response, null, 2))
  console.log(response);
  // 真实的浏览器中，body 是逐段返回，不断解析的。是异步分段处理的。这里简化处理。
  let dom = parser.parserHTML(response.body);
  // console.log(JSON.stringify(dom, null, 2))
  console.log(dom)
}();
```

parser.js
```
// 词法分析 tokenization 语法分析
let currentToken = null; // tag 是当做一个 token 处理的，不论其有多复杂
let currentAttribute = null;
let currentTextNode = null;

let stack = [{ type: "document", children: [] }]; // 栈中放一个根节点。当 HTML 配对良好，栈为空。有一个初始根节点，以便把树拿出来

// 状态机创建完所有状态后，要把它在同一个出口输出
// emit 函数接受所有从状态机产生的 token，有开始标签，结束标签，自封闭标签
// 对文本节点的处理：相邻的文本节点会被合并；遇到其他类型的标签，当前文本节点会被清除。
// 文本标签的处理方式，与自封闭标签的处理，相同的地方是，不会真的入栈；不同的地方是，文本 token 是一个个地过来的，多个文本节点需要被合并。
function emit(token) {
  console.log(token);
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

    // 构建树的关系
    top.children.push(element); // 栈顶元素的 children 是当前 element
    element.parent = top;

    if (!token.isSelfClosing) { // 自封闭标签没必要进栈匹配
      stack.push(element);
    }
    currentTextNode = null;

  } else if (token.type === "endTag") { // 匹配退栈，不匹配报错。
    if (top.tagName !== token.tagName) {
      throw new Error("Tag start end doesn't match!"); // 真实浏览器会做容错操作，此处省略
    } else {
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
    console.log('========', state.name, '--', char)
    state = state(char);
    // console.log("---------------------------------------------------", stack.length)
  }
  // HTML 里最后有一个文件终结？？？该位置一些文本节点可能仍然是未结束的状态 ？？？例子？？？所以必须额外给它一个字符，且该字符不能是任何一个有效字符（什么是有效字符？？？）。所以创建一个 eof 的symbol的符号，作为最后一个输入，传给状态机，强制截止。
  state = state(EOF);
  return stack[0];
}
```

# 直播笔记

// 闭包
// 截图1
// 有意义的闭包
// let f = a => {
//   return x => a + x  // f(3)  f(4) 本函数可以引用到不一样的 a
// }
// control part 一致
// environment part 不一致 

// 所有函数都可以是，因为函数内部都可以引用外部变量

// let f = x => x + 1 // 非闭包函数



// let a = { o: 1 }
// o.a + 1 // 2   o.a 是值
// delete o.a // true  o.a 是引用  （reference 类型 存在于 js 运行时，引擎里有，但取不到）
// typeof super ...


// realm 
// iframe 有自己的一套 realm
// instanceof 用于内置对象 很容易被坑 截图2


// 前端安全 CSRF XSS <IFRame></IFRame> 微博上一个黑客写的 有诚意的h

// 前端系统设计 架构
// 架构牧师 MVC MVVM
// 组件化

// 调试技巧
// 调试递归代码  加一个参数 每次调用加几个空格 parm+='  '
// log里看缩进就知道第几层
