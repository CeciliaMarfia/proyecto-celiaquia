export class FocusImage {
  constructor(canvas) {
    this.canvas = canvas;
    this.image = new Image();
    this.image.src = 'images/FocusImage.jpg';
    this.isActive = false;
    this.isLoaded = false;
    
    // Dimensiones de la imagen
    this.width = 200;
    this.height = 200;
    
    // Posición centrada (se calculará cuando se active)
    this.x = 0;
    this.y = 0;
    
    // Área de colisión (un poco más grande que la imagen para facilitar la interacción)
    this.collisionPadding = 30;
    
    // Animación de pulso
    this.pulseScale = 1;
    this.pulseDirection = 1;
    this.pulseSpeed = 0.01;
    
    this.image.onload = () => {
      this.isLoaded = true;
    };
  }
  
  activate(canvasWidth, canvasHeight) {
    this.isActive = true;
    // Centra la imagen en el canvas
    this.x = (canvasWidth - this.width) / 2;
    this.y = (canvasHeight - this.height) / 2;
  }
  
  deactivate() {
    this.isActive = false;
  }
  
  update() {
    if (!this.isActive) return;
    
    // Animación de pulso suave
    this.pulseScale += this.pulseSpeed * this.pulseDirection;
    
    if (this.pulseScale >= 1.1) {
      this.pulseDirection = -1;
    } else if (this.pulseScale <= 0.95) {
      this.pulseDirection = 1;
    }
  }
  
  draw(ctx) {
    if (!this.isActive || !this.isLoaded) return;
    
    ctx.save();
    
    // Sombra para destacar la imagen
    ctx.shadowColor = "rgba(52, 152, 219, 0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Calcular posición centrada con escala de pulso
    const scaledWidth = this.width * this.pulseScale;
    const scaledHeight = this.height * this.pulseScale;
    const centeredX = this.x + (this.width - scaledWidth) / 2;
    const centeredY = this.y + (this.height - scaledHeight) / 2;
    
    // Dibujar círculo de fondo brillante
    ctx.beginPath();
    ctx.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      (this.width / 2 + 10) * this.pulseScale,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(52, 152, 219, 0.2)";
    ctx.fill();
    
    // Dibujar la imagen
    ctx.drawImage(
      this.image,
      centeredX,
      centeredY,
      scaledWidth,
      scaledHeight
    );
    
    // Texto instructivo debajo de la imagen
    ctx.scale(-1, 1); // Espeja el texto
    ctx.font = "bold 24px Nunito";
    ctx.fillStyle = "#2C3E50";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      "¡Toca la imagen para comenzar!",
      -(this.x + this.width / 2),
      this.y + this.height + 20
    );
    
    ctx.restore();
  }
  
  checkCollision(handX, handY) {
    if (!this.isActive) return false;
    
    // Área de colisión expandida para facilitar la interacción
    const collisionX = this.x - this.collisionPadding;
    const collisionY = this.y - this.collisionPadding;
    const collisionWidth = this.width + (this.collisionPadding * 2);
    const collisionHeight = this.height + (this.collisionPadding * 2);
    
    return handX >= collisionX &&
           handX <= collisionX + collisionWidth &&
           handY >= collisionY &&
           handY <= collisionY + collisionHeight;
  }
}