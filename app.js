(function(){
  'use strict';

  const VERSION = 'BINGO v1007';

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
    isDrawing: false
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

    for(let n = min; n <= max; n++){
      numbers.push(n);
    }

    for(let i = numbers.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    return numbers.slice(0, count).sort((a, b) => a - b);
  }

  function createBingoCard(){
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
        const isFree = row === 2 && col === 2;
        card.push({
          value: isFree ? '★' : columns[col][row],
          marked: isFree,
          free: isFree
        });
      }
    }

    return card;
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


  function allNumbers(){
    const numbers = [];
    for(let n = 1; n <= 75; n++){
      numbers.push(n);
    }
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

    if(state.drawTimer){
      clearTimeout(state.drawTimer);
      state.drawTimer = null;
    }

    if(state.drawSpinTimer){
      clearInterval(state.drawSpinTimer);
      state.drawSpinTimer = null;
    }

    if(drawBall){
      drawBall.classList.remove('is-spinning');
      drawBall.textContent = '?';
    }

    renderDrawnNumbers();
  }

  function startAutoDraw(){
    if(state.bingoFinished) return;

    if(state.drawTimer){
      clearTimeout(state.drawTimer);
      state.drawTimer = null;
    }

    state.drawTimer = setTimeout(drawNextNumber, 5000);
  }

  function drawNextNumber(){
    if(state.bingoFinished || state.isDrawing) return;

    const available = remainingNumbers();

    if(!available.length){
      state.bingoFinished = true;
      return;
    }

    state.isDrawing = true;

    if(drawBall){
      drawBall.classList.add('is-spinning');
      drawBall.textContent = '?';
    }

    if(state.drawSpinTimer){
      clearInterval(state.drawSpinTimer);
      state.drawSpinTimer = null;
    }

    state.drawSpinTimer = setInterval(() => {
      if(!drawBall) return;
      drawBall.textContent = String(available[Math.floor(Math.random() * available.length)]);
    }, 90);

    setTimeout(() => {
      if(state.drawSpinTimer){
        clearInterval(state.drawSpinTimer);
        state.drawSpinTimer = null;
      }

      const finalNumber = available[Math.floor(Math.random() * available.length)];
      state.drawnNumbers.push(finalNumber);

      if(drawBall){
        drawBall.classList.remove('is-spinning');
        drawBall.textContent = String(finalNumber);
      }

      renderDrawnNumbers();
      state.isDrawing = false;

      if(!state.bingoFinished){
        startAutoDraw();
      }
    }, 3000);
  }

  function stopDraws(){
    state.bingoFinished = true;

    if(state.drawTimer){
      clearTimeout(state.drawTimer);
      state.drawTimer = null;
    }

    if(state.drawSpinTimer){
      clearInterval(state.drawSpinTimer);
      state.drawSpinTimer = null;
    }

    if(drawBall){
      drawBall.classList.remove('is-spinning');
    }
  }

  function newGameCard(){
    resetDrawMachine();
    state.card = createBingoCard();
    renderBingoCard();
    startAutoDraw();
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
  btnExitGame.addEventListener('click', () => {
    stopDraws();
    showScreen('start');
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') showScreen('start');
  });

  window.BingoGame = {
    version: VERSION,
    setRoomData,
    setPlayers,
    openGame,
    showStart: () => showScreen('start'),
    newGameCard,
    stopDraws
  };

  setRoomData(state.nick, state.roomCode);

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=1007').catch(()=>{});
    });
  }

  showScreen('start');
})();
