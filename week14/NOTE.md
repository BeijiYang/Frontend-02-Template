# 触屏
touch 系列事件与 mouse 系列事件的区别：touch start 触发时，也会触发 move，而且是和 start 在同一个元素上。

所以 touch 事件的监听不需要像 mouse 一样，在 mousedown 之后才监听 mousemove

鼠标晃动的时候，可以按下键，也可以不按；而 touchmove 无法越过 touchstart 执行。

特殊的 touchcancel , touch 事件被系统事件等打断

