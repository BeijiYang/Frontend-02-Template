// 用正则表达式 和 正则表达式的捕获关系 进行词法分析
const regexp = /([0-9\.]+)|([ \t]+)|([\r\n]+)|(\*)|(\/)|(\+)|(\-)/g // | 相当于 或 

const dictionary = [
  'Number',
  'Whitespace', // 支持 空格 和 tab 符
  'LineTerminator', // 支持 \r 和 \n
  '*', '/', '+', '-'
];

function* tokenize(source) {
  let result = null;
  let lastIndex = 0;
  while (true) {
    // The lastIndex is a read/write integer property of regular expression instances that specifies the index at which to start the next match.
    lastIndex = regexp.lastIndex;
    result = regexp.exec(source);
    // 当匹配不到返回 null
    if (!result) break;

    if (regexp.lastIndex - lastIndex > result[0].length) {
      // 每次匹配前进的长度 大于 匹配出来的字符串长度，说明有无法识别的内容/格式
      // throw Error('')
      break;
    }

    const token = {
      type: null,
      value: null
    }
    // 匹配的结果里，第 0 位是整个的结果，后面是分别匹配到的元素
    for (let i = 1; i <= dictionary.length; i++) {
      if (result[i]) {
        token.type = dictionary[i - 1];
      }
    }
    token.value = result[0];
    yield token;
  }
  yield {
    type: 'EOF'
  }
}

const test = '1 + 2 * 5 + 3';

const source = [];
for (const token of tokenize(test)) {
  if (token.type !== 'Whitespace' && token.type !== 'LineTerminator') {
    source.push(token);
  }
}


// 产生整体的，最外层的，带 EOF 的结构
const Expression = tokens => {
  if (source[0].type === 'AdditiveExpression' && source[1] && source[1].type === 'EOF') {
    let node = {
      type: 'Expression',
      children: [
        source.shift(),
        source.shift()
      ]
    }
    source.unshift(node);
    return node;
  }
  // 该层包含所有的 AdditiveExpression 层的逻辑
  AdditiveExpression(source);
  return Expression(source);
}

