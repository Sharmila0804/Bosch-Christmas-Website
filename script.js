/* ------------------------
   Data and helpers
   ------------------------ */
const STORAGE_KEY = 'xmas_wishes_v1';
const LIKED_KEY = 'xmas_liked_v1';

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 9);
}
function now() { return Date.now(); }
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}
function timeAgo(ts){
  const diff = Math.floor((Date.now() - ts)/60000);
  if (diff < 1) return 'just now';
  if (diff === 1) return '1 minute ago';
  if (diff < 60) return `${diff} minutes ago`;
  const h = Math.floor(diff/60);
  if (h === 1) return '1 hour ago';
  if (h < 24) return `${h} hours ago`;
  const d = Math.floor(h/24);
  return d === 1 ? '1 day ago' : `${d} days ago`;
}

/* ------------------------
   App state
   ------------------------ */
let state = {
  comments: []
};
let likedSet = new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]'));

/* ------------------------
   DOM refs
   ------------------------ */
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

const toggleSnowBtn = document.getElementById('toggle-snow');
const snowContainer = document.getElementById('snow-container');

/* ------------------------
   Persistence
   ------------------------ */
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) { /* ignore */ }
  localStorage.setItem(LIKED_KEY, JSON.stringify(Array.from(likedSet)));
}

/* ------------------------
   Rendering
   ------------------------ */
function renderComments() {
  // sort by likes desc then time desc
  state.comments.sort((a,b) => b.likes - a.likes || b.timestamp - a.timestamp);

  commentsList.innerHTML = '';
  state.comments.forEach(comment => {
    const li = document.createElement('li');
    li.className = 'comment';
    li.dataset.id = comment.id;

    const likedAlready = likedSet.has(comment.id);

    li.innerHTML = `
      <div class="meta">
        <div>
          <div class="name">${escapeHTML(comment.name)}</div>
          <div class="time" aria-hidden="true">${timeAgo(comment.timestamp)}</div>
        </div>
        <div class="score"><strong>${comment.likes}</strong></div>
      </div>
      <div class="text">${escapeHTML(comment.text)}</div>
      <div class="like-row">
        <button class="like-btn ${likedAlready ? 'liked' : ''}" aria-pressed="${likedAlready ? 'true' : 'false'}" data-id="${comment.id}">
          <span class="icon">${likedAlready ? '❤️' : '🤍'}</span>
          <span class="label">${likedAlready ? 'Liked' : 'Like'}</span>
        </button>
        <div class="time-small" aria-hidden="true">${timeAgo(comment.timestamp)}</div>
      </div>
    `;
    commentsList.appendChild(li);
  });

  // update top 3 scoreboard
  top1.textContent = state.comments[0] ? truncate(state.comments[0].text, 60) : '';
  top2.textContent = state.comments[1] ? truncate(state.comments[1].text, 60) : '';
  top3.textContent = state.comments[2] ? truncate(state.comments[2].text, 60) : '';
}

function truncate(s, n=40){ if(!s) return ''; return s.length > n ? s.slice(0,n-3) + '...' : s }

/* ------------------------
   Comment actions
   ------------------------ */
function addComment(name, text) {
  const c = {
    id: uid(),
    name: name || 'Anonymous',
    text: text || '',
    likes: 0,
    timestamp: now()
  };
  state.comments.push(c);
  save();
  renderComments();
}

function handleLike(commentId, btnEl) {
  // one click per commenter per comment: stored in likedSet
  if (likedSet.has(commentId)) return; // ignore further clicks
  const comment = state.comments.find(c => c.id === commentId);
  if (!comment) return;
  comment.likes++;
  likedSet.add(commentId);
  save();
  renderComments();
}

/* ------------------------
   Form events
   ------------------------ */
wishForm.addEventListener('submit', e => {
  e.preventDefault();
  let name = nameInput.value.trim();
  if (anonymousCheckbox.checked) name = 'Anonymous';
  const text = wishInput.value.trim();
  if (!text) {
    wishInput.focus();
    return;
  }
  addComment(name || 'Anonymous', text);
  wishForm.reset();
  nameInput.focus();
});

