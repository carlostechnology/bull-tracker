// Homografía y utilidades
export function computeHomography4(ptsPx, ptsM) {
  if (ptsPx.length !== 4 || ptsM.length !== 4) throw new Error("Se requieren 4 puntos.");
  const A = Array(8).fill(0).map(()=>Array(9).fill(0)); // 8x9 (augmented)
  for (let i=0;i<4;i++){
    const [x,y] = ptsPx[i], [X,Y] = ptsM[i];
    // X eq
    A[2*i][0]=x; A[2*i][1]=y; A[2*i][2]=1;
    A[2*i][3]=0; A[2*i][4]=0; A[2*i][5]=0;
    A[2*i][6]=-X*x; A[2*i][7]=-X*y; A[2*i][8]=X;
    // Y eq
    A[2*i+1][0]=0; A[2*i+1][1]=0; A[2*i+1][2]=0;
    A[2*i+1][3]=x; A[2*i+1][4]=y; A[2*i+1][5]=1;
    A[2*i+1][6]=-Y*x; A[2*i+1][7]=-Y*y; A[2*i+1][8]=Y;
  }
  const h = gaussSolve(A);
  return h;
}
export function applyHomography(pt, H) {
  const [x,y] = pt;
  const [h11,h12,h13,h21,h22,h23,h31,h32,h33] = H;
  const w = h31*x + h32*y + h33;
  return [(h11*x + h12*y + h13)/w, (h21*x + h22*y + h23)/w];
}
export function invertHomography(H) {
  const m = H;
  const a = m[0], b=m[1], c=m[2], d=m[3], e=m[4], f=m[5], g=m[6], h=m[7], i=m[8];
  const A =   e*i - f*h;
  const B = -(d*i - f*g);
  const C =   d*h - e*g;
  const D = -(b*i - c*h);
  const E =   a*i - c*g;
  const F = -(a*h - b*g);
  const G =   b*f - c*e;
  const Hc = -(a*f - c*d);
  const I =   a*e - b*d;
  const det = a*A + b*B + c*C;
  if (Math.abs(det) < 1e-12) throw new Error("Homografía no invertible");
  return [A/det, D/det, G/det, B/det, E/det, Hc/det, C/det, F/det, I/det];
}
function gaussSolve(M){
  const n = 8; const m = 9;
  for (let i=0;i<n;i++){
    let piv=i;
    for (let r=i+1;r<n;r++){ if (Math.abs(M[r][i])>Math.abs(M[piv][i])) piv=r; }
    if (Math.abs(M[piv][i])<1e-12) throw new Error("Sistema singular");
    if (piv!==i){ const tmp=M[i]; M[i]=M[piv]; M[piv]=tmp; }
    const div = M[i][i];
    for (let c=i;c<m;c++) M[i][c]/=div;
    for (let r=i+1;r<n;r++){
      const f = M[r][i];
      for (let c=i;c<m;c++) M[r][c]-=f*M[i][c];
    }
  }
  const x = Array(n).fill(0);
  for (let i=n-1;i>=0;i--){
    let s = M[i][m-1];
    for (let c=i+1;c<n;c++) s -= M[i][c]*x[c];
    x[i] = s / M[i][i];
  }
  return [x[0],x[1],x[2],x[3],x[4],x[5],x[6],x[7],1];
}
