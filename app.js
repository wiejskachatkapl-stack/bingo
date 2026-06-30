(function(){
  'use strict';

  const VERSION = 'BINGO v1018';
  const STATS_KEY = 'bingoStats_v1018';
  const ROOM_STATE_PREFIX = 'bingoRoomState_v1018_';

  const screenStart = document.getElementById('screenStart');
  const screenGame = document.getElementById('screenGame');
  const btnPlay = document.getElementById('btnPlay');
  const btnExitStart = document.getElementById('btnExitStart');
  const btnExitGame = document.getElementById('btnExitGame');
  const playersPanel = document.getElementById('playersPanel');
  const playerNickEl = document.getElementById('playerNick');
  const roomCodeEl = document.getElementById('roomCode');
  const bingoBoard = document.getElementById('bingoBoard');
  const drawBall = document.getElementById('drawBall');
  const drawnNumbersEl = document.getElementById('drawnNumbers');
  const btnStartDraw = document.getElementById('btnStartDraw');
  const bingoWinMessage = document.getElementById('bingoWinMessage');
  const rankingRows = document.getElementById('rankingRows');

  const params = new URLSearchParams(window.location.search);

  const state = {
    nick: getStored('bingoNick') || params.get('nick') || 'Mariusz',
    roomCode: getStored('bingoRoomCode') || params.get('room') || 'PWG5N2D',
    players: [],
    card: [],
    drawnNumbers: [],
    drawTimer: null,
    drawSpinTimer: null,
    bingoFinished: false,
    isDrawing: false,
    winMessageTimer: null,
    winningLine: [],
    resultRecorded: false,
    stats: getStatsStore(),
    roomState: null
  };

  function getStored(key){
    try { return localStorage.getItem(key) || ''; } catch(e) { return ''; }
  }

  function setStored(key, value){
    try { localStorage.setItem(key, value); } catch(e) {}
  }

  function showScreen(name){
    screenStart.classList.toggle('is-active', name === 'start');
    screenGame.classList.toggle('is-active', name === 'game');
  }

  function normalizeName(name){
    return String(name || '').trim().slice(0,18) || 'GRACZ';
  }

  function getStatsStore(){
    try {
      const raw = localStorage.getItem(STATS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch(e){
      return {};
    }
  }

  function saveStatsStore(){
    try { localStorage.setItem(STATS_KEY, JSON.stringify(state.stats)); } catch(e) {}
  }

  function ensurePlayerStats(players){
    players.forEach(name => {
      const clean = normalizeName(name);
      if(!state.stats[clean]){
        state.stats[clean] = { points: 0, games: 0 };
      }
      if(typeof state.stats[clean].points !== 'number') state.stats[clean].points = 0;
      if(typeof state.stats[clean].games !== 'number') state.stats[clean].games = 0;
    });
    saveStatsStore();
  }

  function getAverage(playerName){
    const row = state.stats[playerName] || { points: 0, games: 0 };
    if(!row.games) return 0;
    return row.points / row.games;
  }

  function roomStateKey(){
    return ROOM_STATE_PREFIX + (state.roomCode || 'POKOJ');
  }

  function readRoomState(){
    try {
      const raw = localStorage.getItem(roomStateKey());
      const parsed = raw ? JSON.parse(raw) : {};
      return normalizeRoomState(parsed);
    } catch(e){
      return normalizeRoomState({});
    }
  }

  function saveRoomState(data){
    const clean = normalizeRoomState(data);
    try {
      localStorage.setItem(roomStateKey(), JSON.stringify(clean));
    } catch(e) {}
    state.roomState = clean;
    return clean;
  }

  function normalizeRoomState(data){
    const rawOwner = String((data && data.owner) || '').trim();
    const cleanOwner = rawOwner ? normalizeName(rawOwner) : '';
    const cleanPlayers = Array.isArray(data && data.players)
      ? Array.from(new Set(data.players.map(normalizeName))).filter(name => name !== 'GRACZ' || state.nick === 'GRACZ').slice(0,8)
      : [];
    const joined = {};
    const rawJoined = (data && data.joined && typeof data.joined === 'object') ? data.joined : {};
    cleanPlayers.forEach(name => {
      joined[name] = !!rawJoined[name];
    });
    return {
      owner: cleanOwner,
      players: cleanPlayers,
      joined
    };
  }

  function getDisplayPlayers(){
    if(state.roomState && Array.isArray(state.roomState.players) && state.roomState.players.length){
      return state.roomState.players.slice(0,8);
    }
    return (state.players.length ? state.players : [state.nick]).slice(0,8);
  }

  function isHost(){
    return !!(state.roomState && state.roomState.owner === state.nick);
  }

  function isJoinedPlayer(name){
    const clean = normalizeName(name);
    if(state.roomState && state.roomState.owner === clean) return true;
    return !!(state.roomState && state.roomState.joined && state.roomState.joined[clean]);
  }

  function syncRoomMembership(){
    let room = readRoomState();

    room.players = room.players.filter(name => name !== 'GRACZ' || state.nick === 'GRACZ');

    if(!room.owner || (room.owner === 'GRACZ' && state.nick !== 'GRACZ')){
      room.owner = state.nick;
    }

    if(!room.players.includes(room.owner)){
      room.players.unshift(room.owner);
    }

    const requestedPlayers = state.players.length ? state.players : [state.nick];
    requestedPlayers.forEach(name => {
      if(!room.players.includes(name)) room.players.push(name);
    });

    if(!room.players.includes(state.nick)){
      room.players.push(state.nick);
    }

    room.players = room.players.slice(0,8);

    room.players.forEach(name => {
      if(typeof room.joined[name] !== 'boolean') room.joined[name] = false;
    });

    if(room.owner){
      room.joined[room.owner] = true;
    }

    state.players = room.players.slice(0,8);
    saveRoomState(room);
    ensurePlayerStats(state.players);
  }

  function setRoomData(nick, roomCode){
    state.nick = normalizeName(nick);
    state.roomCode = String(roomCode || '').trim().slice(0,10).toUpperCase() || 'POKÓJ';
    playerNickEl.textContent = state.nick;
    roomCodeEl.textContent = state.roomCode;
    setStored('bingoNick', state.nick);
    setStored('bingoRoomCode', state.roomCode);
    syncRoomMembership();
  }

  function getSortedRanking(){
    const activePlayers = getDisplayPlayers();
    ensurePlayerStats(activePlayers);
    return activePlayers.map(name => {
      const clean = normalizeName(name);
      const row = state.stats[clean] || { points: 0, games: 0 };
      return {
        name: clean,
        points: row.points || 0,
        games: row.games || 0,
        avg: getAverage(clean)
      };
    }).sort((a,b) => {
      if(b.avg !== a.avg) return b.avg - a.avg;
      if(b.points !== a.points) return b.points - a.points;
      if(a.games !== b.games) return a.games - b.games;
      return a.name.localeCompare(b.name, 'pl');
    });
  }

  function renderRanking(){
    if(!rankingRows) return;
    const rows = getSortedRanking();
    rankingRows.innerHTML = '';
    rows.forEach((row, index) => {
      const item = document.createElement('div');
      item.className = 'ranking-row';
      if(row.name === state.nick) item.classList.add('is-me');

      const cells = [
        String(index + 1),
        row.name,
        String(row.points),
        String(row.games),
        row.games ? row.avg.toFixed(2) : '0.00'
      ];

      cells.forEach((text, cellIndex) => {
        const span = document.createElement('span');
        span.textContent = text;
        if(cellIndex === 1) span.className = 'ranking-name';
        item.appendChild(span);
      });
      rankingRows.appendChild(item);
    });
  }

  function recordGameResult(winnerName){
    if(state.resultRecorded) return;
    const roomPlayers = getDisplayPlayers();
    ensurePlayerStats(roomPlayers);
    roomPlayers.forEach(name => {
      state.stats[name].games += 1;
    });
    const cleanWinner = normalizeName(winnerName || state.nick);
    ensurePlayerStats([cleanWinner]);
    state.stats[cleanWinner].points += 1;
    state.resultRecorded = true;
    saveStatsStore();
    renderRanking();
  }

  function setPlayers(players){
    const clean = Array.from(new Set((players || []).map(normalizeName))).slice(0,8);
    state.players = clean.length ? clean : [state.nick];
    syncRoomMembership();
    renderPlayers(getDisplayPlayers());
    updatePlayerProgress();
    renderRanking();
    updatePrimaryButton();
  }

  function renderPlayers(players){
    playersPanel.innerHTML = '';
    players.slice(0,8).forEach((name, idx) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.dataset.player = String(idx + 1);
      row.dataset.nick = name;

      const titleLine = document.createElement('div');
      titleLine.className = 'player-name-line';

      const title = document.createElement('div');
      title.className = 'player-name';
      title.textContent = name;

      const readyDot = document.createElement('i');
      readyDot.className = 'player-ready-dot';
      if(isJoinedPlayer(name)) readyDot.classList.add('is-ready');
      else readyDot.classList.add('is-not-ready');

      titleLine.append(title, readyDot);

      const balls = document.createElement('div');
      balls.className = 'balls';
      for(let i = 0; i < 5; i++) balls.appendChild(document.createElement('i'));

      row.append(titleLine, balls);
      playersPanel.appendChild(row);
    });
  }

  function updateReadyDots(){
    const rows = playersPanel.querySelectorAll('.player-row');
    rows.forEach(row => {
      const nick = normalizeName(row.dataset.nick || '');
      const dot = row.querySelector('.player-ready-dot');
      if(!dot) return;
      dot.classList.remove('is-ready', 'is-not-ready');
      dot.classList.add(isJoinedPlayer(nick) ? 'is-ready' : 'is-not-ready');
    });
  }

  function updatePrimaryButton(){
    if(!btnStartDraw) return;
    if(isHost()){
      btnStartDraw.textContent = 'START';
      btnStartDraw.classList.remove('btn-join-room');
      btnStartDraw.setAttribute('aria-label', 'Start');
    } else {
      btnStartDraw.textContent = 'DOŁĄCZ';
      btnStartDraw.classList.add('btn-join-room');
      btnStartDraw.setAttribute('aria-label', 'Dołącz');
    }
  }

  function joinCurrentPlayer(){
    let room = readRoomState();
    if(!room.owner){
      room.owner = state.nick;
    }
    if(!room.players.includes(room.owner)) room.players.unshift(room.owner);
    if(!room.players.includes(state.nick)) room.players.push(state.nick);
    room.players = room.players.slice(0,8);
    room.players.forEach(name => {
      if(typeof room.joined[name] !== 'boolean') room.joined[name] = false;
    });
    room.joined[room.owner] = true;
    room.joined[state.nick] = true;
    saveRoomState(room);
    state.players = room.players.slice(0,8);
    renderPlayers(getDisplayPlayers());
    updatePlayerProgress();
    renderRanking();
    updatePrimaryButton();
  }

  function randomNumbers(min, max, count){
    const numbers = [];
    for(let n=min; n<=max; n++) numbers.push(n);
    for(let i=numbers.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers.slice(0,count).sort((a,b)=>a-b);
  }

  function createBingoCard(){
    const columns = [
      randomNumbers(1,15,5),
      randomNumbers(16,30,5),
      randomNumbers(31,45,5),
      randomNumbers(46,60,5),
      randomNumbers(61,75,5)
    ];
    const card = [];
    for(let row=0; row<5; row++){
      for(let col=0; col<5; col++){
        const isFree = row===2 && col===2;
        card.push({ value: isFree ? '★' : columns[col][row], marked: isFree, free: isFree });
      }
    }
    return card;
  }

  function getMarkedIndexSet(){
    const marked = new Set();
    state.card.forEach((cell,index)=>{ if(cell.marked) marked.add(index); });
    return marked;
  }

  function getAllLines(){
    return [
      [0,1,2,3,4],[5,6,7,8,9],[10,11,12,13,14],[15,16,17,18,19],[20,21,22,23,24],
      [0,5,10,15,20],[1,6,11,16,21],[2,7,12,17,22],[3,8,13,18,23],[4,9,14,19,24],
      [0,6,12,18,24],[4,8,12,16,20]
    ];
  }

  function getBestLineProgress(){
    const marked = getMarkedIndexSet();
    let best = 0;
    getAllLines().forEach(line => {
      let count = 0;
      line.forEach(index => { if(marked.has(index)) count++; });
      if(count > best) best = count;
    });
    return Math.max(0, Math.min(5, best));
  }

  function getWinningLine(){
    const marked = getMarkedIndexSet();
    for(const line of getAllLines()){
      const ok = line.every(index => marked.has(index));
      if(ok) return line.slice();
    }
    return [];
  }

  function updatePlayerProgress(){
    const rows = playersPanel.querySelectorAll('.player-row');
    const progress = getBestLineProgress();
    rows.forEach((row,rowIndex) => {
      const balls = row.querySelectorAll('.balls i');
      balls.forEach((ball,index) => {
        ball.classList.toggle('filled', index < progress && rowIndex === 0);
      });
    });
    updateReadyDots();
  }

  function renderWinningBoard(){
    const wrap = document.createElement('div');
    wrap.className = 'win-board';
    const winSet = new Set(state.winningLine || []);
    ['B','I','N','G','O'].forEach(letter => {
      const head = document.createElement('div');
      head.className = 'win-board-head';
      head.textContent = letter;
      wrap.appendChild(head);
    });
    state.card.forEach((cell,index) => {
      const cellEl = document.createElement('div');
      cellEl.className = 'win-board-cell';
      cellEl.textContent = cell.value;
      if(cell.marked) cellEl.classList.add('is-marked');
      if(cell.free) cellEl.classList.add('is-free');
      if(winSet.has(index)) cellEl.classList.add('is-winning');
      wrap.appendChild(cellEl);
    });
    return wrap;
  }

  function showBingoWinner(winnerName){
    stopDraws();
    state.winningLine = getWinningLine();
    recordGameResult(winnerName || state.nick);
    if(!bingoWinMessage) return;
    const cleanWinner = normalizeName(winnerName || state.nick);
    bingoWinMessage.innerHTML = '';
    const title = document.createElement('strong');
    title.textContent = 'BINGO!';
    const subtitle = document.createElement('span');
    subtitle.textContent = 'Wygrał: ' + cleanWinner;
    bingoWinMessage.appendChild(title);
    bingoWinMessage.appendChild(subtitle);
    if(state.winningLine.length) bingoWinMessage.appendChild(renderWinningBoard());
    bingoWinMessage.classList.add('is-visible');
    if(state.winMessageTimer){ clearTimeout(state.winMessageTimer); state.winMessageTimer = null; }
    state.winMessageTimer = setTimeout(() => {
      bingoWinMessage.classList.remove('is-visible');
      bingoWinMessage.innerHTML = '';
      state.winMessageTimer = null;
    }, 3000);
  }

  function checkBingoStop(){
    if(getBestLineProgress() >= 5) showBingoWinner(state.nick);
  }

  function canMarkCell(cell){
    if(cell.free) return false;
    if(cell.marked) return true;
    const value = Number(cell.value);
    return state.drawnNumbers.includes(value);
  }

  function renderBingoCard(){
    if(!bingoBoard) return;
    bingoBoard.innerHTML = '';
    ['B','I','N','G','O'].forEach(letter => {
      const head = document.createElement('div');
      head.className = 'bingo-head';
      head.textContent = letter;
      bingoBoard.appendChild(head);
    });
    state.card.forEach((cell,index) => {
      const button = document.createElement('button');
      button.className = 'bingo-cell';
      button.type = 'button';
      button.textContent = cell.value;
      button.dataset.index = String(index);
      if(cell.marked) button.classList.add('is-marked');
      if(cell.free) button.classList.add('is-free');
      button.addEventListener('click', () => {
        if(!canMarkCell(cell)) return;
        cell.marked = !cell.marked;
        button.classList.toggle('is-marked', cell.marked);
        updatePlayerProgress();
        checkBingoStop();
      });
      bingoBoard.appendChild(button);
    });
  }

  function allNumbers(){
    const numbers = [];
    for(let n=1; n<=75; n++) numbers.push(n);
    return numbers;
  }

  function remainingNumbers(){
    const used = new Set(state.drawnNumbers);
    return allNumbers().filter(n => !used.has(n));
  }

  function renderDrawnNumbers(){
    if(!drawnNumbersEl) return;
    drawnNumbersEl.innerHTML = '';
    state.drawnNumbers.forEach(number => {
      const item = document.createElement('span');
      item.className = 'drawn-number';
      item.textContent = number;
      drawnNumbersEl.appendChild(item);
    });
  }

  function resetDrawMachine(){
    state.drawnNumbers = [];
    state.bingoFinished = false;
    state.isDrawing = false;
    state.winningLine = [];
    state.resultRecorded = false;
    if(state.drawTimer){ clearTimeout(state.drawTimer); state.drawTimer = null; }
    if(state.drawSpinTimer){ clearInterval(state.drawSpinTimer); state.drawSpinTimer = null; }
    if(drawBall){ drawBall.classList.remove('is-spinning'); drawBall.textContent = '?'; }
    renderDrawnNumbers();
    if(bingoWinMessage){ bingoWinMessage.classList.remove('is-visible'); bingoWinMessage.innerHTML = ''; }
  }

  function startAutoDraw(){
    if(state.bingoFinished) return;
    if(state.drawTimer){ clearTimeout(state.drawTimer); state.drawTimer = null; }
    state.drawTimer = setTimeout(drawNextNumber, 5000);
  }

  function drawNextNumber(){
    if(state.bingoFinished || state.isDrawing) return;
    const available = remainingNumbers();
    if(!available.length){ state.bingoFinished = true; return; }
    state.isDrawing = true;
    if(drawBall){ drawBall.classList.add('is-spinning'); drawBall.textContent = '?'; }
    if(state.drawSpinTimer){ clearInterval(state.drawSpinTimer); state.drawSpinTimer = null; }
    state.drawSpinTimer = setInterval(() => {
      if(!drawBall) return;
      drawBall.textContent = String(available[Math.floor(Math.random()*available.length)]);
    }, 90);
    setTimeout(() => {
      if(state.drawSpinTimer){ clearInterval(state.drawSpinTimer); state.drawSpinTimer = null; }
      const finalNumber = available[Math.floor(Math.random()*available.length)];
      state.drawnNumbers.push(finalNumber);
      if(drawBall){ drawBall.classList.remove('is-spinning'); drawBall.textContent = String(finalNumber); }
      renderDrawnNumbers();
      state.isDrawing = false;
      if(!state.bingoFinished) startAutoDraw();
    }, 3000);
  }

  function stopDraws(){
    state.bingoFinished = true;
    if(state.drawTimer){ clearTimeout(state.drawTimer); state.drawTimer = null; }
    if(state.drawSpinTimer){ clearInterval(state.drawSpinTimer); state.drawSpinTimer = null; }
    if(drawBall) drawBall.classList.remove('is-spinning');
  }

  function newGameCard(){
    resetDrawMachine();
    state.card = createBingoCard();
    renderBingoCard();
    updatePlayerProgress();
    renderRanking();
  }

  function openGame(){
    setRoomData(state.nick, state.roomCode);
    setPlayers(state.players.length ? state.players : [state.nick]);
    newGameCard();
    showScreen('game');
  }

  function exitToGameRoom(){
    const target = window.BINGO_EXIT_URL || '../index.html';
    try {
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:'BINGO_EXIT', version: VERSION}, '*');
        return;
      }
    } catch(e) {}
    window.location.href = target;
  }

  function clearOldCache(){
    if('caches' in window){
      caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch(()=>{});
    }
    if('serviceWorker' in navigator){
      navigator.serviceWorker.getRegistrations().then(registrations => Promise.all(registrations.map(reg => reg.unregister()))).catch(()=>{});
    }
  }

  btnPlay.addEventListener('click', openGame);
  btnStartDraw.addEventListener('click', () => {
    if(isHost()){
      if(state.bingoFinished) return;
      if(state.isDrawing || state.drawTimer) return;
      drawNextNumber();
    } else {
      joinCurrentPlayer();
    }
  });
  btnExitStart.addEventListener('click', exitToGameRoom);
  btnExitGame.addEventListener('click', () => {
    stopDraws();
    showScreen('start');
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') showScreen('start');
  });

  window.addEventListener('storage', (event) => {
    if(event.key !== roomStateKey()) return;
    state.roomState = readRoomState();
    state.players = getDisplayPlayers();
    renderPlayers(getDisplayPlayers());
    updatePlayerProgress();
    renderRanking();
    updatePrimaryButton();
  });

  window.BingoGame = {
    version: VERSION,
    setRoomData,
    setPlayers,
    openGame,
    showStart: () => showScreen('start'),
    newGameCard,
    stopDraws,
    updatePlayerProgress,
    showBingoWinner,
    renderRanking,
    joinCurrentPlayer
  };

  setRoomData(state.nick, state.roomCode);
  ensurePlayerStats([state.nick]);
  renderPlayers(getDisplayPlayers());
  updatePlayerProgress();
  renderRanking();
  updatePrimaryButton();
  clearOldCache();
  showScreen('start');
})();
