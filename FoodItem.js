import { HandDetector } from "./HandDetector.js";
export class FoodItem {
  constructor(x, y, type, imageSrc) {
    this.x = x;
    this.y = y;
    this.type = type; // 1: saludable, 2: no saludable, 3: con TACC
    this.image = new Image();
    this.image.onload = () => {
      // Calcular proporciones manteniendo el aspecto ratio
      const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
      const baseSize = 100; // Aumentado de 60 a 100

      if (aspectRatio > 1) {
        // Imagen más ancha que alta
        this.width = baseSize;
        this.height = baseSize / aspectRatio;
      } else {
        // Imagen más alta que ancha o cuadrada
        this.height = baseSize;
        this.width = baseSize * aspectRatio;
      }

      // Aplicar escala aleatoria manteniendo las proporciones
      const scale = 0.9 + Math.random() * 0.3; // Ajustado para que no sean muy pequeñas
      this.width *= scale;
      this.height *= scale;
    };
    this.image.src = imageSrc;
    this.width = 100; // Tamaño inicial antes de cargar
    this.height = 100;
    this.isActive = true;
    this.spawnTime = Date.now();
    this.lifetime = 4000 + Math.random() * 3000; // 4-7 segundos
  }

  update(currentTime) {
    // El alimento desaparece después de su tiempo de vida
    if (currentTime - this.spawnTime > this.lifetime) {
      this.isActive = false;
    }
  }

  draw(ctx) {
    if (!this.isActive) return;

    try {
      // Asegura que la imagen esté cargada y sea válida
      if (this.image.complete && this.image.naturalWidth !== 0) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
      }
    } catch (error) {
      console.error("Error dibujando:", error);
      this.isActive = false;
    }
  }

  checkCollision(hand) {
    if (!this.isActive) return false;

    const keypoints = hand.getKeypoints(); // Keypoints a verificar por colisión

    for (let i = 0; i < keypoints.length; i++) {
      const { x, y } = keypoints[i];
      const isInside =
        x > this.x &&
        x < this.x + this.width &&
        y > this.y &&
        y < this.y + this.height;
      if (isInside) {
        console.log("hay colision en foodItem");
        return true;
      } else {
        console.log("no hay colision en foodItem");
      }
    }
    return false;
  }
}
