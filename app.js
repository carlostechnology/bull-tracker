// app.js — Bull Tracker (sin IA, con soporte móvil)
// - Calibración por círculo (N,E,S,O + diámetro)
// - Seguimiento por plantilla (arrastrar rectángulo)
// - Dibujo en tiempo real del recorrido
// - Exportación CSV / SVG
// - Control táctil (Pointer Events) para móvil

import { computeHomography4, applyHomography, invertHomography } from './homography.js';
import { TemplateTracker } from './tracker.js';

const els = {
  video: document.getElementById('video'),
  overlay: document.getElementById('overlay'),
  status: document.getElementById('status'),
  fps: document.getElementById('fps'),
  dist: document.getElementById('distance'),
  btnStart: document.getElementById('btnStart'),
  chkBackCam: document.getElementById('chkBackCam'),

  // Calibración círculo
  cN: document.getElementById('cN'),
  cE: document.getElementById('cE'),
  cS: document.getElementById('cS'),
  cW: document.getElementById('cW'),
  diam: document.getElementById('diam'),
  btnResetPts: document.getElementById('btnResetPts'),
  btnComputeH: document.getElementById('btnComputeH'),
  Hval: document.getElementById('Hval'),

  // Medición / exportación
  btnStartRun: document.getElementById('btnStartRun'),
  btnStopRun: document.getElementById('btnStopRun'),
  btnDownloadCSV: document.getElementById('btnDownloadCSV'),
  btnDownloadSVG: document.getElementById('btnDownloadSVG'),
};

let running = false;
let H = null, Hinv = null;
let clicks = [];                      // puntos N,E,S,O (en píxeles)
let tracker = new TemplateTracker();  // seg. por plantilla (sin IA)

// Interacción para arrastrar rectángulo (PC/móvil)
let dragging = false, dragStart = null, dragRect = null;

// Métricas / registro
let distance = 0, lastPtM = null;
let trailPx = [], trailM = [];
let csv = [["t_ms","x_m","y_m","dist_m"]];

function updateStatus(s){ els.status.textContent = s; }
function updateDist(){ els.dist.textContent = distance.toFixed(2); }

