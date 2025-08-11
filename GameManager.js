import { Player } from './Player.js';
import { FoodItem } from './FoodItem.js';
import { QuestionItem } from './QuestionItem.js';
import { foodImages } from './foodImagesList.js';
import { HandDetector } from './HandDetector.js';
import { QuestionsList } from './QuestionsList.js';
import { CountdownDisplay } from './CountdownDisplay.js';

export class GameManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.canvas.getContext('2d');

    this.countdown = new CountdownDisplay();
    this.isInCountdown = false; // Estado para controlar el conteo inicial de cada etapa
    this.countdownStartTime = 0; // Tiempo de inicio del conteo

    this.gameStartTime = 0;
    this.stageDuration = 120000; // 2min por etapa
    this.allFoodItems = [];
    this.foodSpawnInterval = 600; // ms entre spawns
    this.lastFoodSpawn = 0;

    this.players = [new Player(1), new Player(2)];

    this.gameStarted = false;
    this.gameEnded = false;
    this.currentStage = 1; // 1: Identificación, 2: Saludable, 3: Contaminación
    this.blockedByIntro = true;
    this.stageSettings = {
      1: {
        // Etapa 1 - Identificación de alimentos con y sin TACC
        description: "Identificación de alimentos con y sin TACC 🔍",
      },
      2: {
        // Etapa 2 - Elección de alimentos más saludables
        description: "Elección de alimentos más saludables 🔍",
      },
      3: {
        // Etapa 3 - Contaminación cruzada
        description: "Contaminación cruzada y situaciones cotidianas 🔍",
      },
    };

    this.currentQuestion = [null, null];
    this.lastQuestionId = [null, null];
    this.answeredQuestions = new Set();
    this.selectionStartTime = null;
    this.selectionThreshold = 3000; // 3 segundos para seleccionar
    this.questions = [
      ...QuestionsList,
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

    // this.hidePlayersInfo(); -- creeria que esta de mas, chequear
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

  update(currentTime, hands, handToPlayer) {
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
      this.hideCanvas();
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
      this.handleQuestions(currentTime, hands, handToPlayer);
    } else {
      // Actualiza alimentos y filtra inactivos
      this.allFoodItems.forEach((food) => food.update(currentTime));
      this.allFoodItems = this.allFoodItems.filter((food) => food.isActive);

      // Detecta colisiones si hay por lo menos una mano detectada
      if (hands && hands.length >= 1) {
        this.detectCollisions(hands, handToPlayer);
      }
    }
  }

  updatePlayersInfo() {
    const player1Score = document.getElementById('player1-score');
    const player2Score = document.getElementById('player2-score');

    if (player1Score) player1Score.textContent = `${this.players[0].score} pts`;
    if (player2Score) player2Score.textContent = `${this.players[1].score} pts`;
  }

  handleInitialCountdown(currentTime) {
    const elapsed = currentTime - this.countdownStartTime;
    const countdownDuration = 3000; // 3 segundos total

    if (elapsed >= countdownDuration) {
      // Terminó el conteo, x lo tanto empieza el juego
      this.isInCountdown = false; // Para que no se muestre el contador de nuevo!!!!!
      this.countdown.hide(); // Oculta el contador, logica ahora manejada x la clase CountdownDisplay
      this.allFoodItems = []; // Limpia los alimentos de la etapa anterior
      this.currentQuestion = [null, null]; // Resetea las preguntas
      this.gameStartTime = currentTime; // Reinicia el tiempo de la etapa
      this.lastFoodSpawn = currentTime; // Reinicia el tiempo de spawn de alimentos
      this.draw(); // Dibuja el estado inicial del juego
      this.showCanvas(); // Se vuelve a mostrar el canvas
      this.showPlayersInfo(); // Aparece la info de los jugadores
      return;
    }

    // Muestra el número correspondiente (3, 2, 1)
    const remaining = Math.ceil((countdownDuration - elapsed) / 1000);
    this.countdown.show(remaining);

    // Dibuja fondo blanco durante el conteo
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);
  }

  handleTimeCounter(currentTime) {
    const remaining = Math.ceil((this.stageDuration - (currentTime - this.gameStartTime)) / 1000);

    if (remaining <= 0) {
      this.countdown.hide();
      return;
    }

    // Muestra contador al final (últimos 3 segundos)
    if (remaining <= 3) {
      this.countdown.show(remaining);
    } else {
      this.countdown.hide();
    }
  }

  showStageResults() {
    this.clearStageResults();
    this.hidePlayersInfo();

    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'stage-results';
    const title = document.createElement('h1');
    title.textContent = `¡Etapa ${this.currentStage} Completada!`;

    // Determina el ganador
    const p1 = this.players[0].score;
    const p2 = this.players[1].score;
    let winnerIndex = -1;
    if (p1 > p2) winnerIndex = 0;
    else if (p2 > p1) winnerIndex = 1;

    // Contenedor para los jugadores
    const playersContainer = document.createElement('div');
    playersContainer.className = 'players-results-container';

    const player1Div = this.createPlayerResult('Jugador 1', 0, winnerIndex === 0);
    const player2Div = this.createPlayerResult('Jugador 2', 1, winnerIndex === 1);

    playersContainer.append(player1Div, player2Div);

    const messageDiv = document.createElement('div');
    messageDiv.className = 'game-message';
    const stageInfo = this.stageSettings[this.currentStage];
    const message = document.createElement('p');
    message.innerHTML = `<b>${stageInfo.description}</b><br>¡Muy bien! Completaste esta etapa.`;
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
    nextButton.className = 'btn-success';
    if (nextButton.textContent === 'Finalizar Juego') {
      nextButton.onclick = () => this.showFinalMessage();
    } else {
      nextButton.onclick = () => {
        this.continueToNextStage();
      };
    }

    buttonsContainer.append(repeatButton, nextButton);

    // Ensamblar todo
    resultsDiv.append(title, playersContainer, messageDiv, buttonsContainer);

    document.getElementById('game-container').appendChild(resultsDiv);
  }

  resetStageValues() {
    // Resetea todos los valores del juego
    this.allFoodItems = [];

    // Limpiar cache de las preguntas existentes antes de resetear
    this.currentQuestion.forEach(q => {
      if (q) q.clearLayoutCache();
    });

    this.currentQuestion = [null, null];
    this.answeredQuestions = new Set();
    this.lastQuestionId = [null, null];

    // Resetea los jugadores
    this.players.forEach((p) => {
      p.score = 0;
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
    if (this.currentStage > 1) { // Solo se muestra la etapa 1!!!!!!
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
    const existingResults = document.querySelector('.stage-results');
    if (existingResults) existingResults.remove();
  }

  hideCanvas() {
    const canvas = this.canvas && this.canvas.canvas ? this.canvas.canvas : null;
    if (canvas) canvas.style.visibility = 'hidden';
  }

  showCanvas() {
    const canvas = this.canvas && this.canvas.canvas ? this.canvas.canvas : null;
    if (canvas) canvas.style.visibility = 'visible';
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
        videoSrc = 'videos/video_preEtapa.mp4';
      } else {
        videoSrc = 'videos/video_preEtapa.mp4';
      }
      */
      video.src = 'videos/video_etapa1.mp4';
      video.muted = false;
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
    `;
    const container = document.getElementById('game-container');
    container.appendChild(introDiv);

    this.blockedByIntro = true;
    this.hideCanvas();

    setTimeout(() => {
      introDiv.remove();
      this.blockedByIntro = false;
      this.gameStarted = true;

      // Después del cartel, inicia el conteo hacia atrás
      this.isInCountdown = true;
      this.countdownStartTime = Date.now();
    }, 4000); // 4 segundos
  }

  showPlayersInfo() {
    const playersInfo = document.getElementById('game-center-column');
    if (playersInfo) {
      playersInfo.style.display = 'flex';
    }
  }

  hidePlayersInfo() {
    const playersInfo = document.getElementById('game-center-column');
    const timeCounter = document.getElementById('time-counter');
    if (playersInfo) {
      playersInfo.style.display = 'none';
    }
    if (timeCounter) {
      timeCounter.style.display = 'none';
    }
  }

  handleQuestions(currentTime, hands, handToPlayer) {
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

        // Limpiar cache cuando se crea una nueva pregunta
        if (newQ) {
          newQ.clearLayoutCache();
        }
      }
    }
    // Detectar colisiones con las manos (cada jugador responde solo su caja)
    if (hands && hands.length > 0 && handToPlayer) {
      hands.forEach((hand, i) => {
        const playerIdx = handToPlayer[i];
        if (playerIdx === 0 || playerIdx === 1) {
          const q = this.currentQuestion[playerIdx];
          if (hand && hand.keypoints && hand.keypoints.length > 0 && hand.score > 0.7 && q && !q.feedbackActive) {
            // Invertir la coordenada X porque el canvas está espejado
            const handX = this.canvas.canvas.width - hand.keypoints[8].x;
            const handY = hand.keypoints[8].y;
            if (q.checkCollision(handX, handY, this.ctx)) {
              const selectedOption = q.selectedOption;
              const isCorrect = selectedOption === q.correctAnswer;
              q.showFeedback(selectedOption, isCorrect);
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
      });
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
        if (this.activeFoods.length > 0) console.log("hay active foods"); else console.log("no hay active foods...");
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

  detectCollisions(hands, handToPlayer) {
    if (!hands || hands.length === 0) return;

    // Asigna cada mano al jugador correcto segun handToPlayer
    hands.forEach((hand, i) => {
      const playerIdx = handToPlayer && handToPlayer[i] !== undefined ? handToPlayer[i] : (i < 2 ? 0 : 1);
      if (playerIdx !== null) {
        this.processPlayerHands([hand], playerIdx);
      }
    });
  }

  createCollectionEffect(food) {
    const effect = document.createElement('div');
    effect.className = 'food-collected';

    // Reproducir sonido según el tipo de comida
    const sound = new Audio();
    if (food.type === 1) {
      sound.src = 'sounds/good-food.mp3'; // sonido positivo para comida saludable
    } else if (food.type === 2) {
      sound.src = 'sounds/neutral-food.mp3'; // sonido neutral para comida no saludable
    } else {
      sound.src = 'sounds/bad-food.mp3'; // sonido negativo para comida con gluten
    }
    sound.play();

    let points = 0;
    if (this.currentStage === 1) {
      if (food.type === 1) points = 10; // sin tacc saludable: +10
      else if (food.type === 2) points = 3; // sin tacc no saludable: +3
      else if (food.type === 3) points = -10; // con tacc: -10
    } else if (this.currentStage === 2) {
      if (food.type === 1) points = 7; // sin tacc saludable: +7
      else if (food.type === 2) points = -10; // sin tacc no saludable: -10
    }

    //  Tamanio del circulo y para el número (y simbolo) adentro
    effect.style.width = '80px';
    effect.style.height = '80px';
    effect.style.lineHeight = '80px';
    effect.style.fontSize = '2.3rem';
    effect.style.textAlign = 'center';
    effect.textContent = points > 0 ? `+${points}` : `${points}`; // falta el -
    effect.style.color = '#fff';
    effect.style.fontWeight = 'bold';

    // Como el canvas está espejado con scaleX(-1) invertimos la coordenada X asi el efecto se ve en la posicion correcta   
    const coordX = this.canvas.canvas.width - (food.x + food.width / 2);
    const coordY = food.y + food.height / 2;

    const videoContainer = document.querySelector('.video-canvas-container');
    if (videoContainer) {
      const rect = videoContainer.getBoundingClientRect();
      const canvasRect = this.canvas.canvas.getBoundingClientRect();
      const offsetX = canvasRect.left - rect.left;
      const offsetY = canvasRect.top - rect.top;
      effect.style.left = `${coordX - offsetX - 45}px`; // Para centrar el círculo
      effect.style.top = `${coordY - offsetY - 45}px`;
      effect.style.backgroundColor = this.getFoodColor(food.type);
      videoContainer.appendChild(effect);
    }

    setTimeout(() => effect.remove(), 1500);
  }

  getFoodColor(type) {
    return type === 1 ? "#2ECC71" : type === 2 ? "#7b5a9fff" : "#E67E22";
  }

  draw() {
    this.activeFoods.forEach((food) => {
      food.draw(this.ctx);
    });

    if (this.currentStage === 3) {
      this.ctx.fillStyle = '#f5f5f5'; // Dibuja un fondo blanco en lugar de la cámara
      this.ctx.fillRect(0, 0, this.canvas.canvas.width, this.canvas.canvas.height);

      // Usamos un cacheKey para recalcular solo si cambia el tamaño del canvas
      const canvasKey = `${this.canvas.canvas.width}x${this.canvas.canvas.height}`;
      this.currentQuestion.forEach(q => {
        if (q && (!q.layoutCache || q.layoutCache.key !== canvasKey)) {
          q.clearLayoutCache();
        }
      });

      const firstQuestion = this.currentQuestion.find(q => q !== null);
      if (firstQuestion) {
        const positions = firstQuestion.calculateQuestionsLayout(
          this.currentQuestion,
          this.canvas.canvas.width,
          this.canvas.canvas.height,
          this.ctx
        );
        this.currentQuestion.forEach((q, i) => {
          if (q && positions[i]) {
            q.relocateQuestion(positions[i].x, positions[i].y, positions[i].width);
            q.draw(this.ctx);
          }
        });
      }
    }
  }

  getStageStatsForPlayer(playerIndex) {
    const stats = [];
    const player = this.players[playerIndex];

    if (this.currentStage === 1) {
      // Etapa 1: Saludables, No saludables, Con gluten
      stats.push(
        this.createFoodStat("healthy", "Saludables", player.foodsCollected.healthy),
        this.createFoodStat("unhealthy", "No saludables", player.foodsCollected.unhealthy),
        this.createFoodStat("gluten", "Con gluten", player.foodsCollected.gluten)
      );
    } else if (this.currentStage === 2) {
      // Etapa 2: Saludables, No saludables
      stats.push(
        this.createFoodStat("healthy", "Saludables", player.foodsCollected.healthy),
        this.createFoodStat("unhealthy", "No saludables", player.foodsCollected.unhealthy)
      );
    } else if (this.currentStage === 3) {
      // Etapa 3: Preguntas correctas
      const correctQuestions = document.createElement('p');
      correctQuestions.textContent = `Preguntas correctas: ${player.correctQuestions || 0}`;
      stats.push(correctQuestions);
    }

    return stats;
  }

  // Método auxiliar para crear la sección de cada jugador
  createPlayerResult(playerName, playerIndex, isWinner) {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-result';

    const title = document.createElement('h3');
    title.textContent = playerName;

    const score = document.createElement('p');
    score.textContent = `Puntuación: ${this.players[playerIndex].score}`;

    // Efecto para el ganador
    if (isWinner) {
      playerDiv.classList.add('winner');
    }

    playerDiv.append(title, score);

    // Agrega las estadísticas correspondientes a la etapa
    const stats = this.getStageStatsForPlayer(playerIndex);
    if (this.currentStage === 1 || this.currentStage === 2) {
      const foodsDiv = document.createElement('div');
      foodsDiv.className = 'food-stats';
      stats.forEach(stat => foodsDiv.appendChild(stat));
      playerDiv.appendChild(foodsDiv);
    } else if (this.currentStage === 3) {
      stats.forEach(stat => playerDiv.appendChild(stat));
    }

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
            Clara y Santiago son amigos, ambos celíacos, lo que significa que deben tener especial cuidado con lo que comen en su día a día 👀.<br><br>
            En este juego te invitamos a ayudarlos: tendrás que seleccionar con atención los alimentos que aparecen en pantalla, algunos son sin TACC y otros contienen gluten.🚫🌾<br><br>
            🎯El objetivo es capturar la mayor cantidad de alimentos sanos sin TACC que aparezcan <br><br>
            Agarra los alimentos... <b> ¡con las manos! </b> <br><br>
            <b>¡Animate a cuidarte como lo hacen Clara y Santiago todos los días🤩!</b>
          </div>
        </div>
        <div class="intro-sidebar">
          <button class="intro-btn">¡Comenzar!</button>
        </div>
      </div>
    `;
    document.getElementById('game-container').appendChild(introDiv);
    introDiv.querySelector('.intro-btn').onclick = () => {
      introDiv.remove();
      this.hideCanvas();
      this.showStageVideo().then(() => {
        if (this.gameEnded) return;
        this.showStageIntroduction();
      });
    };
  }

  // esto creo que no lo usamos al final, chequear
  getOptionPositions(ctx) {
    const positions = [];

    // Usa los mismos valores que en draw()
    const optionFontSize = 20;
    const optionHeight = 40;
    const optionSpacing = 10;
    const marginTop = 20;
    const marginBottom = 20;
    const questionAreaHeight = 60;
    const optionsStartY = this.y + marginTop + questionAreaHeight + 10;

    for (let i = 0; i < this.options.length; i++) {
      const optionY = optionsStartY + i * (optionHeight + optionSpacing);
      if (optionY + optionHeight > this.y + this.height - marginBottom) {
        break;
      }
      positions.push({
        x: this.x + 30,
        y: optionY,
        width: this.width - 60,
        height: optionHeight
      });
    }
    return positions;
  }

}