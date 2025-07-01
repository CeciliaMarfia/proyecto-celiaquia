import { Player } from './Player.js';
import { FoodItem } from './FoodItem.js';
import { QuestionItem } from './QuestionItem.js';
import { foodImages } from './foodImagesList.js';
import { HandDetector } from './HandDetector.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.canvas.getContext('2d');
    this.allFoodItems = [];
    this.players = [new Player(1), new Player(2)];
    this.lastFoodSpawn = 0;
    this.foodSpawnInterval = 500; // ms entre spawns
    this.gameStarted = false;
    this.gameEnded = false;
    this.gameStartTime = 0;
    this.stageDuration = 15000; // 15 segundos por etapa
    this.currentStage = 1; // 1: Identificación, 2: Saludable, 3: Contaminación
    this.isInCountdown = false; // Estado para controlar el conteo inicial de cada etapa
    this.countdownStartTime = 0; // Tiempo de inicio del conteo
    this.blockedByIntro = true;
    this.stageSettings = {
      1: {
        // Etapa 1 - Identificación de alimentos con y sin TACC
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
        `,
      },
      2: {
        // Etapa 2 - Elección de alimentos más saludables
        description: "Elección de alimentos más saludables",
        details: `
          <b>Objetivo:</b> Elegir los alimentos más saludables entre los aptos para celíacos.<br>
          <br>
          <b>¿Qué alimentos aparecen?</b> Sólo alimentos sin TACC (saludables y no saludables).<br>
          <br>
          <b>¿Qué hacer?</b> Atrapa la mayor cantidad de alimentos <b>saludables</b> (frutas, verduras, agua, etc). Evita los ultraprocesados.<br>
          <br>
          <b>Puntaje:</b> +10 por saludable, +5 por no saludable.
        `,
      },
      3: {
        // Etapa 3 - Contaminación cruzada
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
        `,
      },
    };
    this.currentQuestion = [null, null];
    this.lastQuestionId = [null, null];
    this.answeredQuestions = new Set();
    this.selectionStartTime = null;
    this.selectionThreshold = 3000; // 3 segundos para seleccionar
    this.questions = [
      {
        id: 1,
        question:
          "Clara va a usar el utensilio de su hermana con el que cortó pan. ¿Lo puede usar?",
        options: ["Sí, si lo lava bien", "No, nunca", "Sí, si es de plástico"],
        correctAnswer: 0,
      },
      {
        id: 2,
        question:
          "¿Es seguro guardar alimentos sin TACC junto a alimentos con TACC en la heladera?",
        options: [
          "No, nunca",
          "Sí, si están en diferentes estantes",
          "Sí, si están en recipientes cerrados",
        ],
        correctAnswer: 2,
      },
      {
        id: 3,
        question: "¿Qué alimento es más saludable?",
        options: ["Pan", "Pizza", "Helado"],
        correctAnswer: 2,
      },
    ];

    // Agregar listener para redimensionamiento
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    

    // CHEQUEAR ESTO..... YO LO SACARIA Y YA FUE, MAS ADELANTE VEO SI PODEMOS ADAPTAR TODO PARA QUE SE PUEDA JUGAR EN MOVILES TMB
    // Listener para cambio de orientación en móviles
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleResize();
      }, 100);
    });
  }

  handleResize() {
    const container = document.getElementById('game-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Actualizar dimensiones del canvas
    this.canvas.canvas.width = width;
    this.canvas.canvas.height = height;

    // Redibujar el estado actual solo si el juego está activo
    if (this.gameStarted && !this.gameEnded && !this.blockedByIntro) {
      this.draw();
    }
  }

  get activeFoods() {
    return this.allFoodItems.filter((food) => food.isActive);
  }

  startGame() {
    this.gameStarted = false;
    this.gameEnded = false;
    this.currentStage = 1;
    this.allFoodItems = [];
    this.players.forEach((p) => p.reset());
    this.currentQuestion = [null, null];
    this.answeredQuestions = new Set();
    this.blockedByIntro = true;
    this.showIntroOverlay();
  }

  endGame() {
    this.gameStarted = false;
    // Limpia cualquier pregunta o introducción que quede
    this.currentQuestion = [null, null];
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

    this.hidePlayersInfo();
    this.showFinalMessage();

    // Vuelve al estado inicial de los botones
    document.getElementById('initial-controls').style.display = 'flex';
    document.getElementById('pre-game-controls').style.display = 'none';
    document.getElementById('game-controls').style.display = 'none';
  }

  showFinalMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'final-message';
    messageDiv.innerHTML = `
      <div class="final-content">
        <div class="final-left">
          <h1>¡Gracias por jugar!</h1>
          <p>La celiaquía es una condición seria donde incluso pequeñas cantidades de gluten pueden causar daño.</p>
          <p>¡Siempre verifica los alimentos y busca el sello SIN TACC!</p>
          <button class="btn-primary btn-large" onclick="window.location.reload()">Jugar de nuevo</button>
        </div>
        <div class="final-right">
          <img src="images/qr.png" alt="QR Code" class="qr-code">
        </div>
      </div>
    `;
    document.getElementById('game-container').appendChild(messageDiv);
  }

  update(currentTime, hands) {
    if (!this.gameStarted || this.gameEnded || this.blockedByIntro) return;

    // Si está en conteo inicial, sólo maneja el contador
    if (this.isInCountdown) {
      this.handleInitialCountdown(currentTime);
      return;
    }

    // Verifica fin de etapa
    if (currentTime - this.gameStartTime > this.stageDuration) {
      this.currentQuestion = [null, null];
      this.draw();
      this.showStageResults();
      return;
    }

    // Actualiza información de tiempo jugadores del html
    this.updatePlayersInfo();
    this.handleTimeCounter(currentTime);

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
      this.allFoodItems.forEach((food) => food.update(currentTime));
      this.allFoodItems = this.allFoodItems.filter((food) => food.isActive);

      // Detecta colisiones si hay por lo menos una mano detectada
      if (hands && hands.length >= 1) {
        this.detectCollisions(hands);
      }
    }
  }

  updatePlayersInfo() {
    const player1Score = document.getElementById('player1-score');
    const player1Energy = document.getElementById('player1-energy');
    const player2Score = document.getElementById('player2-score');
    const player2Energy = document.getElementById('player2-energy');

    if (player1Score) player1Score.textContent = `${this.players[0].score} pts`;
    if (player1Energy) player1Energy.textContent = `❤️ ${this.players[0].vitalEnergy}%`;
    if (player2Score) player2Score.textContent = `${this.players[1].score} pts`;
    if (player2Energy) player2Energy.textContent = `❤️ ${this.players[1].vitalEnergy}%`;
  }

  handleInitialCountdown(currentTime) {
    const elapsed = currentTime - this.countdownStartTime;
    const countdownDuration = 3000; // 3 segundos total
    const timeDisplay = document.getElementById('time-display');
    const timeCounter = document.getElementById('time-counter');

    if (elapsed >= countdownDuration) {
      // Terminó el conteo, x lo tanto empieza el juego
      this.isInCountdown = false; // Para que no se muestre el contador de nuevo!!!!!
      timeCounter.style.display = 'none';
      this.gameStartTime = currentTime; // Reinicia el tiempo de la etapa
      this.lastFoodSpawn = currentTime; // Reinicia el tiempo de spawn de alimentos
      return;
    }

    // Muestra el número correspondiente (3, 2, 1)
    const remainingTime = Math.ceil((countdownDuration - elapsed) / 1000);
    timeDisplay.textContent = remainingTime;
    timeCounter.style.display = 'block';

    // Dibuja fondo blanco durante el conteo
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);
  }

  handleTimeCounter(currentTime) {
    const remaining = Math.ceil((this.stageDuration - (currentTime - this.gameStartTime)) / 1000);
    const timeDisplay = document.getElementById('time-display');
    const timeCounter = document.getElementById('time-counter');

    if (remaining <= 0) return;

    // Muestra contador al final (últimos 3 segundos)
    if (remaining <= 3 && remaining > 0) {
      timeDisplay.textContent = remaining;
      timeCounter.style.display = 'block';
    } else {
      timeCounter.style.display = 'none';
    }
  }

  showStageResults() {
    this.clearStageResults();
    this.hidePlayersInfo();
    this.hideTimer();
    
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'game-results';
    const title = document.createElement('h1');
    title.textContent = `¡Etapa ${this.currentStage} Completada!`;

    // Contenedor para los jugadores
    const playersContainer = document.createElement('div');
    playersContainer.className = 'players-results-container';

    // Jugador 1
    const player1Div = this.createPlayerResult('Jugador 1', 0);

    // Jugador 2
    const player2Div = this.createPlayerResult('Jugador 2', 1);

    // Agrega jugadores al contenedor
    playersContainer.append(player1Div, player2Div);

    // Mensaje específico de la etapa
    const messageDiv = document.createElement('div');
    messageDiv.className = 'game-message';
    const stageInfo = this.stageSettings[this.currentStage];
    const message = document.createElement('p');
    message.innerHTML = `<b>${stageInfo.description}</b><br>¡Bien hecho! Has completado esta etapa. Cada etapa es un desafío independiente.`;
    messageDiv.appendChild(message);

    // Botones de acción
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'stage-results-buttons';

    const repeatButton = document.createElement('button');
    repeatButton.textContent = 'Repetir Etapa';
    repeatButton.className = 'btn-primary';
    repeatButton.onclick = () => {
      this.repeatCurrentStage();
    };

    const nextButton = document.createElement('button');
    nextButton.textContent = this.currentStage < 3 ? 'Siguiente Etapa' : 'Finalizar Juego';
    const aux = this.currentStage < 3 ? 'Siguiente Etapa' : 'Finalizar Juego';
    nextButton.className = 'btn-success';
    nextButton.onclick = () => {
      console.log(aux);
      this.continueToNextStage();
    };

    buttonsContainer.append(repeatButton, nextButton);

    // Ensamblar todo
    resultsDiv.append(title, playersContainer, messageDiv, buttonsContainer);

    document.getElementById('game-container').appendChild(resultsDiv);
  }

  resetStageValues() {
    // Resetea todos los valores del juego
    this.allFoodItems = [];
    this.currentQuestion = [null, null];
    this.answeredQuestions = new Set();
    this.lastQuestionId = [null, null];
    
    // Resetea los jugadores
    this.players.forEach((p) => {
      p.score = 0;
      p.vitalEnergy = 100;
      p.foodsCollected = { healthy: 0, unhealthy: 0, gluten: 0 };
      p.correctQuestions = 0;
    });
  }

  repeatCurrentStage() {
    this.clearStageResults(); // Elimina la tabla de resultados anterior
    this.resetStageValues(); // Resetea todo
    this.blockedByIntro = true;
    this.gameStarted = false;
    this.showStageVideo().then(() => {
      if (this.gameEnded) return;
      this.showStageIntroduction();
    });
  }

  continueToNextStage() {
    this.clearStageResults(); // Elimina la tabla de resultados anterior
    this.currentStage++;
    if (this.currentStage > 3) {
      this.endGame();
      return;
    }
    this.resetStageValues();
    this.blockedByIntro = true;
    this.gameStarted = false; // ya lo tengo en startGame() esto... chequear
    this.showStageVideo().then(() => {
      if (this.gameEnded) return;
      this.showStageIntroduction();
    });
  }

  clearStageResults() {
    const existingResults = document.querySelector('.game-results');
    if (existingResults) existingResults.remove();
  }

  showStageVideo() {
    return new Promise((resolve) => {
      const videoContainer = document.createElement('div');
      videoContainer.className = 'stage-video-container';
      videoContainer.style.transition = 'opacity 0.7s';
      
      const video = document.createElement('video');
      video.className = 'stage-video';
      // Seleccionar video según la etapa
      /*
      let videoSrc = '';
      if (this.currentStage === 1) {
        videoSrc = 'videos/video_etapa1.mp4';
      } else {
        videoSrc = 'videos/video_preEtapa.mp4';
      }
      */
      video.src =  'videos/video_preEtapa.mp4';;
      video.muted = true; // sacar
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

      videoContainer.appendChild(video);
      videoContainer.appendChild(controls);
      document.getElementById('game-container').appendChild(videoContainer);
      
      setTimeout(() => videoContainer.style.opacity = '1', 10);
      video.play();
      
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
      // Después del cartel, inicia el conteo hacia atrás
      this.gameStarted = true;
      this.isInCountdown = true;
      this.countdownStartTime = Date.now();
      this.allFoodItems = [];
      this.currentQuestion = [null, null];
      this.showPlayersInfo(); // Muestra información de jugadores
      this.draw();
    }, 10000); // 10 segundos
  }

  showPlayersInfo() {
    const playersInfo = document.getElementById('players-info');
    if (playersInfo) {
      playersInfo.style.display = 'flex';
    }
  }

  hidePlayersInfo() {
    const playersInfo = document.getElementById('players-info');
    const timeCounter = document.getElementById('time-counter');
    if (playersInfo) {
      playersInfo.style.display = 'none';
    }
    if (timeCounter) {
      timeCounter.style.display = 'none';
    }
  }

  handleQuestions(currentTime, hands) {
    // Dos preguntas, una por jugador
    for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
      if (!this.currentQuestion[playerIdx]) {
        // Evitar repetir la última pregunta (no impide que se repita en absoluto, sólo que no se repita inmediatamente)
        const lastQ = this.lastQuestionId[playerIdx];
        let availableQuestions = this.questions.filter(
          (q) => !this.answeredQuestions.has(`${playerIdx}_${q.id}`)
        );
        if (availableQuestions.length === 0) {
          this.answeredQuestions.clear();
          availableQuestions = this.questions.slice();
        }
        // Filtrar la última pregunta usada
        if (lastQ && availableQuestions.length > 1) {
          availableQuestions = availableQuestions.filter((q) => q.id !== lastQ);
        }
        const newQ = this.createNewQuestion(availableQuestions);
        this.currentQuestion[playerIdx] = newQ;
        this.lastQuestionId[playerIdx] = newQ ? newQ.id : null;
      }
    }
    // Detectar colisiones con las manos (cada jugador responde solo su caja)
    if (hands && hands.length > 0) {
      for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
        const hand = hands[playerIdx * 2]; // Mano principal de cada jugador
        const q = this.currentQuestion[playerIdx];
        if (hand && hand.keypoints && hand.keypoints.length > 0 && hand.score > 0.7 && q && !q.feedbackActive) {
          // Invertir la coordenada X porque el canvas está espejado
          const handX = this.canvas.canvas.width - hand.keypoints[8].x;
          const handY = hand.keypoints[8].y;
          if (q.checkCollision(handX, handY, this.ctx)) {
            const selectedOption = q.selectedOption;
            const isCorrect = selectedOption === q.correctAnswer;
            q.feedbackActive = true;
            q.feedbackResult = isCorrect;
            q.feedbackSelected = selectedOption;
            // Contar preguntas correctas
            if (isCorrect) {
              if (!this.players[playerIdx].correctQuestions) {
                this.players[playerIdx].correctQuestions = 0;
              }
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

    const availableTypes = this.getAvailableFoodTypes();
    if (availableTypes.length === 0) return;

    // Selecciona tipo aleatorio de los disponibles
    const randomType =
      availableTypes[Math.floor(Math.random() * availableTypes.length)];

    // Obtiene imágenes para el tipo seleccionado
    const images = foodImages[randomType];
    if (!images || images.length === 0) return;

    // Genera una posición aleatoria
    const x = Math.random() * (this.canvas.canvas.width - 60);
    const y = Math.random() * (this.canvas.canvas.height - 60);

    // Imagen aleatoria del tipo
    const imageName = images[Math.floor(Math.random() * images.length)];
    const imagePath = `images/foodImages/${imageName}`;
    this.allFoodItems.push(new FoodItem(x, y, randomType, imagePath));
  }

  getAvailableFoodTypes() {
    // tipos: 1 = sin TACC saludable, 2 = sin TACC no saludable, 3 = con TACC
    if (this.currentStage === 1) {
      // Etapa 1: incluye todos los tipos de alimentos
      return [1, 2, 3];
    }
    else if (this.currentStage === 2) {
      // Etapa 2: solo sin TACC (saludable y no saludable)
      return [1, 2];
    }
    // Etapa 3: no hay comida
    return [];
  }

  // Método auxiliar para procesar las manos de un jugador
  processPlayerHands(playerHands, playerIndex) {
    playerHands.forEach((hand) => {
      console.log("entro al for each 'player hands' ");
      if (hand.keypoints && hand.keypoints.length > 0 && hand.score > 0.7) {
        // Verificación de keypoints y solo considera detecciones con alta confianza
        // Detección con toda la mano (dedos y palma)
        const detectedHand = new HandDetector(hand);
        if(this.activeFoods.length > 0) console.log("hay active foods"); else console.log("no hay active foods...");
        this.activeFoods.forEach((food) => {
          console.log("comida activa");
          if (food.checkCollision(detectedHand)) {
            console.log("Colisión detectada!!!!!");
            food.isActive = false;
            this.players[playerIndex].collectFood(food.type, this.currentStage);
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
    // Como el canvas está espejado con scaleX(-1) invertimos la coordenada X asi el efecto se ve en la posicion correcta
    const coordX = this.canvas.canvas.width - (food.x + food.width / 2);
    const coordY = food.y + food.height / 2;
    
    effect.style.left = `${coordX}px`;
    effect.style.top = `${coordY}px`;
    effect.style.backgroundColor = this.getFoodColor(food.type);
    document.getElementById('game-container').appendChild(effect);

    setTimeout(() => effect.remove(), 500);
  }

  getFoodColor(type) {
    return type === 1 ? "#4CAF50" : type === 2 ? "#FFC107" : "#F44336";
  }

  draw() {
    // En la etapa 3 dibuja un fondo blanco en lugar de la cámara
    if (this.currentStage === 3) {
      this.ctx.fillStyle = '#f5f5f5'; // Fondo beige claro
      this.ctx.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);
    }
    this.activeFoods.forEach((food) => {
      food.draw(this.ctx);
    });
    // Preguntas una debajo de la otra y centradas
    if (this.currentStage === 3) {
      const totalQuestions = this.currentQuestion.length;
      const canvasHeight = this.canvas.canvas.height;
      const canvasWidth = this.canvas.canvas.width;
      
      // Calcula espaciado entre preguntas para que sean legibles
      const minQuestionHeight = 200; // Altura mínima por pregunta
      const spacingBetweenQuestions = 50; // Espacio entre preguntas
      const totalMinHeight = totalQuestions * minQuestionHeight + (totalQuestions - 1) * spacingBetweenQuestions;
      const availableHeight = canvasHeight - 80; // Dejar margen arriba y abajo
      
      let blockHeight, startY;
      
      if (totalMinHeight <= availableHeight) {
        // Si hay espacio suficiente, usar altura mínima con espaciado
        blockHeight = minQuestionHeight + spacingBetweenQuestions;
        startY = 40;
      } else {
        // Si no hay espacio, distribuir uniformemente
        blockHeight = availableHeight / totalQuestions;
        startY = 40;
      }
      
      for (let i = 0; i < totalQuestions; i++) {
        const q = this.currentQuestion[i];
        if (q) {
          q.x = Math.max(20, canvasWidth * 0.05); // Mínimo 20px de margen
          q.y = startY + i * blockHeight;
          q.width = Math.min(canvasWidth - 40, canvasWidth * 0.9); // Máximo 90% del ancho
          q.height = Math.max(150, blockHeight - spacingBetweenQuestions); // Altura mínima de 150px
          q.draw(this.ctx);
        }
      }
    }
  }

  hideTimer() {
    // Oculta el contador de tiempo para evitar interferencias
    const timeCounter = document.getElementById('time-counter');
    if (timeCounter) {
      timeCounter.style.display = 'none';
    }
  }

  showResults() {
    this.hideTimer();
    
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'game-results';
    const title = document.createElement('h1');
    title.textContent = '¡Juego Terminado!';

    // Contenedor para los jugadores
    const playersContainer = document.createElement('div');
    playersContainer.className = 'players-results-container';

    const player1Div = this.createPlayerResult('Jugador 1', 0);
    const player2Div = this.createPlayerResult('Jugador 2', 1);

    playersContainer.append(player1Div, player2Div);

    const messageDiv = document.createElement('div');
    messageDiv.className = 'game-message';
    const message1 = document.createElement('p');
    message1.textContent = 'La celiaquía es una condición seria donde incluso pequeñas cantidades de gluten pueden causar daño.';
    const message2 = document.createElement('p');
    message2.textContent = '¡Siempre verifica los alimentos y busca el sello SIN TACC!';
    messageDiv.append(message1, message2);

    // Botón de finalizar
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'stage-results-buttons';

    const finishButton = document.createElement('button');
    finishButton.textContent = 'Finalizar Juego';
    finishButton.className = 'btn-primary';
    finishButton.onclick = () => this.showFinalMessage();

    buttonContainer.appendChild(finishButton);

    resultsDiv.append(title, playersContainer, messageDiv, buttonContainer);
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
    const healthyDiv = this.createFoodStat(
      "healthy",
      "Saludables",
      this.players[playerIndex].foodsCollected.healthy
    );
    const unhealthyDiv = this.createFoodStat(
      "unhealthy",
      "No saludables",
      this.players[playerIndex].foodsCollected.unhealthy
    );
    const glutenDiv = this.createFoodStat(
      "gluten",
      "Con gluten",
      this.players[playerIndex].foodsCollected.gluten
    );

    foodsDiv.append(healthyDiv, unhealthyDiv, glutenDiv);
    
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
      <div>
        <div class="intro-content">
          <div class="intro-text">
            Clara y Santiago son amigos, ambos celíacos, lo que significa que deben tener especial cuidado con lo que comen en su día a día.<br><br>
            En este juego te invitamos a enfrentar el desafío de ponerse en su lugar: tendrás que seleccionar con atención los alimentos que sean seguros y evitar los que contienen gluten que aparecen en pantalla.<br><br>
            Si elegís uno que no es apto pueden hacerle daño y tendrá consecuencias: se sienten mal y tus puntos bajan.<br><br>
            El objetivo no es solo sumar puntos para ganar, sino aprender cómo es vivir con una condición alimentaria que requiere atención constante.<br><br>
            <b>¿Estás listo para cuidarte como lo hacen Clara y Santiago todos los días?</b>
          </div>
        </div>
        <div class="intro-sidebar">
          <button class="intro-btn">Continuar</button>
        </div>
      </div>
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