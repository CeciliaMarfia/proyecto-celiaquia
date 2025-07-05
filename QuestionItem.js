export class QuestionItem {
  constructor(x, y, question, options, correctAnswer) {
    this.x = x;
    this.y = y;
    this.question = question;
    this.options = options;
    this.correctAnswer = correctAnswer;
    this.width = 500; // Aumentado para mejor legibilidad
    this.height = 300; // Altura fija para mejor distribución
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

    // Diseño con altura fija
    const boxX = this.x;
    const boxY = this.y;
    const boxW = this.width;
    const boxH = this.height; // Usar exactamente la altura asignada

    // Tamaños fijos para mejor control
    const questionFontSize = 22;
    const optionFontSize = 20;
    const optionHeight = 40;
    const optionSpacing = 10;
    const marginTop = 20;
    const marginBottom = 20;

    // Fondo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 20);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(44,62,80,0.15)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Espeja el texto de las preguntas para que se vea normal
    ctx.save();
    ctx.scale(-1, 1);
    ctx.font = `bold ${questionFontSize}px Nunito`;
    ctx.fillStyle = "#2C3E50";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      this.question,
      -(this.x + this.width / 2),
      this.y + marginTop,
      this.width - 60
    );
    ctx.restore();

    // Dibuja opciones
    this.options.forEach((option, index) => {
      const optionY = optionsStartY + index * (optionHeight + optionSpacing);
      
      // Verifica que la opción no se salga del área asignada
      if (optionY + optionHeight > this.y + this.height - marginBottom) {
        return; // No dibujar si se sale del área
      }
      
      // Feedback visual SOLO para la opción seleccionada
      let feedbackColor = null;
      if (this.feedbackActive && index === this.feedbackSelected) {
        feedbackColor = this.feedbackResult ? "#4CAF50" : "#F44336"; // Verde si es correcta, rojo si no
      }
      
      // Fondo de la opción
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(this.x + 30, optionY, this.width - 60, optionHeight, 12);
      ctx.fillStyle = feedbackColor || "rgba(248, 249, 250, 0.9)";
      ctx.strokeStyle = feedbackColor ? feedbackColor : "#dee2e6";
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Texto de la opción
      ctx.save();
      ctx.scale(-1, 1);
      ctx.fillStyle = feedbackColor ? "white" : "#495057";
      ctx.font = `600 ${optionFontSize}px Nunito`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        option,
        -(this.x + this.width / 2),
        optionY + optionHeight / 2,
        this.width - 80
      );
      ctx.restore();

      // Barra de progreso si está seleccionando
      if (
        this.selectedOption === index &&
        this.selectionStartTime &&
        !this.feedbackActive
      ) {
        ctx.save();
        ctx.fillStyle = "rgba(52, 152, 219, 0.8)";
        ctx.fillRect(
          this.x + 40,
          optionY + optionHeight - 8,
          (this.width - 80) * Math.min((Date.now() - this.selectionStartTime) / this.selectionThreshold, 1),
          6
        );
        ctx.restore();
      }
    });
  }

  // Para hacer wrap de texto en canvas (no se si es necesario)
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  // Obtiene las posiciones reales de las opciones
  getOptionPositions(ctx) {
    const positions = [];
    
    // Calcula altura de la pregunta
    const questionFontSize = Math.max(20, Math.min(28, Math.floor(this.height/10)));
    const questionLineHeight = questionFontSize + 8;
    const questionLines = this.wrapText(ctx, this.question, this.width - 80);
    const questionHeight = questionLines.length * questionLineHeight;
    
    const marginTop = Math.max(25, Math.floor(this.height/12));
    const optionFontSize = Math.max(18, Math.min(24, Math.floor(this.height/12)));
    const optionHeight = optionFontSize + 24;
    const optionSpacing = Math.max(15, Math.floor(this.height/15));
    
    for (let i = 0; i < this.options.length; i++) {
      const optionY = this.y + marginTop + questionHeight + 20 + i * (optionHeight + optionSpacing);
      const optionX = this.x + 30;
      const optionWidth = this.width - 60;
      
      positions.push({
        x: optionX,
        y: optionY,
        width: optionWidth,
        height: optionHeight
      });
    }
    
    return positions;
  }

  checkCollision(handX, handY, ctx) {
    if (!this.isActive) return false;

    // Posiciones reales de las opciones
    const optionPositions = this.getOptionPositions(ctx);

    // Verifica colisión con cada opción
    for (let i = 0; i < this.options.length; i++) {
      const option = optionPositions[i];
      
      // Verifica si la mano está dentro del área de la opción
      if (
        handX > option.x &&
        handX < option.x + option.width &&
        handY > option.y &&
        handY < option.y + option.height
      ) {
        // Si es una nueva selección, inicia el temporizador
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          this.selectionStartTime = Date.now();
        }
        // Verifica si se ha mantenido la selección el tiempo suficiente
        if (
          this.selectionStartTime &&
          Date.now() - this.selectionStartTime >= this.selectionThreshold
        ) {
          return true;
        }
        return false;
      }
    }
    // Si no hay colisión, resetea la selección
    this.selectedOption = null;
    this.selectionStartTime = null;
    return false;
  }
}
