const net = require("net");
const images = require("images");
const parser = require("./parser");
const render = require("./render");

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
      this.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
    // body 需要经过编码。有四种常见的编码格式，以下为简单的两种
    // application/x-www-form-urlencoded multipart/form-data application/json text/xml
    // application/x-www-form-urlencoded 提交的数据按照 key1=val1&key2=val2 的方式进行编码，key 和 val 都进行了 URL 转码
    // encodeURIComponent: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
    if (this.headers["Content-Type"] === "application/json") {
      this.bodyText = JSON.stringify(this.body);
    } else if (this.headers["Content-Type"] === "application/x-www-form-urlencoded") { // 此种 form 格式，body 是 & 符分隔的，key 在等号左，value 在等号右的结构，等号右边的的值需要经过 encodeURIComponent 操作
      this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('&'); // encodeuricomponent ??? 
    }
    /**
     * 最后一个Javascript编码函数是encodeURIComponent()。与encodeURI()的区别是，它用于对URL的组成部分进行个别编码，而不用于对整个URL进行编码。

因此，"; / ? : @ & = + $ , #"，这些在encodeURI()中不被编码的符号，在encodeURIComponent()中统统会被编码。至于具体的编码方法，两者是一样。
     */
    // 这也是必要的header，如果此项length出错，会使得该 http 请求为非法请求。不从外部传，直接在内部读取。
    this.headers["Content-Length"] = this.bodyText.length;
  }

  // 因为 send 函数是 promise 的形式，所以在 send 的过程中，会逐步收到 response ？？？？？？？？？？？
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
        // console.log(data.toString());
        console.log(JSON.stringify(data.toString(), null, 2));
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
        connection.end(); // 防止已经出错但仍然站着链接
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


void async function () { // void ??????
  // async function aaa() {
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
  // console.log(dom)

  // 绘制
  const viewport = images(800, 600); // 视口
  // render(viewport, dom.children[0].children[3].children[1].children[3]); // 传入视口 和 想要绘制的dom (class="c1" 的 div)
  render(viewport, dom);

  viewport.save('viewport.jpg');

}();

// aaa()


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