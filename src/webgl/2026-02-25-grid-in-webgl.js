
console.log('Using WebGL to draw a grid');

const glsl = Object.freeze({
    useStandardDerivatives: `
    #extension GL_OES_standard_derivatives : enable
  `,
    constants: `
    #define PI 3.141592653589793238
    #define HALF_PI 1.57079632679
    #define HALF_PI_INV 0.15915494309
    #define LOG_2 0.69314718056
    #define C_ONE (vec2(1.0, 0.0))
    #define C_I (vec2(0.0, 1.0))
    #define TO_RADIANS 0.01745329251
  `,
    precision: `
    precision mediump float;
  `,
    hsv2rgb: `
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
  `,
    complex: `
    float cosh (float x) {
      return 0.5 * (exp(x) + exp(-x));
    }

    float sinh (float x) {
      return 0.5 * (exp(x) - exp(-x));
    }

    vec2 sinhcosh (float x) {
      float ex = exp(x);
      float emx = exp(-x);
      return 0.5 * vec2(
        ex + emx,
        ex - emx
      );
    }

    vec2 cmul (vec2 a, vec2 b) {
      return vec2(
        a.x * b.x - a.y * b.y,
        a.y * b.x + a.x * b.y
      );
    }

    vec2 cmul (vec2 a, vec2 b, vec2 c) {
      return cmul(cmul(a, b), c);
    }

    vec2 cdiv (vec2 a, vec2 b) {
      return vec2(
        a.y * b.y + a.x * b.x,
        a.y * b.x - a.x * b.y
      ) / dot(b, b);
    }

    vec2 cinv (vec2 z) {
      return vec2(z.x, -z.y) / dot(z, z);
    }

    vec2 cexp (vec2 z) {
      return vec2(cos(z.y), sin(z.y)) * exp(z.x);
    }

    vec2 clog (vec2 z) {
      return vec2(
        log(hypot(z)),
        atan(z.y, z.x)
      );
    }

    vec2 cpolar (vec2 z) {
      return vec2(
        atan(z.y, z.x),
        hypot(z)
      );
    }

    vec2 cpow (vec2 z, float x) {
      float r = hypot(z);
      float theta = atan(z.y, z.x) * x;
      return vec2(cos(theta), sin(theta)) * pow(r, x);
    }

    vec2 cpow (vec2 a, vec2 b) {
      float aarg = atan(a.y, a.x);
      float amod = hypot(a);
      float theta = log(amod) * b.y + aarg * b.x;
      return vec2(cos(theta), sin(theta)) * pow(amod, b.x) * exp(-aarg * b.y);
    }

    vec2 csqrt (vec2 z) {
      vec2 zpolar = cpolar(z);
      float theta = zpolar.x * 0.5;
      float mod = sqrt(zpolar.y);
      return vec2(cos(theta), sin(theta)) * mod;
    }

    vec2 csqr (vec2 z) {
      return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
    }

    vec2 ccos (vec2 z) {
      return sinhcosh(z.y) * vec2(cos(z.x), -sin(z.x));
    }

    vec2 csin (vec2 z) {
      return sinhcosh(z.y).yx * vec2(sin(z.x), cos(z.x));
    }

    vec2 ctan (vec2 z) {
      vec2 e2iz = cexp(2.0 * vec2(-z.y, z.x));
      return cdiv(e2iz - C_ONE, cmul(C_I, C_ONE + e2iz));
    }

    vec2 cacos (vec2 z) {
      vec2 t1 = csqrt(vec2(z.y * z.y - z.x * z.x + 1.0, -2.0 * z.x * z.y));
      vec2 t2 = clog(vec2(t1.x - z.y, t1.y + z.x));
      return vec2(HALF_PI - t2.y, t2.x);
    }

    vec2 casin (vec2 z) {
      vec2 t1 = csqrt(vec2(z.y * z.y - z.x * z.x + 1.0, -2.0 * z.x * z.y));
      vec2 t2 = clog(vec2(t1.x - z.y, t1.y + z.x));
      return vec2(t2.y, -t2.x);
    }
    
    vec2 catan (vec2 z) {
      float d = z.x * z.x + (1.0 - z.y) * (1.0 - z.y);
      vec2 t1 = clog(vec2(1.0 - z.y * z.y - z.x * z.x, -2.0 * z.x) / d);
      return 0.5 * vec2(-t1.y, t1.x);
    }

    vec2 ccosh (vec2 z) {
      return sinhcosh(z.x).yx * vec2(cos(z.y), sin(z.y));
    }

    vec2 csinh (vec2 z) {
      return sinhcosh(z.x) * vec2(cos(z.y), sin(z.y));
    }

    vec2 ctanh (vec2 z) {
      vec2 ez = cexp(z);
      vec2 emz = cexp(-z);
      return cdiv(ez - emz, ez + emz);
    }
  `,
    hypot: `
    float hypot (vec2 z) {
      float t;
      float x = abs(z.x);
      float y = abs(z.y);
      t = min(x, y);
      x = max(x, y);
      t = t / x;
      return x * sqrt(1.0 + t * t);
    }
  `,
    wireframe: `
    // https://github.com/rreusser/glsl-solid-wireframe
    float wireframe (float parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      float d = fwidth(parameter);
      float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      return smoothstep(d * w1, d * (w1 + feather), looped);
    }

    float wireframe (vec2 parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      vec2 d = fwidth(parameter);
      vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec2 a2 = smoothstep(d * w1, d * (w1 + feather), looped);
      return min(a2.x, a2.y);
    }

    float wireframe (vec3 parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      vec3 d = fwidth(parameter);
      vec3 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec3 a3 = smoothstep(d * w1, d * (w1 + feather), looped);
      return min(min(a3.x, a3.y), a3.z);
    }

    float wireframe (vec4 parameter, float width, float feather) {
      float w1 = width - feather * 0.5;
      vec4 d = fwidth(parameter);
      vec4 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec4 a4 = smoothstep(d * w1, d * (w1 + feather), looped);
      return min(min(min(a4.x, a4.y), a4.z), a4.w);
    }

    float wireframe (float parameter, float width) {
      float d = fwidth(parameter);
      float looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      return smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
    }

    float wireframe (vec2 parameter, float width) {
      vec2 d = fwidth(parameter);
      vec2 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec2 a2 = smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
      return min(a2.x, a2.y);
    }

    float wireframe (vec3 parameter, float width) {
      vec3 d = fwidth(parameter);
      vec3 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec3 a3 = smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
      return min(min(a3.x, a3.y), a3.z);
    }

    float wireframe (vec4 parameter, float width) {
      vec4 d = fwidth(parameter);
      vec4 looped = 0.5 - abs(mod(parameter, 1.0) - 0.5);
      vec4 a4 = smoothstep(d * (width - 0.5), d * (width + 0.5), looped);
      return min(min(min(a4.x, a4.y), a4.z), a4.z);
    }
  `
})


