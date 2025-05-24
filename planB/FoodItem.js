export class FoodItem {
  constructor(x, y, type, imageSrc) {
    this.x = x;
    this.y = y;
    this.type = type; // 1: saludable, 2: no saludable, 3: con TACC
    this.image = new Image();
    this.image.src = imageSrc;
    this.width = 60;
    this.height = 60;
    this.isActive = true;
    this.spawnTime = Date.now();
    this.lifetime = 4000 + Math.random() * 3000; // 4-7 segundos
    this.rotation = Math.random() * Math.PI * 2;
    this.scale = 0.8 + Math.random() * 0.4;
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
        console.error('Error dibujando:', error);
        this.isActive = false;
    }
}

  checkCollision(handX, handY) {
    if (!this.isActive) return false;
    
    return handX > this.x && handX < this.x + this.width &&
           handY > this.y && handY < this.y + this.height;
  }
}