const $ = Symbol('$'); // 截止符，唯一，但打印不出来
// const $ = '$'// 截止符

class Trie {
  constructor() {
    this.root = Object.create(null);
  }

  insert(word) {
    let curNode = this.root;
    // 查找
    for (const char of word) {
      if (!curNode[char]) {
        curNode[char] = Object.create(null);
      }
      // 就像查字典时的翻页跳转
      curNode = curNode[char];
    }
    // word 结束后添加戒指符
    if (!($ in curNode)) {
      // 初始化
      curNode[$] = 0;
    }
    // 标记该词出现了一次
    curNode[$]++;
  }

  most() {
    let max = 0;
    let maxWord = null;
    const visit = (node, word) => {
      if (node[$] && node[$] > max) {
        max = node[$];
        maxWord = word;
      }
      for (const key in node) {
        visit(node[key], word + key);
      }
    }
    visit(this.root, '');
    return maxWord;
  }
}

const randomWord = len => {
  let str = '';
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(Math.random() * 2 + 'a'.charCodeAt(0));
  }
  return str;
}

const trie = new Trie();

for (let i = 0; i < 10; i++) {
  trie.insert(randomWord(4));
}

console.log(JSON.stringify(trie, null, 4));
console.log(trie.most())