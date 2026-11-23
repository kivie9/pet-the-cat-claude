// Vẽ cả cảnh bằng WebGL: vải ghế + mèo (lông gợn theo tay) + ánh sáng + bóng bàn tay.
// Nếu trình duyệt không có WebGL thì rơi về canvas 2D (không có lông gợn).

const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uCat,uCloth,uInfo,uRuf;
uniform vec2 uRes,uC,uHP,uBounds,uPiv,uHp;
uniform vec4 uA;
uniform vec3 uClothCol,uTint,uHand;
uniform float uTime,uBreath,uTail,uHead,uVib,uWarm,uK,uShow,uMode,uBC;
const vec2 SC=vec2(2048.,1024.);
float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 s=vec2(uA.x*p.x+uA.y*p.y+uC.x,uA.z*p.x+uA.w*p.y+uC.y);
  vec2 uv=s/SC;
  vec3 cl=texture2D(uCloth,s/900.).rgb;
  float cl2=texture2D(uCloth,s/2700.+.31).r;
  vec3 base=uClothCol*(.78+.7*cl)*(.85+.3*cl2);
  vec4 inf=texture2D(uInfo,uv);
  vec4 ruf=texture2D(uRuf,uv);
  float mk=uMode>.5?inf.a:1.;
  vec2 cuv=uv;
  cuv.y=uBC+(cuv.y-uBC)/(1.+uBreath*mk);
  vec2 d=(cuv-uPiv)*SC;
  float ang=uTail*inf.g*mk,ca=cos(ang),sa=sin(ang);
  cuv=uPiv+vec2(ca*d.x-sa*d.y,sa*d.x+ca*d.y)/SC;
  d=(cuv-uHp)*SC;
  ang=uHead*inf.b*mk; ca=cos(ang); sa=sin(ang);
  cuv=uHp+vec2(ca*d.x-sa*d.y,sa*d.x+ca*d.y)/SC;
  vec2 rv=(ruf.rg*2.-1.)*mk;
  cuv-=rv*16./SC;
  cuv.y+=sin(uTime*157.)*uVib*mk/SC.y;
  vec4 cat=texture2D(uCat,cuv)*uShow;
  float e=ruf.b*mk;
  float fa=inf.r*6.2832;
  float ag=-dot(normalize(rv+vec2(.001)),vec2(cos(fa),sin(fa)))*e;
  cat.rgb*=1.+e*.25+ag*.18;
  vec2 bv=s/uBounds;
  if(uMode>.5) bv=clamp(bv,0.,1.);
  float vig=mix(.66,1.,smoothstep(1.1,.3,length((bv-vec2(.5,.48))*vec2(1.,1.5))));
  vec3 col;
  if(uMode<.5){
    float band=dot(s,vec2(.55,.835))/300.+uTime*.02;
    float wl=smoothstep(.2,.95,sin(band*6.2832)*.5+.5);
    col=(cat.rgb+base*(1.-cat.a))*(.84+.2*wl*(1.-uv.y*.6))*vig*uTint;
  } else {
    float fe=smoothstep(-24.,40.,min(min(s.x,uBounds.x-s.x),min(s.y,uBounds.y-s.y)));
    col=mix(uClothCol*.9,cat.rgb,fe)*mix(.94,1.,vig);
  }
  col=mix(col,col*vec3(1.1,.97,.84),uWarm);
  // bóng bàn tay + cánh tay
  vec2 q=p-uHand.xy-vec2(.55,.835)*uK*(34.+150.*uHP.x);
  float t=uHand.z;
  float ly=dot(q,vec2(-sin(t),cos(t)))/uK,lx=dot(q,vec2(cos(t),sin(t)))/uK;
  float dist=length(vec2(lx,ly-clamp(ly,-110.,420.)))-100.;
  float sh=(1.-smoothstep(-8.-30.*uHP.x,14.+90.*uHP.x,dist))*uHP.y*(.68-.3*uHP.x);
  // bỏ bóng đổ của bàn tay lên mèo
  col+=(hs(p)-.5)*.012;
  gl_FragColor=vec4(col,1.);
}`;

function shader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export class Renderer {
  constructor(canvas, cloth, info, infoSize, ruffleSize) {
    this.cv = canvas; this.cloth = cloth; this.info = info; this.infoSize = infoSize; this.rs = ruffleSize;
    this.catCanvas = null; this.sc = null; this.view = null;
    let gl = null;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'default' }); } catch { /* không có WebGL */ }
    this.gl = gl;
    if (gl) {
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });
      canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.init(); if (this.catCanvas) this.setCat(this.catCanvas, this.sc); });
      this.init();
    } else {
      this.c2 = canvas.getContext('2d');
      this.pattern = this.c2.createPattern(cloth, 'repeat');
    }
  }

  init() {
    const gl = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.prog = prog;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.U = {};
    for (const n of ['uCat', 'uCloth', 'uInfo', 'uRuf', 'uRes', 'uC', 'uHP', 'uA', 'uClothCol', 'uTint', 'uHand', 'uTime', 'uBreath', 'uTail', 'uHead', 'uVib', 'uWarm', 'uK', 'uShow', 'uBounds', 'uPiv', 'uHp', 'uMode', 'uBC']) this.U[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(this.U.uCat, 0); gl.uniform1i(this.U.uCloth, 1); gl.uniform1i(this.U.uInfo, 2); gl.uniform1i(this.U.uRuf, 3);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    this.tCat = this.tex(0); this.tCloth = this.tex(1); this.tInfo = this.tex(2); this.tRuf = this.tex(3);
    gl.activeTexture(gl.TEXTURE1);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.cloth);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.activeTexture(gl.TEXTURE2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.infoSize[0], this.infoSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, this.info);
    gl.activeTexture(gl.TEXTURE3);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.rs[0], this.rs[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  tex(unit) {
    const gl = this.gl, t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  resize(w, h, dpr) {
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    if (this.gl) this.gl.viewport(0, 0, this.cv.width, this.cv.height);
  }

  // sc: {mode (0 mèo vẽ, 1 ảnh), bounds, cloth, tint, bc, piv, hp, info}
  setCat(canvas, sc) {
    this.catCanvas = canvas; this.sc = sc; this.info = sc.info;
    const gl = this.gl;
    if (!gl) return;
    gl.activeTexture(gl.TEXTURE2);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.infoSize[0], this.infoSize[1], gl.RGBA, gl.UNSIGNED_BYTE, sc.info);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tCat);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  }

  setRuffle(data) {
    const gl = this.gl;
    if (!gl) return;
    gl.activeTexture(gl.TEXTURE3);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.rs[0], this.rs[1], gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  draw(s) {
    const gl = this.gl, sc = this.sc;
    if (!gl) return this.draw2d(s);
    if (this.lost || !sc) return;
    const U = this.U, v = s.view, W = this.cv.width, H = this.cv.height;
    gl.uniform2f(U.uRes, W, H);
    gl.uniform4f(U.uA, v.a, v.b, v.d, v.e); gl.uniform2f(U.uC, v.c, v.f);
    gl.uniform3f(U.uClothCol, ...sc.cloth); gl.uniform3f(U.uTint, ...sc.tint);
    gl.uniform2f(U.uBounds, ...sc.bounds); gl.uniform2f(U.uPiv, ...sc.piv); gl.uniform2f(U.uHp, ...sc.hp);
    gl.uniform1f(U.uMode, sc.mode); gl.uniform1f(U.uBC, sc.bc);
    gl.uniform3f(U.uHand, s.hand.x, s.hand.y, s.hand.a); gl.uniform2f(U.uHP, s.hand.lift, s.hand.vis);
    gl.uniform1f(U.uTime, s.time); gl.uniform1f(U.uBreath, s.breath); gl.uniform1f(U.uTail, s.tail); gl.uniform1f(U.uHead, s.head);
    gl.uniform1f(U.uVib, s.vib); gl.uniform1f(U.uWarm, s.warm); gl.uniform1f(U.uK, s.hand.k); gl.uniform1f(U.uShow, s.show);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  draw2d(s) {
    const c = this.c2, B = this.sc, v = s.view, W = this.cv.width, H = this.cv.height;
    if (!B) return;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = `rgb(${B.cloth.map((x) => (x * 200) | 0)})`; c.fillRect(0, 0, W, H);
    c.globalAlpha = .35; c.fillStyle = this.pattern; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
    // scene -> device px (nghịch đảo của affine v)
    const det = v.a * v.e - v.b * v.d;
    const ia = v.e / det, ib = -v.b / det, id = -v.d / det, ie = v.a / det;
    c.setTransform(ia, id, ib, ie, -(ia * v.c + ib * v.f), -(id * v.c + ie * v.f));
    c.globalAlpha = s.show;
    if (this.catCanvas) c.drawImage(this.catCanvas, 0, 0, 2048, 1024);
    c.globalAlpha = 1; c.setTransform(1, 0, 0, 1, 0, 0);
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,8,20,.55)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
}
