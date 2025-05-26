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
  // Deshabilita botones de juego hasta que empiece
  document.getElementById('b-start-game').disabled = false;
  document.getElementById('b-pause-game').disabled = true;
  document.getElementById('b-resume-game').disabled = true;
});

document.getElementById('b-stop-webcam').addEventListener('click', () => {
  camera.stop();
  document.getElementById('b-start-game').disabled = true;
});

document.getElementById('b-start-game').addEventListener('click', () => {
  window.gameManager.startGame();
});

document.getElementById('b-pause-game').addEventListener('click', () => {
  window.gameManager.pauseGame();
});

document.getElementById('b-resume-game').addEventListener('click', () => {
  window.gameManager.resumeGame();
});

document.getElementById('b-end-game').addEventListener('click', () => {
  window.gameManager.endGame();
});

// Inicialización de los botones al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('b-pause-game').disabled = true;
  document.getElementById('b-resume-game').disabled = true;
  document.getElementById('b-start-game').disabled = true;
  document.getElementById('b-end-game').disabled = true;
});


// Bucle principal del juego
async function runInference(canvas, camera) {
  const image = camera.getVideo();
  try {
    // Detectar tanto poses como manos
    const hands = await rec.estimateHands(image, {
      flipHorizontal: false,
      staticImageMode: false,
    });

    const poses = await rec.estimatePoses(image);
    canvas.drawCameraFrame(camera);

    // Actualiza y dibuja el juego
    window.gameManager.update(Date.now(), hands);
    window.gameManager.draw();

    // Dibuja todas las detecciones
    canvas.drawResultsPoses(poses);
    canvas.drawResultsHands(hands);
    updateFPS();
  } catch (error) {
    console.error("Error en la detección:", error);
  }
  requestAnimationFrame(() => runInference(canvas, camera));
}