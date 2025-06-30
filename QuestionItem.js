export class QuestionItem {
  constructor(x, y, question, options, correctAnswer) {
    this.x = x;
    this.y = y;
    this.question = question;
    this.options = options;
    this.correctAnswer = correctAnswer;
    this.width = 500; // Aumentado para mejor legibilidad
    this.height = 80; // Aumentado para mejor interacción
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

    // --- Medir alto de la pregunta dinámicamente ---
    ctx.save();
    const questionFontSize = Math.max(18, Math.min(24, Math.floor(this.height/12)));
    ctx.font = `bold ${questionFontSize}px Nunito`;
    const questionLines = this.wrapText(ctx, this.question, this.width - 60);
    const questionLineHeight = questionFontSize + 6;
    const questionHeight = questionLines.length * questionLineHeight;
    ctx.restore();

    // Medir alto de opciones
    const optionFontSize = Math.max(16, Math.min(20, Math.floor(this.height/15)));
    const optionHeight = optionFontSize + 20;
    const optionSpacing = Math.max(10, Math.floor(this.height/20));
    const optionsHeight = this.options.length * optionHeight + (this.options.length - 1) * optionSpacing;

    // Margen superior e inferior
    const marginTop = Math.max(20, Math.floor(this.height/10));
    const marginBottom = Math.max(20, Math.floor(this.height/10));

    // Calcula el alto total
    const boxH = marginTop + questionHeight + 20 + optionsHeight + marginBottom;
    const boxX = this.x;
    const boxY = this.y;
    const boxW = this.width;

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
    ctx.shadowColor = "transparent";
    // Dibuja cada línea de la pregunta
    questionLines.forEach((line, i) => {
      ctx.fillText(
        line,
        -(this.x + this.width / 2),
        this.y + marginTop + i * questionLineHeight,
        this.width - 60
      );
    });
    ctx.restore();

    // Dibuja opciones
    this.options.forEach((option, index) => {
      const optionY = this.y + marginTop + questionHeight + 20 + index * (optionHeight + optionSpacing);
      // Feedback visual SOLO para la opción seleccionada
      let feedbackColor = null;
      if (this.feedbackActive && index === this.feedbackSelected) {
        feedbackColor = this.feedbackResult ? "#4CAF50" : "#F44336"; // Verde si es correcta, rojo si no
      }
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(this.x + 30, optionY, this.width - 60, optionHeight, 12);
      ctx.fillStyle = feedbackColor || "rgba(248, 249, 250, 0.9)";
      ctx.strokeStyle = feedbackColor ? feedbackColor : "#dee2e6";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
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
        ctx.fillStyle = "rgba(52, 152, 219, 0.1)";
        ctx.fillRect(
          this.x + 40,
          optionY + optionHeight - 8,
          this.width - 80,
          6
        );

        // Barra de progreso
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
    
    // Calcula altura de la pregunta - tiene que haber una manera mas simple de hacer esto.... chequear
    const questionFontSize = Math.max(18, Math.min(24, Math.floor(this.height/12)));
    const questionLineHeight = questionFontSize + 6;
    const questionLines = this.wrapText(ctx, this.question, this.width - 60);
    const questionHeight = questionLines.length * questionLineHeight;
    
    const marginTop = Math.max(20, Math.floor(this.height/10));
    const optionFontSize = Math.max(16, Math.min(20, Math.floor(this.height/15)));
    const optionHeight = optionFontSize + 20;
    const optionSpacing = Math.max(10, Math.floor(this.height/20));
    
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