const vert = `
${glsl.useStandardDerivatives}
${glsl.precision}

// Pass the aspect ratio (16:9) to the shader so we can adjust the grid accordingly
uniform float u_ratio;
attribute vec2 position;
varying vec2 v_position;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    v_position = vec2(position.x * u_ratio, position.y);
}
`

const frag = `
${glsl.useStandardDerivatives}
${glsl.precision}
${glsl.hsv2rgb}
${glsl.constants}
${glsl.wireframe}

varying vec2 v_position;

uniform float u_gridSize;
uniform float u_lineWidth;
uniform float u_lineFeather;

void main() {
    float x = v_position.x;
    float y = v_position.y;

    // atan(y, x) -> (-PI, PI)
    vec3 rgb = 1.2 * hsv2rgb(vec3(atan(y, x) * HALF_PI_INV, 1.0, 0.5));
    float gridFactor = 1.0 - wireframe(v_position*u_gridSize, u_lineWidth, u_lineFeather);
    gridFactor = pow(gridFactor, 0.5);
    gl_FragColor = mix(vec4(rgb, 1.0), vec4(vec3(1.0), gridFactor), gridFactor);
    return;
}
`

const canvas = document.querySelector('canvas');
const container = canvas.parentElement; // 获取父容器
const main = document.querySelector('main');

const gl = canvas.getContext('webgl');
const ext = gl.getExtension('OES_standard_derivatives');

if (!ext) {
    console.warn('OES_standard_derivatives not supported - falling back to basic rendering');
}

// Make canvas full width and ratio as 16:9
const ratio = 16 / 9;

// 初始化画布大小
function resizeCanvas() {
    // 获取父容器宽度（考虑padding和border）
    const w = main.clientWidth;

    // 设置canvas尺寸
    canvas.width = w;
    canvas.height = w / ratio;

    // 如果WebGL已初始化，更新视口
    if (gl) {
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    console.log(`Canvas 调整大小: ${canvas.width}x${canvas.height}`);
}
resizeCanvas()

// 监听窗口大小变化
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Helper function to create and compile shader
function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Helper function to create program
function createProgram(gl, vertSource, fragSource) {
    const vertShader = createShader(gl, vertSource, gl.VERTEX_SHADER);
    const fragShader = createShader(gl, fragSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }

    return program;
}

const program = createProgram(gl, vert, frag);

// Define vertices for a quad that covers the entire clip space
const vertices = new Float32Array([
    -1.0, -1.0,  // bottom left
    1.0, -1.0,  // bottom right
    -1.0, 1.0,  // top left
    1.0, 1.0   // top right
]);

// Create buffer and upload vertex data
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// Set up attribute
const positionLoc = gl.getAttribLocation(program, 'position');
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

// Setup the uniform for aspect ratio
const ratioLoc = gl.getUniformLocation(program, 'u_ratio');
gl.useProgram(program);
gl.uniform1f(ratioLoc, ratio);

const gui = new dat.GUI({
    title: 'Grid Controls',
    width: 300,
});
container.style.display = 'inline-block';
container.appendChild(gui.domElement);

const u_gridSize = gl.getUniformLocation(program, 'u_gridSize'),
    u_lineWidth = gl.getUniformLocation(program, 'u_lineWidth'),
    u_lineFeather = gl.getUniformLocation(program, 'u_lineFeather');

const params = {
    gridSize: 5.0,
    lineWidth: 0.5,
    lineFeather: 1.0,
};

gui.add(params, 'gridSize', 1.0, 10.0).name('Grid Size').onChange(updateUniforms);
gui.add(params, 'lineWidth', 0.1, 2.0).name('Line Width').onChange(updateUniforms);
gui.add(params, 'lineFeather', 0.1, 20.0).name('Line Feather').onChange(updateUniforms);

// Function to update uniforms from params
function updateUniforms() {
    gl.uniform1f(u_gridSize, params.gridSize);
    gl.uniform1f(u_lineWidth, params.lineWidth);
    gl.uniform1f(u_lineFeather, params.lineFeather);
}

updateUniforms();

function render() {
    // Use program and draw
    // gl.useProgram(program);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

render();