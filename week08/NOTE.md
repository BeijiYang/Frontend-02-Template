# 字符引用
## 语法
* 文本实体由 & 开头，; 结尾。如 &lt；
* 文本实体可以用#后跟一个十六进制数字，表示字符的 ASCII 值
  * &#97；=> &#97;

## 规定的比较重要的转义字符
* nbsp: no-break space
  * 用它连接的两个词会被认为是一个词
  * 要想要多个空格，应使用 CSS 的 white-space
* quot: 双引号
* amp: & 符号
* lt: < 符号
* gt: > 符号

例子：

&lt；html>&lt；/html>: &lt;html>&lt;/html>


# 语义化使用 HTML 标签
* &lt;aside> 定义 article 以外的内容（非主体内容）。aside 的内容应该与 article 的内容相关。
* &lt;main>  主题部分，只有一个。
* &lt;article> 主要内容。
* &lt;hgroup> 包含主标题副标题。
* &lt;hr> 段落之间切换内容。
* &lt;abbr> 缩写
* 加粗
    * &lt;strong> 强调该词在段落中的重要性
    * &lt;em> 语调中的重音，重读。如**一个**苹果\一个**苹果**
* 图表+说明文字的标签组
    * &lt;figure> 外层
    * &lt;img>
    * &lt;figcaption> 放说明文字
* 列表
  * &lt;ol> 与 &lt;ul> 的区别是，列表内容在语义上是否有顺序性
  * 可以用 CSS 的 counter 把 &lt;ol> 里的 &lt;li> 前的数字变成圆点
  * 可嵌套
* &lt;nav> 导航
* &lt;footer> article 中也可以有自己的 header 和 footer
* &lt;dfn> 表示给某词下定义。The term &lt;dfn>Internet&lt;dfn> is ...
* &lt;samp> 表示是示例
* &lt;pre> 表示预先调整好格式的一段文本
* &lt;code> 
  
没有合适的标签，如注记，可以配合class： &lt;p class="note">

# HTML 中的合法元素
* element: &lt;tagname>&lt;/tagname>
* text
* comment: &lt;!-- comments -->
* DocumentType: &lt;!Doctype html>
* ProcessingInstruction: &lt;?a 1?>
* CDATA: &lt;![CDATA[]]> 文本的另一种语法，其中不用考虑转义

# DOM API （四部分）
## node 部分
### 导航类操作
* 节点的导航
* 元素的导航 （避免空白文本节点的干扰）

| Node | Element |
| ---- | ---- |
| parentNode | parentElement |
| childNodes | children |
| firstChild | firstElementChild |
| lastChild | lastElementChild |
| nextSibling | nextElementSibling |
| previousSiblilng | previousElementSibling |

* 提供在 DOM 树中自由移动的能力
* parentNode 和 parentElement 重复，因为 非element 的 node 是不会有子节点的。
* DOM 的 collection 是 **living collection**。引用是保持的。

### 修改操作

* 插入
  * appendChild
  * insertBefore
  
这两个搭配，可以插入任意位置。如，有 10 个子节点，形成 11 个可以插入的空隙。insertBefore 可以插前十个，appendChild 可以插第十一个（尾部）。

如果用 appendChild 移动一个 DOM 树中已经存在的节点，该节点会自动先从原位置被 remove，在 append 到相应位置。

* 删 removeChild
* 换 replaceChild （相当于 一次 remove + 一次 insert）

### 高级操作
* compareDocumentPosition: 比较两个节点的关系。可以得到“前后”的关系。
* contains 检查一个节点是否包含另一个节点。
* isEqualNode 检查两个节点是否相同，只要 DOM 树结构相同即可，可以用来检查树形结构。
* isSameNode 不然直接用 ===
* cloneNode 复制节点。如果传入参数 true，会做深拷贝（连同子元素）。

## event API
* target.addEventListener(type, listener, options)
options： 捕获\冒泡模式; 是否只响应一次；是否产生副作用，如果单纯想监听，可以用
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener

## Range API
强大的微操(可以选中半个节点，tag会被自动补齐)或批量操作能力。
* const range = new Range();

### 用 offset 选起止点
* range.setStart(element, 9);
* range.setEnd(element, 4);

关于起点和终点：只要保证起点在 DOM 树中先于终点即可（这个先后指哪种顺序？？？），不要求二者在同一层级。

对于起止点的偏移值，对于 element，是其 children 的个数；对于 text，是文字的个数。

是 offset，偏移量，即选在第几个元素的后边。

### 不用 offset 选起止点
* range.setStartBefore
* range.setEndBefore
* range.setStartAfter
* range.setEndAfter
* range.selectNode // 选中一个元素
* range.selectNodeContents // 选中一个元素所有的内容

### 鼠标选中起止点
* const range = document.getSelection().getRangeAt(0);

### 取出 range 里的内容 - 删
把选取的内容从 DOM 树完全摘下来

取出来的是 fragment 对象。它也是 Node 的子类，可以执行 DOM API 的操作。append 时，仅会把它的所有子节点 append 上去。
* const fragment = range.extractContents();

### 在 range 的位置插入一个新的节点 - 增
* range.insertNode(document.createTextNode('aaa'));

