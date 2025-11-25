/* Full Festive Explosion script.js
   - per-person like logic using visitor id
   - music play fallback with visible controls
   - top3 ornaments + scoreboard
   - floating bubbles, gift drop, snow
*/

const STORAGE_KEY = 'xmas_wishes_v1';
const LIKED_KEY = 'xmas_liked_v1';
const VISITOR_KEY = 'xmas_visitor_v1';

// generate persistent visitor id (represents "person" in this browser)
function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = 'visitor_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}
const visitorId = getVisitorId();

/* helpers */
function uid() { return 'id_' + Math.random().toString(36).slice(2,9); }
function now() { return Date.now(); }
function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }
function timeAgo(ts){
  const mins = Math.floor((Date.now()-ts)/60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const h = Math.floor(mins/60);
  if (h === 1) return '1 hour ago';
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h/24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

/* app state */
let state = { comments: [] };

// likedSet stores strings of `${visitorId}_${commentId}` so one like per person per comment
let likedSet = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));

/* DOM refs */
const commentsList = document.getElementById('comments-list');
const wishForm = document.getElementById('wish-form');
const nameInput = document.getElementById('name');
const wishInput = document.getElementById('wish');
const anonymousCheckbox = document.getElementById('anonymous');
const top1 = document.getElementById('top1');
const top2 = document.getElementById('top2');
const top3 = document.getElementById('top3');
const clearStorageBtn = document.getElementById('clear-storage');

const music = document.getElementById('christmas-music');
const musicToggle = document.getElementById('music-toggle');
const muteToggle = document.getElementById('mute-toggle');
const playlistToggle = document.getElementById('playlist-toggle');
const wave = document.getElementById('wave');

const toggleSnowBtn = document.getElementById('toggle-snow');
const snowContainer = document.getElementById('snow-container');

const ornamentTop1 = document.getElementById('orn-top1');
const ornamentTop2 = document.getElementById('orn-top2');
const ornamentTop3 = document.getElementById('orn-top3');

const ornamentsWrap = document.getElementById('ornaments');
const floatingBubbles = document.getElementById('floating-bubbles');
const giftsContainer = document.getElementById('gifts');

/* persistence */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw);
    if (!state.comments) state.comments = [];
  } catch (e) {
    state = {comments: []};
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(likedSet)));
}

/* rendering */
function truncate(s, n=60){ if(!s) return ''; return s.length > n ? s.slice(0,n-3)+'...' : s; }

function renderComments() {
  state.comments.sort((a,b) => b.likes - a.likes || b.timestamp - a.timestamp);
  commentsList.innerHTML = '';

  state.comments.forEach(c => {
    const li = document.createElement('li');
    li.className = 'comment';
    li.dataset.id = c.id;

    const likedAlready = likedSet.has(`${visitorId}_${c.id}`);

    li.innerHTML = `
      <div class="meta">
        <div>
          <div class="name">${escapeHTML(c.name)}</div>
          <div class="time">${timeAgo(c.timestamp)}</div>
        </div>
        <div class="score"><strong>${c.likes}</strong></div>
      </div>
      <div class="text">${escapeHTML(c.text)}</div>
      <div class="like-row">
        <button class="like-btn ${likedAlready ? 'liked' : ''}" data-id="${c.id}" aria-pressed="${likedAlready ? 'true' : 'false'}">
          <span class="icon">${likedAlready ? '❤️' : '🤍'}</span>
          <span class="label">${likedAlready ? 'Liked' : 'Like'}</span>
        </button>
        <div class="time-small">${timeAgo(c.timestamp)}</div>
      </div>
    `;
    // subtle entrance animation
    li.style.opacity = 0;
    commentsList.appendChild(li);
    requestAnimationFrame(()=> li.style.transition = 'opacity 360ms ease, transform 360ms ease');
    requestAnimationFrame(()=> { li.style.opacity = 1; li.style.transform = 'translateY(0)'; });
  });

  // update scoreboard and ornaments
  top1.textContent = state.comments[0] ? truncate(state.comments[0].text, 60) : '—';
  top2.textContent = state.comments[1] ? truncate(state.comments[1].text, 60) : '—';
  top3.textContent = state.comments[2] ? truncate(state.comments[2].text, 60) : '—';

  ornamentTop1.textContent = state.comments[0] ? truncate(`${state.comments[0].name}: ${state.comments[0].text}`, 20) : '—';
  ornamentTop2.textContent = state.comments[1] ? truncate(`${state.comments[1].name}: ${state.comments[1].text}`, 20) : '—';
  ornamentTop3.textContent = state.comments[2] ? truncate(`${state.comments[2].name}: ${state.comments[2].text}`, 20) : '—';
}

