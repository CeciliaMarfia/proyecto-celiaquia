import { HandDetector } from "./HandDetector.js";

export class FoodItem {
  constructor(x, y, type, imageSrc) {
    this.x = x;
    this.y = y;
    this.type = type; // 1: saludable, 2: no saludable, 3: con TACC

    this.image = new Image();
    this.image.onload = () => {
      const aspectRatio = this.image.naturalWidth / this.image.naturalHeight;
      const baseSize = 150;

      if (aspectRatio > 1) {
        this.width = baseSize;
        this.height = baseSize / aspectRatio;
      } else {
        this.height = baseSize;
        this.width = baseSize * aspectRatio;
      }

      const scale = 0.9 + Math.random() * 0.2;
      this.width *= scale;
      this.height *= scale;
    };
    this.image.src = imageSrc;

    this.width = 150;
    this.height = 150;

    this.isActive = true;
    this.spawnTime = Date.now();
    this.lifetime = 4000 + Math.random() * 3000; // 4-7 seg
  }

  update(currentTime) {
    if (currentTime - this.spawnTime > this.lifetime) {
      this.isActive = false;
    }
  }

  draw(ctx) {
    if (!this.isActive) return;

    try {
      if (this.image.complete && this.image.naturalWidth !== 0) {
        ctx.save();

        // --- FLIP VISUAL: solo afecta la imagen, no la hitbox ---
        ctx.translate(this.x + this.width, this.y);
        ctx.scale(-1, 1);
        ctx.drawImage(this.image, 0, 0, this.width, this.height);

        ctx.restore();

        // --- DIBUJAR HITBOX: en coordenadas "reales" ---
        ctx.save();
        ctx.strokeStyle = "rgba(255,0,0,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = "rgba(255,0,0,0.1)";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
      }
    } catch (error) {
      console.error("Error dibujando:", error);
      this.isActive = false;
    }
  }

  checkCollision(hand) {
    if (!this.isActive) return false;

    const keypoints = hand.getKeypoints();

    const pointsToCheck = [
      keypoints[0],  // wrist
      keypoints[4],  // thumb_tip
      keypoints[8],  // index_tip
      keypoints[12], // middle_tip
      keypoints[16], // ring_tip
      keypoints[20], // pinky_tip
    ];

    const marginX = this.width * 0.15;
    const marginY = this.height * 0.15;

    const hitboxX = this.x + marginX;
    const hitboxY = this.y + marginY;
    const hitboxWidth = this.width - 2 * marginX;
    const hitboxHeight = this.height - 2 * marginY;

    const isInside = pointsToCheck.some(pt =>
      pt.x > hitboxX &&
      pt.x < hitboxX + hitboxWidth &&
      pt.y > hitboxY &&
      pt.y < hitboxY + hitboxHeight
    );

    if (isInside) {
      console.log("Collision detected with food item at x: " + this.x + ", y: " + this.y);
      console.log("Hand points:", pointsToCheck.map(p => `(${p.x.toFixed(0)},${p.y.toFixed(0)})`).join(", "));
    }

    return isInside;
  }

}
