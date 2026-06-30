(function(){
  'use strict';
  const VERSION = 'BINGO v1004';
  const screenStart = document.getElementById('screenStart');
  const screenGame = document.getElementById('screenGame');
  const btnPlay = document.getElementById('btnPlay');
  const btnExitStart = document.getElementById('btnExitStart');
  const btnExitGame = document.getElementById('btnExitGame');
  const playersPanel = document.getElementById('playersPanel');
  const playerNickEl = document.getElementById('playerNick');
  const roomCodeEl = document.getElementById('roomCode');

  const params = new URLSearchParams(window.location.search);

  const state = {
    nick: getStored('bingoNick') || params.get('nick') || 'Mariusz',
    roomCode: getStored('bingoRoomCode') || params.get('room') || 'PWG5N2D',
    // Na starcie nie ma przykładowych graczy. Widoczny jest tylko aktualny gracz.
    players: []
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

  function setRoomData(nick, roomCode){
    state.nick = normalizeName(nick);
    state.roomCode = String(roomCode || '').trim().slice(0,10).toUpperCase() || 'POKÓJ';
    playerNickEl.textContent = state.nick;
    roomCodeEl.textContent = state.roomCode;
    setStored('bingoNick', state.nick);
    setStored('bingoRoomCode', state.roomCode);
  }

  function setPlayers(players){
    const clean = Array.from(new Set((players || []).map(normalizeName))).slice(0,8);
    state.players = clean.length ? clean : [state.nick];
    renderPlayers(state.players);
  }

  function renderPlayers(players){
    playersPanel.innerHTML = '';
    players.slice(0,8).forEach((name, idx) => {
      const row = document.createElement('div');
      row.className = 'player-row';
      row.dataset.player = String(idx + 1);

      const title = document.createElement('div');
      title.className = 'player-name';
      title.textContent = name;

      const balls = document.createElement('div');
      balls.className = 'balls';
      for(let i=0;i<5;i++) balls.appendChild(document.createElement('i'));

      row.append(title, balls);
      playersPanel.appendChild(row);
    });
  }

  function openGame(){
    setRoomData(state.nick, state.roomCode);
    setPlayers(state.players.length ? state.players : [state.nick]);
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

  btnPlay.addEventListener('click', openGame);
  btnExitStart.addEventListener('click', exitToGameRoom);
  btnExitGame.addEventListener('click', () => showScreen('start'));

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') showScreen('start');
  });

  // Proste wejście dla późniejszego GameRoom:
  // window.BingoGame.setRoomData('Nick', 'KOD123');
  // window.BingoGame.setPlayers(['Nick1','Nick2']);
  // window.BingoGame.openGame();
  window.BingoGame = {
    version: VERSION,
    setRoomData,
    setPlayers,
    openGame,
    showStart: () => showScreen('start')
  };

  setRoomData(state.nick, state.roomCode);

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  showScreen('start');
})();
