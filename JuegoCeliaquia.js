import { Camera } from './Camera.js';
import { Canvas } from './Canvas.js';
import * as rec from './Recognition.js';
import { updateFPS } from "./fpsModule.js";
import { GameManager } from './GameManager.js';

// Configuración principal
export const camera = new Camera();
const canvas = new Canvas();
window.gameManager = new GameManager(canvas); // Variable global para acceder al GameManager
window.gameManager.camera = camera; // Referencia al objeto Camera en el GameManager

// Carga modelos de detección
rec.loadPoseNet(poseDetection.SupportedModels.MoveNet, {
  modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
  enableTracking: true,
});

rec.loadHandNet(handPoseDetection.SupportedModels.MediaPipeHands, {
  runtime: 'tfjs',
  modelType: 'lite',
  maxHands: 4,
  detectorConfig: {
    runtime: 'tfjs',
  }
});

// Event Listeners
camera.getVideo().addEventListener('loadeddata', () => runInference(canvas, camera));

document.getElementById('b-start-webcam').addEventListener('click', () => {
  camera.start(canvas);
  // Limpia cualquier resultado previo
  const existingResults = document.querySelector('.stage-results');
  if (existingResults) {
    existingResults.remove();
  }
  // Oculta el botón de iniciar cámara y muestra el de comenzar juego
  document.getElementById('initial-controls').style.display = 'none';
  document.getElementById('pre-game-controls').style.display = 'flex';
  document.getElementById('game-controls').style.display = 'none';

  // Mostrar mensaje de prueba - que deberia ser el juego de prueba!!
  const testMsg = document.getElementById('test-stage-message');
  testMsg.style.display = 'block';
  // El mensaje se queda fijo hasta que se presione "Comenzar Juego" 
});

document.getElementById('b-start-game').addEventListener('click', () => {
  window.gameManager.startGame();
  // Oculta el botón de comenzar juego y muestra los controles del juego
  document.getElementById('pre-game-controls').style.display = 'none';
  document.getElementById('game-controls').style.display = 'flex';
  // Oculta el mensaje de prueba cuando se inicia el juego
  const testMsg = document.getElementById('test-stage-message');
  testMsg.style.display = 'none';
});

document.getElementById('b-end-game').addEventListener('click', () => {
  window.gameManager.endGame();
  // Al terminar el juego, vuelve al estado inicial
  document.getElementById('game-controls').style.display = 'none';
  document.getElementById('initial-controls').style.display = 'flex';
  // Detiene la cámara
  camera.stop();
});

// Inicialización de los botones al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Asegura que solo el botón inicial esté visible
  document.getElementById('initial-controls').style.display = 'flex';
  document.getElementById('pre-game-controls').style.display = 'none';
  document.getElementById('game-controls').style.display = 'none';
});

// Bucle principal del juego
async function runInference(canvas, camera) {
  const image = camera.getVideo();
  try {
    // Detectar tanto poses como manos
    const hands = await rec.estimateHands(image, {
      // flipHorizontal: true,
      staticImageMode: false,
    });

    const poses = await rec.estimatePoses(image, {
      // flipHorizontal: true
    });
    canvas.drawCameraFrame(camera);

    // Actualiza y dibuja el juego sólo cuando no está mostrando resultados de etapa
    if (window.gameManager && !window.gameManager.gameEnded && !document.querySelector('.stage-results')) {
      window.gameManager.update(Date.now(), hands);
      window.gameManager.draw();
    }

    // Dibuja todas las detecciones
    canvas.drawResultsPoses(poses);
    // Suponemos que hay hasta 4 manos, 2 por jugador (0 y 1)
const handsJugador1 = hands.slice(0, 2);
const handsJugador2 = hands.slice(2, 4);

// Dibujar cada par de manos con su color de jugador
canvas.renderHands(handsJugador1, 0); // Jugador 0 (por ejemplo, rosa)
canvas.renderHands(handsJugador2, 1); // Jugador 1 (por ejemplo, verde)

    updateFPS();
  } catch (error) {
    console.error("Error en la detección:", error);
  }
  requestAnimationFrame(() => runInference(canvas, camera));
}