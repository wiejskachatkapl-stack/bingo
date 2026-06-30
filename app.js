(function(){
  'use strict';
  const VERSION = 'BINGO v1001';
  const screenStart = document.getElementById('screenStart');
  const screenGame = document.getElementById('screenGame');
  const btnPlay = document.getElementById('btnPlay');
  const btnExitStart = document.getElementById('btnExitStart');
  const btnExitGame = document.getElementById('btnExitGame');
  const playersPanel = document.getElementById('playersPanel');

  const demoPlayers = ['MARIUSZ','KASIA','TOMEK','OLA','ADAM'];

  function showScreen(name){
    screenStart.classList.toggle('is-active', name === 'start');
    screenGame.classList.toggle('is-active', name === 'game');
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

  function exitToGameRoom(){
    // Przy późniejszym podpięciu pod GameRoom wystarczy ustawić window.BINGO_EXIT_URL.
    const target = window.BINGO_EXIT_URL || '../index.html';
    try {
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:'BINGO_EXIT', version: VERSION}, '*');
        return;
      }
    } catch(e) {}
    window.location.href = target;
  }

  btnPlay.addEventListener('click', () => {
    renderPlayers(demoPlayers);
    showScreen('game');
  });
  btnExitStart.addEventListener('click', exitToGameRoom);
  btnExitGame.addEventListener('click', exitToGameRoom);

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') showScreen('start');
  });

  if('serviceWorker' in navigator){
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }

  showScreen('start');
})();
