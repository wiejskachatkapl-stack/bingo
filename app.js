(function(){
  'use strict';

  const VERSION = 'BINGO v1005';

  const screenStart = document.getElementById('screenStart');
  const screenGame = document.getElementById('screenGame');
  const btnPlay = document.getElementById('btnPlay');
  const btnExitStart = document.getElementById('btnExitStart');
  const btnExitGame = document.getElementById('btnExitGame');
  const playersPanel = document.getElementById('playersPanel');
  const playerNickEl = document.getElementById('playerNick');
  const roomCodeEl = document.getElementById('roomCode');
  const bingoBoard = document.getElementById('bingoBoard');

  const params = new URLSearchParams(window.location.search);

  const state = {
    nick: getStored('bingoNick') || params.get('nick') || 'Mariusz',
    roomCode: getStored('bingoRoomCode') || params.get('room') || 'PWG5N2D',
    players: [],
    card: []
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
      for(let i = 0; i < 5; i++){
        balls.appendChild(document.createElement('i'));
      }

      row.append(title, balls);
      playersPanel.appendChild(row);
    });
  }

  function randomNumbers(min, max, count){
    const numbers = [];
    for(let n = min; n <= max; n++) numbers.push(n);

    for(let i = numbers.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    return numbers.slice(0, count).sort((a, b) => a - b);
  }

  function createBingoCard(){
    // Klasyczna karta BINGO: B 1-15, I 16-30, N 31-45, G 46-60, O 61-75.
    const columns = [
      randomNumbers(1, 15, 5),
      randomNumbers(16, 30, 5),
      randomNumbers(31, 45, 5),
      randomNumbers(46, 60, 5),
      randomNumbers(61, 75, 5)
    ];

    const card = [];
    for(let row = 0; row < 5; row++){
      for(let col = 0; col < 5; col++){
        card.push({
          value: columns[col][row],
          marked: row === 2 && col === 2,
          free: row === 2 && col === 2
        });
      }
    }

    card[12].value = '★';
    return card;
  }

  function renderBingoCard(){
    if(!bingoBoard) return;

    bingoBoard.innerHTML = '';

    const letters = ['B','I','N','G','O'];
    letters.forEach(letter => {
      const head = document.createElement('div');
      head.className = 'bingo-head';
      head.textContent = letter;
      bingoBoard.appendChild(head);
    });

    state.card.forEach((cell, index) => {
      const button = document.createElement('button');
      button.className = 'bingo-cell';
      button.type = 'button';
      button.textContent = cell.value;
      button.dataset.index = String(index);

      if(cell.marked) button.classList.add('is-marked');
      if(cell.free) button.classList.add('is-free');

      button.addEventListener('click', () => {
        if(cell.free) return;
        cell.marked = !cell.marked;
        button.classList.toggle('is-marked', cell.marked);
      });

      bingoBoard.appendChild(button);
    });
  }

  function newGameCard(){
    state.card = createBingoCard();
    renderBingoCard();
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

  btnPlay.addEventListener('click', openGame);
  btnExitStart.addEventListener('click', exitToGameRoom);
  btnExitGame.addEventListener('click', () => showScreen('start'));

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') showScreen('start');
  });

  window.BingoGame = {
    version: VERSION,
    setRoomData,
    setPlayers,
    openGame,
    showStart: () => showScreen('start'),
    newGameCard
  };

  setRoomData(state.nick, state.roomCode);

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  showScreen('start');
})();
