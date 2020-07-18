学习笔记

# Grammer 语法：Grammer Tree & Priority；Left hand side & Right hand side 语法树 优先级的关系 运算符的左值和右值的区别

# RunTime 运行时：Type Convertion & Reference 类型转换 引用类型


## Grammer Tree & Priorit
可以用二叉树（中缀树）来表达运算优先级
标准中是用产生式来表述优先级的


### Expressions
优先级最高的是 Member 运算。
成员访问（点，方括号）
super
new Foo()
等等

举例：new a()() 问第一对括号是函数调用，还是new运算的结果？
因为 new Foo() 的优先级更高，所以第一对括号一定是跟着前面的 new 运算的。

New
new Foo 不带括号的 new 优先级更低
举例： new new a() 问：连续两个 new，后面跟了一个 class 名 a，该括号是跟着第一个 new，还是第二个 new？
因为带括号的 new 运算优先级更高，所以括号优先跟第二个 new 结合。


### Reference
Object.key 访问了一个属性，取出来的不是值，是引用。
引用类型并不属于 JavaScript 7种基本类型。
它是存在于运行时中的类型，是存在于标准中的类型，而非存在于语言中的类型。

key 可以是 string，也可以是 symbol

Reference
完全记录了 member 运算的前半部分和后半部分

delete 和 assign 这样的写操作，用到的就是引用类型。明确是哪个对象的哪个属性。
如果是加法或减法运算，reference 类型会解引用，像普通变量一样使用。“解引用？？？像普通变量一样使用是什么意思”

### Call Expression 函数调用
最基础的函数调用
foo() 优先级低于 new ，低于 member 运算
如果在括号后取属性，会让表达式降级为 Call Expression ?????

举例： new a()['b']  new 出了 a 对象，访问其 b 属性。


## Left hand side & Right hand side
### Left hand expression
a.b

只有  Left hand expression 才能放到等号左边
a.b = c 可以
a + b = c 不可以

因为 a.b 是 Left hand expression
a + b 是right hand expression

### right hand expression
以下各 expression 的优先级依次递减
#### Update expression 自增自减
a ++
a --
-- a
++ a

可以认为 Left hand expression 一定是 right hand expression，没有例外 ？？？？？

#### Unary expressions 单目运算符
delete a.b    delete 后面必须是 reference 类型
void foo()    把 void 后面的所有东西变成 undefined，可以起到改变语法结构的作用（类似回车）
typeof a
+a            并不会改变表达式的值。如果是字符串，发生类型转换。
-a
~a            位运算，把整数按位取反。如果不是整数，强制转为整数。
!a            非
await a

#### ** exponential 
唯一一个右结合的运算符，表示乘方

举例 3 ** 2 ** 3， 表示 3 ** （2 ** 3）


### multiplicative * / % 乘除取余 
### Additive + -
### Shift << >> >>> 位运算，移位运算
### Relationship < > <= >= instanceof in 关系比较


### Equality == != === !== 类型不同时，优先把布尔型转为数字型
### bitwise & ^ |   位运算，按位与 异或 按位或

### Logical && || 注意短路原则
### Conditional ? : 三目运算符 也存在短路逻辑



# 类型转换 Type Convertion
a + b 字符串/数字
"false" == false 当类型不同，基本先转为number
a[o] = 1   object的key也会发生类型转换 例子: 传入布尔值，被转换为字符串  var a = {false: 111}; a[Boolean()] // 111 ; a[false] // 111
位运算不但会转成 number 类型，还必须再把 number 转为整数类型。

7 种类型互相转换的表格

## UnBoxing 拆箱转换
Object 转为一个基本类型
关键步骤是 toPrimitive 如，当 object + object 时，就会被调用

对象上的三个方法会影响到 toPrimitive
* toString
  * 当对象作为属性名的时候，会优先调用该对象的 toString 方法，该结果作为属性名 key，见例子2
* valueOf
  * 对象参与加法 + 运算时，若 Symbol.toPrimitive 未调用，则优先调用该对象上的 valueOf 方法的结果来参与运算 见例子1
* Symbol.toPrimitive // Symbol 的 key 值？？
  * 如果定义了 Symbol.toPrimitive， 该方法具有最高优先级，无论该对象作为 object 还是 key

例子1
var o = {
  toString() { return "2" },
  valueOf() { return 1 },
  [Symbol.toPrimitive]() { return 3 }
}

o + 1 // 4

var o = {
  toString() { return "2" },
  valueOf() { return 1 },
  // [Symbol.toPrimitive]() { return 3 }
}

o + 1 // 2

var o = {
  toString() { return "2" },
  // valueOf() { return 1 },
  // [Symbol.toPrimitive]() { return 3 }
}

o + 1 // "21"

例子2
var o = {
  toString() { return "2" },
  valueOf() { return 1 },
  // [Symbol.toPrimitive]() { return 3 }
}

var x = {}
x[o] = 1     // x = { 2: 1 }


var o = {
  toString() { return "2" },
  valueOf() { return 1 },
  [Symbol.toPrimitive]() { return 3 }
}

var x = {}
x[o] = 1     // x = { 3: 1 }


## Boxing 装箱转换
对于四种基础类型， object 提供了包装类。（UN没有 Undefined Null）
如 Number，一个构造器。
* 如果用 new 调用，得到 object；    new Number (1)
* 如果直接调用，得到值。             Number (1)

此时称得到的number对象与number值存在装箱关系。

String Boolean 同理
Symbol 无法直接被 new 调用，会抛错。
* 要创造一个 symbol 对象，即 symbol 的包装类型，还需要用 Object 构造器包一层。 new Object(Symbol("a"))
* 直接调用，与其他一样 Symbol("a")

