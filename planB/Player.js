export class Player {
  constructor(id) {
    this.id = id;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.vitalEnergy = 100;
    this.foodsCollected = {
      healthy: 0,
      unhealthy: 0,
      gluten: 0
    };
  }

  collectFood(foodType) {
    switch(foodType) {
      case 1: // food1* (saludable)
        this.score += 10; // 10 puntos por comida tipo food1
        this.vitalEnergy = Math.min(100, this.vitalEnergy + 5);
        this.foodsCollected.healthy++;
        break;
      case 2: // food2* (no saludable)
        this.score += 5; // 5 puntos por comida tipo food2
        this.vitalEnergy = Math.max(0, this.vitalEnergy - 5);
        this.foodsCollected.unhealthy++;
        break;
      case 3: // food3_* (con TACC)
        this.score = Math.max(0, this.score - 10); // Resta 10 puntos por comida tipo food3
        this.vitalEnergy = Math.max(0, this.vitalEnergy - 20);
        this.foodsCollected.gluten++;
        break;
    }
  }
}