(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const SIZE = 20, CELL = canvas.width / SIZE;
  const $ = id => document.getElementById(id);
  let snake, food, direction, nextDirection, score, foods, running=false, paused=false, over=false;
  let lastTick=0, elapsed=0, startedAt=0, soundOn=true, wrap=false, showGrid=true, raf=0;
  let best = Number(localStorage.getItem('neonSnakeBest') || 0);
  let difficulty = 'normal';
  const baseSpeed = {easy:190, normal:135, hard:95};
  let audioCtx;

  function beep(freq=520,duration=.07,type='sine',volume=.035){
    if(!soundOn) return;
    try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type=type;o.frequency.value=freq;g.gain.value=volume;o.connect(g);g.connect(audioCtx.destination);
      o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration);
    } catch(e){}
  }
  function randomFood(){
    let p; do {p={x:Math.floor(Math.random()*SIZE),y:Math.floor(Math.random()*SIZE)}}
    while(snake.some(s=>s.x===p.x&&s.y===p.y)); return p;
  }
  function reset(){
    snake=[{x:9,y:10},{x:8,y:10},{x:7,y:10},{x:6,y:10}];
    direction={x:1,y:0};nextDirection={x:1,y:0};food=randomFood();
    score=0;foods=0;elapsed=0;running=false;paused=false;over=false;lastTick=0;
    $('score').textContent='000';$('foodCount').textContent='0';$('timer').textContent='00:00';
    $('scoreNote').textContent='Your run starts here';$('speedLabel').textContent='NORMAL';$('speedValue').textContent='1.0×';$('speedBar').style.width='28%';
    $('statusText').textContent='READY TO PLAY';$('statusDot').className='status-dot';
    $('overlay').classList.remove('hidden');$('overlayKicker').textContent='READY WHEN YOU ARE';$('overlayTitle').textContent="Let's play.";
    $('overlayText').textContent='Collect the glowing orbs. Avoid the walls and your tail.';$('startBtn').innerHTML='START GAME <span>→</span>';
    $('pauseChip').classList.remove('show');$('best').textContent=String(best).padStart(3,'0');
    draw();
  }
  function start(){
    if(over) reset();
    if(!running){running=true;paused=false;startedAt=performance.now()-elapsed*1000;lastTick=0;
      $('overlay').classList.add('hidden');$('pauseChip').classList.remove('show');$('statusText').textContent='RUN IN PROGRESS';$('statusDot').className='status-dot';beep(620,.09);}
    if(!raf) raf=requestAnimationFrame(loop);
  }
  function pause(){
    if(!running||over)return;
    paused=!paused;
    if(paused){$('pauseChip').classList.add('show');$('statusText').textContent='PAUSED';$('statusDot').className='status-dot paused';}
    else{ $('pauseChip').classList.remove('show');$('statusText').textContent='RUN IN PROGRESS';$('statusDot').className='status-dot';lastTick=0;startedAt=performance.now()-elapsed*1000;}
    beep(paused?300:500,.06);
  }
  function endGame(){
    running=false;over=true;beep(150,.3,'sawtooth',.05);
    if(score>best){best=score;localStorage.setItem('neonSnakeBest',best);}
    $('best').textContent=String(best).padStart(3,'0');$('statusText').textContent='RUN COMPLETE';
    $('overlayKicker').textContent='THAT WAS A GOOD RUN';$('overlayTitle').textContent='Game over.';
    $('overlayText').textContent=`You scored ${score} points and collected ${foods} ${foods===1?'orb':'orbs'}. Ready for another run?`;
    $('startBtn').innerHTML='PLAY AGAIN <span>→</span>';$('overlay').classList.remove('hidden');
  }
  function tick(){
    direction=nextDirection;
    let head={x:snake[0].x+direction.x,y:snake[0].y+direction.y};
    if(wrap){head.x=(head.x+SIZE)%SIZE;head.y=(head.y+SIZE)%SIZE;}
    else if(head.x<0||head.x>=SIZE||head.y<0||head.y>=SIZE){endGame();return;}
    const eating=head.x===food.x&&head.y===food.y;
    const body=eating?snake:snake.slice(0,-1);
    if(body.some(s=>s.x===head.x&&s.y===head.y)){endGame();return;}
    snake.unshift(head);if(eating){score+=10;foods++;food=randomFood();beep(780,.08,'triangle',.045);
      $('score').textContent=String(score).padStart(3,'0');$('foodCount').textContent=foods;
      $('scoreNote').textContent=score>=best&&score>0?'New record territory!':'Nice catch — keep going';
    }else snake.pop();
    const multiplier=1+Math.min(foods*.055,.8);
    $('speedValue').textContent=multiplier.toFixed(1)+'×';
    $('speedLabel').textContent=foods>=10?'INSANE':foods>=5?'FAST':difficulty==='easy'?'CHILL':difficulty==='hard'?'TURBO':'NORMAL';
    $('speedBar').style.width=Math.min(28+foods*6,100)+'%';
  }
  function roundedRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function draw(){
    ctx.clearRect(0,0,600,600);
    const bg=ctx.createLinearGradient(0,0,600,600);bg.addColorStop(0,'#0b1420');bg.addColorStop(1,'#08101a');ctx.fillStyle=bg;ctx.fillRect(0,0,600,600);
    if(showGrid){ctx.strokeStyle='rgba(128,166,173,.075)';ctx.lineWidth=1;for(let i=1;i<SIZE;i++){ctx.beginPath();ctx.moveTo(i*CELL,0);ctx.lineTo(i*CELL,600);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*CELL);ctx.lineTo(600,i*CELL);ctx.stroke();}}
    // food glow
    const fx=(food.x+.5)*CELL,fy=(food.y+.5)*CELL;
    ctx.save();ctx.shadowColor='#a3ff65';ctx.shadowBlur=25;ctx.fillStyle='rgba(163,255,101,.13)';ctx.beginPath();ctx.arc(fx,fy,13,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=15;ctx.fillStyle='#c6ff92';ctx.beginPath();ctx.arc(fx,fy,6,0,Math.PI*2);ctx.fill();ctx.restore();
    snake.forEach((s,i)=>{const pad=i===0?2.2:2.8,x=s.x*CELL+pad,y=s.y*CELL+pad,w=CELL-pad*2;
      const grad=ctx.createLinearGradient(x,y,x+w,y+w);grad.addColorStop(0,i===0?'#d2ff9f':'#8ef4a7');grad.addColorStop(1,i===0?'#83e95e':'#3dc58e');
      ctx.save();ctx.shadowColor=i===0?'rgba(163,255,101,.65)':'rgba(69,220,148,.22)';ctx.shadowBlur=i===0?17:5;ctx.fillStyle=grad;roundedRect(x,y,w,w, i===0?6:5);ctx.restore();
      if(i===0){ctx.fillStyle='#102116';let ex=x+w/2+(direction.x===0?4:direction.x*3),ey=y+w/2+(direction.y===0?-4:direction.y*3);
        ctx.beginPath();ctx.arc(ex-3,ey-2,1.5,0,7);ctx.arc(ex+3,ey+2,1.5,0,7);ctx.fill();}
    });
  }
  function loop(now){
    raf=0;if(!running||paused){draw();return;}
    if(!lastTick)lastTick=now;
    const interval=baseSpeed[difficulty]-Math.min(foods*4,55);
    if(now-lastTick>=interval){tick();lastTick=now;}
    if(running){elapsed=(now-startedAt)/1000;$('timer').textContent=fmt(elapsed);draw();raf=requestAnimationFrame(loop);}
  }
  function fmt(s){const m=Math.floor(s/60),sec=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
  function setDirection(d){
    const map={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
    const v=map[d];if(!v)return;
    if(v.x===-direction.x&&v.y===-direction.y)return;
    nextDirection=v;if(!running&&!over)start();
  }
  document.addEventListener('keydown',e=>{
    const keys={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
    if(keys[e.key]){e.preventDefault();setDirection(keys[e.key]);}
    if(e.code==='Space'){e.preventDefault();if(!running&&!over)start();else pause();}
    if(e.key.toLowerCase()==='r'){reset();start();}
  });
  document.querySelectorAll('.dir').forEach(b=>b.addEventListener('pointerdown',()=>setDirection(b.dataset.dir)));
  $('startBtn').addEventListener('click',start);$('restartBtn').addEventListener('click',()=>{reset();start();});
  $('difficulty').addEventListener('change',e=>{difficulty=e.target.value;});
  $('wrapToggle').addEventListener('change',e=>wrap=e.target.checked);
  $('gridToggle').addEventListener('change',e=>{showGrid=e.target.checked;draw();});
  $('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').style.color=soundOn?'var(--green)':'var(--muted)';$('soundBtn').textContent=soundOn?'♫':'♪';});
  $('themeBtn').addEventListener('click',()=>document.body.classList.toggle('light'));
  reset();
})();