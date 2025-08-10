export class Player {
  constructor(id) {
    this.id = id;
    this.score = 0;
    this.foodsCollected = {
      healthy: 0,
      unhealthy: 0,
      gluten: 0,
    };
    this.correctQuestions = 0;
  }

  reset() {
    this.score = 0;
    this.foodsCollected = {
      healthy: 0,
      unhealthy: 0,
      gluten: 0,
    };
    this.correctQuestions = 0;
  }

  collectFood(foodType, currentStage) {
    // si no funciona bien, poner currentStage = 1 como parametro
    switch (foodType) {
      case 1: // healthySTACC
        if (currentStage === 1) {
          this.score += 10;
        } else if (currentStage === 2) {
          this.score += 7;
        }
        this.foodsCollected.healthy++;
        break;
      case 2: // unhealthySTACC
        if (currentStage === 1) {
          this.score += 3;
        } else if (currentStage === 2) {
          this.score = Math.max(0, this.score - 10);
        }
        this.foodsCollected.unhealthy++;
        break;
      case 3: // CTACC (solo aparece en etapa 1)
        this.score = Math.max(0, this.score - 10);
        this.foodsCollected.gluten++;
        break;
    }
  }
}