/* delegated like click */
commentsList.addEventListener('click', (e) => {
  const btn = e.target.closest('.like-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  handleLike(id, btn);
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

/* ------------------------
   Seed sample comments (only if none)
   ------------------------ */
function seed() {
  if (state.comments.length === 0) {
    state.comments.push({
      id: uid(), name: 'Marina',
      text: 'Merry Christmas! May God shower your life with unlimited blessings on this day.',
      likes: 209, timestamp: now() - 1000*60*20
    });
    state.comments.push({
      id: uid(), name: 'Bryan',
      text: 'Merry Xmas! Warmest greetings to you on this festive season and best wishes for the New Year.',
      likes: 90, timestamp: now() - 1000*60*50
    });
    save();
  }
}

/* ------------------------
   Music controls & autoplay fallback
   ------------------------ */
function setupMusic() {
  // attempt autoplay
  music.play().then(() => {
    musicToggle.textContent = 'Pause music';
  }).catch(() => {
    musicToggle.textContent = 'Play music';
  });

  musicToggle.addEventListener('click', () => {
    if (music.paused) {
      music.play().then(()=> musicToggle.textContent = 'Pause music').catch(()=> musicToggle.textContent = 'Play music');
    } else {
      music.pause();
      musicToggle.textContent = 'Play music';
    }
  });

  muteToggle.addEventListener('click', (ev) => {
    ev.preventDefault();
    music.muted = !music.muted;
    muteToggle.textContent = music.muted ? 'Unmute' : 'Mute';
  });

  // if user interacts anywhere first time, try to play (fallback)
  const playOnInteraction = () => {
    music.play().catch(()=>{});
    window.removeEventListener('click', playOnInteraction);
    window.removeEventListener('keydown', playOnInteraction);
  };
  window.addEventListener('click', playOnInteraction);
  window.addEventListener('keydown', playOnInteraction);
}

/* ------------------------
   Snow animation (canvas-less small DOM elements)
   ------------------------ */
let snowInterval = null;
let snowOn = true;

function createSnowflake(){
  const el = document.createElement('div');
  el.className = 'snowflake';
  el.style.position = 'absolute';
  el.style.top = '-10vh';
  el.style.left = (Math.random()*100) + 'vw';
  const size = 8 + Math.random()*28;
  el.style.fontSize = size + 'px';
  el.style.pointerEvents = 'none';
  el.textContent = '❄️';
  el.style.opacity = (0.2 + Math.random()*0.9).toString();
  const duration = 6 + Math.random()*12; // seconds

  snowContainer.appendChild(el);

  // animate using CSS transforms with transition
  const endX = (Math.random()*40 - 20); // drift
  el.animate([
    { transform: `translate3d(0,0,0)` },
    { transform: `translate3d(${endX}vw, ${100 + Math.random()*20}vh, 0)` }
  ], {
    duration: duration*1000,
    easing: 'linear',
    iterations: 1,
    fill: 'forwards'
  });

  setTimeout(()=> {
    el.remove();
  }, duration*1000 + 200);
}

function startSnow() {
  if (snowInterval) return;
  snowInterval = setInterval(createSnowflake, 150);
  snowOn = true;
  toggleSnowBtn.textContent = 'Toggle Snow';
}
function stopSnow() {
  clearInterval(snowInterval);
  snowInterval = null;
  snowOn = false;
  toggleSnowBtn.textContent = 'Snow off';
}

toggleSnowBtn.addEventListener('click', () => {
  if (snowOn) stopSnow(); else startSnow();
});

/* ------------------------
   Initial boot
   ------------------------ */
function boot() {
  load();
  seed();
  renderComments();
  setupMusic();
  startSnow();
}
boot();

/* ------------------------
   accessibility: update timestamps every minute
   ------------------------ */
setInterval(() => {
  const times = document.querySelectorAll('.time, .time-small');
  times.forEach(el => {
    // don't change inner structure; easiest is re-render
  });
  renderComments();
}, 60000);
