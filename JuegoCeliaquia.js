import { Camera } from './Camera.js';
import { Canvas } from './Canvas.js';
import * as rec from './Recognition.js';
import { updateFPS } from "./fpsModule.js";
import { GameManager } from './GameManager.js';

// Configuración principal

export const camera = new Camera();
const canvas = new Canvas();

// Colores de referencia para los símbolos de los jugadores - CHEQUEAR si quieren estos dos colores; sino cambiar los valores rgb y googlear cuales irian
export const PLAYER_SYMBOLS = [
  { name: "rojo", rgb: [200, 30, 30] }, // Jugador 1: rojo
  { name: "azul", rgb: [30, 30, 200] }  // Jugador 2: azul
];

/* Distancia mínima para considerar un color como válido - si no hay coincidencia, no se asigna la mano a un jugador
  - Bajar el umbral si queremos que se amas estricto (se asignan menos manos) 
  - Subir el umbral si queremos que acepte colores mas parecidos (se asignan mas manos) */
const COLOR_THRESHOLD = 120;

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

function getAverageColor(ctx, x, y, w, h) {
  const imageData = ctx.getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < imageData.length; i += 4) {
    r += imageData[i];
    g += imageData[i + 1];
    b += imageData[i + 2];
    count++;
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

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
    const debugCtx = canvas.ctx;
    // Debug: muestra cuántas poses se detectaron
    if (window.gameManager && !window.gameManager.gameEnded) {
      
      debugCtx.fillStyle = 'white';
      debugCtx.font = '16px Arial';
      debugCtx.fillText(`Poses detectadas: ${poses.length}`, 10, 50);
      debugCtx.fillText(`Manos detectadas: ${hands.length}`, 10, 70);
    }

    // Detecta el color del torso UNA VEZ y lo aplica a TODAS las manos
    
    // Busca la primera pose válida para detectar el color del torso
    let torsoColor = [0, 0, 0];
    let torsoDetected = false;
    let debugInfo = null;
    
    for (let pose of poses) {
      const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
      const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
      const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');
      const rightHip = pose.keypoints.find(kp => kp.name === 'right_hip');
      
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        // Define el área del torso
        const torsoLeft = Math.min(leftShoulder.x, leftHip.x);
        const torsoRight = Math.max(rightShoulder.x, rightHip.x);
        const torsoTop = Math.min(leftShoulder.y, rightShoulder.y);
        const torsoBottom = Math.max(leftHip.y, rightHip.y);
        
        // Muestrea el color del torso
        const torsoWidth = torsoRight - torsoLeft;
        const torsoHeight = torsoBottom - torsoTop;
        torsoColor = getAverageColor(debugCtx, torsoLeft, torsoTop, torsoWidth, torsoHeight);
        torsoDetected = true;
        
        // Guarda info para debug
        debugInfo = { torsoLeft, torsoRight, torsoTop, torsoBottom, torsoColor };
        break; // Solo necesitamos la primera pose válida
      }
    }
    
    // Debug visual del torso
    if (window.gameManager && !window.gameManager.gameEnded && debugInfo) {
      const debugCtx = canvas.ctx;
      const { torsoLeft, torsoRight, torsoTop, torsoBottom, torsoColor } = debugInfo;
      
      // Dibuja los puntos clave detectados
      const leftShoulder = poses[0].keypoints.find(kp => kp.name === 'left_shoulder');
      const rightShoulder = poses[0].keypoints.find(kp => kp.name === 'right_shoulder');
      const leftHip = poses[0].keypoints.find(kp => kp.name === 'left_hip');
      const rightHip = poses[0].keypoints.find(kp => kp.name === 'right_hip');
      
      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        debugCtx.fillStyle = 'yellow';
        debugCtx.beginPath();
        debugCtx.arc(leftShoulder.x, leftShoulder.y, 5, 0, 2 * Math.PI);
        debugCtx.fill();
        debugCtx.fillText('LS', leftShoulder.x + 8, leftShoulder.y);
        
        debugCtx.fillStyle = 'orange';
        debugCtx.beginPath();
        debugCtx.arc(rightShoulder.x, rightShoulder.y, 5, 0, 2 * Math.PI);
        debugCtx.fill();
        debugCtx.fillText('RS', rightShoulder.x + 8, rightShoulder.y);
        
        debugCtx.fillStyle = 'cyan';
        debugCtx.beginPath();
        debugCtx.arc(leftHip.x, leftHip.y, 5, 0, 2 * Math.PI);
        debugCtx.fill();
        debugCtx.fillText('LH', leftHip.x + 8, leftHip.y);
        
        debugCtx.fillStyle = 'magenta';
        debugCtx.beginPath();
        debugCtx.arc(rightHip.x, rightHip.y, 5, 0, 2 * Math.PI);
        debugCtx.fill();
        debugCtx.fillText('RH', rightHip.x + 8, rightHip.y);
      }
      
      // Color del borde según si se detectó color de jugador
      const redDist = colorDistance(torsoColor, PLAYER_SYMBOLS[0].rgb);
      const blueDist = colorDistance(torsoColor, PLAYER_SYMBOLS[1].rgb);
      const minDist = Math.min(redDist, blueDist);
      
      if (minDist < COLOR_THRESHOLD) {
        debugCtx.strokeStyle = 'green'; // Verde si se detectó jugador
      } else {
        debugCtx.strokeStyle = 'red'; // Rojo si no se detectó
      }
      
      debugCtx.lineWidth = 3;
      debugCtx.strokeRect(torsoLeft, torsoTop, torsoRight - torsoLeft, torsoBottom - torsoTop);
      
      // Muestra el color detectado y la distancia
      debugCtx.fillStyle = 'white';
      debugCtx.font = '14px Arial';
      debugCtx.fillText(`Color: [${torsoColor.join(', ')}]`, torsoLeft, torsoTop - 5);
      debugCtx.fillText(`Dist: R:${Math.round(redDist)} B:${Math.round(blueDist)}`, torsoLeft, torsoTop - 20);
      
      // Debug adicional
      debugCtx.fillStyle = 'lime';
      debugCtx.font = '12px Arial';
      debugCtx.fillText(`Torso: L:${Math.round(torsoLeft)} R:${Math.round(torsoRight)} T:${Math.round(torsoTop)} B:${Math.round(torsoBottom)}`, 10, 30);
    }
    
    // Ahora asigna TODAS las manos al mismo jugador si se detectó torso
    const handToPlayer = [];
    
    if (torsoDetected) {
      // Calcula qué jugador es basándose en el color del torso
      let minDist = Infinity, assignedPlayer = null;
      PLAYER_SYMBOLS.forEach((player, idx) => {
        const dist = colorDistance(torsoColor, player.rgb);
        if (dist < minDist) {
          minDist = dist;
          assignedPlayer = idx;
        }
      });
      
      // Si el color del torso es válido, asigna TODAS las manos a ese jugador
      if (minDist < COLOR_THRESHOLD) {
        hands.forEach((_, i) => {
          handToPlayer[i] = assignedPlayer;
        });
        
        console.log(`✅ Torso detectado: Color [${torsoColor.join(', ')}] | Asignando ${hands.length} manos a ${PLAYER_SYMBOLS[assignedPlayer].name}`);
      } else {
        console.log(`❌ Torso detectado pero color no válido: [${torsoColor.join(', ')}] | Distancia mínima: ${minDist} > umbral: ${COLOR_THRESHOLD}`);
        hands.forEach((_, i) => {
          handToPlayer[i] = null;
        });
      }
    } else {
      console.log(`❌ No se detectó torso válido`);
      hands.forEach((_, i) => {
        handToPlayer[i] = null;
      });
    }

    // Actualiza y dibuja el juego sólo cuando no está mostrando resultados de etapa
    if (window.gameManager && !window.gameManager.gameEnded && !document.querySelector('.stage-results')) {
      // Solo pasa las manos identificadas como jugadores al GameManager
      const handsToDraw = hands.filter((_, i) => handToPlayer[i] !== null);
      const filteredHandToPlayer = handToPlayer.filter(playerId => playerId !== null);
      window.gameManager.update(Date.now(), handsToDraw, filteredHandToPlayer);
      window.gameManager.draw();
    }

    // Dibuja solo las manos identificadas como jugadores
    const handsToDraw = hands.filter((_, i) => handToPlayer[i] !== null); // el _ es para que se ignore ese argumento
    const filteredHandToPlayer = handToPlayer.filter(playerId => playerId !== null);
    canvas.renderHands(handsToDraw, filteredHandToPlayer);

    updateFPS();
  } catch (error) {
    console.error("Error en la detección:", error);
  }
  requestAnimationFrame(() => runInference(canvas, camera));
}