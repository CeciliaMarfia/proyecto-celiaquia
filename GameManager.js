import { Player } from './Player.js';
import { FoodItem } from './FoodItem.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.canvas.getContext('2d');
    this.allFoodItems = [];
    this.players = [new Player(1), new Player(2)];
    this.lastFoodSpawn = 0;
    this.foodSpawnInterval = 800; // ms entre spawns
    this.gameStarted = false;
    this.gameStartTime = 0;
    this.gameDuration = 60000; // 1 minuto
    this.currentLevel = 'daily';
    this.levelSettings = {
      daily: { speed: 1, foodRatio: [0.6, 0.3, 0.1] },
      birthday: { speed: 1.3, foodRatio: [0.4, 0.3, 0.3] },
      travel: { speed: 1.6, foodRatio: [0.5, 0.2, 0.3] }
    }
    this.isPaused = false // Para controlar el estado de pausa del juego; es para nosotras, no para el juego
    this.pauseStartTime = 0; // Para guardar el momento en que se pausa el juego

    // Agregar listener para redimensionamiento
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  handleResize() {
    const container = document.getElementById('game-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Actualizar dimensiones del canvas
    this.canvas.canvas.width = width;
    this.canvas.canvas.height = height;

    // Redibujar el estado actual
    this.draw();
  }

  get activeFoods() {
    return this.allFoodItems.filter(food => food.isActive);
  }
  
  updateButtons(startWebCam, stopWebCam, startGame, endGame, pauseGame, resumeGame) {
    document.getElementById('b-start-webcam').disabled = startWebCam;
    document.getElementById('b-stop-webcam').disabled = stopWebCam;
    document.getElementById('b-start-game').disabled = startGame;
    document.getElementById('b-pause-game').disabled = pauseGame;
    document.getElementById('b-resume-game').disabled = resumeGame;
    document.getElementById('b-end-game').disabled = endGame;
  }

  startGame() {
    this.gameStarted = true;
    this.isPaused = false;
    this.gameStartTime = Date.now();
    this.pauseStartTime = 0;
    this.allFoodItems = [];
    this.players.forEach(p => p.reset());

    // Actualiza estados de los botones
    this.updateButtons(true, false, true, false, false, true);
  }

  endGame() {
    this.gameStarted = false;
    this.isPaused = false;
    this.hidePauseMessage();

    // console.log(typeof camera);
    if (typeof this.camera !== 'undefined') {
      this.camera.stop();
    }

    this.showResults();

    // Actualiza estados de los botones
    this.updateButtons(false, true, false, true, true, true);

    // guardarResultadosEnFirebase(); // -- a implementar después
  }

  // Pausa hasta que se toca el boton de reanudar o salir del juego
  pauseGame() {
    this.isPaused = true;
    this.pauseStartTime = Date.now(); // Guarda el momento en que se pausa
    this.updateButtons(true, false, false, true, true, false);
    this.showPauseMessage(); // Muestra mensaje de pausa
  }

  resumeGame() {
    if (!this.isPaused) return; // Si no está pausado, no hacer nada -- no deberia pasar nunca pero deberia probarlo bien

    // Calcula tiempo de pausa
    const pauseDuration = Date.now() - this.pauseStartTime;

    // Ajustar los tiempos de los alimentos
    this.allFoodItems.forEach(food => {
      food.spawnTime += pauseDuration;
    });

    // Ajustar tiempos del juego
    this.gameStartTime += pauseDuration;
    this.lastFoodSpawn += pauseDuration;

    this.isPaused = false;
    this.hidePauseMessage();
    this.updateButtons(false, false, false, true, false, true);
  }

  update(currentTime, hands) {
    if (!this.gameStarted || this.isPaused) return;

    // Verifica fin del juego
    if (currentTime - this.gameStartTime > this.gameDuration) {
      this.endGame();
      return;
    }

    // Genera nuevos alimentos
    if (currentTime - this.lastFoodSpawn > this.foodSpawnInterval) {
      this.spawnFood();
      this.lastFoodSpawn = currentTime;
    }

    // Actualiza alimentos y filtra inactivos
    this.allFoodItems.forEach(food => food.update(currentTime));
    this.allFoodItems = this.allFoodItems.filter(food => food.isActive);

    // Detecta colisiones si hay 4 manos (2 jugadores) -- si no hay 4 manos, no detecta colisiones (esto no esta ok pero tendríamos que definir qué hacer, si un jugador esconde una mano no puede frenarse el juego)
    if (hands && hands.length >= 4) {
      this.detectCollisions(hands);
    }
  }

  spawnFood() {
    const { foodRatio } = this.levelSettings[this.currentLevel];
    const random = Math.random();
    let type;

    if (random < foodRatio[0]) type = 1;
    else if (random < foodRatio[0] + foodRatio[1]) type = 2;
    else type = 3;

    const x = Math.random() * (this.canvas.canvas.width - 60);
    const y = Math.random() * (this.canvas.canvas.height - 60);

    const imageName = this.getRandomFoodImage(type);
    const imagePath = `foodImages/${imageName}`;
    this.allFoodItems.push(new FoodItem(x, y, type, imagePath));
  }

  getRandomFoodImage(type) {
    const foodImages = {
      1: ['apple.png', 'banana.png', 'avocado.png', 'carrot.png', 'lettuce.png', 'nut.png', 'pepper.png', 'strawberry.png'],
      2: ['drink.png', 'friepotatoes.png'],
      3: ['bread.png', 'pizza.png', 'cookie.png', 'donut.png']
    };

    const images = foodImages[type];
    const randomIndex = Math.floor(Math.random() * images.length);

    return `food${type}_${images[randomIndex]}`;
  }

  // Método auxiliar para procesar las manos de un jugador
  processPlayerHands(playerHands, playerIndex) {
    playerHands.forEach(hand => {
      if (hand.keypoints && hand.keypoints.length > 0 && hand.score > 0.7) { // Verificación de keypoints y solo considera detecciones con alta confianza
        const handX = hand.keypoints[0].x;
        const handY = hand.keypoints[0].y;
        this.activeFoods.forEach(food => {
          console.log("comida activa");
          if (food.checkCollision(handX, handY)) {
            console.log("Colisión detectada");
            food.isActive = false;
            this.players[playerIndex].collectFood(food.type);
            this.createCollectionEffect(food);
          }
        });
      }
    });
  }

  detectCollisions(hands) {
    if (!hands || hands.length === 0) return;

    console.log("Detectando colisiones con cant manos:", hands.length);

    // Procesa las manos del jugador 1 (primeras dos manos detectadas)
    const player1Hands = hands.slice(0, 2);
    this.processPlayerHands(player1Hands, 0);

    console.log("Manos del jugador 1 procesadas:", player1Hands.length);

    // Procesa las manos del jugador 2 (siguientes dos manos detectadas)
    const player2Hands = hands.slice(2, 4);
    this.processPlayerHands(player2Hands, 1);

    console.log("Manos del jugador 2 procesadas:", player2Hands.length);
  }

  createCollectionEffect(food) {
    const effect = document.createElement('div');
    effect.className = 'food-collected';
    effect.style.left = `${food.x + food.width / 2}px`;
    effect.style.top = `${food.y + food.height / 2}px`;
    effect.style.backgroundColor = this.getFoodColor(food.type);
    document.getElementById('game-container').appendChild(effect);

    setTimeout(() => effect.remove(), 500);
  }

  getFoodColor(type) {
    return type === 1 ? '#4CAF50' :
      type === 2 ? '#FFC107' : '#F44336';
  }

  draw() {
    // Limpiar el canvas completamente primero
    // this.ctx.clearRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);

    // Dibujar alimentos activos
    this.activeFoods.forEach(food => {
      food.draw(this.ctx);
    });

    // Dibujar información del juego
    this.drawGameInfo();
  }

  drawGameInfo() {
    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;

    // Jugador 1 (izquierda)
    this.ctx.fillText(`Jugador 1: ${this.players[0].score} pts | ❤️ ${this.players[0].vitalEnergy}%`, 20, 30);
    this.ctx.strokeText(`Jugador 1: ${this.players[0].score} pts | ❤️ ${this.players[0].vitalEnergy}%`, 20, 30);

    // Jugador 2 (derecha)
    const p2Text = `Jugador 2: ${this.players[1].score} pts | ❤️ ${this.players[1].vitalEnergy}%`;
    const textWidth = this.ctx.measureText(p2Text).width;
    this.ctx.fillText(p2Text, this.canvas.canvas.width - textWidth - 20, 30);
    this.ctx.strokeText(p2Text, this.canvas.canvas.width - textWidth - 20, 30);

    // Tiempo restante
    const remaining = Math.ceil((this.gameDuration - (Date.now() - this.gameStartTime)) / 1000);
    const timeText = `Tiempo: ${remaining}s`;
    const timeWidth = this.ctx.measureText(timeText).width;
    this.ctx.fillText(timeText, this.canvas.canvas.width / 2 - timeWidth / 2, 30);
    this.ctx.strokeText(timeText, this.canvas.canvas.width / 2 - timeWidth / 2, 30);
  }

  showResults() {
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'game-results';
    const title = document.createElement('h1');
    title.textContent = '¡Juego Terminado!';

    // Contenedor para los jugadores
    const playersContainer = document.createElement('div');
    playersContainer.className = 'players-results-container';

    // Jugador 1
    const player1Div = this.createPlayerResult('Jugador 1', 0);

    // Jugador 2
    const player2Div = this.createPlayerResult('Jugador 2', 1);

    // Agregar jugadores al contenedor
    playersContainer.append(player1Div, player2Div);

    // Mensaje del juego
    const messageDiv = document.createElement('div');
    messageDiv.className = 'game-message';
    const message1 = document.createElement('p');
    message1.textContent = 'La celiaquía es una condición seria donde incluso pequeñas cantidades de gluten pueden causar daño.';
    const message2 = document.createElement('p');
    message2.textContent = '¡Siempre verifica los alimentos y busca el sello SIN TACC!';
    messageDiv.append(message1, message2);

    // Ensamblar todo para agregarlo al game conteiner
    resultsDiv.append(
      title,
      playersContainer, // Usamos el contenedor en lugar de los divs individuales porque era re ilegible :)
      messageDiv,
    );

    document.getElementById('game-container').appendChild(resultsDiv);
  }

  // Método auxiliar para crear la sección de cada jugador
  createPlayerResult(playerName, playerIndex) {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-result';

    const title = document.createElement('h2');
    title.textContent = playerName;

    const score = document.createElement('p');
    score.textContent = `Puntuación: ${this.players[playerIndex].score}`;

    const energy = document.createElement('p');
    energy.textContent = `Energía Vital: ${this.players[playerIndex].vitalEnergy}%`;

    const foodsDiv = document.createElement('div');
    foodsDiv.className = 'food-stats';

    // Estadísticas de comida
    const healthyDiv = this.createFoodStat('healthy', 'Saludables', this.players[playerIndex].foodsCollected.healthy);
    const unhealthyDiv = this.createFoodStat('unhealthy', 'No saludables', this.players[playerIndex].foodsCollected.unhealthy);
    const glutenDiv = this.createFoodStat('gluten', 'Con gluten', this.players[playerIndex].foodsCollected.gluten);

    foodsDiv.append(healthyDiv, unhealthyDiv, glutenDiv);
    playerDiv.append(title, score, energy, foodsDiv);

    return playerDiv;
  }

  // Método auxiliar para crear cada estadística de comida
  createFoodStat(className, labelText, value) {
    const statDiv = document.createElement('div');
    statDiv.className = 'food-stat';

    const legend = document.createElement('span');
    legend.className = `legend ${className}`;

    const label = document.createElement('span');
    label.textContent = `${labelText}: ${value}`;

    statDiv.append(legend, label);
    return statDiv;
  }

  showPauseMessage() {
    // Crea o actualiza el mensaje de pausa
    let pauseMsg = document.getElementById('pause-message');
    if (!pauseMsg) {
      pauseMsg = document.createElement('div');
      pauseMsg.id = 'pause-message';
      pauseMsg.className = 'game-pause-message';
      pauseMsg.innerHTML = '<h1>JUEGO EN PAUSA</h1>';
      document.getElementById('game-container').appendChild(pauseMsg);
    }
    pauseMsg.style.display = 'block';
  }

  hidePauseMessage() {
    const pauseMsg = document.getElementById('pause-message');
    if (pauseMsg) {
      pauseMsg.style.display = 'none';
    }
  }
}