**用例 1**
```
 <div id="a">123<strong>abc</strong>696969</div>
  
 ...
 
 range.setStart(document.getElementById('a').childNodes[0], 2);
 range.setEnd(document.getElementById('a').childNodes[2], 4);
 range.extractContents()； // 剩下 1269，3，整个strong标签，6969被摘下
 
```
**用例 2**
保留空 strong 标签，删去其内容：删除半个标签（其结束标签会DOM树中自动补齐）
```
 <div id="a">123<strong>abc</strong>696969</div>
  
 ...
 
   range.setStart(document.getElementById('a').childNodes[1], 0); // offset为 0，对于 element，选在children前，即 <strong> 后
  range.setEnd(document.getElementById('a').childNodes[2], 0); // offset为 0，对于文本节点，是第一个 6 前。
 range.extractContents()； // 剩下 123<strong></strong>696969
 
```

### 经典面试题：把一个元素的所有子元素逆序。
```
<html>
<head>
  <title>reverse the children of an element</title>
</head>

<body>
  <div class='parent'>
    <div>0</div>
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <div>4</div>
  </div>
</body>
<script>
  const parent = document.getElementsByClassName('parent')[0];
  let len = parent.children.length;
  for (let index = len - 2; index >= 0; index--) {
    parent.appendChild(parent.children[index]);
  }
</script>
</html>
```
正常：
```
const parent = document.getElementsByClassName('parent')[0];
  let len = parent.children.length;
  for (let index = len - 2; index >= 0; index--) {
    parent.appendChild(parent.children[index]);
  }
```

高级：
```
<html>
  <head>
    <title>reverse the children of an element</title>
  </head>

<body>
  <div id='parent'>
    <div>0</div>
    <div>1</div>
    <div>2</div>
    <div>3</div>
    <div>4</div>
  </div>
</body>
<script>
  const range = new Range();
  range.selectNodeContents(document.getElementById('parent'))
  // or
  // range.setStart(document.getElementById('parent').children[0], 0);
  // range.setEnd(document.getElementById('parent').children[4], 1);
  
  const fragment = range.extractContents();
  let index = fragment.children.length - 1;

  while (index--) {
    fragment.appendChild(fragment.children[index]);
  }
  document.getElementById('parent').appendChild(fragment);
</script>

</html>
```

#### 为什么后者更好：
因为只需要两次 DOM 操作：把01234取下来，把43210放上去。中间的reverse操作不会影响DOM。

前者，则需要在 DOM 上操作 4 次。

**DOM 操作会产生重排，影响性能。**

## traversal 系列 废了


# CSSOM API
使用场景：批量修改、修改伪元素样式（无法通过 DOM API 访问伪元素）
## document.styleSheets
* document.styleSheets[0].cssRules
* document.styleSheets[0].insertRule('p { color:pink; }', 0) // string, position
* document.styleSheets[0].removeRule(0)

## Rule
* **CSSStyleRule**
  * selectorText String
  * style key-value
* CSSCharsetRule
* CSSImportRule
* CSSMediaRule
* CSSFontFaceRule
* CSSPageRule
* CSSNamespaceRule
* CSSKeyframeRule
* CSSKeyframesRule
* CSSSupportsRule
* ...

## getComputedStyle
computedStyle 无法通过 DOM API 访问

window.getComputedStyle(element, pseudoElement);
  * pseudoElement，伪元素，可选参数


**用例 1： **
`document.styleSheets[0].cssRules[0].style.color = 'lightgreen';`

**用例 2： **
`getComputedStyle(document.querySelector('a'), '::before').color // lightgreen`

**使用场景**
* 实现拖拽效果 [张鑫旭案例](https://www.zhangxinxu.com/wordpress/2010/03/javascript%E5%AE%9E%E7%8E%B0%E6%9C%80%E7%AE%80%E5%8D%95%E7%9A%84%E6%8B%96%E6%8B%BD%E6%95%88%E6%9E%9C/)
* 用来确定 transition 动画播放进度

# CSSOM view

* window.innnerHeight, window.innerWidth 实际的 viewport
* window.outerHeight, window.outerWidth 带工具栏等等
* window.devicePixelRatio 屏幕物理像素/代码逻辑像素 比值
* window.screen
 * window.screen.width
 * window.screen.height
 * window.screen.availWidth
 * window.screen.availHeight 如手机屏幕会划一部分作为按钮
<hr />

* window.open('about:blank', "_blank", "width=100,height=100,left=100,right=100");
* moveTo(x, y) 改变位置
* moveBy(x, y)
* resizeTo(x, y) 改变尺寸
* resizeBy(x, y)
<hr />

* scrollTop 当前滚动到的位置
* scrollLeft
* scrollWidth 可滚动内容的最大宽度
* scrollHeight
* scroll(x, y) 也叫 scrollTo，滚动到特定位置
* scrollBy(x, y) 当前基础上滚动的差值
* scrollIntoView(x, y) 强制滚动到屏幕的可见区域 https://blog.csdn.net/hyl94/article/details/77472154

* window
 * scrollX
 * scrollY
 * scroll(x, y)
 * scrollBy(x, y)
<hr />

**layout** 获取元素真实的位置信息，如做拖拽效果时
* element.getClientRects() 获取元素生成的所有盒
* element.getBoundingClientRect() 获取包裹所有内容的盒（最外层）



 # 其他 API

























