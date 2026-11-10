#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
export PORT

: "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must point to the worker metadata directory}"
mkdir -p "$PROJECT_DIR/dist" "$OPENCODE_WEB_DIR"

# Gradle resolves Android dependencies and performs an incremental debug build.
/usr/bin/time -p gradle -p "$PROJECT_DIR/android" :app:assembleDebug
/usr/bin/time -p cp "$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk" "$PROJECT_DIR/dist/barakel.apk"

/usr/bin/time -p tee "$PROJECT_DIR/dist/index.html" >/dev/null <<'HTML'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#101513">
<title>Barakel — The Fallen Angel</title>
<style>
:root{color-scheme:dark;--ink:#f1e7d0;--muted:#a9aaa0;--gold:#e5b968;--line:#ffffff1a}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 72% 18%,#473323 0,transparent 37%),#101513;color:var(--ink);font:15px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}a{color:inherit;text-decoration:none}.shell{max-width:1180px;margin:auto;padding:28px 42px 32px}.topbar{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:22px}.brand{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:750;letter-spacing:.18em}.sigil{width:34px;height:34px;border:1px solid #d5a86166;border-radius:50%;display:grid;place-items:center;color:var(--gold);font:20px Georgia,serif}.edition{color:#c4c0b5;font-size:11px;letter-spacing:.14em;text-transform:uppercase}.hero{display:grid;grid-template-columns:.86fr 1.14fr;gap:54px;align-items:center;padding:56px 0 42px}.copy{padding:10px 0}.eyebrow{display:flex;align-items:center;gap:10px;color:var(--gold);font-size:11px;font-weight:750;letter-spacing:.2em;text-transform:uppercase}.eyebrow:before{content:"";width:25px;height:1px;background:var(--gold)}h1{font:clamp(50px,7vw,82px)/.93 Georgia,"Times New Roman",serif;letter-spacing:-.055em;margin:21px 0 10px}h1 span{display:block;color:#d9bd88;font-size:.57em;letter-spacing:.08em;margin-top:12px}.subtitle{color:#c2b9a6;font:17px/1.6 Georgia,serif;margin:23px 0 27px;max-width:430px}.actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.button{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 19px;border-radius:4px;font-size:12px;font-weight:750;letter-spacing:.09em;text-transform:uppercase;transition:transform .18s,background .18s}.button:hover{transform:translateY(-2px)}.primary{background:linear-gradient(135deg,#efcb82,#c88940);color:#241b12;box-shadow:0 8px 26px #d6953630}.secondary{border:1px solid #e8d9b345;color:#dfd3b8}.meta{display:flex;gap:24px;margin-top:30px;color:#8f968d;font-size:11px;letter-spacing:.08em;text-transform:uppercase}.meta strong{display:block;color:#ded6c4;font-size:12px;margin-bottom:3px}.art{position:relative;min-width:0}.frame{position:relative;overflow:hidden;border:1px solid #d9b97950;border-radius:5px;background:#151b18;box-shadow:0 28px 85px #0009}.frame:after{content:"";position:absolute;inset:0;pointer-events:none;border:1px solid #fff1;box-shadow:inset 0 0 70px #080c0bc4}.frame canvas{display:block;width:100%;aspect-ratio:16/10}.caption{position:absolute;z-index:1;left:18px;bottom:15px;color:#c5c6b7;font:11px Georgia,serif;letter-spacing:.1em;text-transform:uppercase}.caption span{color:#e4bd70}.ornament{position:absolute;width:72px;height:72px;border:1px solid #d7ae674d;border-radius:50%;right:-22px;top:-23px;display:grid;place-items:center;background:#111713;color:#e5bc70;font:26px Georgia,serif}.lower{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;border:1px solid var(--line);background:var(--line)}.feature{min-height:94px;padding:19px 22px;background:#121816}.feature b{display:block;color:#ead8b3;font:17px Georgia,serif;margin-bottom:5px}.feature p{margin:0;color:#979d94;font-size:12px}.footer{display:flex;justify-content:space-between;color:#727d75;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding-top:20px}.footer .online{color:#94b38b}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:760px){.shell{padding:18px 19px 24px}.topbar{padding-bottom:15px;gap:12px}.brand{flex-shrink:0}.edition{max-width:126px;font-size:8px;line-height:1.4;text-align:right}.hero{grid-template-columns:1fr;gap:25px;padding:32px 0 25px}.copy{padding:0}.eyebrow{font-size:9px}h1{font-size:58px;margin:15px 0 5px}.subtitle{font-size:15px;margin:16px 0 19px}.meta{margin-top:22px;gap:17px;font-size:9px}.button{min-height:43px;padding:0 14px;font-size:10px}.ornament{width:52px;height:52px;right:-9px;top:-12px;font-size:19px}.lower{grid-template-columns:1fr}.feature{min-height:0;padding:13px 16px}.feature b{font-size:15px}.feature p{font-size:11px}.footer{font-size:8px}.caption{font-size:9px;bottom:10px;left:12px}}
</style>
</head>
<body>
<main class="shell">
<header class="topbar"><a class="brand" href="#home" aria-label="Barakel home"><span class="sigil">✦</span> BARAKEL</a><span class="edition">A dark-fantasy action game · Android</span></header>
<section class="hero" id="home" aria-labelledby="title">
<div class="copy"><div class="eyebrow">The shrine is stirring</div><h1 id="title">BARAKEL<span>THE FALLEN ANGEL</span></h1><p class="subtitle">Beneath the ash, an ancient shrine calls. Stand against the dark, free the lost souls, and lift the veil.</p><div class="actions"><a class="button primary" href="barakel.apk" download>↓ &nbsp; Download for Android</a><a class="button secondary" href="#controls">View controls</a></div><div class="meta"><div><strong>4 waves</strong>Survive the shrine</div><div><strong>Touch · Keyboard · Gamepad</strong>Choose your way</div></div></div>
<div class="art"><span class="ornament" aria-hidden="true">✦</span><div class="frame"><canvas id="scene" width="960" height="600" role="img" aria-label="A lone keeper stands before a glowing altar in a ruined shrine"></canvas><div class="caption">A forgotten shrine stirs <span>beneath the ash</span></div></div></div>
</section>
<section class="lower" id="controls" aria-label="Game features"><article class="feature"><b>Move with purpose</b><p>Touch stick, WASD, arrow keys, or your gamepad.</p></article><article class="feature"><b>Steel & sorcery</b><p>Strike with Space / A. Cast aether with C / X.</p></article><article class="feature"><b>Hold your ground</b><p>Pause any time. Resume, restart, or leave the shrine.</p></article></section>
<footer class="footer"><span>Made for the keepers who remain</span><span class="online">● &nbsp; Shrine open</span></footer>
</main>
<script>
(()=>{const c=document.querySelector('#scene'),x=c.getContext('2d'),w=960,h=600;
const grad=(a,b,colors)=>{const g=x.createLinearGradient(...a,...b);colors.forEach(([p,col])=>g.addColorStop(p,col));return g};
x.fillStyle=grad([0,0],[w,h],[[0,'#1b2624'],[.52,'#3a382b'],[1,'#141a18']]);x.fillRect(0,0,w,h);
let glow=x.createRadialGradient(490,300,8,490,300,330);glow.addColorStop(0,'#be854048');glow.addColorStop(1,'#b27b1600');x.fillStyle=glow;x.fillRect(0,0,w,h);
for(let r=0;r<8;r++)for(let q=0;q<13;q++){let a=q*82+(r%2)*37-24,b=94+r*65;x.strokeStyle=['#ffffff0d','#b6a27610','#6c9a8310'][((q*7+r*3)%3)];x.lineWidth=1;x.beginPath();x.roundRect(a,b,72,54,7);x.stroke();if((q*7+r*11)%13===0){x.fillStyle='#84946a55';x.fillRect(a+14,b+14,4,3);x.fillRect(a+20,b+14,4,3)}}
// broken shrine columns
for(const [a,b,s] of [[85,184,1],[867,164,-1],[145,495,1],[820,485,-1]]){x.save();x.translate(a,b);x.scale(s,1);x.fillStyle='#171d19';x.fillRect(-28,-28,57,38);x.fillStyle='#55564a';x.fillRect(-21,-37,-8,13);x.fillRect(9,-48,23,27);x.fillStyle='#9a8865';x.fillRect(-24,-40,-4,7);x.fillRect(6,-51,22,7);x.fillStyle='#262b25';x.fillRect(-9,-25,19,30);x.restore()}
// altar and warm well
x.fillStyle='#261d18b8';x.beginPath();x.roundRect(374,201,232,224,23);x.fill();x.fillStyle='#6b492d';x.beginPath();x.roundRect(393,215,194,190,17);x.fill();x.fillStyle='#24201a';x.beginPath();x.ellipse(490,310,78,88,0,0,7);x.fill();for(let i=0;i<3;i++){x.strokeStyle=['#d99b4a66','#f0c66c77','#f5d99499'][i];x.lineWidth=2;x.beginPath();x.ellipse(490,310,64-i*16,70-i*17,0,0,7);x.stroke()}x.fillStyle='#ffcf78';x.shadowColor='#efa844';x.shadowBlur=30;x.beginPath();x.arc(490,310,11,0,7);x.fill();x.shadowBlur=0;
// keeper silhouette
x.save();x.translate(490,374);x.fillStyle='#111619';x.beginPath();x.ellipse(0,23,25,11,0,0,7);x.fill();x.fillStyle='#34414a';x.beginPath();x.moveTo(-20,17);x.lineTo(-14,-10);x.lineTo(-9,-24);x.lineTo(9,-24);x.lineTo(16,-9);x.lineTo(21,17);x.closePath();x.fill();x.fillStyle='#c9bea0';x.beginPath();x.moveTo(-14,-8);x.lineTo(-10,-25);x.lineTo(0,-35);x.lineTo(11,-23);x.lineTo(15,-7);x.closePath();x.fill();x.fillStyle='#dfc895';x.beginPath();x.arc(0,-33,9,0,7);x.fill();x.fillStyle='#f8da9c';x.shadowColor='#edba68';x.shadowBlur=19;x.beginPath();x.arc(0,-48,4,0,7);x.fill();x.shadowBlur=0;x.strokeStyle='#d9d3c2';x.lineWidth=4;x.beginPath();x.moveTo(12,-5);x.lineTo(33,-28);x.stroke();x.restore();
// faint ash motes
for(let i=0;i<54;i++){const a=(i*173+31)%w,b=(i*97+19)%h;x.fillStyle=i%4===0?'#e7c77b77':'#d7d2b52b';x.beginPath();x.arc(a,b,(i%3)+.5,0,7);x.fill()}
})();
</script>
</body>
</html>
HTML

/usr/bin/time -p node -e 'const fs=require("node:fs"),path=require("node:path");const project=process.cwd(),directory=path.join(project,"dist");if(!fs.existsSync(path.join(directory,"index.html")))throw Error("Static build is missing index.html");fs.writeFileSync(path.join(process.env.OPENCODE_WEB_DIR,"deployment-output.json"),JSON.stringify({project,directory}));'

# Keep the preview server in the foreground so the controller owns its lifecycle.
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$PROJECT_DIR/dist"
