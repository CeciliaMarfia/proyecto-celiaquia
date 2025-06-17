export class QuestionItem {
  constructor(x, y, question, options, correctAnswer) {
    this.x = x;
    this.y = y;
    this.question = question;
    this.options = options;
    this.correctAnswer = correctAnswer;
    this.width = 400;  // Aumentado para mejor legibilidad
    this.height = 70;  // Aumentado para mejor interacción
    this.isActive = true;
    this.selectedOption = null;
    this.selectionStartTime = null;
    this.selectionThreshold = 3000; // 3 segundos para seleccionar
    this.hoverProgress = 0; // Para el efecto de gris progresivo
    this.feedbackActive = false;
    this.feedbackSelected = null;
    this.feedbackResult = false;
  }

  draw(ctx) {
    if (!this.isActive) return;

    // Caja principal (simula un div con estilos)
    const boxX = this.x - 20;
    const boxY = this.y - 60;
    const boxW = this.width + 40;
    const boxH = (this.options.length * (this.height + 15)) + 80;

    // Fondo y borde
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(44,62,80,0.15)';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Título de la pregunta
    ctx.save();
    ctx.font = 'bold 22px Nunito';
    ctx.fillStyle = '#2C3E50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'transparent';
    ctx.fillText(this.question, this.x + this.width/2, this.y - 40, this.width);
    ctx.restore();

    // Dibujar opciones
    this.options.forEach((option, index) => {
      const optionY = this.y + (index * (this.height + 15));
      
      // Calcular el progreso de selección
      let progress = 0;
      if (this.selectedOption === index && this.selectionStartTime) {
        progress = Math.min((Date.now() - this.selectionStartTime) / this.selectionThreshold, 1);
      }
      // Feedback visual SOLO para la opción seleccionada
      let feedbackColor = null;
      if (this.feedbackActive && index === this.feedbackSelected) {
        feedbackColor = this.feedbackResult ? '#4CAF50' : '#F44336'; // Verde si es correcta, rojo si no
      }
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(this.x, optionY, this.width, this.height, 10);
      ctx.fillStyle = feedbackColor || 'white';
      ctx.strokeStyle = '#2C3E50';
      ctx.lineWidth = 2;
      
      // Dibujar rectángulo de la opción con sombra suave
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // Texto de la opción
      ctx.save();
      ctx.fillStyle = feedbackColor ? 'white' : '#2C3E50';
      ctx.font = '20px Nunito';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(option, this.x + this.width/2, optionY + this.height/2, this.width - 20);
      ctx.restore();
      // Barra de progreso si está seleccionando
      if (this.selectedOption === index && this.selectionStartTime && !this.feedbackActive) {
        ctx.save();
        ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.fillRect(this.x + 10, optionY + this.height - 8, this.width - 20, 6);
        
        // Barra de progreso
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.fillRect(this.x + 10, optionY + this.height - 8, (this.width - 20) * progress, 6);
        ctx.restore();
      }
    });
  }

  checkCollision(handX, handY) {
    if (!this.isActive) return false;

    // Verificar colisión con cada opción
    for (let i = 0; i < this.options.length; i++) {
      const optionY = this.y + (i * (this.height + 15));
      if (handX > this.x && handX < this.x + this.width &&
          handY > optionY && handY < optionY + this.height) {
        // Si es una nueva selección, iniciar el temporizador
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          this.selectionStartTime = Date.now();
        }
        // Verificar si se ha mantenido la selección el tiempo suficiente
        if (this.selectionStartTime && 
            Date.now() - this.selectionStartTime >= this.selectionThreshold) {
          // NO poner isActive=false aquí, solo devolver true para que el GameManager maneje el feedback
          return true;
        }
        return false;
      }
    }
    // Si no hay colisión, resetear la selección
    this.selectedOption = null;
    this.selectionStartTime = null;
    return false;
  }
} 