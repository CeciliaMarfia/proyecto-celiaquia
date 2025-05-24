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

  startGame() {
    this.gameStarted = true;
    this.isPaused = false;
    this.gameStartTime = Date.now();
    this.pauseStartTime = 0;
    this.allFoodItems = [];
    this.players.forEach(p => p.reset());

    // Actualiza estados de los botones
    document.getElementById('b-start-game').disabled = true;
    document.getElementById('b-pause-game').disabled = false;
    document.getElementById('b-resume-game').disabled = true;
    document.getElementById('b-end-game').disabled = false;
    document.getElementById('b-restart-game').disabled = false;
  }

  endGame() {
    this.gameStarted = false;
    this.isPaused = false;
    this.hidePauseMessage();

    // Apaga la cámara
    if (typeof camera !== 'undefined') {
      camera.stop();
      document.getElementById('b-stop-webcam').disabled = true;
      document.getElementById('b-start-webcam').disabled = true;
    }

    this.showResults();

    // Actualiza estados de los botones
    document.getElementById('b-start-game').disabled = false;
    document.getElementById('b-pause-game').disabled = true;
    document.getElementById('b-resume-game').disabled = true;
    document.getElementById('b-end-game').disabled = true;
    document.getElementById('b-restart-game').disabled = false;
  }

  // queda en pausa hasta que se toca el boton de reanudar o el boton de salir del juego
  pauseGame() {
    this.isPaused = true;
    this.pauseStartTime = Date.now(); // Guarda el momento en que se pausa

    // Deshabilita botón de pausa y botones de cámara, y habilita el de continuar (resume) y el de salir del juego
    document.getElementById('b-pause-game').disabled = true;
    document.getElementById('b-start-webcam').disabled = true;
    document.getElementById('b-stop-webcam').disabled = true;
    document.getElementById('b-resume-game').disabled = false;
    document.getElementById('b-end-game').disabled = false;
    document.getElementById('b-restart-game').disabled = false;

    // Muestra mensaje de pausa
    this.showPauseMessage();
  }

  resumeGame() {
    if (!this.isPaused) return; // Si no está pausado, no hacer nada

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

    // Actualiza botones
    document.getElementById('b-pause-game').disabled = false;
    document.getElementById('b-resume-game').disabled = true;
    document.getElementById('b-start-webcam').disabled = false;
    document.getElementById('b-stop-webcam').disabled = false;
    document.getElementById('b-restart-game').disabled = false;
  }

  restartGame() {
  // Limpia todo el estado del juego
  this.gameStarted = false;
  this.isPaused = false;
  this.allFoodItems = [];
  this.players.forEach(p => p.reset());
  
  // Oculta resultados si están visibles
  //const resultsDiv = document.querySelector('.game-results');
  //if (resultsDiv) resultsDiv.remove();
  
  // Reseteo botones al estado inicial
  document.getElementById('b-start-webcam').disabled = false;
  document.getElementById('b-stop-webcam').disabled = true;
  document.getElementById('b-start-game').disabled = true;
  document.getElementById('b-pause-game').disabled = true;
  document.getElementById('b-resume-game').disabled = true;
  document.getElementById('b-end-game').disabled = true;
  document.getElementById('b-restart-game').disabled = true;
  
  camera.stop();
}

  update(currentTime, poses) {
    if (!this.gameStarted || this.isPaused) return;

    if (!this.gameStarted) return;

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

    // Detecta colisiones si hay 4 manos (2 jugadores)
    if (poses && poses.length >= 4) {
      this.detectCollisions(poses);
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
    console.log('Cargando imagen:', imagePath); // Para debug
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

  detectCollisions(hands) {
    if (!hands || hands.length === 0) return;

    // Procesa las manos del jugador 1 (primeras dos manos detectadas)
    const player1Hands = hands.slice(0, 2);
    player1Hands.forEach(hand => {
      if (hand.score > 0.7) { // Solo considera detecciones con alta confianza
        const handX = hand.keypoints[0].x;
        const handY = hand.keypoints[0].y;
        this.activeFoods.forEach(food => {
          if (food.checkCollision(handX, handY)) {
            food.isActive = false;
            this.players[0].collectFood(food.type);
            this.createCollectionEffect(food);
          }
        });
      }
    });

    // Procesa las manos del jugador 2 (siguientes dos manos detectadas)
    const player2Hands = hands.slice(2, 4);
    player2Hands.forEach(hand => {
      if (hand.score > 0.7) { // Solo considera detecciones con alta confianza
        const handX = hand.keypoints[0].x;
        const handY = hand.keypoints[0].y;
        this.activeFoods.forEach(food => {
          if (food.checkCollision(handX, handY)) {
            food.isActive = false;
            this.players[1].collectFood(food.type);
            this.createCollectionEffect(food);
          }
        });
      }
    });
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
    resultsDiv.innerHTML = `
      <h1>¡Juego Terminado!</h1>
      
      <div class="player-result">
        <h2>Jugador 1</h2>
        <p>Puntuación: ${this.players[0].score}</p>
        <p>Energía Vital: ${this.players[0].vitalEnergy}%</p>
        <div class="food-stats">
          <div class="food-stat">
            <span class="legend healthy"></span>
            <span>Saludables: ${this.players[0].foodsCollected.healthy}</span>
          </div>
          <div class="food-stat">
            <span class="legend unhealthy"></span>
            <span>No saludables: ${this.players[0].foodsCollected.unhealthy}</span>
          </div>
          <div class="food-stat">
            <span class="legend gluten"></span>
            <span>Con gluten: ${this.players[0].foodsCollected.gluten}</span>
          </div>
        </div>
      </div>
      
      <div class="player-result">
        <h2>Jugador 2</h2>
        <p>Puntuación: ${this.players[1].score}</p>
        <p>Energía Vital: ${this.players[1].vitalEnergy}%</p>
        <div class="food-stats">
          <div class="food-stat">
            <span class="legend healthy"></span>
            <span>Saludables: ${this.players[1].foodsCollected.healthy}</span>
          </div>
          <div class="food-stat">
            <span class="legend unhealthy"></span>
            <span>No saludables: ${this.players[1].foodsCollected.unhealthy}</span>
          </div>
          <div class="food-stat">
            <span class="legend gluten"></span>
            <span>Con gluten: ${this.players[1].foodsCollected.gluten}</span>
          </div>
        </div>
      </div>
      
      <div class="game-message">
        <p>La celiaquía es una condición seria donde incluso pequeñas cantidades de gluten pueden causar daño.</p>
        <p>¡Siempre verifica los alimentos y busca el sello SIN TACC!</p>
      </div>
      
      <button id="b-close-results">Cerrar</button>
    `;

    document.getElementById('game-container').appendChild(resultsDiv);

    document.getElementById('b-close-results').addEventListener('click', () => {
      resultsDiv.remove();
    });
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