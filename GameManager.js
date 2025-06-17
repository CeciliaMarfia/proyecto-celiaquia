import { Player } from './Player.js';
import { FoodItem } from './FoodItem.js';
import { QuestionItem } from './QuestionItem.js';
import { foodImages } from './foodImagesList.js';

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
    this.stageDuration = 30000; // 30 segundos por etapa
    this.currentStage = 1; // 1: Identificación, 2: Saludable, 3: Contaminación
    this.stageSettings = {
      1: {
        // Etapa 1 - Identificación de alimentos con y sin TACC
        foodRatio: [0.4, 0.3, 0.3], // [saludable, no saludable, con TACC]
        description: "Identificación de alimentos con y sin TACC",
        details: `
          <b>Objetivo:</b> Diferencir alimentos aptos y no aptos para celíacos.<br>
          <br>
          <b>¿Qué alimentos vas a ver?</b> Alimentos sin TACC saludables, sin TACC no saludables y con TACC.<br>
          <br>
          <b>¿Qué hacer?</b> Usa tus manos para atrapar solo los alimentos <b>sin TACC</b> (aptos). Evita los que tienen TACC.<br>
          <br>
          <b>Puntaje:</b> +10 por saludable, +5 por no saludable, -10 por con TACC.<br>
          <br>
          <b>Energía vital:</b> ¡Cuidado! Restar puntos también te quita energía.
        `
      },
      2: {
        // Etapa 2 - Elección de alimentos más saludables
        foodRatio: [0.6, 0.4, 0], // 60% de alimentos saludables, 40% de alimentos no saludables
        description: "Elección de alimentos más saludables",
        details: `
          <b>Objetivo:</b> Elegir los alimentos más saludables entre los aptos para celíacos.<br>
          <br>
          <b>¿Qué alimentos aparecen?</b> Sólo alimentos sin TACC (saludables y no saludables).<br>
          <br>
          <b>¿Qué hacer?</b> Atrapa la mayor cantidad de alimentos <b>saludables</b> (frutas, verduras, agua, etc). Evita los ultraprocesados.<br>
          <br>
          <b>Puntaje:</b> +10 por saludable, +5 por no saludable.
        `
      },
      3: {
        // Etapa 3 - Contaminación cruzada
        foodRatio: [0, 0, 0], // No se spawnean alimentos en esta etapa, solo preguntas
        description: "Contaminación cruzada y situaciones cotidianas",
        details: `
          <b>Objetivo:</b> Responder correctamente preguntas sobre situaciones de riesgo.<br>
          <br>
          <b>¿Qué aparece?</b> Preguntas de opción múltiple para cada jugador.<br>
          <br>
          <b>¿Qué hacer?</b> Lee la pregunta y selecciona la respuesta correcta manteniendo la mano sobre la opción.<br>
          <br>
          <b>Puntaje:</b> +10 por respuesta correcta.<br>
          <br>
          <b>¿Qué es la contaminación cruzada?</b> Es cuando un alimento con TACC se mezcla con uno sin TACC, provocando una <i>contaminacion</i>.
        `
      }
    };
    this.currentQuestion = null;
    this.answeredQuestions = new Set();
    this.selectionStartTime = null;
    this.selectionThreshold = 3000; // 3 segundos para seleccionar
    this.currentHoveredOption = null;
    this.questions = [
      {
        id: 1,
        question: "Clara va a usar el utensilio de su hermana con el que cortó pan. ¿Lo puede usar?",
        options: ["Sí, si lo lava bien", "No, nunca", "Sí, si es de plástico"],
        correctAnswer: 0
      },
      {
        id: 2,
        question: "¿Es seguro guardar alimentos sin TACC junto a alimentos con TACC en la heladera?",
        options: ["No, nunca", "Sí, si están en diferentes estantes", "Sí, si están en recipientes cerrados"],
        correctAnswer: 2
      },
      {
        id: 3,
        question: "¿Qué alimento es más saludable?",
        options: ["Pan", "Pizza", "Helado"],
        correctAnswer: 2
      },
    ];

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
    this.gameStarted = false;
    this.gameEnded = false;
    this.currentStage = 1;
    this.allFoodItems = [];
    this.players.forEach(p => p.reset());
    this.currentQuestion = null;
    this.answeredQuestions = new Set();
    this.blockedByIntro = true;
    this.showIntroOverlay();
  }

  endGame() {
    this.gameStarted = false;

    // Limpia cualquier pregunta o introducción que quede
    this.currentQuestion = null;
    this.blockedByIntro = false;
    const questionDiv = document.querySelector('.question-container');
    if (questionDiv) questionDiv.remove();
    const introDiv = document.querySelector('.stage-introduction');
    if (introDiv) introDiv.remove();
    const videoDiv = document.querySelector('.stage-video-container');
    if (videoDiv) videoDiv.remove();

    this.gameEnded = true; // Para evitar que se sigan mostrando cosas

    if (typeof this.camera !== 'undefined') {
      this.camera.stop();
    }

    this.showResults();

    // Vuelve al estado inicial de los botones
    document.getElementById('initial-controls').style.display = 'flex';
    document.getElementById('pre-game-controls').style.display = 'none';
    document.getElementById('game-controls').style.display = 'none';

    // Agrega el botón de salir solo en la pantalla de resultados
    const resultsDiv = document.querySelector('.game-results');
    if (resultsDiv) {
      const exitButton = document.createElement('button');
      exitButton.id = 'exit-game-button';
      exitButton.className = 'exit-button';
      exitButton.textContent = 'Salir del juego';
      exitButton.onclick = () => {
        this.gameEnded = false;
        this.gameStarted = false;
        this.currentStage = 1;
        this.allFoodItems = [];
        this.players.forEach(p => p.reset());
        this.currentQuestion = null;
        this.answeredQuestions = new Set();
        this.blockedByIntro = false;
        const videoDiv = document.querySelector('.stage-video-container');
        if (videoDiv) videoDiv.remove();
        const introDiv = document.querySelector('.stage-introduction');
        if (introDiv) introDiv.remove();
        const questionDiv = document.querySelector('.question-container');
        if (questionDiv) questionDiv.remove();
        this.draw();
        window.location.reload();
      };
      resultsDiv.appendChild(exitButton);
    
      // guardarResultadosEnFirebase(); // -- a implementar después
    }
  }

  update(currentTime, hands) {
    if (!this.gameStarted || this.gameEnded || this.blockedByIntro) return;

    // Verifica fin de etapa
    if (currentTime - this.gameStartTime > this.stageDuration) {
      this.currentQuestion = null;
      this.draw();
      this.nextStage();
      return;
    }

    // Genera nuevos alimentos solo en etapas 1 y 2
    if (this.currentStage < 3 && currentTime - this.lastFoodSpawn > this.foodSpawnInterval) {
      this.spawnFood();
      this.lastFoodSpawn = currentTime;
    }

    // En etapa 3, maneja preguntas
    if (this.currentStage === 3) {
      this.handleQuestions(currentTime, hands);
    } else {
      // Actualiza alimentos y filtra inactivos
      this.allFoodItems.forEach(food => food.update(currentTime));
      this.allFoodItems = this.allFoodItems.filter(food => food.isActive);

      // Detecta colisiones si hay manos detectadas
      if (hands && hands.length >= 1) {
        this.detectCollisions(hands);
      }
    }
  }

  nextStage() {
    this.currentStage++;
    if (this.currentStage > 3) {
      this.endGame();
      return;
    }
    this.blockedByIntro = true;
    this.gameStarted = false; // ya lo tengo en startGame() esto... chequear
    this.showStageVideo().then(() => {
      if (this.gameEnded) return; // Si se salió del juego, no mostrar nada más
      this.showStageIntroduction();
    });
  }

  showStageVideo() {
    return new Promise((resolve) => {
      // Crear contenedor para el video
      const videoContainer = document.createElement('div');
      videoContainer.className = 'stage-video-container';
      videoContainer.style.transition = 'opacity 0.7s';
      // Crear elemento de video
      const video = document.createElement('video');
      video.className = 'stage-video';
      // Seleccionar video según la etapa
      let videoSrc = '';
      if (this.currentStage === 1) {
        videoSrc = 'videos/video_etapa1.mp4';
      } else {
        videoSrc = 'videos/video_preEtapa.mp4';
      }
      video.src = videoSrc;
      // video.muted = true;
      video.playsInline = true;
      video.setAttribute('autoplay', '');
      video.setAttribute('preload', 'auto');
      // Agregar controles de video
      const controls = document.createElement('div');
      controls.className = 'video-controls';
      controls.innerHTML = `
        <button class="skip-button">Saltar</button>
        <button class="mute-button">🔊</button>
      `;
      // Agregar elementos al contenedor
      videoContainer.appendChild(video);
      videoContainer.appendChild(controls);
      document.getElementById('game-container').appendChild(videoContainer);
      // Fade-in suave
      setTimeout(() => videoContainer.style.opacity = '1', 10);
      video.play();
      // Botón de saltar
      controls.querySelector('.skip-button').addEventListener('click', () => {
        videoContainer.style.opacity = '0';
        setTimeout(() => {
          videoContainer.remove();
          resolve();
        }, 700);
      });
      controls.querySelector('.mute-button').addEventListener('click', () => {
        video.muted = !video.muted;
        controls.querySelector('.mute-button').textContent = video.muted ? '🔇' : '🔊';
      });
      // Cuando el video termina
      video.addEventListener('ended', () => {
        videoContainer.style.opacity = '0';
        setTimeout(() => {
          videoContainer.remove();
          resolve();
        }, 700);
      });
    });
  }

  showStageIntroduction() {
    // Quitar cualquier ocultamiento de video/canvas
    const stageInfo = this.stageSettings[this.currentStage];
    const introDiv = document.createElement('div');
    introDiv.className = 'stage-introduction big-intro';
    introDiv.innerHTML = `
      <h2>Etapa ${this.currentStage}</h2>
      <p>${stageInfo.description}</p>
      <div class="stage-details cartel-etapa-detalles">${stageInfo.details}</div>
    `;
    const container = document.getElementById('game-container');
    container.appendChild(introDiv);
    this.blockedByIntro = true;
    setTimeout(() => {
      introDiv.remove();
      this.blockedByIntro = false;
      // Solo después de quitar el cartel, comienza la etapa
      this.gameStarted = true;
      this.gameStartTime = Date.now();
      this.lastFoodSpawn = Date.now();
      this.allFoodItems = [];
      this.currentQuestion = [null, null]; // Una pregunta por jugador
      this.draw();
    }, 10000); // 10 segundos
  }

  handleQuestions(currentTime, hands) {
    // Dos preguntas, una por jugador
    for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
      if (!this.currentQuestion[playerIdx]) {
        // Evitar repetir la última pregunta
        const lastQ = this.lastQuestionId ? this.lastQuestionId[playerIdx] : null;
        let availableQuestions = this.questions.filter(q => !this.answeredQuestions.has(`${playerIdx}_${q.id}`));
        if (availableQuestions.length === 0) {
          this.answeredQuestions.clear();
          availableQuestions = this.questions.slice();
        }
        // Filtrar la última pregunta usada
        if (lastQ && availableQuestions.length > 1) {
          availableQuestions = availableQuestions.filter(q => q.id !== lastQ);
        }
        const newQ = this.createNewQuestion(availableQuestions);
        this.currentQuestion[playerIdx] = newQ;
        if (!this.lastQuestionId) this.lastQuestionId = [null, null];
        this.lastQuestionId[playerIdx] = newQ ? newQ.id : null;
      }
    }
    // Detectar colisiones con las manos (cada jugador responde solo su caja)
    if (hands && hands.length > 0) {
      for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
        const hand = hands[playerIdx * 2]; // Mano principal de cada jugador
        const q = this.currentQuestion[playerIdx];
        if (hand && hand.keypoints && hand.keypoints.length > 0 && hand.score > 0.7 && q && !q.feedbackActive) {
          const handX = hand.keypoints[8].x;
          const handY = hand.keypoints[8].y;
          if (q.checkCollision(handX, handY)) {
            const selectedOption = q.selectedOption;
            const isCorrect = selectedOption === q.correctAnswer;
            q.feedbackActive = true;
            q.feedbackResult = isCorrect;
            q.feedbackSelected = selectedOption;
            // Contar preguntas correctas
            if (isCorrect) {
              if (!this.players[playerIdx].correctQuestions) this.players[playerIdx].correctQuestions = 0;
              this.players[playerIdx].correctQuestions++;
            }
            // Mostrar feedback visual durante 1 segundo, luego eliminar la pregunta
            setTimeout(() => {
              this.players[playerIdx].score += isCorrect ? 10 : 0;
              this.answeredQuestions.add(`${playerIdx}_${q.id}`);
              this.currentQuestion[playerIdx] = null;
            }, 1000);
          }
        }
      }
    }
  }

  createNewQuestion(availableQuestions = this.questions) {
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[randomIndex];
    
    // Calcular posición centrada en el canvas
    const x = (this.canvas.canvas.width - 300) / 2; // 300 es el ancho de la pregunta
    const y = (this.canvas.canvas.height - 200) / 2; // 200 es aproximadamente el alto total
    
    return new QuestionItem(x, y, question.question, question.options, question.correctAnswer);
  }

  spawnFood() {
    if (this.currentStage === 3) return; // No hay alimentos en etapa 3
    const { foodRatio } = this.stageSettings[this.currentStage];
    const random = Math.random();
    let type;
    if (random < foodRatio[0]) type = 1;
    else if (random < foodRatio[0] + foodRatio[1]) type = 2;
    else type = 3;
    // En etapa 2 no debe haber con TACC
    if (this.currentStage === 2 && type === 3) return;
    const images = this.getFoodImagesForCurrentStage(type);
    if (!images || images.length === 0) return;
    const x = Math.random() * (this.canvas.canvas.width - 60);
    const y = Math.random() * (this.canvas.canvas.height - 60);
    const imageName = images[Math.floor(Math.random() * images.length)];
    const imagePath = `foodImages/${imageName}`;
    this.allFoodItems.push(new FoodItem(x, y, type, imagePath));
  }

  getRandomFoodImage(type) {
    // type: 1 = sin tacc saludable, 2 = sin tacc no saludable, 3 = con tacc
    const images = this.getFoodImagesForCurrentStage(type);
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  }

  getFoodImagesForCurrentStage(type) {
    // Etapa 1: todos los alimentos
    // Etapa 2: solo healthySTACC y unhealthySTACC
    // Etapa 3: ninguno
    if (this.currentStage === 3) return [];
    if (this.currentStage === 2 && type === 3) return [];
    return foodImages[type];
  }

  // Método auxiliar para procesar las manos de un jugador
  processPlayerHands(playerHands, playerIndex) {
    playerHands.forEach(hand => {
      if (hand.keypoints && hand.keypoints.length > 0 && hand.score > 0.7) { // Verificación de keypoints y solo considera detecciones con alta confianza
        const handX = hand.keypoints[8].x;
        const handY = hand.keypoints[8].y;
        this.activeFoods.forEach(food => {
          // console.log("comida activa");
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

    // console.log("Detectando colisiones con cant manos:", hands.length);

    // Procesa las manos del jugador 1 (primeras dos manos detectadas)
    const player1Hands = hands.slice(0, 2);
    this.processPlayerHands(player1Hands, 0);

    // console.log("Manos del jugador 1 procesadas:", player1Hands.length);

    // Procesa las manos del jugador 2 (siguientes dos manos detectadas)
    const player2Hands = hands.slice(2, 4);
    this.processPlayerHands(player2Hands, 1);

    // console.log("Manos del jugador 2 procesadas:", player2Hands.length);
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

    // Dibuja información del juego
    this.drawGameInfo();

    // Dibuja alimentos activos
    this.activeFoods.forEach(food => {
      food.draw(this.ctx);
    });

    // Dibujar preguntas de ambos jugadores
    if (Array.isArray(this.currentQuestion)) {
      for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
        const q = this.currentQuestion[playerIdx];
        if (q) {
          // Ubicación: izquierda/derecha
          if (playerIdx === 0) {
            q.x = 60;
            q.y = this.canvas.canvas.height / 2 - 80;
          } else {
            q.x = this.canvas.canvas.width - q.width - 60;
            q.y = this.canvas.canvas.height / 2 - 80;
          }
          q.draw(this.ctx);
        }
      }
    }
  }

  drawGameInfo() {
    this.ctx.clearRect(0, 0, this.canvas.canvas.width, 50);

    this.ctx.font = '20px Verdana';
    this.ctx.fillStyle = 'white';
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 3;

    // Jugador 1
    this.ctx.fillText(`Jugador 1: ${this.players[0].score} pts | ❤️ ${this.players[0].vitalEnergy}%`, 20, 30);
    this.ctx.strokeText(`Jugador 1: ${this.players[0].score} pts | ❤️ ${this.players[0].vitalEnergy}%`, 20, 30);

    // Jugador 2
    const p2Text = `Jugador 2: ${this.players[1].score} pts | ❤️ ${this.players[1].vitalEnergy}%`;
    const textWidth = this.ctx.measureText(p2Text).width;
    this.ctx.fillText(p2Text, this.canvas.canvas.width - textWidth - 20, 30);
    this.ctx.strokeText(p2Text, this.canvas.canvas.width - textWidth - 20, 30);

    // Tiempo
    let remaining = Math.ceil((this.stageDuration - (Date.now() - this.gameStartTime)) / 1000);
    remaining = Math.max(0, remaining);
    const timeText = `${remaining} segundos`;
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
    // Preguntas correctas
    const correctQuestions = document.createElement('p');
    correctQuestions.textContent = `Preguntas correctas: ${this.players[playerIndex].correctQuestions || 0}`;
    playerDiv.append(title, score, energy, foodsDiv, correctQuestions);

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

  showIntroOverlay() {
    const introDiv = document.createElement('div');
    introDiv.className = 'intro-overlay';
    introDiv.innerHTML = `
      <div class="intro-title">¡Bienvenido/a!</div>
      <div class="intro-text">
        Clara y Santiago son amigos, ambos celíacos, lo que significa que deben tener especial cuidado con lo que comen en su día a día.<br><br>
        En este juego te invitamos a enfrentar el desafío de ponerse en su lugar: tendrás que seleccionar con atención los alimentos que sean seguros y evitar los que contienen gluten que aparecen en pantalla.<br><br>
        Si elegís uno que no es apto pueden hacerle daño y tendrá consecuencias: se sienten mal y tus puntos bajan.<br><br>
        El objetivo no es solo sumar puntos para ganar, sino aprender cómo es vivir con una condición alimentaria que requiere atención constante.<br><br>
        <b>¿Estás listo para cuidarte como lo hacen Clara y Santiago todos los días?</b>
      </div>
      <button class="intro-btn">Continuar</button>
    `;
    document.getElementById('game-container').appendChild(introDiv);
    introDiv.querySelector('.intro-btn').onclick = () => {
      introDiv.remove();
      this.showStageVideo().then(() => {
        if (this.gameEnded) return;
        this.showStageIntroduction();
      });
    };
  }
}