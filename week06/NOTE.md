# CSS
## @ rules
* @charset 声明 CSS 字符集
* @import 在 CSS cascade 级联标准里
* **@media 在 CSS conditional 标准里，有条件地生效**
* @page 分页媒体，其实主要就是打印机，一般的浏览器不分页
* @counter-style list 列表每行开头的小黑点，需要定制列表形状时使用
* **@key-frames 定义动画**
* **@fontface 可以定义一切字体，如 web fonts，衍生出 icon fonts**
* @support 在 CSS conditional 标准里，用来检查某属性是否存在。它本身的兼容性不太好，目前不推荐使用，可以用工程工具解决
* @namespace 处理命名空间
## rule (Selector + Declaration)
### Selector 选择器
<!--
  * selector group  （由逗号分隔的 selector 构成）

  * selector combinator（由连接的 simple selector sequence 构成）
    * \<sp>
    * \>
    * \+
    * \~
-->
  * **simple selector 简单选择器**
    * \* 通用选择器（Universal selector）
      * 选中任何元素，相当于没有选择器
      * 在复合选择器（combined selector）中，必须写在最前
    * div svg|a （type 类型选择器）
      * 可以选中 tagName
        * HTML 命名空间有三个： HTML，SVG, MathML。如果想选中后两者里面的特定元素，要用单竖线|，需要配合使用 @namespace 声明一下？不常用
          * 命名空间分隔符：HTML语言中是冒号: CSS语言中是单竖线 |
      * 在复合选择器（combined selector）中，必须写在最前
    * \.class class选择器
      * 可以用 空格 作为分隔符，分隔多个 class，只需要匹配中其中一个即可
    * \# id选择器
    * \[attr=value] 属性选择器
      * 等号前面加波浪线 ~ ，表示像 class 一样，可以支持用空格分隔的值的序列
      * 等号前面加单竖线 | ，表示该属性以这个值开头即可匹配
      * 如果对优先级没有特殊要求，理论上可以用该选择器代替 id class 选择器
    * 伪类 (跟链接和行为相关，表示元素的特殊状态)
      * 经典伪类
        * :any-link 匹配所有超链接
        * :link :visited
          * link 匹配还没访问过的超链接，link + visited === any-link
          * 出于安全考虑，一旦使用了 link 或 visited，就无法更改其元素里，文字颜色之外的属性了。
        * :hover
          * 目前很多元素都支持 hover，包括伪元素
        * :active 激活状态
        * :focus
          * 目前，所有能获得焦点的元素都支持
          * :focus-within 元素自身或者它的某个后代匹配 :focus 伪类。目前实现得还不是很好
        * :target
          * 不是给超链接用的，而是给作为锚点的 \<a />标签用的。
          * 如果当前 hash 指向当前 \<a />标签表示的链接，target 被激活
      * 树型结构相关伪类 (影响 computeCSS 的时机，性能不太好)
        * :empty 表示没有子元素的元素
        * :nth-child() matches elements based on their position in a group of siblings.
          * 参数
            * even/odd 奇偶
            * <An+B> https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-child
          * 语法复杂，应简单使用，不要写复杂的表达式
        * :nth-last-child()
          * 跟 :nth-child() 一样，只是从后往前数
        * :first-chhild :last-child :only-child
      * 逻辑型
        * :not() 用来匹配不符合一组选择器的元素
          * 参数：目前只支持 简单选择器的序列（复合选择器），不能用连接符，逗号等
        * :where :has
        

    * 伪元素选择器
      * ::before ::after
        * 添加原本不存在的元素
        * 一旦运用，declaration 中就可以写 content 属性。该伪元素就像一个真正的 DOM 元素一样，生成盒，参与排版、渲染等后续步骤。
      * ::first-line ::first-letter
        * 用不存在的元素 装饰已经存在的文本
          * e.g. \<div><::first-letter>A</::first-letter> dog ... ...\</div>
        * ::first-line 装饰的内容多少，由渲染结果决定。
        * 可用属性的差异
          * ::first-line
            * font 系列
            * color 系列
            * background 系列
            * word-spacing
            * letter-spacing
            * text-decoration
            * text-transform
            * line-height
          * ::first-letter
            * ::first-line 支持的所有属性
            * float （为什么 ::first-letter 支持 float，但 ::first-line 不行？）
            * vertical-align
            * 盒模型系列：margin padding border


 * **combined selector 复合选择器**
  * 写法
    * 简单选择器挨着写，就是复合选择器
    * 简单选择器的顺序：
      * \* 或者 div 必须写在坐前；
      * 伪类、伪元素一定写在最后
  * 语义：选中的元素必须同时 match 这些简单选择器。即 && 与 的关系。

  * **复杂选择器**
    * 写法：用连接符 selector combinator 连接 复合选择器
    * 语义：针对一个元素的结构进行选择
      * \<sp> 空格 子孙选择器、后代组合器（Descendant combinator）
      * \> 父子选择器 （Child combinator）（连接符左边选中的元素必须是右边的直接的父元素）
    * ~  一般兄弟组合器（General sibling combinator）
      * 二者有有同一个父节点
    * \+ 紧邻兄弟组合器（Adjacent sibling combinator）
      * 二者有有同一个父节点，且前后相邻
    * || 选中 table 中的某一列

  * **选择器列表（Selector list）**
    * 复杂选择器用逗号相连
    * 逗号之间是 或 的关系
  
    
### Declaration 声明
  * **key**
    * variables 变量 
      * 声明时双减号开头，在子元素中用 var() 使用
      * 可以在任何局部使用：key、value、嵌套、calc() 中等等
    ```
    :root {
      --main-color: #06c;
      --accent-color: #006;
    }
    #foo h1 {
      color: var(--main-color);
    }
    ```
    * properties 属性
  * **value**
    * calc()
    * attr() 可以让 CSS 的值和元素上的值绑定？？？
    * number
    * length
    * ...

# 从 w3.org 爬取CSS规则的爬虫函数

# 优先级 specificity
四元组，[inline, id, class/attribute, tagname]
e.g. [0, 2, 1, 1]
sp = 0 * N3️⃣ + 2 * N² + 1 * N + 1
N 是一个很大的数。
IE 老版本中，为了节省内存，N 取值255，不够大，导致了 256 个 class 相当于一个 id 的bug。
当然，正常人不会写 256 个选择器。
目前大部分浏览器取 65536。


