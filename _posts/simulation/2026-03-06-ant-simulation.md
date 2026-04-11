---
layout: post
title: "Ant Simulation"
author: "Listenzcc"
tags: Simulation
toc: true
---
本文通过程序模拟解释 How do the ants work together? 这个问题。

这个好奇是源自于媳妇的一句话，她在试用LLM后，觉得这个东西的原理不可能是“预测后一个字符”，因为这太简单和短视了，无法产生实际上已经出现的有价值的对话。这让我想到了小小的蚂蚁，每只蚂蚁的视野都很小，但群体却极其高效和有序。

本文的代码实现了 **双信息素蚁群系统**。整体结构可以理解为一个离散空间上的 **stochastic agent system**，其行为机制接近经典的 **Ant Colony Foraging Model**。体现了小小的蚂蚁如何通过每个短视的行为构筑起群体的高效与智能。

您可以在我的在线笔记本 <[Ant simulation / Chuncheng | Observable](https://observablehq.com/@listenzcc/ant-simulation)> 和博客 <[gp-ant-simulation](https://listenzcc.github.io/blog/2026-03-06/ant-simulation "gp-ant-simulation")> 找到实时在线版本和源码。

---

* This line will be replaced with the TOC
{:toc}

---

[toc]

## 从蚁群到优化算法

蚂蚁觅食行为不仅是一种有趣的群体行为模型，它实际上启发了一类重要的优化方法：
**蚁群优化算法（Ant Colony Optimization, ACO）**。

该算法最早由 Marco Dorigo 在 1990 年代提出，用于解决组合优化问题，例如旅行商问题。
其核心思想正是对前文模拟机制的抽象。

---

### 路径选择模型

在 ACO 中，问题通常表示为一张图：

$$
G = (V,E)
$$

其中

* $V$ 为节点
* $E$ 为路径

每条路径上存在信息素：

$$
\tau_{ij}
$$

表示从节点 $i$ 到节点 $j$ 的吸引程度。蚂蚁从节点 $i$ 选择下一个节点 $j$ 的概率为（当然，这只是理论式，实时并不会这么复杂）

$$
P_{ij} =
\frac{\tau_{ij}^{\alpha},\eta_{ij}^{\beta}}
{\sum_{k\in N(i)} \tau_{ik}^{\alpha},\eta_{ik}^{\beta}}
$$

其中

* $\tau_{ij}$ —— 信息素强度
* $\eta_{ij}$ —— 启发式信息（例如距离倒数）
* $\alpha,\beta$ —— 权重参数

简单来说：

* 信息素表示 **群体经验**
* 启发函数表示 **局部理性**

---

### 信息素更新机制

当蚂蚁完成一次路径后，会对经过的边进行强化：

$$
\tau_{ij} \leftarrow (1-\rho)\tau_{ij} + \Delta\tau_{ij}
$$

其中

* $\rho$ 为挥发率
* $\Delta\tau_{ij}$ 为新增信息素

通常

$$
\Delta\tau_{ij} = \frac{Q}{L}
$$

其中

* $L$ 为路径长度
* $Q$ 为常数

因此：

**路径越短 → 信息素增长越快。**

这与自然界蚂蚁的行为完全一致。

---

### 更短路径为何会自动出现

设两条路径长度分别为

$$
L_1 < L_2
$$

单位时间往返次数近似为

$$
n \propto \frac{1}{L}
$$

因此沉积信息素速度

$$
\frac{d\tau}{dt} \propto \frac{1}{L}
$$

于是

$$
\tau_1 > \tau_2
$$

更多蚂蚁会选择路径 1，形成 **正反馈循环**：

> 短路径 → 更多蚂蚁 → 更多信息素 → 更短路径

同时挥发机制防止系统陷入旧路径。

---

### 群体智能的一个重要特点

蚁群算法的特别之处在于：

**个体极其简单，但群体行为高度复杂。**

单个蚂蚁只具备一些极度短视的能力，包括：

* 随机探索
* 信息素跟随
* 信息素沉积

整个种群却能产生种种智能体才能具备的行为，比如：

* 最短路径发现
* 动态环境适应
* 群体协作

这种现象被称为 **Emergent Intelligence（涌现智能）**， 类似机制也出现在以下领域

* 鸟群模型（Boids）
* 鱼群行为
* 细菌趋化
* 神经网络学习

类似这样， **局部规则 + 环境记忆 → 群体智能。** 每只蚂蚁并不知道最短路径在哪里，但通过不断强化有效路径，整个系统像一台计算机一样，会通过不断试错“计算”出最优解。

换句话说， **优化并不一定需要中央控制。** 自然界通过极其简单的短视规则，就能完成复杂问题的求解。这与 LLM 是相近的，大量“预测下一个字”的小机制复合成具有智能的大系统。所以 LLM 表现出的智能是涌现出来的。

---

## 实时模拟

<link rel="stylesheet" href="/blog/src/simulation/2026-03-06-ant-simulation/style.css" />

<div class="card">
    <canvas id="antCanvas" width="1000" height="600"></canvas>

    <div class="stats-panel">
        <div class="stats">
            <div class="stat-item"><span class="stat-label">🐜 蚂蚁</span><span class="stat-value"
                    id="antCounter">0</span></div>
            <div class="stat-item"><span class="stat-label">🍎 食物</span><span class="stat-value"
                    id="foodCounter">2</span></div>
            <div class="stat-item"><span class="stat-label">🏠 回家中</span><span class="stat-value"
                    id="returningCounter">0</span></div>
            <div class="stat-item"><span class="stat-label">帧耗时</span><span class="stat-value"
                    id="fpsDisplay">0</span><span style="color:#7f92b0;">ms</span></div>
        </div>
        <div class="legend">
            <span><span class="dot-demo" style="background:#8aff8a;"></span>食物信息素</span>
            <span><span class="dot-demo" style="background:#5cc8ff;"></span>巢穴信息素</span>
            <span><span class="dot-demo" style="background:#ffe066;"></span>搬运工</span>
        </div>
    </div>

    <div class="control-bar">
        <div class="slider-item"><span>🎲 探索</span><input type="range" id="exploreRate" min="0.0" max="0.3"
                value="0.01" step="0.01"></div>
        <span style="color:#a0e0d0; margin-left:auto;">点击画布加食物</span>
        <button id="resetButton">🌱 重置蚁群</button>
    </div>
    <footer>🪹 巢穴 · 双信息素独立叠加 · 超过阈值停止排放</footer>
</div>

<script src="/blog/src/simulation/2026-03-06-ant-simulation/ants.js">
</script>

---

## 蚁群与信息素

自然界蚂蚁的协同行为主要依赖 **信息素 (pheromone)**。
单个蚂蚁几乎没有全局认知能力，但通过在环境中留下化学信号，可以形成一种 **间接通信机制（stigmergy）**。

在模拟中环境被离散为网格：

$$
G = {g_{i,j}}, \quad i=1..C, j=1..R
$$

每个格子记录两种信息素：

1. **食物信息素**(foodPheromone)

    $$
    P_f(i,j)
    $$

    表示通往食物源的路径强度。

2. **巢穴信息素**(homePheromone)

    $$
    P_h(i,j)
    $$

    表示通往巢穴的路径强度。

    蚂蚁在移动过程中会在当前位置沉积信息素：

    * 觅食蚂蚁留下 **回巢路径**
    * 携带食物的蚂蚁留下 **食物路径**

    信息素随时间挥发：

    $$
    P(t+1)=\max(0, P(t)-\lambda)
    $$

    这保证旧路径会逐渐消失，系统能够适应新的食物源。

### 永远能回家的策略

系统中每只蚂蚁具有两种状态：

* 觅食蚂蚁处于状态：STATE_FORAGING  (寻找食物)
* 回巢蚂蚁处于状态：STATE_CARRYING  (携带食物回巢)

觅食蚂蚁在移动时不断释放 **home pheromone**，并且强度随时间而减小

    ```javascript
    homePheromone[idx] = deposit
    ```

当蚂蚁获得食物后，其行为策略发生反转：

* 不再跟随食物信息素
* 改为跟随 **home pheromone 梯度**

在实现中，蚂蚁在 3×3 邻域寻找最大梯度方向， 这相当于执行一个离散梯度上升：

$$
v_{t+1} = v_t + \alpha (\nabla P - v_t)
$$

因此只要路径曾被探索过，回家的梯度就始终存在。
这就是蚂蚁“永远能回家”的机制。

### 引导到食物的策略

我们的虚拟蚂蚁按照以下规则引导同伴找到食物

    ```javascript
    // 当蚂蚁成功找到食物并开始返回巢穴时，它会留下 **food pheromone**：
    // 这个值随着蚂蚁距离食物的距离增加而减小
    foodPheromone[idx] = deposit

    // 同时记录 **信息素寿命**
    foodPheromoneAge[idx] = limit

    // 当寿命结束后信息素快速衰减：
    foodPheromone[i] -= fps
    ```

这种设计产生两个效果：

1. **新路径更强**
2. **旧路径自动消失**

因此系统会自动收敛到 **最短路径**。
原因很简单：
较短路径被距离食物的路程更近，因此容易标记成大值。

设路径长度为 (L)，单位时间往返次数约为

$$
n \propto \frac{1}{L}
$$

沉积速率

$$
\frac{dP}{dt} \propto \frac{1}{L}
$$

于是短路径的信息素浓度更高，蚂蚁更容易跟随它。
这就是经典 **positive feedback + evaporation** 机制。

### 群体模拟

整个系统是一个 **agent-based simulation**。
系统状态可以写为：

$$
S = (A, P_f, P_h)
$$

其中

* $A$ 为所有蚂蚁状态
* $P_f$ 食物信息素场
* $P_h$ 巢穴信息素场

每一帧执行以下步骤：

    ```javascript
    // 1. 信息素挥发
    updatePheromones()

    // 2. 蚂蚁决策
    applyAntDecision()

    // 3. 移动
    ant.x += vx
    ant.y += vy

    // 4. 沉积信息素
    depositPheromone()

    // 5. 环境交互
    handleInteractions()
    ```

系统行为具有几个典型 emergent phenomena:

1. 路径自组织
    随机探索 → 信息素放大 → 稳定路径

2. 最短路径收敛
    由于短路径往返频率更高。

3. 动态适应
    当食物消失时，路径随时间而消失

        ```txt
        pheromone → evaporation → path vanish
        ```

    群体重新探索。
