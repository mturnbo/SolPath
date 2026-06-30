const canvas = document.getElementById('solar-system');
const ctx = canvas.getContext('2d');

function resize() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  canvas.style.width = container.clientWidth + 'px';
  canvas.style.height = container.clientHeight + 'px';
  ctx.scale(dpr, dpr);
  draw();
}

function draw() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#fff';
  ctx.font = '13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Solar system canvas — rendering coming in PR 6', w / 2, h / 2);
}

window.addEventListener('resize', resize);
resize();
