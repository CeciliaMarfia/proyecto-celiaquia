export class QuestionItem {
  constructor(x, y, question, options = [], correctAnswer = 0) {
    this.x = x || 0;
    this.y = y || 0;
    this.question = question || "";
    this.options = options;
    this.correctAnswer = correctAnswer;

    this.config = {
      width: 0,
      padding: 20,
      radius: 16,
      questionFont: 24,
      optionFont: 18,
      optionSpacing: 8,
      optionMinHeight: 55,
      optionHorizontalPadding: 16,
      selectionThreshold: 3000,
    };

    // Estado
    this.isActive = true;
    this.selectedOption = null;
    this.selectionStartTime = null;
    this.feedbackActive = false;
    this.feedbackSelected = null;
    this.feedbackResult = false;

    // Layout calculado por draw
    this._optionRects = [];
    this.layoutCache = null;
    this.layout = { totalHeight: 0 };
  }

  clearLayoutCache() {
    this.layoutCache = null;
    this.layout.totalHeight = 0;
    this._optionRects = [];
  }

  calculateLayout(ctx) {
    if (!ctx || !ctx.canvas) return;
    const canvas = ctx.canvas;
    const cw = canvas.width;

    const width =
      this.config.width > 0 ? this.config.width : Math.floor(cw * 0.85);
    this.config.width = width;

    const qFont = Math.max(
      18,
      Math.min(this.config.questionFont, Math.floor(width / 18))
    );
    ctx.save();
    ctx.font = `bold ${qFont}px "Segoe UI", Arial, sans-serif`;
    const maxTextWidth = width - this.config.padding * 2;
    const questionLines = this._wrapTextLines(ctx, this.question, maxTextWidth);
    const questionHeight = questionLines.length * (qFont + 8);
    ctx.restore();

    ctx.font = `${this.config.optionFont}px "Segoe UI", Arial, sans-serif`;
    const optionHeights = this.options.map((opt) => {
      const lines = this._wrapTextLines(
        ctx,
        opt,
        width - this.config.padding * 2 - this.config.optionHorizontalPadding * 2 - 50
      );
      const lineHeight = this.config.optionFont + 7;
      const h = Math.max(
        this.config.optionMinHeight,
        lines.length * lineHeight + 20
      );
      return { lines, height: h };
    });

    const optionsTotalHeight =
      optionHeights.reduce((s, o) => s + o.height, 0) +
      (this.options.length - 1) * this.config.optionSpacing;

    const totalHeight =
      this.config.padding +
      questionHeight +
      16 +
      optionsTotalHeight +
      this.config.padding;
    this.layout.totalHeight = totalHeight;
    this.layout.optionHeights = optionHeights;

    this.layoutCache = { key: `${cw}x${canvas.height}` };
  }

  draw(ctx) {
    if (!this.isActive) return;

    const canvas = ctx && ctx.canvas;
    const cw = canvas ? canvas.width : this.config.width || 800;
    const ch = canvas ? canvas.height : 600;

    const width =
      this.config.width > 0 ? this.config.width : Math.floor(cw * 0.95);
    const x = Math.floor((cw - width) / 2);
    const maxCardHeight = Math.floor(ch * 0.98);

    const qFont = Math.max(
      18,
      Math.min(this.config.questionFont, Math.floor(width / 18))
    );
    const oFont = Math.max(
      17,
      Math.min(this.config.optionFont, Math.floor(width / 24))
    );

    ctx.save();
    ctx.font = `bold ${qFont}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = "#222";

    const maxTextWidth = width - this.config.padding * 2;
    const questionLines = this._wrapTextLines(ctx, this.question, maxTextWidth);
    const questionHeight = questionLines.length * (qFont + 8);

    let optionHeights = this.layout.optionHeights;
    if (!optionHeights) {
      ctx.font = `${oFont}px "Segoe UI", Arial, sans-serif`;
      optionHeights = this.options.map((opt) => {
        const lines = this._wrapTextLines(
          ctx,
          opt,
          maxTextWidth - this.config.optionHorizontalPadding * 2 - 50
        );
        const lineHeight = oFont + 7;
        const h = Math.max(
          this.config.optionMinHeight,
          lines.length * lineHeight + 20
        );
        return { lines, height: h };
      });
      this.layout.optionHeights = optionHeights;
    }

    const optionsTotalHeight =
      optionHeights.reduce((s, o) => s + o.height, 0) +
      (this.options.length - 1) * this.config.optionSpacing;

    let totalHeight =
      this.config.padding +
      questionHeight +
      16 +
      optionsTotalHeight +
      this.config.padding;
    totalHeight = Math.min(totalHeight, maxCardHeight);

    const y = Math.floor((ch - totalHeight) / 2);

    ctx.save();
    ctx.translate(x + width, y);
    ctx.scale(-1, 1);

    ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    ctx.beginPath();
    this._roundRect(ctx, 0, 0, width, totalHeight, this.config.radius);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, totalHeight);
    gradient.addColorStop(0, "#FFFBF5");
    gradient.addColorStop(1, "#FFF5E8");
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(230, 200, 150, 0.4)";
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = "#2D2D2D";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `bold ${qFont}px "Segoe UI", Arial, sans-serif`;
    let currentY = this.config.padding;
    const textX = this.config.padding;
    
    questionLines.forEach((line) => {
      ctx.fillText(line, textX, currentY);
      currentY += qFont + 8;
    });

    currentY += 12;

    this._optionRects = [];
    
    for (let i = 0; i < this.options.length; i++) {
      const optInfo = optionHeights[i];
      const ow = width - this.config.padding * 2;
      const oh = optInfo.height;
      const ox = x + textX;
      const oy = y + currentY;

      this._optionRects[i] = { x: ox, y: oy, width: ow, height: oh };

      ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      this._roundRect(ctx, textX, currentY, ow, oh, 12);
      
      // Colores según estado
      if (this.feedbackActive && i === this.feedbackSelected) {
        if (this.feedbackResult) {
          const correctGradient = ctx.createLinearGradient(textX, currentY, textX, currentY + oh);
          correctGradient.addColorStop(0, "#6FCF97");
          correctGradient.addColorStop(1, "#5BB77D");
          ctx.fillStyle = correctGradient;
        } else {
          const incorrectGradient = ctx.createLinearGradient(textX, currentY, textX, currentY + oh);
          incorrectGradient.addColorStop(0, "#EB5757");
          incorrectGradient.addColorStop(1, "#D94545");
          ctx.fillStyle = incorrectGradient;
        }
      } else if (this.selectedOption === i && !this.feedbackActive) {
        // Gris clarito cuando está siendo seleccionada
        ctx.fillStyle = "#F5F5F5";
      } else {
        ctx.fillStyle = "#FFFFFF";
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.selectedOption === i && !this.feedbackActive 
        ? "rgba(180, 180, 180, 0.4)" 
        : "rgba(220, 200, 170, 0.3)";
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Texto de la opción
      ctx.fillStyle = this.feedbackActive && i === this.feedbackSelected ? "#FFF" : "#2D2D2D";
      ctx.font = `${oFont}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      const lines = optInfo.lines;
      let ty = currentY + (oh - (lines.length * (oFont + 7) - 7)) / 2;
      const textLeft = textX + this.config.optionHorizontalPadding;
      const textMaxW = ow - this.config.optionHorizontalPadding * 2 - 40;
      
      lines.forEach((ln) => {
        ctx.fillText(ln, textLeft, ty, textMaxW);
        ty += oFont + 7;
      });

      // Indicador circular a la derecha
      const circleX = textX + ow - 20;
      const circleY = currentY + oh / 2;
      
      ctx.beginPath();
      ctx.arc(circleX, circleY, 12, 0, 2 * Math.PI);
      
      if (this.selectedOption === i && !this.feedbackActive) {
        ctx.fillStyle = "#64B5F6";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#FFFFFF";
        ctx.stroke();
        
        // Checkmark interior
        ctx.beginPath();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.moveTo(circleX - 4, circleY);
        ctx.lineTo(circleX - 1, circleY + 3);
        ctx.lineTo(circleX + 4, circleY - 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(200, 180, 150, 0.5)";
        ctx.stroke();
      }

      // Barra de progreso mejorada
      if (this.selectedOption === i && this.selectionStartTime && !this.feedbackActive) {
        const progress = Math.min(
          (Date.now() - this.selectionStartTime) / this.config.selectionThreshold,
          1
        );
        
        // Fondo de la barra
        ctx.fillStyle = "rgba(200, 200, 200, 0.2)";
        ctx.beginPath();
        this._roundRect(ctx, textX + 8, currentY + oh - 10, ow - 16, 4, 2);
        ctx.fill();
        
        // Progreso
        const progressGradient = ctx.createLinearGradient(
          textX + 8,
          0,
          textX + 8 + (ow - 16) * progress,
          0
        );
        progressGradient.addColorStop(0, "#4FC3F7");
        progressGradient.addColorStop(1, "#29B6F6");
        ctx.fillStyle = progressGradient;
        ctx.beginPath();
        this._roundRect(ctx, textX + 8, currentY + oh - 10, (ow - 16) * progress, 4, 2);
        ctx.fill();
      }

      currentY += oh + this.config.optionSpacing;
    }

    ctx.restore();

    this.x = x;
    this.y = y;
    this.config.width = width;
    this.config._totalHeight = totalHeight;
  }

  checkCollision(handX, handY, ctx) {
    if (!this.isActive) return false;
    if (!this._optionRects || this._optionRects.length === 0) return false;

    for (let i = 0; i < this._optionRects.length; i++) {
      const r = this._optionRects[i];
      if (
        handX >= r.x &&
        handX <= r.x + r.width &&
        handY >= r.y &&
        handY <= r.y + r.height
      ) {
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          this.selectionStartTime = Date.now();
        }

        if (
          this.selectionStartTime &&
          Date.now() - this.selectionStartTime >= this.config.selectionThreshold
        ) {
          return true;
        }
        return false;
      }
    }

    this.selectedOption = null;
    this.selectionStartTime = null;
    return false;
  }

  relocateQuestion(x, y, width) {
    if (typeof x === "number") this.x = x;
    if (typeof y === "number") this.y = y;
    if (typeof width === "number" && width > 0) this.config.width = width;
    this._optionRects = [];
  }

  showFeedback(selectedIndex, isCorrect) {
    this.feedbackActive = true;
    this.feedbackSelected = selectedIndex;
    this.feedbackResult = !!isCorrect;
  }

  resetFeedback() {
    this.feedbackActive = false;
    this.feedbackSelected = null;
    this.feedbackResult = false;
    this.selectedOption = null;
    this.selectionStartTime = null;
  }

  _wrapTextLines(ctx, text, maxWidth) {
    if (!text) return [""];
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + " " + words[i] : words[i];
      const w = ctx.measureText(test).width;
      if (w > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  _roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}