// -------------------- Sizing vídeo/canvas --------------------
function resizeCanvas(){
  const v = els.video, c = els.overlay;
  if (v.videoWidth && v.videoHeight){
    c.width = v.videoWidth;
    c.height = v.videoHeight;
  }
}
els.video.addEventListener('loadedmetadata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

// -------------------- Cámara --------------------
els.btnStart.addEventListener('click', async ()=>{
  const constraints = {
    audio: false,
    video: { facingMode: els.chkBackCam.checked ? { exact: 'environment' } : 'user' }
  };
  try{
    const s = await navigator.mediaDevices.getUserMedia(constraints);
    els.video.srcObject = s;
    await els.video.play();
    updateStatus('Cámara OK');
  }catch(e){
    console.error(e);
    updateStatus('Error cámara');
  }
});

// -------------------- Dibujo / utilidades --------------------
function drawVideoToOverlay(){
  const ctx = els.overlay.getContext('2d');
  ctx.drawImage(els.video, 0, 0, els.overlay.width, els.overlay.height);
}
function clearOverlay(){
  const ctx = els.overlay.getContext('2d');
  ctx.clearRect(0,0,els.overlay.width, els.overlay.height);
}
function drawTrail(ctx){
  if (trailPx.length < 2) return;
  ctx.lineWidth = 2; ctx.strokeStyle = '#00bcd4';
  ctx.beginPath();
  for (let i=0;i<trailPx.length;i++){
    const [x,y] = trailPx[i];
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
}
function drawEllipseBoundary(ctx){
  if (!Hinv) return;
  const D = parseFloat(els.diam.value)||60;
  const R = D/2;
  const pts = [];
  for (let k=0;k<=360;k+=2){
    const a = k*Math.PI/180;
    const Xm = R*Math.cos(a), Ym = R*Math.sin(a);
    const [xp, yp] = applyHomography([Xm,Ym], Hinv); // metros→px
    pts.push([xp, yp]);
  }
  ctx.lineWidth = 2; ctx.strokeStyle = '#888';
  ctx.beginPath();
  pts.forEach((p,i)=>{ if(i===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); });
  ctx.closePath();
  ctx.stroke();
}
function drawOverlay(){
  const ctx = els.overlay.getContext('2d');
  clearOverlay();
  drawEllipseBoundary(ctx);
  if (dragRect){
    ctx.lineWidth = 2; ctx.strokeStyle = '#ff9800';
    ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h);
  }
  drawTrail(ctx);
}

// -------------------- Calibración círculo --------------------
els.btnResetPts.addEventListener('click', ()=>{
  clicks = [];
  [els.cN,els.cE,els.cS,els.cW].forEach(el => el.textContent = '–');
  H = null; Hinv = null; els.Hval.textContent = '–';
  lastPtM = null; distance = 0; updateDist();
  trailPx = []; trailM = []; csv = [["t_ms","x_m","y_m","dist_m"]];
  els.btnStartRun.disabled = true; els.btnDownloadCSV.disabled = true; els.btnDownloadSVG.disabled = true;
  drawOverlay();
});

els.btnComputeH.addEventListener('click', ()=>{
  if (clicks.length !== 4){ alert('Haz 4 clics en el borde del ruedo en orden N, E, S, O'); return; }
  const D = parseFloat(els.diam.value);
  if (!(D>0)){ alert('Diámetro inválido'); return; }
  const R = D/2;
  const meters = [[0,R],[R,0],[0,-R],[-R,0]];
  try{
    H = computeHomography4(clicks, meters);
    Hinv = invertHomography(H);
    els.Hval.textContent = H.map(v=>v.toFixed(4)).join(', ');
    drawOverlay();
    // habilitar si ya hay plantilla
    els.btnStartRun.disabled = !tracker.center();
  }catch(e){
    alert('Error homografía: '+e.message);
  }
});

// -------------------- Pointer Events (PC y móvil) --------------------
function getXYFromEvent(ev){
  const rect = els.overlay.getBoundingClientRect();
  const cw = els.overlay.width, ch = els.overlay.height;
  const clientX = ev.clientX ?? (ev.touches && ev.touches[0]?.clientX);
  const clientY = ev.clientY ?? (ev.touches && ev.touches[0]?.clientY);
  const x = (clientX - rect.left) * (cw / rect.width);
  const y = (clientY - rect.top) * (ch / rect.height);
  return [x,y];
}

els.overlay.addEventListener('pointerdown', (ev)=>{
  ev.preventDefault();                 // evita scroll en móvil
  els.overlay.setPointerCapture(ev.pointerId);
  const [x,y] = getXYFromEvent(ev);
  dragging = true; dragStart = [x,y]; dragRect = null;
});

els.overlay.addEventListener('pointermove', (ev)=>{
  if (!dragging) return;
  ev.preventDefault();
  const [x,y] = getXYFromEvent(ev);
  const x0 = Math.min(dragStart[0], x), y0 = Math.min(dragStart[1], y);
  const w  = Math.abs(x - dragStart[0]), h = Math.abs(y - dragStart[1]);
  dragRect = { x: Math.floor(x0), y: Math.floor(y0), w: Math.floor(w), h: Math.floor(h) };
  drawOverlay();
});

els.overlay.addEventListener('pointerup', (ev)=>{
  ev.preventDefault();
  try { els.overlay.releasePointerCapture(ev.pointerId); } catch(_) {}
  if (!dragging) return;
  dragging = false;

  if (dragRect && dragRect.w > 10 && dragRect.h > 10){
    // Inicializa plantilla desde frame actual
    drawVideoToOverlay();
    const ctx = els.overlay.getContext('2d');
    tracker.initFromCanvas(ctx, dragRect);
    els.btnStartRun.disabled = !H; // requiere calibración para medir
  } else {
    // Tap/click corto → punto de calibración N,E,S,O
    const [x,y] = getXYFromEvent(ev);
    if (clicks.length < 4){
      clicks.push([x,y]);
      const labels = [els.cN, els.cE, els.cS, els.cW];
      labels[clicks.length-1].textContent = `${x.toFixed(1)}, ${y.toFixed(1)}`;
    }
  }
  dragRect = null;
  drawOverlay();
});

// -------------------- Medición (loop) --------------------
els.btnStartRun.addEventListener('click', ()=>{ running = true; loop(); els.btnStopRun.disabled=false; els.btnStartRun.disabled=true; });
els.btnStopRun.addEventListener('click', ()=>{ running = false; els.btnStartRun.disabled=false; els.btnStopRun.disabled=true; els.btnDownloadCSV.disabled=false; els.btnDownloadSVG.disabled=false; });

els.btnDownloadCSV.addEventListener('click', ()=>{
  const blob = new Blob([csv.map(r=>r.join(',')).join('\n')], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='trayectoria.csv'; a.click(); URL.revokeObjectURL(url);
});
els.btnDownloadSVG.addEventListener('click', ()=>{
  const D = parseFloat(els.diam.value)||60;
  const R = D/2;
  const margin = Math.max(2, D*0.05);
  const minX = -R - margin, size = 2*(R+margin);
  const path = trailM.map((p,i)=> (i?'L':'M') + p[0].toFixed(3)+','+(-p[1]).toFixed(3)).join(' ');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${-(R+margin)} ${size} ${size}" width="1000" height="1000">
  <g stroke-width="0.05" fill="none">
    <circle cx="0" cy="0" r="${R}" stroke="#888" />
    <path d="${path}" stroke="#0cf" />
  </g>
</svg>`;
  const blob = new Blob([svg], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='trayectoria.svg'; a.click(); URL.revokeObjectURL(url);
});

function drawFrame(){
  const ctx = els.overlay.getContext('2d');
  ctx.drawImage(els.video, 0, 0, els.overlay.width, els.overlay.height);
}

async function loop(){
  if (!running) return;
  const t0 = performance.now();

  // 1) pintar vídeo en overlay para que el tracker lea píxeles
  drawFrame();
  const ctx = els.overlay.getContext('2d');

  // 2) actualizar tracker
  const bbox = tracker.update(ctx);

  // 3) limpiar y dibujar overlays
  clearOverlay();
  drawEllipseBoundary(ctx);

  if (bbox){
    // bbox y centro
    ctx.lineWidth = 2; ctx.strokeStyle = '#00ff99';
    ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
    const cx = bbox.x + bbox.w/2, cy = bbox.y + bbox.h/2;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.stroke();

    // trayectoria px
    const lastPx = trailPx.length ? trailPx[trailPx.length-1] : null;
    if (!lastPx || Math.hypot(cx-lastPx[0], cy-lastPx[1]) > 1){
      trailPx.push([cx,cy]);
      // trayectoria en metros + distancia
      if (H){
        const [Xm,Ym] = applyHomography([cx,cy], H);
        const lastM = trailM.length ? trailM[trailM.length-1] : null;
        if (lastM){
          const d = Math.hypot(Xm-lastM[0], Ym-lastM[1]);
          if (isFinite(d) && d < 10){ distance += d; }
        }
        trailM.push([Xm,Ym]);
        csv.push([Math.round(performance.now()), Xm.toFixed(4), Ym.toFixed(4), distance.toFixed(4)]);
        updateDist();
      }
    }
  }

  drawTrail(ctx);

  const t1 = performance.now();
  els.fps.textContent = (1000/(t1-t0)).toFixed(1);
  requestAnimationFrame(loop);
}

// Mensaje inicial
updateStatus('Listo: inicia cámara, calibra el círculo (N,E,S,O) y ARRÁSTRA con ratón o dedo para seleccionar la plantilla.');
