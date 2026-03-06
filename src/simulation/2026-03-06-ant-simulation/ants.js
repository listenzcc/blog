
const canvas = document.getElementById('antCanvas');
const ctx = canvas.getContext('2d');
const W = 1000, H = 600;

// ---------- 固定参数 ----------
const ANT_COUNT = 350;
const ANT_RADIUS = 4;
const NEST_POS = { x: 180, y: 300 };
const GRID_SIZE = 12;
const COLS = Math.ceil(W / GRID_SIZE);
const ROWS = Math.ceil(H / GRID_SIZE);

// 两种信息素网格
let foodPheromone = new Float32Array(COLS * ROWS);   // 引导觅食（食物源方向）
let foodPheromoneAge = new Float32Array(COLS * ROWS);   // 引导觅食（食物源方向）
let foodPheromoneAgeLimit = 20; // Seconds
let homePheromone = new Float32Array(COLS * ROWS);   // 引导回家（巢穴方向）

// 食物源列表
let foodSources = [];

// 蚂蚁状态
const STATE_FORAGING = 0;   // 外出觅食
const STATE_CARRYING = 1;   // 携带食物回巢

// 蚂蚁数组
let ants = [];

// 辅助函数
function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomAge() {
    return random(20 * fps, 30 * fps);
}

// 创建一只新蚂蚁（巢穴附近）
function createAntNearNest() {
    const angle = random(0, 2 * Math.PI);
    const dist = random(5, 25);
    return {
        x: NEST_POS.x + Math.cos(angle) * dist,
        y: NEST_POS.y + Math.sin(angle) * dist,
        vx: random(-1.2, 1.2),
        vy: random(-1.2, 1.2),
        r: ANT_RADIUS,
        state: STATE_FORAGING,
        age: randomAge(),
    };
}

function initAnts(count) {
    ants = []
    for (let i = 0; i < count; i++) { ants.push(createAntNearNest()) };
}

function resetSimulation() {
    initAnts(ANT_COUNT);
    foodPheromone.fill(0);
    foodPheromoneAge.fill(0);
    homePheromone.fill(0);
    foodSources = [
        { x: 750, y: 200, amount: 250, radius: 18 },
        { x: 820, y: 450, amount: 250, radius: 18 }
    ];
}

