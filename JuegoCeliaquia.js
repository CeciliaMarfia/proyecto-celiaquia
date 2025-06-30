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
    const existingResults = document.querySelector('.game-results');
    if (existingResults) {
        existingResults.remove();
    }
    // Oculta el botón de iniciar cámara y muestra el de comenzar juego
    document.getElementById('initial-controls').style.display = 'none';
    document.getElementById('pre-game-controls').style.display = 'flex';
    document.getElementById('game-controls').style.display = 'none';
});

document.getElementById('b-start-game').addEventListener('click', () => {
    window.gameManager.startGame();
    // Oculta el botón de comenzar juego y muestra los controles del juego
    document.getElementById('pre-game-controls').style.display = 'none';
    document.getElementById('game-controls').style.display = 'flex';
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
    if (window.gameManager && !window.gameManager.gameEnded && !document.querySelector('.game-results')) {
      window.gameManager.update(Date.now(), hands);
      window.gameManager.draw();
    }

    // Dibuja todas las detecciones
    canvas.drawResultsPoses(poses);
    canvas.renderHands(hands);
    updateFPS();
  } catch (error) {
    console.error("Error en la detección:", error);
  }
  requestAnimationFrame(() => runInference(canvas, camera));
}