### 何时发生
当使用 Member，即 点 或 方括号 访问属性时，如果 . 之前的变量/表达式得到的是基础类型，装箱转换就被调用
所以，在 Number 这个 class 上定义了什么样的值，正常的 number 类型的值也可以通过点运算去访问 ？？？？？

Exercise:
number 有四种进制。可以通过传一个进制，来指定要转换为几进制的字符串
StringToNumber(){}
NumberToString(){}

Number 
* decimal literal 十进制
  * 0
  * 允许有小数，小数点前后一面有数字就行 0.    。2
    * 所以 0.toString() 抛错，0 .toString() 才行。 0. 是合法的十进制数字。
  * 科学计数法 1e3 1为有效数字，3为指数  即1000
* binary integer literal 二进制 
  * 只支持整数
  * 0b 开头，后面只能是0或1，不能有空格 0b111
* octal integer literal 八进制
  * 0o 开头，后面只能是 0 ~ 7
* hex integer literal 十六进制
  * 0x 开头，0 ~ 9 的数字，10 ~ 16 用 A ~ F 来表示

  0b 0o 0x 这些都是在 Number 类型中使用的。
  在用字符串表示 2 8 16 进制数时，不带这个头，直接上后面的数字。

  如  parseInt("11", 2)  // 3
      0b11.toString()   // "3"
      0b11.toString(2)  // "11"

  parseInt() 方法只能识别 "0x..." 十六进制字符串，二进制字符串 八进制字符串识别不了。


# statement 语句
## Grammar 简单语句 组合语句 声明
## Runtime completion record & lexical environment

### completion record 
用来存储语句完成结果（是否有返回值，返回值是什么 etc）的数据结构。
语句完成状态的记录

### completion record 组成的三个部分
* 类型 [[type]]: normal break continue return throw
* 返回值 [[value]]: 基本类型之一
* [[target]]: label 
  * 语句前加标识符和冒号，该语句就变成了带 label 的语句
  * break 与 continue 可能与带 label 的语句发生交互，所以它们往往会带一个 target 出来


### 简单语句
* expression statement 表达式语句 
  * 完全由表达式组成，可以简单到 一个表达式加一个分号
* empty statement
  * 空语句，单独一个分号。
  * 没卵用
* debugger statement
  * 一个 debugger 关键字加一个分号
  * 用于调试，上线前会移除

以下为控制语句
* throw statement 
  * 会抛出异常 throw someExpression
* continue statement
* break statement
* return statement

### 复合语句
* block statement 
  * 最重要
  * 一对花括号，中间一个语句的列表
  * 一般来说，其返回值的 type 是 normal

* if statement 分支结构

* switch statement 多分支结构 
  * 性能在 JavaScript 中与 if 没区别，在 C, C++ 中性能比连续 if 要高

* iteration statement 循环
  * while, do while, for, for in, for of, for await ...

* with statement
  * 通过 with 打开一个对象，把该对象的所有属性直接放进作用域里去
  * 带来较高的不确定性，不建议使用

* label statement
  * 在语句前面加上 label，相当于给语句取了名字
  * 有意义的使用场景：对 iteration statement 循环语句使用 label，配合 break continue 后面带 label

* try statement
  * try catch finally 三段结构
  * try 不能省略花括号
  * try 中即使有 return，finally 也会执行


break & continue 
break 后面可以加 label，这样 [[target]] 就是 label

# 声明
* function declaration
* generator declaration           function + * 
* async function declaration      async + function
* async generator declaration     async + function + *
* variable statement      var    function
* class declaration       class
* lexical declaration     const  let 

class const let TDZ 暂时性死区


## 预处理 pre-process
一段代码执行之前，JavaScript 引擎对代码预先做的处理.

预处理时，会提前找到所有的变量的声明，使之变成局部变量。
只不过旧有的 function var 会变量提升；新的 const let class 有暂时性死区。

例子：

var a = 2;

void function () {
  a = 1;
  return;
  var a;
}();

console.log(a); // 2
为什么不是 1 ，因为函数内部的作用域中，最后一行的，return 之后的 "var a" 被提升到了作用域顶部。
所以 函数内部的 a = 1 只修改了改作用域中的 a ，没有顺着作用域链影响到外部的 a

## 作用域
var 作用域是函数体
const/let 作用域是
  * 其外层的 {} block 块
  * 如果是循环语句中声明的，作用域是整个循环语句。（这个范围比语句中那个{}块要大，因为每次循环中不会产生新的变量）


# JavaScript 执行粒度 （运行时）
* 宏任务
* 微任务 Promise
* 函数调用 execution context
* 语句/声明 completion record
* 表达式 reference
* 直接量/变量/this...

## 宏任务 & 微任务
* 宏任务
  * 传给 JavaScript 引擎的任务
* 微任务 Promise
  * JavaScript 引擎内部的任务

## 事件循环 event loop

## 函数调用
同一个微任务中，由函数调用来决定代码的执行顺序，不一定是顺次执行
函数调用栈 execution context stack 存放
函数执行上下文 execution context 
栈顶元素是 running execution context

execution context 中保存的信息（7样，不会包含全部七种）
* code evaluation state
  * 用于 async & generator 函数，保存代码执行到哪一步；
* Funtion
  * 由 Function 初始化的 execution context 会存在此项
* Script or Module 之一
  * Script or Module 中的代码会有此项
* Generator
  * Generator 函数每次执行生成的，隐藏在背后的 Generator ？？？？？？

* Realm 
  * 保存所有内置对象
* Lexical Environment
  * this
  * new.target
  * super
  * 变量
* Variable Environment
  * 仅仅用于处理 var 声明的变量保存的环境

闭包

作用域链

realm

