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
    ctx.font = `bold ${Math.max(22, Math.floor(this.height/11))}px Nunito`;
    const questionLines = this.wrapText(ctx, this.question, this.width - 40);
    const questionLineHeight = Math.max(22, Math.floor(this.height/11)) + 8;
    const questionHeight = questionLines.length * questionLineHeight;
    ctx.restore();

    // Medir alto de opciones
    const optionFontSize = Math.max(22, Math.floor(40/1.5)); // Antes era 16 y 40/2.5
    const optionHeight = optionFontSize + 28;
    const optionSpacing = 20;
    const optionsHeight = this.options.length * optionHeight + (this.options.length - 1) * optionSpacing;

    // Margen superior e inferior
    const marginTop = 30;
    const marginBottom = 30;

    // Calcula el alto total
    const boxH = marginTop + questionHeight + 30 + optionsHeight + marginBottom;
    const boxX = this.x;
    const boxY = this.y;
    const boxW = this.width;

    // Fondo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 30);
    ctx.fillStyle = "rgba(255,255,255,0.97)";
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(44,62,80,0.10)";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Espeja el texto de las preguntas para que se vea normal
    ctx.save();
    ctx.scale(-1, 1);
    ctx.font = `bold ${Math.max(22, Math.floor(this.height/11))}px Nunito`;
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
        this.width - 40
      );
    });
    ctx.restore();

    // Dibuja opciones
    this.options.forEach((option, index) => {
      const optionY = this.y + marginTop + questionHeight + 30 + index * (optionHeight + optionSpacing);
      // Feedback visual SOLO para la opción seleccionada
      let feedbackColor = null;
      if (this.feedbackActive && index === this.feedbackSelected) {
        feedbackColor = this.feedbackResult ? "#4CAF50" : "#F44336"; // Verde si es correcta, rojo si no
      }
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(this.x + 40, optionY, this.width - 80, optionHeight, 18);
      ctx.fillStyle = feedbackColor || "white";
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Texto de la opción
      ctx.save();
      ctx.scale(-1, 1);
      ctx.fillStyle = feedbackColor ? "white" : "#2C3E50";
      ctx.font = `bold ${optionFontSize}px Nunito`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        option,
        -(this.x + this.width / 2),
        optionY + optionHeight / 2,
        this.width - 120
      );
      ctx.restore();

      // Barra de progreso si está seleccionando
      if (
        this.selectedOption === index &&
        this.selectionStartTime &&
        !this.feedbackActive
      ) {
        ctx.save();
        ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
        ctx.fillRect(
          this.x + 60,
          optionY + optionHeight - 12,
          this.width - 120,
          8
        );

        // Barra de progreso
        ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
        ctx.fillRect(
          this.x + 60,
          optionY + optionHeight - 12,
          (this.width - 120) * Math.min((Date.now() - this.selectionStartTime) / this.selectionThreshold, 1),
          8
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

  checkCollision(handX, handY) {
    if (!this.isActive) return false;

    // Verificar colisión con cada opción
    for (let i = 0; i < this.options.length; i++) {
      const optionY = this.y + 80 + i * (Math.max(60, Math.floor(this.height / (this.options.length + 1))) + 20);
      if (
        handX > this.x + 40 &&
        handX < this.x + this.width - 40 &&
        handY > optionY &&
        handY < optionY + Math.max(60, Math.floor(this.height / (this.options.length + 1)))
      ) {
        // Si es una nueva selección, iniciar el temporizador
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          this.selectionStartTime = Date.now();
        }
        // Verificar si se ha mantenido la selección el tiempo suficiente
        if (
          this.selectionStartTime &&
          Date.now() - this.selectionStartTime >= this.selectionThreshold
        ) {
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
