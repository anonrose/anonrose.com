var resizeSVG = () => {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("circle-svg");

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const width = document.body.clientWidth;
  const height = window.innerHeight - 20;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", `${width}px`);
  svg.setAttribute("height", `${height}px`);

  const hue = ~~(Math.random() * 360);

  const maxR = Math.min(width, height) * 0.5 - 10;
  const minR = maxR * 0.65;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const count = 100;
  const delta = (2 * Math.PI) / (count * 0.75);

  const variation = (maxR - minR) * 0.25;
  for (let a = 0; a < 2 * Math.PI; a += delta) {
    const ray = document.createElementNS(NS, "line");
    const startR = minR + ~~(Math.random() * variation);
    const endR = maxR - ~~(Math.random() * variation);
    ray.setAttribute("x1", centerX + startR * Math.cos(a));
    ray.setAttribute("y1", centerY + startR * Math.sin(a));

    ray.setAttribute("x2", centerX + endR * Math.cos(a));
    ray.setAttribute("y2", centerY + endR * Math.sin(a));

    ray.setAttribute("stroke", `hsl(${hue * a}, 75%, 45%)`);
    ray.setAttribute("stroke-width", 1 + ~~(Math.random() * 4));

    svg.appendChild(ray);
  }
};

window.onresize = window.onload = resizeSVG;
