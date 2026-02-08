const src = document.getElementById("src");

const camera = document.getElementById("camera");
const particles = document.getElementById("particles");

const momo = document.getElementById("momo");
const wawa = document.getElementById("wawa");
const miata = document.getElementById("miata");

const bubbleM = document.getElementById("bubbleM");
const bubbleW = document.getElementById("bubbleW");
const sceneLabel = document.getElementById("sceneLabel");

const playBtn = document.getElementById("playBtn");
const nextBtn = document.getElementById("nextBtn");
const skipBtn = document.getElementById("skipBtn");

// Canvases
const momoBody = document.getElementById("momoBody");
const momoHead = document.getElementById("momoHead");
const momoArm  = document.getElementById("momoArm");

const wawaBody = document.getElementById("wawaBody");
const wawaHead = document.getElementById("wawaHead");

// ===== IMPORTANT: CROPS =====
// These are NORMALIZED (0..1) rectangles over the SOURCE image.
// You may tweak these slightly so it perfectly frames each person.
// Based on your photo, these should be close.
const CROP = {
  // Full bodies
  momoBody: { x:0.08, y:0.18, w:0.40, h:0.78 },
  wawaBody: { x:0.47, y:0.18, w:0.45, h:0.78 },

  // Heads (zoomed)
  momoHead: { x:0.17, y:0.18, w:0.22, h:0.22 },
  wawaHead: { x:0.56, y:0.19, w:0.24, h:0.24 },

  // MOMO right arm area (for wave)
  momoArm:  { x:0.16, y:0.40, w:0.25, h:0.35 },
};

// ====== mini “anime” filter (optional but helps) ======
function clamp(v){ return Math.max(0, Math.min(255, v)); }

function posterize(d, levels=7){
  const step = 255/(levels-1);
  for(let i=0;i<d.length;i+=4){
    d[i]   = Math.round(d[i]/step)*step;
    d[i+1] = Math.round(d[i+1]/step)*step;
    d[i+2] = Math.round(d[i+2]/step)*step;
  }
}

function sobelEdges(img, w, h){
  const d = img.data;
  const out = new Uint8ClampedArray(d.length);
  const gx = [-1,0,1,-2,0,2,-1,0,1];
  const gy = [-1,-2,-1,0,0,0,1,2,1];

  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      let sx=0, sy=0, k=0;
      for(let yy=-1;yy<=1;yy++){
        for(let xx=-1;xx<=1;xx++){
          const i = ((y+yy)*w + (x+xx))*4;
          const lum = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
          sx += lum * gx[k];
          sy += lum * gy[k];
          k++;
        }
      }
      const mag = Math.sqrt(sx*sx + sy*sy);
      const o = (y*w + x)*4;
      out[o]=out[o+1]=out[o+2]=clamp(mag);
      out[o+3]=255;
    }
  }
  return out;
}

function drawCropToCanvas(img, canvas, rect, anime=true, round=false){
  const ctx = canvas.getContext("2d", {willReadFrequently:true});
  const iw = img.naturalWidth, ih = img.naturalHeight;

  const sx = Math.round(rect.x * iw);
  const sy = Math.round(rect.y * ih);
  const sw = Math.round(rect.w * iw);
  const sh = Math.round(rect.h * ih);

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if(anime){
    let data = ctx.getImageData(0,0,canvas.width,canvas.height);
    posterize(data.data, 7);
    const edges = sobelEdges(data, canvas.width, canvas.height);

    for(let i=0;i<data.data.length;i+=4){
      const e = edges[i];
      if(e > 52){
        data.data[i]   = Math.max(0, data.data[i]-40);
        data.data[i+1] = Math.max(0, data.data[i+1]-40);
        data.data[i+2] = Math.max(0, data.data[i+2]-40);
      }
      data.data[i]   = clamp(data.data[i]*1.05);
      data.data[i+1] = clamp(data.data[i+1]*1.07);
      data.data[i+2] = clamp(data.data[i+2]*1.08);
    }
    ctx.putImageData(data,0,0);

    // soft glow
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.12;
    ctx.filter = "blur(6px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";
  }

  if(round){
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, Math.min(canvas.width,canvas.height)/2 - 2, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }
}

