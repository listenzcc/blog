---
layout: post
title: "Grid in WebGL"
author: "Listenzcc"
tags: WebGL
toc: true
---
Drawing the grid using the WebGL.

---

* This line will be replaced with the TOC
{:toc}

## 使用 WebGL 绘制可交互的网格

在前端图形编程中，网格是一种非常基础且常见的视觉元素。无论是作为坐标参考系，还是作为可视化背景，网格都能帮助我们更好地理解空间关系。本文将通过一个完整的 WebGL 示例，展示如何绘制一个动态的、可交互的网格，并且支持直角坐标和极坐标两种模式。

你将看到一个可交互的网格。直角网格下，背景为简单的红蓝渐变；极坐标模式下，背景变为色环，网格线沿角度和半径方向分布。通过调节参数，你可以直观地看到线条粗细、密度以及边缘柔和度的变化。

<div>
    <canvas id='canvas'></canvas>
</div>
<script src="/blog/src/gui/dat.gui.min.js"></script>
<script src="/blog/src/webgl/2026-02-25-grid-in-webgl.js"></script>

## 程序概览

这个程序使用原生 WebGL 在画布上绘制网格，并通过 `dat.GUI` 提供了实时控制参数的面板。核心功能包括：

* 自适应画布尺寸（保持 16:9 比例）
* 两种网格模式：直角坐标网格和极坐标网格
* 可调节的网格密度、线宽、边缘羽化（feather）
* 使用着色器中的 `wireframe` 函数实现平滑、抗锯齿的网格线

## 核心技术点

### 1. WebGL 上下文与画布适配

代码首先获取 canvas 元素，并设置其尺寸为父容器宽度的 16:9 比例。通过监听 `resize` 事件，画布可以在窗口大小改变时自适应调整。

```javascript
function resizeCanvas() {
  const w = main.clientWidth;
  canvas.width = w;
  canvas.height = w / ratio;
  if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
}
```

### 2. 着色器代码组织

为了保持代码清晰，作者将所有 GLSL 代码片段定义在一个 `glsl` 对象中，包括：

* **标准导数扩展** `OES_standard_derivatives`：用于 `fwidth` 函数，实现抗锯齿线条。
* **数学常量** 如 PI、复数运算辅助函数。
* **HSV 转 RGB** 函数，用于极坐标模式下生成彩色背景。
* **复数运算** 函数集（虽然本示例中未直接使用，但为扩展留有余地）。
* **wireframe 函数**：核心网格线算法，支持不同维度的参数。

### 3. 顶点着色器

顶点着色器非常简单：接收一个二维顶点位置（范围 -1 到 1），将其乘以宽高比 `u_ratio` 后传递给片段着色器。这样做是为了保持网格在不同屏幕比例下显示为均匀的方格。

```glsl
attribute vec2 position;
uniform float u_ratio;
varying vec2 v_position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    v_position = vec2(position.x * u_ratio, position.y);
}
```

### 4. 片段着色器与网格生成

片段着色器包含了两种网格模式的核心逻辑：

* **直角坐标网格**：直接使用 `v_position` 乘以网格密度因子 `u_gridSize`，然后通过 `wireframe` 函数计算该点是否靠近网格线。
* **极坐标网格**：将坐标转换为极坐标形式 `(半径, 角度)`，角度归一化到 `[0,1)` 范围，同样使用 `wireframe` 函数绘制同心圆和径向线。

#### wireframe 函数解析

`wireframe` 函数是实现高质量网格的关键。它利用了导数的思想，根据屏幕空间的变化率自适应地调整线条宽度，从而避免锯齿。

核心思路：对输入的参数（如坐标）取小数部分，并计算到最近整数线的距离。通过 `fwidth` 获得该参数在屏幕上的变化率，结合线宽和羽化值，使用 `smoothstep` 生成平滑过渡的线条。

```glsl
float wireframe (vec2 parameter, float width, float feather) {
    float w1 = width - feather * 0.5;
    vec2 d = fwidth(parameter);
    vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
    vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
    return min(a2.x, a2.y);
}
```

#### 颜色混合

在片段着色器中，首先根据模式计算基础颜色（直角坐标下为简单的渐变，极坐标下使用 HSV 生成色环），然后将网格因子与背景混合，使网格线呈现白色半透明效果。

```glsl
gridFactor = 1.0 - wireframe(...);
gl_FragColor = mix(vec4(rgb, 1.0), vec4(vec3(1.0), gridFactor), gridFactor*0.5);
```

### 5. 数据传递与 GUI 控制

通过 `dat.GUI` 创建控制面板，调整以下参数：

* **Grid Size**：网格密度
* **Line Width**：线条宽度
* **Line Feather**：边缘羽化程度
* **Polar Grid**：切换直角/极坐标模式

每次参数改变时，更新对应的 uniform 值。

### 6. 渲染循环

使用 `requestAnimationFrame` 驱动持续渲染，保证画布实时更新。

## 总结

这个示例展示了 WebGL 在绘制基本图形方面的灵活性。通过组合简单的顶点数据和强大的片段着色器，我们可以实现各种复杂的视觉效果。`wireframe` 函数的技巧尤其值得借鉴，它利用屏幕空间导数实现了设备无关的线条渲染，是抗锯齿线条的常用方法。

希望这篇文章能帮助你理解 WebGL 渲染管线以及如何利用着色器绘制高质量的网格。完整代码可以在文末找到，你也可以在此基础上扩展更多功能，比如动态动画、纹理映射等。
