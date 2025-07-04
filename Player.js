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
      case 1: // food1* (saludable)
        this.score += 10; // 10 puntos por comida tipo food1
        this.foodsCollected.healthy++;
        break;
      case 2: // food2* (no saludable) - comportamiento diferente por etapa
        if (currentStage === 1) {
          // Etapa 1: Sin TACC no saludables suman puntos
          this.score += 5;
        } else if (currentStage === 2) {
          // Etapa 2: Sin TACC no saludables restan pocos puntos
          this.score = Math.max(0, this.score - 3);
        }
        this.foodsCollected.unhealthy++;
        break;
      case 3: // food3_* (con TACC)
        this.score = Math.max(0, this.score - 10); // Resta 10 puntos por comida tipo food3
        this.foodsCollected.gluten++;
        break;
    }
  }
}