// ====== Dialogue + actions timeline ======
let step = 0;
let playing = false;

const script = [
  {
    label:"1/9 — mountains",
    cam:"",
    action: () => {
      showChars();
      say(bubbleM, "MOMO", "Okay… mountain vibes. Green land. Calm. My heart? NOT calm 😭");
      burstSparkles(18);
    }
  },
  {
    label:"2/9 — wawa teasing",
    cam:"cam-pan",
    action: () => {
      say(bubbleW, "WAWA", "Why are you standing like an anime main character before the opening theme?");
      burstSparkles(12);
    }
  },
  {
    label:"3/9 — momo nervous",
    cam:"cam-zoom",
    action: () => {
      waveMomoArm();
      say(bubbleM, "MOMO", "Because I’m about to say something brave… and my brain is buffering.");
      burstHearts(14);
    }
  },
  {
    label:"4/9 — lucky 7",
    cam:"",
    action: () => {
      say(bubbleM, "MOMO", "I brought your lucky number… 7. I’m trying to win with bonus stats.");
      burstSparkles(16);
      popOverlay("Lucky #7", "7");
    }
  },
  {
    label:"5/9 — anime shelf",
    cam:"",
    action: () => {
      say(bubbleW, "WAWA", "If this includes hero speeches, time-travel brain rot, or JoJo drama… I’m listening.");
      burstSparkles(16);
      popOverlay("WAWA’s favorites", "MHA • Steins;Gate • Black Clover • JoJo");
    }
  },
  {
    label:"6/9 — blink-182 + cake",
    cam:"",
    action: () => {
      say(bubbleM, "MOMO", "Soundtrack mood: blink-182… and yes, I came prepared with cake loot.");
      burstHearts(18);
      popOverlay("Cake Loot", "🍰 Red Velvet + 🍫 Chocolate");
    }
  },
  {
    label:"7/9 — miata cameo",
    cam:"cam-pan",
    action: () => {
      driveMiata();
      say(bubbleM, "MOMO", "And the Miata pulls up like: blink blink 😭 even the headlights are flirting.");
      burstSparkles(18);
    }
  },
  {
    label:"8/9 — sweet moment",
    cam:"cam-zoom",
    action: () => {
      say(bubbleM, "MOMO", "Real talk… I like you a lot. Like ‘rewatch my favorite episode’ a lot.");
      burstHearts(26);
      tiltWawaHead();
    }
  },
  {
    label:"9/9 — the ask",
    cam:"cam-zoom",
    action: () => {
      say(bubbleM, "MOMO", "WAWA… will you be my Valentine?");
      burstHearts(40);
    }
  },
];

function showChars(){
  momo.classList.add("show","idle");
  wawa.classList.add("show","idle");
}

function setCam(cls){
  camera.classList.remove("cam-zoom","cam-pan");
  if(cls) camera.classList.add(cls);
}

function say(bubble, who, line){
  bubbleM.classList.remove("show");
  bubbleW.classList.remove("show");
  bubble.querySelector("span").textContent = line;
  bubble.classList.add("show");
}

function waveMomoArm(){
  const layer = document.getElementById("momoArmLayer");
  layer.animate(
    [
      { transform:"rotate(-6deg) translateY(0)" },
      { transform:"rotate(-35deg) translateY(-2px)" },
      { transform:"rotate(-12deg) translateY(0)" },
      { transform:"rotate(-28deg) translateY(-2px)" },
      { transform:"rotate(-6deg) translateY(0)" },
    ],
    { duration: 1000, easing:"ease-in-out" }
  );
}

function tiltWawaHead(){
  // slightly stronger nod for this beat
  const headLayer = wawa.querySelector(".layer.head");
  headLayer.animate(
    [
      { transform:"rotate(0deg) translateY(0)" },
      { transform:"rotate(3deg) translateY(-2px)" },
      { transform:"rotate(0deg) translateY(0)" },
    ],
    { duration: 900, easing:"ease-in-out" }
  );
}

