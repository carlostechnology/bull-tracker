// Template-matching tracker (sin IA) con correlación normalizada.
export class TemplateTracker {
  constructor() {
    this.template = null; // {w,h,data}
    this.pos = null;      // [cx, cy] en px
    this.win = 64;        // ventana de búsqueda (radio)
  }
  initFromCanvas(ctx, rect) {
    const {x,y,w,h} = rect;
    const img = ctx.getImageData(x, y, w, h);
    const gray = new Float32Array(w*h);
    for (let i=0, j=0; i<img.data.length; i+=4, j++){
      gray[j] = (img.data[i]*0.299 + img.data[i+1]*0.587 + img.data[i+2]*0.114)/255;
    }
    this.template = {w, h, data: gray};
    this.pos = [x + w/2, y + h/2];
  }
  update(ctx) {
    if (!this.template || !this.pos) return null;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const [cx, cy] = this.pos;
    const win = this.win;
    let best = {score: -1, x: 0, y: 0};

    const x0 = Math.max(0, Math.floor(cx - win));
    const y0 = Math.max(0, Math.floor(cy - win));
    const x1 = Math.min(W - this.template.w, Math.floor(cx + win));
    const y1 = Math.min(H - this.template.h, Math.floor(cy + win));

    const tw = this.template.w, th = this.template.h, tdata = this.template.data;
    let tmean = 0; for (let v of tdata) tmean += v; tmean /= tdata.length;
    let tnorm = 0; for (let v of tdata){ const d=v - tmean; tnorm += d*d; }
    tnorm = Math.sqrt(tnorm) + 1e-6;

    for (let yy=y0; yy<=y1; yy+=2){
      for (let xx=x0; xx<=x1; xx+=2){
        const img = ctx.getImageData(xx, yy, tw, th);
        let imean = 0;
        const g = new Float32Array(tw*th);
        for (let i=0,j=0;i<img.data.length;i+=4,j++){
          g[j] = (img.data[i]*0.299 + img.data[i+1]*0.587 + img.data[i+2]*0.114)/255;
          imean += g[j];
        }
        imean /= g.length;
        let inorm = 0, dot = 0;
        for (let k=0;k<g.length;k++){
          const gv = g[k] - imean;
          const tv = tdata[k] - tmean;
          inorm += gv*gv;
          dot += gv*tv;
        }
        const denom = (Math.sqrt(inorm) + 1e-6) * tnorm;
        const score = dot / denom;
        if (score > best.score){
          best = {score, x: xx, y: yy};
        }
      }
    }
    const bx = best.x + tw/2;
    const by = best.y + th/2;
    this.pos = [0.6*bx + 0.4*cx, 0.6*by + 0.4*cy];
    return {x: best.x, y: best.y, w: tw, h: th, score: best.score};
  }
  center(){
    return this.pos ? [this.pos[0], this.pos[1]] : null;
  }
}
