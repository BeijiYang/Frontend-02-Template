const kmp = (source, pattern) => {
  // 计算跳转表格 table，找 pattern 里的自重复
  const table = new Array(pattern.length).fill(0);
  {
    // 截止至 i 位置之前，有 j 个自重复
    let i = 1, j = 0;
    while (i < pattern.length) {
      // 当 i j 两个位置重复
      if (pattern[i] === pattern[j]) {
        i++;
        j++;
        // 记录：截止至 i 位置之前，有 j 个自重复
        table[i] = j;
      } else {
        // 当两个位置不重复，j 的位置(不在起点时)回退，直到退回起点。此时，全部可能的位置都试过了，i 都匹配不上，则 i 继续往前检测下一个
        if (j > 0) {
          // 回退到上一个可能的位置
          j = table[j];
        } else {
          // 全部可能的位置都试过了，i 都匹配不上
          i++;
        }
      }
    }
  }
  console.log(table);
  // 匹配，找两个字符串之间的重复
  {
    // i 在 source string，j 在 pattern string
    let i = 0, j = 0;

    while (i < source.length) {
      // 当两个字符串 i j 对应位置匹配，i j 进位匹配下一位
      if (pattern[j] === source[i]) {
        j++;
        i++;
      } else {
        // 当不匹配，pattern 上的 j 根据跳转表格 table 回退至上一个可能的位置，直到 j 退至起点，i 再进位
        if (j > 0) {
          j = table[j];
        } else {
          i++;
        }
      }
      // pattern 串所有 char 都匹配完成
      if (j === pattern.length) return true;
    }
    // source 串所有 char 都匹配完成
    return false;
  }
}

// leetcode 28

// kmp('', 'abcdabce'); // [ 0, 0, 0, 0, 0, 1, 2, 3 ]
// kmp('', 'abababc'); // [ 0, 0, 0, 1, 2, 3, 4 ]
// kmp('', 'aabaaac'); // [ 0, 0, 1, 0, 1, 2, 2 ]
console.log(
  kmp('ababc', 'abc')
)