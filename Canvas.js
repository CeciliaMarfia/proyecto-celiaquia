import { drawResultsPoses, drawResultsHands } from "./utilities.js";
//Canvas es como un "lienzo digital" en una página web donde podes dibujar
export class Canvas { //obtiene el contexto para dibujar
  constructor() {
    this.canvas = document.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  //toma las dimensiones del canvas
  setWidthHeight(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getCtx() {
   return this.ctx;
  }
//dibuja las poses detectadas
  drawResultsPoses(poses) {
    // No dibujamos nada aquí, solo queremos las manos
    // drawResultsPoses(this.ctx, poses);
    return;
  }
//dibuja las manos detectadas
  renderHands(hands, handToPlayer) {
    drawResultsHands(this.ctx, hands, handToPlayer);
  }
//Dibuja el frame actual del video de la cámara en el canvas
  drawCameraFrame(camera) {
    this.ctx.drawImage(camera.getVideo(), 0,0, this.canvas.width, this.canvas.height);
  }
}