const AdditiveExpression = source => {
  if (source[0].type === 'MultiplicativeExpression') {
    let node = {
      type: 'AdditiveExpression',
      children: [source[0]]
    }
    source[0] = node;
    return AdditiveExpression(source);
  }
  if (source[0].type === 'AdditiveExpression' && source[1] && source[1].type === '+') {
    let node = {
      type: 'AdditiveExpression',
      operator: '+',
      children: []
    }
    node.children.push(source.shift());
    node.children.push(source.shift());
    // 把 source 中的非终结符，如 MultiplicativeExpression 处理掉
    MultiplicativeExpression(source);
    node.children.push(source.shift());
    source.unshift(node);
    return AdditiveExpression(source);
  }
  if (source[0].type === 'AdditiveExpression' && source[1] && source[1].type === '-') {
    let node = {
      type: 'AdditiveExpression',
      operator: '+',
      children: []
    }
    node.children.push(source.shift());
    node.children.push(source.shift());
    // 把 source 中的非终结符，如 MultiplicativeExpression 处理掉
    MultiplicativeExpression(source);
    node.children.push(source.shift());
    source.unshift(node);
    return AdditiveExpression(source);
  }
  // 递归结束条件: 首位是 AdditiveExpression，后面没有加号或减号。因为前面的 if 都有 return，这里相当于 else 分支
  if (source[0].type === 'AdditiveExpression') {
    return source[0];
  }
  // 如果是 AdditiveExpression 不认识的东西，如 Number
  // 该层包含所有的 MultiplicativeExpression 层的逻辑
  MultiplicativeExpression(source);
  return AdditiveExpression(source)
}
// 结构参考产生式。 数字 乘法 除法
const MultiplicativeExpression = source => {
  // 第一个 token
  if (source[0].type === 'Number') {
    let node = {
      type: 'MultiplicativeExpression',
      children: [source[0]], // 把原来的 token 放进 children，构建树形关系
    }
    source[0] = node; // 产生新的 MultiplicativeExpression 结构，替换到原位置
    return MultiplicativeExpression(source); // 递归调用自身，因为变化后的 source 结构可能仍然符合 MultiplicativeExpression 的条件。如案例“”，连续三次都符合本条件
  }

  if (source[0].type === 'MultiplicativeExpression' && source[1] && source[1].type === "*") {
    let node = {
      type: 'MultiplicativeExpression',
      operator: '*',
      children: []
    }
    // 前三项合成一个新的 MultiplicativeExpression。如 10 * 25， 三项就分别是
    // {
    //   type: 'MultiplicativeExpression',
    //     children: [{ type: 'Number', value: '10' }]
    // }

    // { type: '*', value: '*' }

    // { type: 'Number', value: '25' }
    node.children.push(source.shift());
    node.children.push(source.shift());
    node.children.push(source.shift());
    source.unshift(node); // 产生新的 MultiplicativeExpression 结构，替换到原位置
    return MultiplicativeExpression(source);  // 递归调用自身
  }
  // 可以与乘法部分合并，为了与产生式一一对应，分开写
  if (source[0].type === 'MultiplicativeExpression' && source[1] && source[1].type === "/") {
    let node = {
      type: 'MultiplicativeExpression',
      operator: '*',
      children: []
    }
    // 前三项合成一个新的 MultiplicativeExpression
    node.children.push(source.shift());
    node.children.push(source.shift());
    node.children.push(source.shift());
    source.unshift(node); // 产生新的 MultiplicativeExpression 结构，替换到原位置
    return MultiplicativeExpression(source);  // 递归调用自身
  }

  // 递归结束条件: 首位是 MultiplicativeExpression，后面没有乘号或除号。因为前面的 if 都有 return，这里相当于 else 分支
  if (source[0].type === 'MultiplicativeExpression') {
    return source[0];
  }
  // 最后如果有其他情况，默认递归调用自己。应该用不到这个 return
  return MultiplicativeExpression(source);
}

console.log(
  JSON.stringify(Expression(source), null, 2)
)

/**
 * {
  "type": "Expression",
  "children": [
    {
      "type": "AdditiveExpression",
      "operator": "+",
      "children": [
        {
          "type": "AdditiveExpression",
          "operator": "+",
          "children": [
            {
              "type": "AdditiveExpression",
              "children": [
                {
                  "type": "MultiplicativeExpression",
                  "children": [
                    {
                      "type": "Number",
                      "value": "1"
                    }
                  ]
                }
              ]
            },
            {
              "type": "+",
              "value": "+"
            },
            {
              "type": "MultiplicativeExpression",
              "operator": "*",
              "children": [
                {
                  "type": "MultiplicativeExpression",
                  "children": [
                    {
                      "type": "Number",
                      "value": "2"
                    }
                  ]
                },
                {
                  "type": "*",
                  "value": "*"
                },
                {
                  "type": "Number",
                  "value": "5"
                }
              ]
            }
          ]
        },
        {
          "type": "+",
          "value": "+"
        },
        {
          "type": "MultiplicativeExpression",
          "children": [
            {
              "type": "Number",
              "value": "3"
            }
          ]
        }
      ]
    },
    {
      "type": "EOF"
    }
  ]
}
 */

// for (const token of tokenize(test)) {
//   console.log(token);
// }
// { type: 'Number', value: '1024' }
// { type: 'Whitespace', value: ' ' }
// { type: '+', value: '+' }
// { type: 'Whitespace', value: ' ' }
// { type: 'Number', value: '10' }
// { type: 'Whitespace', value: ' ' }
// { type: '*', value: '*' }
// { type: 'Whitespace', value: ' ' }
// { type: 'Number', value: '25' }