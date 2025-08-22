// Bull Tracker — Wizard (mobile-first)
import { computeHomography4, applyHomography, invertHomography } from './homography.js';
import { TemplateTracker } from './tracker.js';

const $ = s => document.querySelector(s);
const els = {
  screens: {
    welcome: $('#screen-welcome'),
    calib: $('#screen-calib'),
    select: $('#screen-select'),
    track: $('#screen-track'),
    results: $('#screen-results')
  },
  container: $('#container'),
  video: $('#video'),
  overlay: $('#overlay'),
  msg: $('#overlay-msg'),
  btnStartAll: $('#btnStartAll'),
  diam: $('#diam'),
  btnResetPts: $('#btnResetPts'),
  btnComputeH: $('#btnComputeH'),
  chips: { N: $('#cN'), E: $('#cE'), S: $('#cS'), W: $('#cW') },
  hintCalib: $('#hintCalib'),
  btnToSelect: $('#btnToSelect'),
  btnStartRun: $('#btnStartRun'),
  fps: $('#fps'),
  distance: $('#distance'),
  btnStopRun: $('#btnStopRun'),
  finalDistance: $('#finalDistance'),
  btnDownloadCSV: $('#btnDownloadCSV'),
  btnDownloadSVG: $('#btnDownloadSVG'),
  btnShare: $('#btnShare'),
  btnRestart: $('#btnRestart'),
};

let phase = 'welcome';
let H = null, Hinv = null;
let clicks = [];
let tracker = new TemplateTracker();
let dragging = false, dragStart = null, dragRect = null;
let running = false;
let distance = 0;
let trailPx = [], trailM = [];
let csv = [["t_ms","x_m","y_m","dist_m"]];

function showScreen(name){
  Object.values(els.screens).forEach(sec => sec.classList.remove('active'));
  els.screens[name].classList.add('active');
  phase = name;
  if (name==='calib') setOverlayMsg('Toca el borde: Norte');
  else if (name==='select') setOverlayMsg('Arrastra un rectángulo alrededor del toro');
  else if (name==='track') setOverlayMsg('Siguiendo…');
  else setOverlayMsg('');
}
function setOverlayMsg(text){ els.msg.textContent = text || ''; }
function updateDistanceUI(){ els.distance.textContent = distance.toFixed(2); }
function setFinalDistanceUI(val){ els.finalDistance.textContent = (val ?? 0).toFixed(2) + ' m'; }

function resizeCanvas(){
  const v = els.video, c = els.overlay;
  if (v.videoWidth && v.videoHeight){ c.width = v.videoWidth; c.height = v.videoHeight; }
}
els.video.addEventListener('loadedmetadata', resizeCanvas);
window.addEventListener('resize', resizeCanvas);

async function startCamera(){
  try {
    const s = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{exact:'environment'}}});
    els.video.srcObject = s; await els.video.play();
  } catch(e) {
    try {
      const s2 = await navigator.mediaDevices.getUserMedia({audio:false, video:true});
      els.video.srcObject = s2; await els.video.play();
    } catch(err){ alert('No se pudo iniciar la cámara.'); console.error(err); }
  }
}

