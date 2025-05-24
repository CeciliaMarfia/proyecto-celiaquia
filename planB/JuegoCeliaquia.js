import { Camera } from './Camera.js';
import { Canvas } from './Canvas.js';
import * as rec from './Recognition.js';
import { updateFPS } from "./fpsModule.js"; 
import { GameManager } from './GameManager.js';

// Configuración principal
const camera = new Camera();
const canvas = new Canvas();
const gameManager = new GameManager(canvas);

// Carga modelos de detección
rec.loadPoseNet(poseDetection.SupportedModels.MoveNet, {
  modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
  enableTracking: true,
});

rec.loadHandNet(handPoseDetection.SupportedModels.MediaPipeHands, {
  runtime: 'tfjs',
  modelType: 'lite',
});

// Event Listeners
camera.getVideo().addEventListener('loadeddata', () => runInference(canvas, camera));

document.getElementById('b-start-webcam').addEventListener('click', () => {
  camera.start(canvas);
  document.getElementById('b-start-game').disabled = false;
});

document.getElementById('b-stop-webcam').addEventListener('click', () => {
  camera.stop();
  document.getElementById('b-start-game').disabled = true;
});

document.getElementById('b-start-game').addEventListener('click', () => {
  gameManager.startGame();
  this.disabled = true;
});

// Bucle principal del juego
async function runInference(canvas, camera) {
  const image = camera.getVideo();

  try {
    const poses = await rec.estimatePoses(image);
    const hands = await rec.estimateHands(image, {flipHorizontal: false});

    canvas.drawCameraFrame(camera);
    
    // Actualiza y dibuja el juego
    gameManager.update(Date.now(), poses);
    gameManager.draw();
    
    // Dibuja detecciones
    canvas.drawResultsPoses(poses);
    canvas.drawResultsHands(hands);

    updateFPS();
  } catch (error) {
    console.error("Error en la detección:", error);
  }

  requestAnimationFrame(() => runInference(canvas, camera));
}