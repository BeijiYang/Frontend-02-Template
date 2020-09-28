# JavaScript 动画

## setInterval()
`setInterval(() => {}, 16);`
16ms 60帧

相对不可控，可能产生积压，不管是否执行完，都放到 interval 队列中。

而执行完一次，再通过 setTimeout 或 requestAnimationFrame 再次执行，更安全。


## setTimeout()
16ms 60帧

需要函数名，不断调用自己
```
const tick = () => {
  ...
  setTimeout(tick, 16);
}
```

## raf requestAnimationFrame()
申请浏览器在执行下一帧的时候执行该函数，可以跟随浏览器的降帧降频操作。
推荐在现代浏览器环境使用，因为 setInterval 不可控制。
```
const tick = () => {
  ...
  requestAnimationFrame(tick, 16);
}
```

相对的，有 cancelAnimationFrame，可以避免资源浪费
```
const tick = () => {
  ...
const handler = requestAnimationFrame(tick, 16);
cancelAnimationFrame(handler);
}
```

# 时间线 timeline 设计

```
const TICK = Symbol('tick'); // 利用 Symbol 的唯一性确保私有，外部代码无法访问
const TICK_HANDLER = Symbol('tick-handler');

class Timeline {
  constructor() {
    // 初始化
    this[TICK] = () => {
      console.log('tick');
      requestAnimationFrame(this[TICK]); // 不断在下一帧时调用自身
    }
  }

  start() {
    // 启动私有的 tick（可以用 Symbol，利用其唯一性，确保文件外无法访问 tick）
    this[TICK]();
  }

  set rate() { }
  get rate() { } // rate 倍速播放

  pause() { } // 暂停
  resume() { }  // 恢复

  reset() { } // 重置
}
```

# 动画
* 属性动画
* 帧动画

## 属性动画
```
class Animation {
  constructor(object, property, startValue, endValue, duration, timingFunction) { // 五个属性动画的必选参数：对象、属性、起始值、终止值、时长。
  
  }
}
```
