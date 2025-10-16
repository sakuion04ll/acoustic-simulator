const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// ---------------------------
//  ベクトル関係の関数
// ---------------------------
  const cross = (a, b) => a.x*b.y - a.y*b.x; //外積
  const dot = (a, b) => a.x*b.x + a.y*b.y; //内積
  const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y }); //引き算（長さ）
  //正規化
  function normalize(v){
    const len = Math.hypot(v.x, v.y);
    return len === 0 ? {x: 0, y: 0} : {x: v.x / len, y: v.y / len};
  }
  //反射ベクトル
  function reflect(incident, normal){ //(音の進行ベクトル, 壁の法線ベクトル)
    const dotProduct = dot(incident, normal);
    return{
      x: incident.x - 2*dotProduct*normal.x,
      y: incident.y - 2*dotProduct*normal.y
    };
  }


  // 壁の法線ベクトル計算
 function getWallNormal(wallStart, wallEnd, incident) {
  const wallVec = subtract(wallEnd, wallStart);
  let normal = normalize({x: -wallVec.y, y: wallVec.x}); // 左回り
  
  if(dot(incident, normal) > 0){
    normal = normalize({x: wallVec.y, y: -wallVec.x }); // 右回り
  }
  return normal; 
}


// ---------------------------
//  線分の交差判定と交点取得
// ---------------------------
  // 2つの線分（p1-p2 と p3-p4）が交差しているかを判定する関数
  function isIntersect(p1, p2, p3, p4) {
    // ベクトルの外積を使った判定
    const d1 = subtract(p2, p1);
    const d2 = subtract(p4, p3);
    const delta = subtract(p3, p1);

    const cross1 = cross(d1, d2);

    if (cross1 === 0) return false; // 平行なときは交差しない

    const t = cross(delta, d2) / cross1;
    const u = cross(delta, d1) / cross1;

    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
  }

  //交点取得
  function getIntersectionRaySegment(rayOrigin, rayDir, segA, segB) {
  const segDir = subtract(segB, segA); // 壁の方向ベクトル
  const v = subtract(segA, rayOrigin); // rayOrigin→segAのベクトル

  const det = cross(rayDir, segDir);

  if (det === 0) return null; // 平行で交差しない

  const t = cross(v, segDir) / det;
  const u = cross(v, rayDir) / det;

  // t: ray上のパラメータ → t<0 なら後ろ方向
  // u: 線分の中にあるかチェック（0〜1）
  if (t < 0) return null;       // rayの逆方向
  if (u < 0 || u > 1) return null; // 壁の線分外

  // 交点の座標
  return {
    x: rayOrigin.x + rayDir.x * t,
    y: rayOrigin.y + rayDir.y * t
  };
}