function driveMiata(){
  miata.animate(
    [
      { transform:"translateX(0)" },
      { transform:"translateX(1400px)" }
    ],
    { duration: 2500, easing:"cubic-bezier(.2,.9,.2,1)" }
  );
}

// particles
function burstHearts(n=20){ burst(n, "heart", ["❤","💜","💕","💖"]); }
function burstSparkles(n=20){ burst(n, "spark", ["✦","✧","✨","⋆"]); }

function burst(n, cls, chars){
  for(let i=0;i<n;i++){
    const el = document.createElement("div");
    el.className = `p ${cls}`;
    el.textContent = chars[Math.floor(Math.random()*chars.length)];
    el.style.left = (18 + Math.random()*64) + "%";
    el.style.top  = (16 + Math.random()*52) + "%";
    el.style.fontSize = (14 + Math.random()*18) + "px";
    particles.appendChild(el);

    const dx = (-140 + Math.random()*280);
    const dy = (-180 + Math.random()*220);

    el.animate(
      [
        { transform:"translate(0,0) scale(.9)", opacity:0 },
        { transform:"translate(0,-10px) scale(1.1)", opacity:1, offset:.15 },
        { transform:`translate(${dx}px, ${dy}px) scale(.8)`, opacity:0 }
      ],
      { duration: 1200 + Math.random()*700, easing:"ease-out" }
    ).onfinish = () => el.remove();
  }
}

function popOverlay(title, text){
  const card = document.createElement("div");
  card.style.cssText = `
    position:fixed; left:50%; top:16px; transform:translateX(-50%);
    z-index:9999; border-radius:16px; padding:12px 14px;
    background: rgba(10,16,24,.62);
    border:1px solid rgba(255,255,255,.16);
    backdrop-filter: blur(12px);
    color:#ecf6ff;
    box-shadow: 0 18px 55px rgba(0,0,0,.28);
    max-width: 92vw;
  `;
  card.innerHTML = `
    <div style="display:inline-block;padding:6px 10px;border-radius:999px;font-weight:950;color:#07151e;
      background:linear-gradient(90deg, rgba(92,224,196,.92), rgba(124,77,255,.86)); font-size:12px;">
      ${title}
    </div>
    <div style="margin-top:8px;font-weight:950;">${text}</div>
  `;
  document.body.appendChild(card);
  card.animate(
    [{ transform:"translateX(-50%) translateY(10px) scale(.96)", opacity:0 },
     { transform:"translateX(-50%) translateY(0) scale(1)", opacity:1 }],
    { duration: 260, easing:"ease-out" }
  );
  setTimeout(()=>card.remove(), 1300);
}

// controls
function go(i){
  step = Math.max(0, Math.min(script.length-1, i));
  const s = script[step];
  sceneLabel.textContent = s.label;
  setCam(s.cam);
  s.action();
}
function next(){ go(step+1); }
function skip(){ go(script.length-1); }

playBtn.addEventListener("click", async () => {
  if(playing) return;
  playing = true;
  go(0);
  for(let i=1;i<script.length;i++){
    await wait(2600);
    go(i);
  }
  playing = false;
});
nextBtn.addEventListener("click", () => next());
skipBtn.addEventListener("click", () => skip());

function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

// init
(async function init(){
  await new Promise(res=>{
    if(src.complete && src.naturalWidth) return res();
    src.addEventListener("load", res, {once:true});
  });

  // Draw crops into layers
  drawCropToCanvas(src, momoBody, CROP.momoBody, true, false);
  drawCropToCanvas(src, wawaBody, CROP.wawaBody, true, false);

  drawCropToCanvas(src, momoHead, CROP.momoHead, true, true);
  drawCropToCanvas(src, wawaHead, CROP.wawaHead, true, true);

  drawCropToCanvas(src, momoArm, CROP.momoArm, true, false);

  // Start ready
  showChars();
  go(0);
})();
