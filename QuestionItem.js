export class QuestionItem {
  constructor(x, y, question, options, correctAnswer) {
    this.x = x;
    this.y = y;
    this.question = question;
    this.options = options;
    this.correctAnswer = correctAnswer;

    // Configuración de layout
    this.config = {
      width: 500,
      padding: 30,
      borderRadius: 20,
      questionFontSize: 22,
      optionFontSize: 18,
      optionHeight: 50,
      optionSpacing: 15,
      marginTop: 25,
      marginBottom: 25,
      questionMarginBottom: 20
    };

    // Estado de la pregunta
    this.isActive = true;
    this.selectedOption = null;
    this.selectionStartTime = null;
    this.selectionThreshold = 3000; // 3 segundos para seleccionar
    this.feedbackActive = false;
    this.feedbackSelected = null;
    this.feedbackResult = false;

    // Layout calculado
    this.layout = {
      questionLines: [],
      questionHeight: 0,
      totalHeight: 0,
      optionPositions: []
    };

    // Factor de escala para ajustar el tamaño
    this.scaleFactor = 1;

    // Guarda dimensiones originales
    this.originalConfig = {
      width: this.config.width,
      padding: this.config.padding,
      borderRadius: this.config.borderRadius,
      questionFontSize: this.config.questionFontSize,
      optionFontSize: this.config.optionFontSize,
      optionHeight: this.config.optionHeight,
      optionSpacing: this.config.optionSpacing,
      marginTop: this.config.marginTop,
      marginBottom: this.config.marginBottom,
      questionMarginBottom: this.config.questionMarginBottom
    };

    // Cache para el layout de preguntas
    this.layoutCache = null;
  }

  // Calcula el layout completo de la pregunta
  calculateLayout(ctx) {
    ctx.save();
    ctx.font = `bold ${this.config.questionFontSize}px Nunito`;

    // Calcula líneas de la pregunta
    this.layout.questionLines = this.wrapText(ctx, this.question, this.config.width - (this.config.padding * 2));
    this.layout.questionHeight = this.layout.questionLines.length * (this.config.questionFontSize + 6);

    // Calcula altura total
    const optionsHeight = this.options.length * this.config.optionHeight +
      (this.options.length - 1) * this.config.optionSpacing;

    this.layout.totalHeight = this.config.marginTop +
      this.layout.questionHeight +
      this.config.questionMarginBottom +
      optionsHeight +
      this.config.marginBottom;

    // Calcula posiciones de las opciones
    this.layout.optionPositions = [];
    const optionsStartY = this.y + this.config.marginTop + this.layout.questionHeight + this.config.questionMarginBottom;

    for (let i = 0; i < this.options.length; i++) {
      const optionY = optionsStartY + i * (this.config.optionHeight + this.config.optionSpacing);
      this.layout.optionPositions.push({
        x: this.x + this.config.padding,
        y: optionY,
        width: this.config.width - (this.config.padding * 2),
        height: this.config.optionHeight
      });
    }

    ctx.restore();
  }

  // Renderiza la pregunta completa
  draw(ctx) {
    if (!this.isActive) return;

    // Calcula el layout solo si no está calculado
    if (this.layout.totalHeight === 0) {
      this.calculateLayout(ctx);
    }

    // Dibuja el fondo principal
    this.drawBackground(ctx);

    // Dibuja la pregunta
    this.drawQuestion(ctx);

    // Dibuja opciones
    this.drawOptions(ctx);
  }

  // Dibuja el fondo de la pregunta
  drawBackground(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.config.width, this.layout.totalHeight, this.config.borderRadius);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(44,62,80,0.15)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 3;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Dibuja el texto de la pregunta
  drawQuestion(ctx) {
    ctx.save();
    ctx.scale(-1, 1); // Espeja el texto para corregir la orientación
    ctx.font = `bold ${this.config.questionFontSize}px Nunito`;
    ctx.fillStyle = "#2C3E50";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const questionX = -(this.x + this.config.width / 2);
    const questionY = this.y + this.config.marginTop;
    const maxWidth = this.config.width - (this.config.padding * 2);

    this.layout.questionLines.forEach((line, i) => {
      ctx.fillText(
        line,
        questionX,
        questionY + i * (this.config.questionFontSize + 6),
        maxWidth
      );
    });

    ctx.restore();
  }

  // Dibuja todas las opciones
  drawOptions(ctx) {
    this.options.forEach((option, index) => {
      const position = this.layout.optionPositions[index];
      this.drawOption(ctx, option, index, position);
    });
  }

  // Dibuja UNA opción
  drawOption(ctx, optionText, index, position) {
    // Determina colores según el estado
    let backgroundColor, borderColor, textColor;

    if (this.feedbackActive && index === this.feedbackSelected) {
      backgroundColor = this.feedbackResult ? "#4CAF50" : "#F44336";
      borderColor = backgroundColor;
      textColor = "white";
    } else {
      backgroundColor = "rgba(248, 249, 250, 0.9)";
      borderColor = "#dee2e6";
      textColor = "#495057";
    }

    // Dibuja fondo de la opción - chequear que se vea bien, sino cambiar el color o sacarlo
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(position.x, position.y, position.width, position.height, 12);
    ctx.fillStyle = backgroundColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Dibuja texto de la opción
    ctx.save();
    ctx.scale(-1, 1); // Espeja para corregir la orientación
    ctx.fillStyle = textColor;
    ctx.font = `600 ${this.config.optionFontSize}px Nunito`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      optionText,
      -(this.x + this.config.width / 2),
      position.y + position.height / 2,
      position.width - 20
    );
    ctx.restore();

    // Dibuja barra de progreso si está seleccionandose
    if (this.selectedOption === index && this.selectionStartTime && !this.feedbackActive) {
      this.drawProgressBar(ctx, position);
    }
  }

  // Dibuja la barra de progreso de selección
  drawProgressBar(ctx, position) {
    const progress = Math.min((Date.now() - this.selectionStartTime) / this.selectionThreshold, 1);

    ctx.save();

    // Fondo de la barra
    ctx.fillStyle = "rgba(52, 152, 219, 0.1)";
    ctx.fillRect(position.x + 10, position.y + position.height - 8, position.width - 20, 6);

    // Barra de progreso
    ctx.fillStyle = "rgba(52, 152, 219, 0.8)";
    ctx.fillRect(
      position.x + 10,
      position.y + position.height - 8,
      (position.width - 20) * progress,
      6
    );

    ctx.restore();
  }

  // Wrap de texto para que las preguntas se adapten
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    lines.push(currentLine);
    return lines;
  }

  // Verifica colisión con las opciones
  checkCollision(handX, handY, ctx) {
    if (!this.isActive) return false;

    // Asegura que el layout esté calculado
    if (this.layout.totalHeight === 0) {
      this.calculateLayout(ctx);
    }

    // Verifica colisión con cada opción
    for (let i = 0; i < this.layout.optionPositions.length; i++) {
      const position = this.layout.optionPositions[i];

      // Verifica si la mano está dentro del área de la opción
      if (this.isPointInRect(handX, handY, position)) {
        // Si es una nueva selección, inicia el temporizador
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          this.selectionStartTime = Date.now();
        }

        // Verifica si se ha mantenido la selección el tiempo suficiente
        if (this.selectionStartTime &&
          Date.now() - this.selectionStartTime >= this.selectionThreshold) {
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

  // Verifica si un kp está dentro de un rectángulo de pregunta
  isPointInRect(x, y, rect) {
    return x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height;
  }

  // Activa feedback visual
  showFeedback(selectedIndex, isCorrect) {
    this.feedbackActive = true;
    this.feedbackSelected = selectedIndex;
    this.feedbackResult = isCorrect;
  }

  // Resetea feedback
  resetFeedback() {
    this.feedbackActive = false;
    this.feedbackSelected = null;
    this.feedbackResult = false;
    this.selectedOption = null;
    this.selectionStartTime = null;
  }

  // Redimensiona la pregunta segun el espacio disponible
  relocateQuestion(x, y, width) {
    this.x = x;
    this.y = y;
    this.config.width = width;
    this.layout.totalHeight = 0; // Fuerza calculo del layout para que se re-adapte de ser necesario
  }

  // Aplica escala a la pregunta para ajustar el tamaño
  applyScale(scaleFactor) {
    this.scaleFactor = scaleFactor;

    // Aplica escala a todas las dimensiones usando las originales
    this.config.width = this.originalConfig.width * scaleFactor;
    this.config.padding = this.originalConfig.padding * scaleFactor;
    this.config.borderRadius = this.originalConfig.borderRadius * scaleFactor;
    this.config.questionFontSize = this.originalConfig.questionFontSize * scaleFactor;
    this.config.optionFontSize = this.originalConfig.optionFontSize * scaleFactor;
    this.config.optionHeight = this.originalConfig.optionHeight * scaleFactor;
    this.config.optionSpacing = this.originalConfig.optionSpacing * scaleFactor;
    this.config.marginTop = this.originalConfig.marginTop * scaleFactor;
    this.config.marginBottom = this.originalConfig.marginBottom * scaleFactor;
    this.config.questionMarginBottom = this.originalConfig.questionMarginBottom * scaleFactor;

    // Recalcular layout con nueva escala
    this.layout.totalHeight = 0;
  }

  // Limpia el cache del layout
  clearLayoutCache() {
    this.layoutCache = null;
    this.layout.totalHeight = 0;
  }

  // Calcula posiciones de múltiples preguntas
  calculateQuestionsLayout(questions, canvasWidth, canvasHeight, ctx) {
    // Cache para evitar recálculos constantes
    const cacheKey = `${canvasWidth}x${canvasHeight}`;
    if (this.layoutCache && this.layoutCache.key === cacheKey) {
      return this.layoutCache.positions;
    }

    const spacingBetweenQuestions = 20; // Espacio entre preguntas
    const startY = 20; // Margen superior
    const availableHeight = canvasHeight - 40; // Margen inferior y superior

    // LOS PASOS DE ESTO SON IMPORTANTES, NO VOLVER A CAMBIARLOS DE LUGAR
    // 1. Se calcul la altura de cada pregunta SIN escalar (scaleFactor = 1)
    questions.forEach(q => q && q.applyScale(1));
    const questionHeights = questions.map(q => {
      if (!q) return 0;
      q.calculateLayout(ctx);
      return q.layout.totalHeight;
    });

    // 2. Calcula el scaleFactor necesario para que entre todo
    const totalHeight = questionHeights.reduce((sum, height, i) => {
      return sum + height + (i < questionHeights.length - 1 ? spacingBetweenQuestions : 0);
    }, 0);

    let scaleFactor = 1;
    if (totalHeight > availableHeight) {
      scaleFactor = availableHeight / totalHeight;
      scaleFactor = Math.max(0.6, scaleFactor); // Mínimo 60%
    }

    // 3. Aplica el scaleFactor a todas las preguntas y recalcula la altura
    questions.forEach(q => q && q.applyScale(scaleFactor));
    const scaledHeights = questions.map(q => {
      if (!q) return 0;
      q.calculateLayout(ctx);
      return q.layout.totalHeight;
    });

    // 4. Calcula el alto total escalado y centrado verticalmente
    const scaledTotalHeight = scaledHeights.reduce((sum, height, i) => {
      return sum + height + (i < scaledHeights.length - 1 ? spacingBetweenQuestions : 0);
    }, 0);

    let currentY = Math.max(startY, (canvasHeight - scaledTotalHeight) / 2);

    // 5. Calcula posiciones finales
    const positions = questions.map((q, i) => {
      if (q) {
        const x = Math.max(10, canvasWidth * 0.02);
        const y = currentY;
        const width = Math.min(canvasWidth - 20, canvasWidth * 0.96);
        currentY += scaledHeights[i] + spacingBetweenQuestions;
        return { x, y, width };
      }
      return { x, y, width };
    });

    // Guardar en cache
    this.layoutCache = {
      key: cacheKey,
      positions: positions,
      scaleFactor: scaleFactor
    };

    return positions;
  }
}