import { Camera } from "./Camera.js";
import { Canvas } from "./Canvas.js";
import * as rec from "./Recognition.js";
import { updateFPS } from "./fpsModule.js";
import { GameManager } from "./GameManager.js";

// Configuración principal

export const camera = new Camera();
const canvas = new Canvas();

// Colores de referencia para los símbolos de los jugadores - CHEQUEAR si quieren estos dos colores; sino cambiar los valores rgb y googlear cuales irian
export const PLAYER_SYMBOLS = [
  { name: "rojo", rgb: [200, 30, 30] }, // Jugador 1: rojo
  { name: "azul", rgb: [30, 30, 200] }, // Jugador 2: azul
];

/* Distancia mínima para considerar un color como válido - si no hay coincidencia, no se asigna la mano a un jugador
  - Bajar el umbral si queremos que sea mas estricto (se asignan menos manos) 
  - Subir el umbral si queremos que acepte colores mas parecidos (se asignan menos manos) */
const COLOR_THRESHOLD = 120;

window.gameManager = new GameManager(canvas); // Variable global para acceder al GameManager
window.gameManager.camera = camera; // Referencia al objeto Camera en el GameManager

// Carga modelos de detección
rec.loadPoseNet(poseDetection.SupportedModels.MoveNet, {
  modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
  enableTracking: true,
});

rec.loadHandNet(handPoseDetection.SupportedModels.MediaPipeHands, {
  runtime: "tfjs",
  modelType: "lite",
  maxHands: 4,
  detectorConfig: {
    runtime: "tfjs",
  },
});

// Event Listeners
camera
  .getVideo()
  .addEventListener("loadeddata", () => runInference(canvas, camera));

document.getElementById("b-start-webcam").addEventListener("click", () => {
  camera.start(canvas);
  // Limpia cualquier resultado previo
  const existingResults = document.querySelector(".stage-results");
  if (existingResults) {
    existingResults.remove();
  }
  // Oculta el botón de iniciar cámara y muestra el de comenzar juego
  document.getElementById("initial-controls").style.display = "none";
  document.getElementById("pre-game-controls").style.display = "flex";
  document.getElementById("game-controls").style.display = "none";

  // Mostrar mensaje de prueba - que deberia ser el juego de prueba!!
  const testMsg = document.getElementById("test-stage-message");
  testMsg.style.display = "block";
  // El mensaje se queda fijo hasta que se presione "Comenzar Juego"
});

document.getElementById("b-start-game").addEventListener("click", () => {
  window.gameManager.startGame();
  // Oculta el botón de comenzar juego y muestra los controles del juego
  document.getElementById("pre-game-controls").style.display = "none";
  document.getElementById("game-controls").style.display = "flex";
  // Oculta el mensaje de prueba cuando se inicia el juego
  const testMsg = document.getElementById("test-stage-message");
  testMsg.style.display = "none";
});

document.getElementById("b-end-game").addEventListener("click", () => {
  window.gameManager.endGame();
  // Al terminar el juego, vuelve al estado inicial
  document.getElementById("game-controls").style.display = "none";
  document.getElementById("initial-controls").style.display = "flex";
  // Detiene la cámara
  camera.stop();
});

// Inicialización de los botones al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  // Asegura que solo el botón inicial esté visible
  document.getElementById("initial-controls").style.display = "flex";
  document.getElementById("pre-game-controls").style.display = "none";
  document.getElementById("game-controls").style.display = "none";
});

function getAverageColor(ctx, x, y, w, h) {
  const imageData = ctx.getImageData(x, y, w, h).data;
  let r = 0,
    g = 0,
    b = 0,
    count = 0;
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

function findClosestPose(hand, poses) {
  let minDist = Infinity,
    closestPose = null;
  const hx = hand.keypoints[0].x;
  const hy = hand.keypoints[0].y;
  poses.forEach((pose) => {
    // Use left and right wrist keypoints
    const leftWrist = pose.keypoints.find((kp) => kp.name === "left_wrist");
    const rightWrist = pose.keypoints.find((kp) => kp.name === "right_wrist");
    if (leftWrist) {
      const dist = Math.hypot(hx - leftWrist.x, hy - leftWrist.y);
      if (dist < minDist) {
        minDist = dist;
        closestPose = pose;
      }
    }
    if (rightWrist) {
      const dist = Math.hypot(hx - rightWrist.x, hy - rightWrist.y);
      if (dist < minDist) {
        minDist = dist;
        closestPose = pose;
      }
    }
  });
  return closestPose;
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

    // Asigna manos a jugadores según símbolo/color - necesitamos el canvas del video
    const videoCtx = canvas.ctx;

    // Mapeo tipo: índice de mano -> índice de jugador
    const handToPlayer = [];

    hands.forEach((hand, i) => {
      // Usa el kp del pecho/hombros para identificar el color del jugador
      const pose = findClosestPose(hand, poses);
      let color = [0, 0, 0];
      if (pose) {
        const leftShoulder = pose.keypoints.find(
          (kp) => kp.name === "left_shoulder"
        );
        const rightShoulder = pose.keypoints.find(
          (kp) => kp.name === "right_shoulder"
        );
        if (leftShoulder && rightShoulder) {
          const cx = (leftShoulder.x + rightShoulder.x) / 2;
          const cy = (leftShoulder.y + rightShoulder.y) / 2;
          color = getAverageColor(videoCtx, cx - 15, cy - 15, 30, 30);
        }
      }

      // Calcula la distancia a cada color para asignar el jugador
      // Asigna el jugador con el color más cercano
      // Se asume que los colores de los jugadores están bien definidos en PLAYER_SYMBOLS
      // y que no hay más de 2 jugadores (si cambiamos eso, recordar ajustar esto!!!!!!!).
      let minDist = Infinity,
        assignedPlayer = null;
      PLAYER_SYMBOLS.forEach((player, idx) => {
        const dist = colorDistance(color, player.rgb);
        if (dist < minDist) {
          minDist = dist;
          assignedPlayer = idx;
        }
      });
      // Solo asigna si el color es parecido
      handToPlayer[i] = minDist < COLOR_THRESHOLD ? assignedPlayer : null;

      console.log(
        "Color promedio:",
        color,
        "Distancia rojo:",
        colorDistance(color, PLAYER_SYMBOLS[0].rgb),
        "Distancia azul:",
        colorDistance(color, PLAYER_SYMBOLS[1].rgb)
      );
    });

    // Actualiza y dibuja el juego sólo cuando no está mostrando resultados de etapa
    if (
      window.gameManager &&
      !window.gameManager.gameEnded &&
      !document.querySelector(".stage-results")
    ) {
      window.gameManager.update(Date.now(), hands, handToPlayer);
      window.gameManager.draw();
    }

    // Dibuja todas las detecciones
    canvas.drawResultsPoses(poses);

    // Filtro las manos para que solo las identificadas como de jugadores se dibujen
    const handsToDraw = hands.filter((_, i) => handToPlayer[i] !== null); // el _ es para que se ignore ese argumento
    canvas.renderHands(handsToDraw, handToPlayer);

    updateFPS();
  } catch (error) {
    console.error("Error en la detección:", error);
  }
  requestAnimationFrame(() => runInference(canvas, camera));
}
