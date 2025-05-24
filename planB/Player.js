export class Player {
  constructor(id) {
    this.id = id;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.vitalEnergy = 100;
    this.foodsCollected = {
      vitalEnergyy: 0,
      unvitalEnergyy: 0,
      gluten: 0
    };
  }

  collectFood(foodType) {
    switch(foodType) {
      case 1: // Saludable
        this.score += 10;
        this.foodsCollected.vitalEnergyy++;
        break;
      case 2: // No saludable
        this.score += 5;
        this.foodsCollected.unvitalEnergyy++;
        break;
      case 3: // Con TACC
        this.score = Math.max(0, this.score - 15);
        this.vitalEnergy = Math.max(0, this.vitalEnergy - 10);
        this.foodsCollected.gluten++;
        break;
    }
  }
}