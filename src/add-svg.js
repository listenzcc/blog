// Add svg into the html
// 查找svgDiv，如果没有则在html最后增加
let container = document.getElementById('svgDiv');

if (!container) {
    // 没有找到，则在body最后创建一个
    container = document.createElement('div');
    container.id = 'svgDiv';
    document.body.getElementsByTagName('article')[0].appendChild(container);
}

// 插入彩色svg（红色圆形，极简）
container.innerHTML = `
<svg width="100" height="100">
<circle cx="50" cy="50" r="200" fill="black" />
<circle cx="50" cy="50" r="20" fill="yellow" />
</svg>
`