// ---------------------------
// 多重反射
// ---------------------------
function traceRay(origin, direction, walls, depth,  reflectionCount = 0, gain = 1.0){
  if(depth <= 0) return; //打ち切り条件
  //進む方向で一番近い壁を調べる
  let closestPoint = null;
  let closestNormal = null;
  let minDist = Infinity;

  for (const wall of walls){
    const point = getIntersectionRaySegment(origin, direction, wall.start, wall.end);
    if(point){
      const dist = Math.hypot(point.x-origin.x, point.y-origin.y);
      if(dist < minDist){ 
        minDist = dist;
        closestPoint = point;
        closestNormal = getWallNormal(wall.start, wall.end, direction);
      }
    }
  }
  
  //反射音は太く，反響音は細く
    let width;
    if (reflectionCount <= 1) {
      width = 4;
    } else {
      width = 1;
    }
    // 色を反射回数に応じて変化（原色→白）
    const brightness = Math.min(75, 25 + reflectionCount * 10); 
    const color = `hsl(182, 81%, ${brightness}%)`;
  if(closestPoint){
    
    drawLine(origin, closestPoint, color, width*gain);

    /*交点に赤い丸を描く（デバッグ用）
    ctx.beginPath();
    ctx.arc(closestPoint.x, closestPoint.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
    */

    // 反射ベクトルを計算
    const incidentVec = subtract(closestPoint, origin);
    const mag = Math.hypot(incidentVec.x, incidentVec.y);

    if (mag < 1e-6) {
      return;
    }
    const incident = normalize(incidentVec);
    const reflected = normalize(reflect(incident, closestNormal));

    // 再帰的に追跡
    const EPS = 1e-4; // 少しだけズラすための微小値
    const nextOrigin = {
      x: closestPoint.x + reflected.x * EPS,
      y: closestPoint.y + reflected.y * EPS
    };
    traceRay(nextOrigin, reflected, walls, depth - 1, reflectionCount+1, gain);
    
    
  } else {
    // 交点がない場合は遠くまで直進して終了
    const farEnd = {
      x: origin.x + direction.x * 1000,
      y: origin.y + direction.y * 1000
    };
    const brightness = Math.min(75, 25 + reflectionCount * 10);
    const color = `hsl(182, 81%, ${brightness}%)`;
    drawLine(origin, farEnd, color, width*gain);
  }
    
}

  
// ---------------------------
// 描写
// ---------------------------
//線を描く
function drawLine(start, end, color = "black", width=1){
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// 円を描く
function drawCircle(point, color = "black"){
  ctx.beginPath();
  ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

//壁を描く
function drawWalls(walls){
  for(const wall of walls){
    drawLine(wall.start, wall.end, "black");
    // 端点に小さな円を描く
    drawCircle(wall.start, "black");
    drawCircle(wall.end, "black");
  }
}


// 音源を描く
function drawSource(source){
  // 音源の描画
  ctx.beginPath();
  ctx.arc(source.x, source.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#FF518B";
  ctx.fill();
}

//全体描画
function drawScene(ctx, canvas, source, walls, direction) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWalls(walls);

  // 音線の数をスライダーから取得
  if (shouldDrawSound) {
  const volume = parseInt(document.getElementById("volumeRange").value); // 1～100
  const rayCount = Math.floor(volume / 2);

  const centerAngleDeg = parseInt(document.getElementById("angleSlider").value); // 指向性中心
  const aimAngle = parseInt(document.getElementById("aimSlider").value); // 指向性の角度幅

  const centerAngleRad = centerAngleDeg * Math.PI / 180;

  for (let i = 0; i < rayCount; i++) {
    // 各線の角度は中心から±で均等に分布させる
    const spread = Math.PI * 2 / rayCount; // 放射間隔
    const angleRad = centerAngleRad + (i - rayCount / 2) * spread;

    const dir = {
      x: Math.cos(angleRad),
      y: Math.sin(angleRad)
    };

    const angleDeg = angleRad * 180 / Math.PI;
    let deviation = Math.abs((angleDeg - centerAngleDeg + 360) % 360);
    if (deviation > 180) deviation = 360 - deviation;

    const gain = deviation < aimAngle ? 1.0 : 0.4;
    traceRay(source, dir, walls, 26, 0, gain);
  }
}

  drawSource(source); // 音源を描画
}


// ---------------------------
// メイン処理
// ---------------------------

//音源の位置
const source = { x: 100, y: 50 };
const direction = normalize({ x: -1, y: 3 }); // 進行方向

//線の長さ
const length = 200;

//音線の終点を計算
const rayEnd = {
  x: source.x + direction.x * 1000,
  y: source.y + direction.y * 1000
};


let draggingSource = false;
let draggingPoint = null;
let shouldDrawSound = false;
let walls = [];

// マウス位置の取得
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// 2点間の距離
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------------------------
// マウスイベント
// ---------------------------
canvas.addEventListener("mousedown", (e) => {
  const pos = getMousePos(e);

  // 1. 音源をクリックしたか
  if (distance(pos, source) < 10) {
    draggingSource = true;
    return;
  }

  // 2. 壁の端点をクリックしたか
  for (let wall of walls) {
    for (let point of [wall.start, wall.end]) {
      if (distance(pos, point) < 10) {
        draggingPoint = point;
        return;
      }
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  const pos = getMousePos(e);

  if (draggingSource) {
    source.x = pos.x;
    source.y = pos.y;
    drawScene(ctx, canvas, source, walls, direction);
  }

  if (draggingPoint) {
    draggingPoint.x = pos.x;
    draggingPoint.y = pos.y;
    drawScene(ctx, canvas, source, walls, direction);
  }
});

canvas.addEventListener("mouseup", () => {
  draggingSource = false;
  draggingPoint = null;
});

// 初期描画
drawScene(ctx, canvas, source, walls, direction);

// ---------------------------
//　壁の生成
// ---------------------------
function generateWalls() {
  const count = parseInt(document.getElementById("wallCount").value);
  walls = [];
  const spacing = 40; // 壁の間隔
  const wallLength = 100; // 壁の長さ
  const startX = 100;
  const startY = 100;

  for (let i = 0; i < count; i++) {
    const y = startY + i * spacing;
    walls.push({
      start: { x: startX, y: y },
      end: { x: startX + wallLength, y: y },
    });
  }
  drawScene(ctx, canvas, source, walls, direction);
}

// ---------------------------
//　設定取得
// ---------------------------
//音量スライダー
document.getElementById("volumeRange").addEventListener("input", (e) => {
  document.getElementById("volumeValue").textContent = e.target.value;
  drawScene(ctx, canvas, source, walls, direction); // 音線を再描画
});

//向きスライダー
document.getElementById("angleSlider").addEventListener("input", (e) => {
  document.getElementById("angleValue").textContent = e.target.value;
  drawScene(ctx, canvas, source, walls, direction); // 音線を再描画
});

//指向性スライダー
document.getElementById("aimSlider").addEventListener("input", (e) => {
  document.getElementById("aimValue").textContent = e.target.value;
  drawScene(ctx, canvas, source, walls, direction); // 音線を再描画
});


window.onload = () => {
  generateWalls(); // 壁があるなら生成
  drawScene();     // 初期描画
};

// 音線表示非表示
document.getElementById("hiddenSound").addEventListener("click", () => {
  shouldDrawSound = !shouldDrawSound; // true <-> false の切り替え  
  const btn = document.getElementById("hiddenSound");
  btn.textContent = shouldDrawSound ? "音線を非表示" : "音線を表示";
  // 再描画
  drawScene(ctx, canvas, source, walls, direction);
});