function clearOverlay(){ const ctx = els.overlay.getContext('2d'); ctx.clearRect(0,0,els.overlay.width, els.overlay.height); }
function drawEllipseBoundary(ctx){
  if (!Hinv) return;
  const D = parseFloat(els.diam.value)||60; const R = D/2;
  const pts = [];
  for (let k=0;k<=360;k+=3){
    const a = k*Math.PI/180, Xm = R*Math.cos(a), Ym = R*Math.sin(a);
    const [xp, yp] = applyHomography([Xm,Ym], Hinv); pts.push([xp, yp]);
  }
  ctx.lineWidth = 2; ctx.strokeStyle = '#888';
  ctx.beginPath(); pts.forEach((p,i)=>{ if(i===0) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); }); ctx.closePath(); ctx.stroke();
}
function drawTrail(ctx){
  if (trailPx.length < 2) return;
  ctx.lineWidth = 2; ctx.strokeStyle = '#58a6ff';
  ctx.beginPath(); for (let i=0;i<trailPx.length;i++){ const [x,y]=trailPx[i]; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.stroke();
}
function drawFrameToCanvas(){ const ctx = els.overlay.getContext('2d'); ctx.drawImage(els.video, 0, 0, els.overlay.width, els.overlay.height); }
function redraw(){
  const ctx = els.overlay.getContext('2d');
  clearOverlay(); drawEllipseBoundary(ctx);
  if (dragRect){ ctx.lineWidth = 2; ctx.strokeStyle = '#FF9800'; ctx.strokeRect(dragRect.x, dragRect.y, dragRect.w, dragRect.h); }
  drawTrail(ctx);
}

function resetAll(){
  clicks = []; ['N','E','S','W'].forEach(k => els.chips[k].textContent = '–');
  H=null; Hinv=null; distance=0; updateDistanceUI(); setFinalDistanceUI(0);
  trailPx=[]; trailM=[]; csv=[["t_ms","x_m","y_m","dist_m"]];
  dragRect=null; dragging=false; redraw();
  els.btnToSelect.disabled = true;
  if (phase==='calib'){ els.hintCalib.textContent='Toca punto Norte'; setOverlayMsg('Toca el borde: Norte'); }
}
els.btnResetPts.addEventListener('click', resetAll);

els.btnComputeH.addEventListener('click', ()=>{
  if (clicks.length !== 4){ alert('Marca 4 puntos del borde en orden N, E, S, O'); return; }
  const D = parseFloat(els.diam.value); if (!(D>0)){ alert('Diámetro inválido'); return; }
  const R = D/2; const meters = [[0,R],[R,0],[0,-R],[-R,0]];
  try{ H = computeHomography4(clicks, meters); Hinv = invertHomography(H); redraw(); els.btnToSelect.disabled = false; setOverlayMsg('Homografía OK. Pulsa Continuar.'); }
  catch(e){ alert('Error calculando homografía.'); }
});
els.btnToSelect.addEventListener('click', ()=> showScreen('select'));

els.btnStartAll.addEventListener('click', async ()=>{
  await startCamera(); resizeCanvas(); resetAll(); showScreen('calib');
});

function getXY(ev){
  const rect = els.overlay.getBoundingClientRect();
  const cw = els.overlay.width, ch = els.overlay.height;
  const clientX = ev.clientX ?? (ev.touches && ev.touches[0]?.clientX);
  const clientY = ev.clientY ?? (ev.touches && ev.touches[0]?.clientY);
  return [(clientX - rect.left) * (cw / rect.width), (clientY - rect.top) * (ch / rect.height)];
}
function onPointerDown(ev){
  ev.preventDefault();
  els.overlay.setPointerCapture?.(ev.pointerId);
  const [x,y] = getXY(ev);
  if (phase === 'calib'){
    if (clicks.length < 4){
      clicks.push([x,y]);
      const l = ['N','E','S','W'][clicks.length-1];
      els.chips[l].textContent = `${x.toFixed(0)},${y.toFixed(0)}`;
      const next = ['Toca punto Este','Toca punto Sur','Toca punto Oeste','Pulsa Calcular homografía'][clicks.length-1] || '';
      els.hintCalib.textContent = next;
      setOverlayMsg(next.replace('Pulsa ','') || '');
    }
    redraw(); return;
  }
  if (phase === 'select'){
    dragging = true; dragStart = [x,y]; dragRect = {x:Math.floor(x), y:Math.floor(y), w:0, h:0}; redraw(); return;
  }
}
function onPointerMove(ev){
  if (!dragging) return;
  ev.preventDefault();
  if (phase === 'select'){
    const [x,y] = getXY(ev);
    const x0 = Math.min(dragStart[0], x), y0 = Math.min(dragStart[1], y);
    const w  = Math.abs(x - dragStart[0]), h = Math.abs(y - dragStart[1]);
    dragRect = { x: Math.floor(x0), y: Math.floor(y0), w: Math.floor(w), h: Math.floor(h) };
    redraw();
  }
}
function onPointerUp(ev){
  ev.preventDefault();
  try { els.overlay.releasePointerCapture?.(ev.pointerId); } catch(_) {}
  if (phase === 'select' && dragging){
    dragging = false;
    if (dragRect && dragRect.w>10 && dragRect.h>10){
      drawFrameToCanvas();
      const ctx = els.overlay.getContext('2d');
      tracker.initFromCanvas(ctx, dragRect);
      els.btnStartRun.disabled = false;
      setOverlayMsg('Plantilla lista. Pulsa Empezar seguimiento.');
    } else {
      setOverlayMsg('Arrastra un rectángulo alrededor del toro');
    }
  }
}
function onPointerCancel(){ dragging=false; dragRect=null; redraw(); }

els.overlay.addEventListener('pointerdown', onPointerDown, {passive:false});
els.overlay.addEventListener('pointermove', onPointerMove, {passive:false});
els.overlay.addEventListener('pointerup', onPointerUp, {passive:false});
els.overlay.addEventListener('pointercancel', onPointerCancel, {passive:false});
['gesturestart','gesturechange','gestureend'].forEach(evt =>
  els.overlay.addEventListener(evt, e => e.preventDefault(), { passive:false }));
els.overlay.addEventListener('dblclick', e => e.preventDefault(), { passive:false });

els.btnStartRun.addEventListener('click', ()=>{
  if (!H){ alert('Falta homografía. Vuelve a Calibración.'); return; }
  running = true; showScreen('track'); loop();
});
els.btnStopRun.addEventListener('click', ()=>{
  running = false; showScreen('results');
  setFinalDistanceUI(distance); csv.push(['TOTAL','','', distance.toFixed(4)]);
});

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
  <title>Trayectoria · Distancia total: ${distance.toFixed(2)} m</title>
  <g stroke-width="0.05" fill="none">
    <circle cx="0" cy="0" r="${R}" stroke="#888" />
    <path d="${path}" stroke="#58a6ff" />
  </g>
</svg>`;
  const blob = new Blob([svg], {type:'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='trayectoria.svg'; a.click(); URL.revokeObjectURL(url);
});
els.btnShare.addEventListener('click', async ()=>{
  const txt = `Distancia total del toro: ${distance.toFixed(2)} m`;
  if (navigator.share){
    try { await navigator.share({ title:'Bull Tracker', text: txt }); } catch(_) {}
  } else {
    await navigator.clipboard.writeText(txt); alert('Copiado al portapapeles.');
  }
});
els.btnRestart.addEventListener('click', ()=>{ resetAll(); showScreen('calib'); });

function drawFrame(){ const ctx = els.overlay.getContext('2d'); ctx.drawImage(els.video, 0, 0, els.overlay.width, els.overlay.height); }
function loop(){
  if (!running) return;
  const t0 = performance.now();
  drawFrame();
  const ctx = els.overlay.getContext('2d');
  const bbox = tracker.update(ctx);

  clearOverlay(); drawEllipseBoundary(ctx);
  if (bbox){
    ctx.lineWidth = 2; ctx.strokeStyle = '#4CAF50'; ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
    const cx = bbox.x + bbox.w/2, cy = bbox.y + bbox.h/2;
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.stroke();

    const lastPx = trailPx.length ? trailPx[trailPx.length-1] : null;
    if (!lastPx || Math.hypot(cx-lastPx[0], cy-lastPx[1]) > 1){
      trailPx.push([cx,cy]);
      if (H){
        const [Xm,Ym] = applyHomography([cx,cy], H);
        const lastM = trailM.length ? trailM[trailM.length-1] : null;
        if (lastM){
          const d = Math.hypot(Xm-lastM[0], Ym-lastM[1]);
          if (isFinite(d) && d < 10){ distance += d; }
        }
        trailM.push([Xm,Ym]);
        csv.push([Math.round(performance.now()), Xm.toFixed(4), Ym.toFixed(4), distance.toFixed(4)]);
        updateDistanceUI();
      }
    }
  }
  drawTrail(ctx);
  const t1 = performance.now();
  els.fps.textContent = (1000/(t1-t0)).toFixed(1);
  requestAnimationFrame(loop);
}

showScreen('welcome');