/* comment actions */
function addComment(name, text) {
  const c = { id: uid(), name: name || 'Anonymous', text, likes: 0, timestamp: now() };
  state.comments.push(c);
  save();
  renderComments();
  spawnFloatingBubble(c.name, c.text);
}

/* like: one per person per comment */
function handleLike(commentId) {
  const key = `${visitorId}_${commentId}`;
  if (likedSet.has(key)) return; // already liked by this visitor
  const comment = state.comments.find(c => c.id === commentId);
  if (!comment) return;
  comment.likes++;
  likedSet.add(key);
  save();
  renderComments();
}

/* form events */
wishForm.addEventListener('submit', e => {
  e.preventDefault();
  let name = nameInput.value.trim();
  if (anonymousCheckbox.checked) name = 'Anonymous';
  const text = wishInput.value.trim();
  if (!text) { wishInput.focus(); return; }
  addComment(name || 'Anonymous', text);
  wishForm.reset();
  nameInput.focus();
});

/* delegated like click */
commentsList.addEventListener('click', e => {
  const btn = e.target.closest('.like-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  handleLike(id);
});

/* clear storage */
clearStorageBtn.addEventListener('click', () => {
  if (!confirm('Clear all saved wishes and likes (local only)?')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LIKED_KEY);
  state.comments = [];
  likedSet.clear();
  renderComments();
});

/* seed */
function seed() {
  if (state.comments.length === 0) {
    state.comments.push({ id: uid(), name: 'Marina', text: 'Merry Christmas! May God shower your life with unlimited blessings on this day.', likes: 209, timestamp: now() - 1000*60*20 });
    state.comments.push({ id: uid(), name: 'Bryan', text: 'Merry Xmas! Warmest greetings to you on this festive season and best wishes for the New Year.', likes: 90, timestamp: now() - 1000*60*50 });
    save();
  }
}

/* AUDIO controls + autoplay fallback
   - visible Play button (must be clicked by user to allow autoplay in many browsers)
   - shows wave animation when playing
*/
function setupMusic() {
  // try to play (may be blocked); update UI accordingly
  music.volume = 0.6;
  music.play().then(()=> {
    musicToggle.textContent = 'Pause music';
    wave.style.opacity = 1;
  }).catch(()=> {
    musicToggle.textContent = 'Play music';
    wave.style.opacity = 0.18;
  });

  musicToggle.addEventListener('click', () => {
    if (music.paused) {
      music.play().then(()=> {
        musicToggle.textContent = 'Pause music';
        wave.style.opacity = 1;
      }).catch(()=> {
        musicToggle.textContent = 'Play music';
        wave.style.opacity = 0.18;
      });
    } else {
      music.pause();
      musicToggle.textContent = 'Play music';
      wave.style.opacity = 0.18;
    }
  });

  muteToggle.addEventListener('click', (ev) => {
    ev.preventDefault();
    music.muted = !music.muted;
    muteToggle.textContent = music.muted ? 'Unmute' : 'Mute';
  });

  // playlist toggle: allow quick swap to another built-in track (demo)
  playlistToggle.addEventListener('click', () => {
    const current = music.querySelector('source').src;
    // two demo tracks: swap between the default and an alternate (Pixabay)
    const alt = 'https://cdn.pixabay.com/download/audio/2021/12/08/audio_9f3f2f9b09.mp3?filename=snow-waltz-6293.mp3';
    const original = 'https://cdn.pixabay.com/download/audio/2022/12/18/audio_e39915e463.mp3?filename=christmas-decorations-relax-120039.mp3';
    const newSrc = current.includes('snow-waltz') ? original : alt;
    music.pause();
    music.querySelector('source').src = newSrc;
    music.load();
    music.play().then(()=> {
      musicToggle.textContent = 'Pause music';
      wave.style.opacity = 1;
    }).catch(()=> {
      musicToggle.textContent = 'Play music';
      wave.style.opacity = 0.18;
    });
  });

  // if user interacts anywhere, try to play (safe fallback)
  const playOnInteraction = () => {
    music.play().catch(()=>{});
    window.removeEventListener('click', playOnInteraction);
    window.removeEventListener('keydown', playOnInteraction);
  };
  window.addEventListener('click', playOnInteraction);
  window.addEventListener('keydown', playOnInteraction);
}

/* SNOW: create DOM snowflakes with random sizes/rotations */
let snowInterval = null;
let snowOn = true;
function createSnowflake(){
  const el = document.createElement('div');
  el.className = 'snowflake';
  el.textContent = '❄️';
  const size = 12 + Math.random()*28;
  el.style.fontSize = size + 'px';
  el.style.left = (Math.random()*100) + 'vw';
  el.style.top = '-10vh';
  el.style.opacity = (0.15 + Math.random()*0.9).toString();
  snowContainer.appendChild(el);

  // animate via Web Animations API for smoothness
  const duration = 6000 + Math.random()*9000;
  el.animate([
    { transform: `translateY(0) rotate(0deg)`, opacity: el.style.opacity },
    { transform: `translateY(${110 + Math.random()*30}vh) rotate(${Math.random()*720}deg)`, opacity: 0.9 }
  ], { duration, easing: 'linear', iterations: 1, fill: 'forwards' });

  setTimeout(()=> el.remove(), duration + 200);
}

function startSnow(){ if (snowInterval) return; snowInterval = setInterval(createSnowflake, 120); snowOn=true; toggleSnowBtn.textContent='Toggle Snow' }
function stopSnow(){ clearInterval(snowInterval); snowInterval=null; snowOn=false; toggleSnowBtn.textContent='Snow off' }
toggleSnowBtn.addEventListener('click', ()=> snowOn ? stopSnow() : startSnow());

/* floating bubbles (decorative on new comment spawn) */
function spawnFloatingBubble(name, text){
  const el = document.createElement('div');
  el.className = 'bubble';
  el.style.position = 'absolute';
  el.style.left = (20 + Math.random()*60) + '%';
  el.style.top = (10 + Math.random()*50) + '%';
  el.style.pointerEvents = 'none';
  el.style.padding = '6px 10px';
  el.style.borderRadius = '999px';
  el.style.background = 'linear-gradient(90deg,#ffd36e,#ff9fb8)';
  el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
  el.style.color = '#2b2b2b';
  el.style.fontWeight = 800;
  el.textContent = `${name}: ${text.length>28 ? text.slice(0,28)+'...' : text}`;
  floatingBubbles.appendChild(el);
  el.animate([{opacity:0, transform:'translateY(20px) scale(0.9)'}, {opacity:1, transform:'translateY(0) scale(1)'}, {opacity:0, transform:'translateY(-40px) scale(0.8)'}], {duration:4200, easing:'ease-in-out'});
  setTimeout(()=> el.remove(), 4200);
}

/* Gift drop demo (visual) */
function giftDropBurst() {
  const count = 8;
  for (let i=0;i<count;i++){
    const g = document.createElement('div');
    g.className = 'gift';
    g.style.left = (10 + Math.random()*80) + 'vw';
    g.style.top = '-6vh';
    g.style.transform = `rotate(${Math.random()*30-15}deg)`;
    g.textContent = '🎁';
    giftsContainer.appendChild(g);

    const dur = 1800 + Math.random()*1400;
    g.animate([{ transform:'translateY(0) rotate(0deg)' }, { transform:`translateY(${120 + Math.random()*80}vh) rotate(${Math.random()*360}deg)` }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' });

    setTimeout(()=> g.remove(), dur+200);
  }
}

/* initialize */
function boot(){
  load();
  seed();
  renderComments();
  setupMusic();
  startSnow();
}
boot();

/* Hook gift drop demo */
document.getElementById('gift-drop').addEventListener('click', ()=> giftDropBurst());

/* update times every minute */
setInterval(()=> renderComments(), 60000);

/* accessibility small improvement: add small entrance bubbles for top ornaments when they change
   We’ll animate ornaments when the top3 change. Keep it light.
*/
let lastTopIds = '';
function checkTopChange(){
  const ids = (state.comments[0]?.id||'') + '|' + (state.comments[1]?.id||'') + '|' + (state.comments[2]?.id||'');
  if (ids !== lastTopIds) {
    lastTopIds = ids;
    // small pulse on ornaments
    ['.top1','.top2','.top3'].forEach((sel,i)=>{
      const el = document.querySelector('.' + sel.replace('.',''));
      if (el) {
        el.animate([{transform:'scale(1)'},{transform:'scale(1.06)'},{transform:'scale(1)'}], {duration:700, easing:'ease-out'});
      }
    });
  }
}
setInterval(checkTopChange, 900);

/* final: ensure scoreboard and ornaments update when renderComments changes - already done inside renderComments */
