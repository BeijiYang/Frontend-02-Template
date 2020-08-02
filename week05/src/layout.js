// 预处理 style
function getStyle(element) {
  if (!element.style) {
    // 用来存放处理结果。最好不要用 style 这个名字。
    element.style = {};
  }
  // console.log("----style-----")
  for (const prop in element.computedStyle) {
    // console.log("😊" + prop);
    // if (element.style.prop === void 0) console.log('w(ﾟДﾟ)w😊', element.computedStyle.value)
    const p = element.computedStyle.value;
    element.style[prop] = element.computedStyle[prop].value;

    // 把 px 单位的转为数字
    if (element.style[prop].toString().match(/px$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
    // 把数字字符串转换为数字类型
    if (element.style[prop].toString().match(/^[0-9\.]+$/)) {
      element.style[prop] = parseInt(element.style[prop]);
    }
  }
  return element.style;
}

function layout(element) {
  // console.log("-------layout-------")
  // console.log(JSON.stringify(element, null, 4))
  // 跳过没有 computedStyle 的元素
  if (!element.computedStyle) return;

  // 对 style 进行预处理
  const elementStyle = getStyle(element);

  // 仅以 flex 布局为例实现
  if (elementStyle.display !== 'flex') return;

  // 过滤文本节点等不相关的
  const items = element.children.filter(e => e.type === "element");
  // 为了支持 order 属性 ？？？？？
  items.sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  })

  const style = elementStyle; // 这是 “把 style 取出来”？

  // 开始主轴、交叉轴相关的逻辑处理

  ['width', 'height'].forEach(size => {
    if (style[size] === 'auto' || style[size] === '') {
      // 把空的变为 null，方便后续代码中进行判断
      style[size] = null;
    }
  })

  // 设置 flex 相关属性的默认值，确保不空
  if (!style.flexDirection || style.flexDirection === 'auto') {
    style.flexDirection = 'row';
  }
  if (!style.alignItems || style.alignItems === 'auto') {
    style.alignItems = 'stretch';
  }
  if (!style.justifyContent || style.justifyContent === 'auto') {
    style.justifyContent = 'flex-start';
  }
  if (!style.flexWrap || style.flexWrap === 'auto') {
    style.flexWrap = 'nowrap';
  }
  if (!style.alignContent || style.alignContent === 'auto') {
    style.alignContent = 'stretch';
  }
  // mainSize: 主轴尺寸 受flexDirection影响，是 width or height
  // mainStart, mainEnd: 最左缘 最右缘 受flexDirection影响 是 left/right or top/bottom; 受 row-reverse 影响，需要交换mainStart, mainEnd的值
  // mainSign （场景：从左开始去加？？？） +1 or -1 ???
  // mainBase: 有可能是一个从左开始或者从又开始的值？？？ 和 mainSign 是一对
  // 交叉轴的类似
  let mainSize, mainStart, mainEnd, mainSign, mainBase,
    crossSize, crossStart, crossEnd, crossSign, crossBase;

  if (style.flexDirection === 'row') {
    mainSize = 'width';
    mainStart = 'left';
    mainEnd = 'right';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  } else if (style.flexDirection === 'row-reverse') {
    mainSize = 'width';
    mainStart = 'right';
    mainEnd = 'left';
    mainSign = -1;
    mainBase = style.width;

    crossSize = 'height';
    crossStart = 'top';
    crossEnd = 'bottom';
  } else if (style.flexDirection === 'column') {
    mainSize = 'height';
    mainStart = 'top';
    mainEnd = 'bottom';
    mainSign = +1;
    mainBase = 0;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  } else if (style.flexDirection === 'column-reverse') {
    mainSize = 'height';
    mainStart = 'bottom';
    mainEnd = 'top';
    mainSign = -1;
    mainBase = style.height;

    crossSize = 'width';
    crossStart = 'left';
    crossEnd = 'right';
  }

  // 漏了 nowrap 的情况？？
  if (style.flexWrap === 'wrap-reverse') {
    let temp = crossStart;
    crossStart = crossEnd;
    crossEnd = temp;
    crossSign = -1;
  } else {
    crossBase = 0;
    crossSign = +1;
  }

  // 如果父元素没有设置主轴尺寸，即由子元素把父元素撑开。此处称该模式为 auto main size
  let isAutoMainSize = false;
  if (!style[mainSize]) {
    // auto sizing
    elementStyle[mainSize] = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // if (itemStyle[mainSize] !== null || itemStyle[mainSize]) { // 未完 不完整
      //   elementStyle[mainSize] = elementStyle[mainSize] // 未完 不完整
      // }
      if (itemStyle[mainSize] !== null || itemStyle[mainSize] !== (void 0)) {
        elementStyle[mainSize] = elementStyle[mainSize] + itemStyle[mainSize];
      }
    }
    isAutoMainSize = true;
  }

  // 把元素放进行里
  let flexLine = [];
  const flexLines = [flexLine];

  // 剩余空间 mainSpace, 设为父元素的 mainsize
  let mainSpace = elementStyle[mainSize];
  let crossSpace = 0;
  // 循环所有的 flex items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    var itemStyle = getStyle(item); // var...
    // 设置默认主轴尺寸
    if (itemStyle[mainSize] === null) {
      itemStyle[mainSize] = 0;
    }
    // 单行 与 换行 的逻辑
    // 若有属性 flex (不是 display: flex)，说明该元素可伸缩，即一定可以放进 flexLine 里
    if (itemStyle.flex) {
      flexLine.push(item);
    } else if (style.flexWrap === 'nowrap' && isAutoMainSize) {
      mainSpace -= itemStyle[mainSize];
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        // e.g. 算行高(当flex direction 为 row时)
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      // nowrap
      flexLine.push(item);
    } else { // 开始换行的逻辑
      // 若有元素主轴尺寸比父元素还大，则压缩到跟父元素一样大。(举例思考容易理解，如宽度)
      if (itemStyle[mainSize] > style[mainSize]) {
        itemStyle[mainSize] = style[mainSize];
      }
      // 若主轴内剩下的空间不足以容纳每一个元素 ?? 则换行
      if (mainSpace < itemStyle[mainSize]) {
        flexLine.mainSpace = mainSpace // 存储主轴剩余的空间，之后要用
        flexLine.crossSpace = crossSpace; // 存储交叉轴剩余空间
        // 前两行都是处理旧的 flexline  得出该行实际剩余的尺寸，和实际占的尺寸 ？
        // 接下来创建新行。当前的 item 已经放不进旧的行了。
        flexLine = [item]; // 创建一个新的 flex line
        flexLines.push(flexLine);
        // 重置两个属性
        mainSpace = style[mainSize];
        crossSpace = 0;
      } else { // 如果主轴内还能方向该元素
        flexLine.push(item);
      }
      // 接下来 还是算主轴和交叉轴的尺寸
      if (itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) {
        crossSpace = Math.max(crossSpace, itemStyle[crossSize]);
      }
      mainSpace -= itemStyle[mainSize];
    }
  }
  // 如果元素没了？？？？循环完成的意思？ 给最后一行的 flexline 加上 mianspace （这是写循环的技巧 ？？）
  flexLine.mainSpace = mainSpace;
  // console.log("😊" + items)

  // 计算主轴位置的代码，是放这个位置吗？？？？？？
  if (style.flexWrap === "nowrap" || isAutoMainSize) {
    flexLine.crossSpace = (style[crossSize] !== undefined) ? style[crossSize] : crossSpace;
  } else {
    flexLine.crossSpace = crossSpace;
  }

  if (mainSpace < 0) {
    // overflow (happens only if container is single line), scale every item 
    // 只会发生在单行，算特情
    // 等比压缩
    let scale = style[mainSize] / (style[mainSize] - mainSpace) // style[mainSize] 是容器的主轴尺寸，它减去 mainSpace 是期望的尺寸
    let currentMain = mainBase;

    // 循环每一个元素，找出样式
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemStyle = getStyle(item);

      if (itemStyle.flex) {
        // flex 元素不参与等比压缩，故而尺寸设为 0
        itemStyle[mainSize] = 0;
      }

      itemStyle[mainSize] = itemStyle[mainSize] * scale;

      // 以 row 的情况为例，计算压缩之后的 left 和 right。
      itemStyle[mainStart] = currentMain; // currentMain 当前排到哪儿了
      itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize]; // left（start） 加上宽度，就是 right（end） 的值
      currentMain = itemStyle[mainEnd];
    }
  } else {
    // 多行
    // process each flex line
    flexLines.forEach(function (items) {
      const mainSpace = items.mainSpace;
      let flexTotal = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let itemStyle = getStyle(item);
        // 在循环中找出 flex 元素，把 flex 加到 flexTotal 上去
        if ((itemStyle.flex !== null) && (itemStyle.flex !== (void 0))) {
          flexTotal += itemStyle.flex;
          continue;
        }
      } // for 循环的括范围弄错了

      // 如果flex 元素存在，就把 mianSpace 均匀地分布给每一个 flex 元素 (如果有 flex 元素，永远是占满整个行，justifyContent 属性用不上)
      if (flexTotal > 0) {
        let currentMain = mainBase;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemStyle = getStyle(item);
          // 如果是 flex 元素，根据收集元素进行的时候计算得出的 mainSpace（每行的主轴方向的剩余空间），按比例（除以总值，乘以自己的flex）划分，得出这些 flex 元素各自的主轴尺寸
          if (itemStyle.flex) {
            itemStyle[mainSize] = (mainSpace / flexTotal) * itemStyle.flex;
          }
          // 跟前面如出一辙，先给一个 currentMain，它一开始等于 mainBase，每排一个元素，currentMain 就加一个（主轴方向的正负符号*主轴方向的尺寸），算得 mainEnd
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd];
        }
      } else { // 如果没有 flex 元素，就把主轴方向的剩余空间，根据 justifyContent的规则分配
        let currentMain, step;
        if (style.justifyContent === 'flex-start') {
          currentMain = mainBase; // 以 row 为例，从左向右排。currentMain 就是 mainBase
          step = 0; // 每个元素之间没有间隔
        }
        if (style.justifyContent === 'flex-end') {
          currentMain = mainBase + mainSpace * mainSign; // 以 row 为例，从右向左排。currentMain 是 mainBase + mainSpace 剩余空间
          step = 0; // 每个元素之间没有间隔
        }
        if (style.justifyContent === 'center') {
          currentMain = mainBase + mainSpace / 2 * mainSign;
          step = 0; // 每个元素之间没有间隔
        }
        if (style.justifyContent === 'space-between') {
          currentMain = mainBase;
          step = mainSpace / (items.length - 1) * mainSign; // 每个元素直接有间隔，总共有 items.length - 1 个间隔
        }
        if (style.justifyContent === 'space-around') {
          currentMain = step / 2 + mainBase;
          step = mainSpace / items.length * mainSign; // 每个元素直接有间隔，总共有 items.length 个间隔
        }
        if (style.justifyContent === 'space-evenly') {
          step = mainSpace / (items.length + 1) * mainSign
          currentMain = step + mainBase
        }
        // 所有的元素都是 根据 mainstart 和  mainsize 算 mainend
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          itemStyle[mainStart] = currentMain;
          itemStyle[mainEnd] = itemStyle[mainStart] + mainSign * itemStyle[mainSize];
          currentMain = itemStyle[mainEnd] + step;
        }
        // 至此，计算出所有的主轴尺寸。以 row 为例，是 宽width  左left  右right
      }
      // }
    })
  }



  // 计算交叉轴位置的代码，是放这个位置吗？？？？？？
  // let crossSpace;// 计算是否已经把父元素的 crossSpace 填满了

  if (!style[crossSize]) { // 若父元素没有 crossSize， crossSpace 永远为零
    crossSpace = 0;
    elementStyle[crossSize] = 0;
    // 还需要把撑开的高度加上去
    for (let i = 0; i < flexLines.length; i++) {
      elementStyle[crossSize] = elementStyle[crossSize] + flexLines[i].crossSpace;
    }
  } else { // 如果有行高，总的 crossSize 依次减去每行的 crossSize，得到一个剩余的行高
    crossSpace = style[crossSize];
    for (let i = 0; i < flexLines.length; i++) {
      crossSpace -= flexLines[i].crossSpace; // 剩余的行高
    }
  }
  // wrap-reverse 从尾到头 影响 crossBase
  if (style.flexWrap === 'wrap-reverse') {
    crossBase = style[crossSize];
  } else {
    crossBase = 0;
  }
  // 每行的 size 等于 总体的交叉轴尺寸 除以 行数
  let lineSize = style[crossSize] / flexLines.length;
  let step;
  // 根据 alignContent 的属性分配行高，矫正 crossSpace
  if (style.alignContent === 'flex-start') {
    crossBase += 0; // crossBase 增量为零
    step = 0;
  }
  if (style.alignContent === 'flex-end') {
    crossBase += crossSpace * crossSign; // 增量把 crossspace 放在尾巴上
    step = 0;
  }
  if (style.alignContent === 'center') {
    crossBase += crossSpace * crossSign / 2; // 剩余空间除以二
    step = 0;
  }
  if (style.alignContent === 'space-between') {
    crossBase += 0;
    step = crossSpace / (flexLines.length - 1);
  }
  if (style.alignContent === 'space-around') {
    crossBase += crossSign * step / 2;
    step = crossSpace / (flexLines.length);
  }
  if (style.alignContent === 'stretch') {
    crossBase += 0;
    step = 0;
  }
  flexLines.forEach(function (items) {
    let lineCrossSize = style.alignContent === 'stretch'
      ? items.crossSpace + crossSpace / flexLines.length // 给剩余空间做分配
      : items.crossSpace; // 填满
    // 计算每个元素的交叉轴尺寸
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let itemStyle = getStyle(item);

      let align = itemStyle.alignSelf || style.alignItems; // 元素本身的 alignSelf  优先于 父元素的 align Items

      // 未指定交叉轴尺寸
      if (itemStyle[crossSize] === null) {
        itemStyle[crossSize] = align === 'stretch'
          ? lineCrossSize // 满属性
          : 0;
      }
      console.log('w(ﾟДﾟ)w😊', crossSize)

      if (align === 'flex-start') {
        itemStyle[crossStart] = crossBase;
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }
      if (align === 'flex-end') {
        itemStyle[crossStart] = crossBase + crossSign * lineCrossSize;
        itemStyle[crossEnd] = itemStyle[crossEnd] - crossSign * itemStyle[crossSize];
      }
      if (align === 'center') {
        itemStyle[crossStart] = crossBase + crossSign * lineCrossSize[crossSize] / 2;
        itemStyle[crossEnd] = itemStyle[crossStart] + crossSign * itemStyle[crossSize];
      }
      if (align === 'stretch') {
        itemStyle[crossStart] = crossBase;
        // itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize] !== null && itemStyle[cross])); // 又他妈不完整
        itemStyle[crossEnd] = crossBase + crossSign * ((itemStyle[crossSize] !== null && itemStyle[crossSize] !== (void 0)) ? itemStyle[crossSize] : lineCrossSize)

        itemStyle[crossSize] = crossSign * (itemStyle[crossEnd] - itemStyle[crossStart]);

      }
    }
    crossBase += crossSign * (lineCrossSize + step);
  })
  // console.log(items)
}

module.exports = layout;