// 坐标转网格索引
function coordToGrid(px, py) {
    const col = Math.floor(px / GRID_SIZE);
    const row = Math.floor(py / GRID_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return -1;
    return row * COLS + col;
}

// 安全获取网格值（越界返回0）
function getGrid(grid, col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 0;
    return grid[row * COLS + col];
}

// ---------- 信息素更新：挥发----------
function updatePheromones() {
    // 挥发（原地衰减）
    const n = COLS * ROWS;

    for (let i = 0; i < n; i++) {
        if (foodPheromoneAge[i] > 0) foodPheromoneAge[i] -= 1;
        if (foodPheromoneAge[i] === 0 & foodPheromone[i] > 0) foodPheromone[i] -= fps;
    }
    // for (let i = 0; i < homePheromone.length; i++) {
    //     if (homePheromone[i] > 0)
    //         homePheromone[i] -= 0.1;
    // }
}


// ---------- 蚂蚁决策：根据状态选择跟随的信息素 ----------
function applyAntDecision(ant, exploreProb) {
    const col = Math.floor(ant.x / GRID_SIZE);
    const row = Math.floor(ant.y / GRID_SIZE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;

    // 探索
    if (Math.random() < exploreProb) {
        ant.vx += (random(-1, 1) - ant.vx) * 0.2;
        ant.vy += (random(-1, 1) - ant.vy) * 0.2;
        return;
    }

    // 觅食状态检测食物
    if (ant.state === STATE_FORAGING) {
        for (let i = foodSources.length - 1; i >= 0; i--) {
            const f = foodSources[i];
            const dx = f.x - ant.x;
            const dy = f.y - ant.y;
            const dist = Math.hypot(dx, dy);
            // 发现食物
            if (dist < (f.radius * 1.5)) {
                ant.vx = dx;
                ant.vy = dy;
                return
            }
        }
    }

    // 根据状态选择要跟随的信息素网格
    const pheromoneGrid = (ant.state === STATE_FORAGING) ? foodPheromone : homePheromone;

    // 感知3x3区域，寻找最大值方向
    let bestDx = 0, bestDy = 0;
    let maxVal = -Infinity;

    for (let dr = -1; dr < 2; dr++) {
        for (let dc = -1; dc < 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
            const val = pheromoneGrid[nr * COLS + nc];
            if (val > maxVal) {
                maxVal = val;
                // 目标位置为格子中心
                const targetX = (nc + 0.5) * GRID_SIZE;
                const targetY = (nr + 0.5) * GRID_SIZE;
                bestDx = targetX - ant.x;
                bestDy = targetY - ant.y;
            }
        }
    }

    // 如果找到了有效梯度，转向该方向；否则随机微动
    if (maxVal > 0.01) {
        const len = Math.hypot(bestDx, bestDy);
        if (len > 0.01) {
            const normDx = bestDx / len;
            const normDy = bestDy / len;
            const turnSpeed = 0.2;
            ant.vx += (normDx * 2.2 - ant.vx) * turnSpeed;
            ant.vy += (normDy * 2.2 - ant.vy) * turnSpeed;
            // ant.vx = normDx;
            // ant.vy = normDy;
        }
    } else {
        // 随机漫步
        if (Math.random() < 0.03) {
            ant.vx += random(-0.5, 0.5);
            ant.vy += random(-0.5, 0.5);
        }
    }

}

// 边界处理
function boundaryAnt(ant) {
    const r = ant.r;
    if (ant.x < r) { ant.x = r; ant.vx = Math.abs(ant.vx) * 0.6; }
    if (ant.x > W - r) { ant.x = W - r; ant.vx = -Math.abs(ant.vx) * 0.6; }
    if (ant.y < r) { ant.y = r; ant.vy = Math.abs(ant.vy) * 0.6; }
    if (ant.y > H - r) { ant.y = H - r; ant.vy = -Math.abs(ant.vy) * 0.6; }
}

// ---------- 食物拾取 & 巢穴卸货 ----------
function handleInteractions(ant) {
    // 觅食状态检测食物
    if (ant.state === STATE_FORAGING) {
        for (let i = foodSources.length - 1; i >= 0; i--) {
            const f = foodSources[i];
            const dx = f.x - ant.x;
            const dy = f.y - ant.y;
            const dist = Math.hypot(dx, dy);
            // 发现食物
            if (dist < f.radius) {
                ant.state = STATE_CARRYING;
                f.amount -= 1;
                if (f.amount <= 0) foodSources.splice(i, 1);
                ant.age = randomAge();
                // 放置食物信息素
                const idx = coordToGrid(ant.x, ant.y);
                if (ant.age > foodPheromone[idx]) foodPheromone[idx] = ant.age;
                foodPheromoneAge[idx] = foodPheromoneAgeLimit * fps;
                break;
            }
        }
    }

    // 携带状态检测巢穴
    if (ant.state === STATE_CARRYING) {
        const dx = NEST_POS.x - ant.x;
        const dy = NEST_POS.y - ant.y;
        const distToNest = Math.hypot(dx, dy);

        // 回到巢穴
        if (distToNest < 30) {
            ant.state = STATE_FORAGING;
            // 同时将蚂蚁位置稍微重置到巢穴中心附近，避免堆积
            const angle = random(0, 2 * Math.PI);
            ant.x = NEST_POS.x + Math.cos(angle) * 8;
            ant.y = NEST_POS.y + Math.sin(angle) * 8;
            ant.age = random(1000, 10000);
        }
    }
}

// ---------- 信息素排放 ----------
function depositPheromone(ant) {
    const idx = coordToGrid(ant.x, ant.y);
    const deposit = ant.age;

    if (idx < 0) return;

    if (ant.state === STATE_FORAGING) {
        // 觅食蚂蚁：排放巢穴信息素（标记回家的路）
        if (deposit > homePheromone[idx]) {
            homePheromone[idx] = deposit;
        }
    } else {
        // 携带蚂蚁：排放食物信息素（标记食物的路）
        if (deposit > foodPheromone[idx]) {
            foodPheromone[idx] = deposit;
        }
        foodPheromoneAge[idx] = foodPheromoneAgeLimit * fps;
    }
}

// 更新所有蚂蚁
function updateAnts(exploreProb) {
    let returningCount = 0;
    for (let ant of ants) {
        applyAntDecision(ant, exploreProb);

        // 速度限制
        const maxSpeed = (60 / fps) * (ant.state === STATE_CARRYING) ? 1.2 : 1.0;
        const sp = Math.hypot(ant.vx, ant.vy);
        if (sp > maxSpeed) {
            ant.vx = (ant.vx / sp) * maxSpeed;
            ant.vy = (ant.vy / sp) * maxSpeed;
        }

        ant.x += ant.vx;
        ant.y += ant.vy;
        ant.age -= 1;

        // Old ant is dead, birth new one.
        if (ant.age < 0) {
            ant.x = NEST_POS.x + random(-20, 20);
            ant.y = NEST_POS.y + random(-20, 20);
            ant.age = randomAge();
            ant.state = STATE_FORAGING;
        }

        boundaryAnt(ant);
        depositPheromone(ant);
        handleInteractions(ant);
        if (ant.state === STATE_CARRYING) returningCount++;
    }
    return returningCount;
}

// 简单碰撞推离（保持视觉舒适）
function handleCollisions() {
    const n = ants.length;
    for (let i = 0; i < n; i++) {
        const a1 = ants[i];
        for (let j = i + 1; j < n; j++) {
            const a2 = ants[j];
            // if (a1.state === STATE_CARRYING || a2.state === STATE_CARRYING) continue
            const dx = a2.x - a1.x;
            const dy = a2.y - a1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = 1.5 * (a1.r + a2.r);
            if (dist < minDist && dist > 0.01) {
                const overlap = (minDist - dist) * 0.25;
                const nx = dx / dist;
                const ny = dy / dist;
                a1.x -= nx * overlap;
                a1.y -= ny * overlap;
                a2.x += nx * overlap;
                a2.y += ny * overlap;
            }
        }
    }
}

// 绘制
function draw(ctx, returningCount) {
    ctx.clearRect(0, 0, W, H);

    const fMax = Math.max(...foodPheromone),
        hMax = Math.max(...homePheromone);

    // 绘制两种信息素背景（叠加）
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            const fVal = foodPheromone[idx] / fMax;
            const hVal = homePheromone[idx] / hMax;
            if (fVal > 0.01) {
                // ctx.fillStyle = `rgba(120, 255, 120, ${Math.min(fVal * 0.05, 0.4)})`;
                ctx.fillStyle = `rgba(120, 255, 120, ${fVal})`;
                ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
            }
            if (hVal > 0.01) {
                // ctx.fillStyle = `rgba(80, 180, 255, ${Math.min(hVal * 0.05, 0.3)})`;
                ctx.fillStyle = `rgba(80, 180, 255, ${hVal})`;
                ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
            }
        }
    }

    // 绘制食物源
    for (let f of foodSources) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#5faf5f';
        ctx.shadowColor = '#a0ffa0';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = '18px sans-serif';
        ctx.shadowBlur = 10;
        ctx.fillText('🍎', f.x - 12, f.y - 15);
        ctx.fillStyle = '#fff0b0';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(f.amount, f.x - 8, f.y + 20);
    }

    // 绘制巢穴
    ctx.shadowColor = '#3aa0ff';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(NEST_POS.x, NEST_POS.y, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#2a5f7a';
    ctx.fill();
    ctx.fillStyle = '#cceeff';
    ctx.font = 'bold 24px sans-serif';
    ctx.shadowBlur = 15;
    ctx.fillText('🪹', NEST_POS.x - 22, NEST_POS.y - 25);
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(NEST_POS.x, NEST_POS.y, 45, 0, 2 * Math.PI);
    ctx.stroke();

    // 绘制蚂蚁
    for (let ant of ants) {
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ant.x, ant.y, Math.min(ant.r, ant.age / fps), 0, 2 * Math.PI);
        if (ant.state === STATE_FORAGING) {
            ctx.fillStyle = '#f0e68c';
            ctx.shadowColor = '#ffd966';
        } else {
            ctx.fillStyle = '#ff5533';
            ctx.shadowColor = '#ff8800';
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        // ctx.arc(ant.x - 1.5, ant.y - 1.5, 1, 0, 2 * Math.PI);
        ctx.arc(ant.x + ant.vx * 1.5, ant.y + ant.vy * 1.5, 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#000';
        ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2fa0a0';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    document.getElementById('returningCounter').innerText = returningCount;
}

// 动画循环
let lastTimestamp = 0;
let frameTime = 0; // milliseconds
let fps = 60; // Hz
let animFrame;

let flagLoop = true;

function tick(now) {
    if (lastTimestamp) frameTime = now - lastTimestamp;
    lastTimestamp = now;
    fps = parseInt(1000 / frameTime);

    // 至少有一个食物源
    if (foodSources.length === 0) {
        foodSources.push({ x: Math.random() * W, y: Math.random() * H, amount: 200, radius: 18 });
    }

    // 从滑块获取参数
    const exploreProb = parseFloat(document.getElementById('exploreRate').value);

    // 更新信息素（挥发）
    updatePheromones()

    // 更新蚂蚁
    const returningCount = updateAnts(exploreProb);

    // 碰撞处理（可选）
    handleCollisions();

    // 绘制
    draw(ctx, returningCount);

    // 更新UI
    document.getElementById('antCounter').innerText = ants.length;
    document.getElementById('fpsDisplay').innerText = frameTime.toFixed(1);
    document.getElementById('foodCounter').innerText = foodSources.length;

    if (flagLoop)
        animFrame = requestAnimationFrame(tick);
}

// 启动
resetSimulation();
animFrame = requestAnimationFrame(tick);

// 事件绑定
document.getElementById('resetButton').addEventListener('click', resetSimulation);
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    foodSources.push({ x: mx, y: my, amount: 200, radius: 18 });

    // ants.map(ant => {
    //     ant.state = ant.state === STATE_FORAGING ? STATE_CARRYING : STATE_FORAGING;
    //     ant.ang = randomAge();
    //     const idx = coordToGrid(ant.x, ant.y);
    //     foodPheromoneAge[idx] = 10 * fps;
    // })
});

window.addEventListener('beforeunload', () => {
    if (animFrame) cancelAnimationFrame(animFrame);
});