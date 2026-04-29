// ═══════════════════════════════════════════════════════
// UI RENDER — Menu star / background canvas
// ═══════════════════════════════════════════════════════
export function drawMenuStars() {
  const cv = document.getElementById('menu-stars');
  if (!cv) return;
  cv.width  = cv.offsetWidth  || window.innerWidth;
  cv.height = cv.offsetHeight || window.innerHeight;
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;

  // sky gradient
  const g = c.createLinearGradient(0,0,0,H);
  g.addColorStop(0,  '#040810');
  g.addColorStop(.6, '#091428');
  g.addColorStop(1,  '#0b1a0a');
  c.fillStyle = g; c.fillRect(0,0,W,H);

  // stars
  for (let i=0; i<220; i++) {
    const x = (Math.sin(i*2.399)*.5+.5)*W;
    const y = (Math.cos(i*1.618)*.5+.5)*H*.8;
    const r = .4+((i*7919)%5)*.3;
    const a = .28+((i*1301)%10)*.065;
    c.fillStyle = `rgba(255,255,235,${a})`;
    c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
  }

  // moon
  const mx=W*.76, my=H*.12, mr=Math.max(18,W*.028);
  const mg = c.createRadialGradient(mx,my,mr*.3, mx,my,mr*2.5);
  mg.addColorStop(0, 'rgba(220,220,175,0.18)'); mg.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=mg; c.beginPath(); c.arc(mx,my,mr*2.5,0,Math.PI*2); c.fill();
  c.fillStyle='#e8e0c0'; c.beginPath(); c.arc(mx,my,mr,0,Math.PI*2); c.fill();
  c.fillStyle='rgba(4,8,20,.67)'; c.beginPath(); c.arc(mx+mr*.3,my,mr*.84,0,Math.PI*2); c.fill();

  // hill silhouettes
  c.fillStyle='#0f3a0a'; c.beginPath(); c.moveTo(0,H);
  for (let x=0; x<=W; x+=4) c.lineTo(x, H*.82-Math.abs(Math.sin(x*.006))*(H*.18));
  c.lineTo(W,H); c.closePath(); c.fill();

  c.fillStyle='#1a5c12'; c.beginPath(); c.moveTo(0,H);
  for (let x=0; x<=W; x+=4) c.lineTo(x, H*.9-Math.abs(Math.sin(x*.009+1))*(H*.13));
  c.lineTo(W,H); c.closePath(); c.fill();
}
