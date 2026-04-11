// Minimal WebGL2 implementation for visualizing Liénard–Wiechert fields
// Real-time, configurable charge trajectory

const canvas = document.getElementById('canvas') || document.createElement('canvas');
const h2 = document.getElementById('canvasH2') || document.createElement('h2');
// document.body.appendChild(h2).textContent = 'Click to toggle sign';
// document.body.appendChild(canvas);
const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
canvas.width = size;
canvas.height = size;

const gl = canvas.getContext('webgl2');

let sign = 1;
canvas.addEventListener('click', () => {
    sign *= -1;
    h2.textContent = sign > 0 ? 'Same sign' : 'Opposite sign';
});
h2.textContent = sign > 0 ? 'Same sign' : 'Opposite sign';

// Vertex shader
const vs = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Fragment shader (core physics)
const fs = `#version 300 es
precision highp float;

out vec4 outColor;
in vec2 v_uv;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_sign;

const float c = 1.0;

// Charge trajectory (editable)
vec3 chargePos(float t) {
    // Example: oscillation
    return vec3(0.5 * sin(2.0 * t), 0.5 * cos(1.5 * t), 0.0);
}

vec3 chargePos1(float t) {
    // Example: oscillation
    return vec3(0.5 * sin(1.0 * t+0.2), 0.5 * cos(1.5 * t+0.1), 0.0);
}

// Solve retarded time via fixed-point iteration
float solve_tr(vec3 r, float t) {
    float tr = t;
    for(int i=0;i<20;i++){
        vec3 rp = chargePos(tr);
        float R = length(r - rp);
        tr = t - R / c;
    }
    return tr;
}

float solve_tr1(vec3 r, float t) {
    float tr = t;
    for(int i=0;i<20;i++){
        vec3 rp = chargePos1(tr);
        float R = length(r - rp);
        tr = t - R / c;
    }
    return tr;
}

vec3 computeE(float tr, vec3 r, vec3 rp, vec3 a, vec3 v) {
    vec3 Rvec = r - rp;
    float R = length(Rvec);
    vec3 n = normalize(Rvec);

    vec3 beta = v / c;
    vec3 betadot = a / c;

    float denom = pow(1.0 - dot(n, beta), 3.0);

    vec3 E = (n - beta) / (R*R*denom) + cross(n, cross(n - beta, betadot)) / (R*denom);
    return E;
}

float computeContour(float logIntensity) {
    // Add some contour lines for better visualization
    // ...
    // outColor.rgb = vec3(smoothstep(0.1, 10.0, logIntensity));
    // --- contour lines ---
    float levels = 20.0;                 // 控制等高线密度
    float scaled = logIntensity * levels;

    // 取小数部分
    // float f = fract(scaled);
    float f = abs(fract(scaled) - 0.5);

    // 线宽控制（抗锯齿）
    float width = max(fwidth(scaled), 0.001);

    // 生成等值线：在 f 接近 0 时画线
    // float contour = smoothstep(0.0, width, f) 
    //             * (1.0 - smoothstep(1.0 - width, 1.0, f));
    float contour = smoothstep(0.0, width, f);

    // 反转让线更亮
    contour = 1.0 - contour;
    return contour;
}

void main() {
    vec2 uv = (v_uv - 0.5) * 2.0;
    vec3 r = vec3(uv, 0.0);

    float t = u_time;
    float dt = 0.1;


    // Point 0
    float tr = solve_tr(r, t);
    vec3 rpOrig = chargePos(t);
    vec3 rp = chargePos(tr);
    vec3 rp_m = chargePos(tr - dt);
    vec3 rp_p = chargePos(tr + dt);
    vec3 v = (rp_p - rp_m) / (2.0 * dt);
    vec3 a = (rp_p - 2.0 * rp + rp_m) / (dt * dt);
    vec3 E = computeE(tr, r, rp, a, v);

    // Point 1
    tr = solve_tr1(r, t);
    vec3 rpOrig1 = chargePos1(t);
    rp = chargePos1(tr);
    rp_m = chargePos1(tr - dt);
    rp_p = chargePos1(tr + dt);
    v = (rp_p - rp_m) / (2.0 * dt);
    a = (rp_p - 2.0 * rp + rp_m) / (dt * dt);
    E += u_sign * computeE(tr, r, rp, a, v);

    // 防止动态范围漂移
    float intensity = length(E);
    float normIntensity = intensity / (1.0 + intensity);
    float logIntensity = log(normIntensity + 1.0);
    float contour = computeContour(logIntensity);

    // 基于强度的颜色映射
    outColor = vec4(vec3(logIntensity) * 0.8, 1.0);

    // 混合到颜色（红色等值线）
    outColor.rgb = mix(outColor.rgb, vec3(1.0, 0.0, 0.0), contour * 0.5);

    // 混合到颜色（相位等值线）
    // phase 0-1 对应 0-2π
    float phase = atan(E.y, E.x) / (2.0 * 3.14159) + 0.5;
    contour = computeContour(phase * 2.0); // 增加频率
    outColor.rgb = mix(outColor.rgb, vec3(phase, 0.5, 1.0), contour * 1.0);

    // Mix with red and yellow as the vec3 rp is the charge position
    outColor.rgb = mix(vec3(0.0, 1.0, 0.0), outColor.rgb, smoothstep(0.01, 0.02, length(rpOrig - r)));
    outColor.rgb = mix(vec3(1.0, 1.0, 0.0), outColor.rgb, smoothstep(0.01, 0.02, length(rpOrig1 - r)));
    // outColor.rgb = mix(vec3(1.0, 0.0, 0.0), outColor.rgb, smoothstep(0.01, 0.02, length(rp - r)));
}`;

function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
}

const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
gl.linkProgram(prog);

gl.useProgram(prog);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1,
    -1, 1, 1, -1, 1, 1
]), gl.STATIC_DRAW);

const loc = gl.getAttribLocation(prog, 'a_pos');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

const timeLoc = gl.getUniformLocation(prog, 'u_time');
const resLoc = gl.getUniformLocation(prog, 'u_resolution');
const signLoc = gl.getUniformLocation(prog, 'u_sign');

function render(t) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(timeLoc, t * 0.001);
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform1f(signLoc, sign);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);

// Notes:
// - Modify chargePos(t) for arbitrary trajectory
// - solve_tr implements approximate retarded time
// - Visualization shows |E|
