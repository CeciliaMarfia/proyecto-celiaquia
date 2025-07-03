export class HandDetector {
    constructor(hand) {
      // Muñeca
      this.wrist = hand.keypoints[0];
      // Pulgar
      this.thumb_cmc = hand.keypoints[1];
      this.thumb_mcp = hand.keypoints[2];
      this.thumb_ip = hand.keypoints[3];
      this.thumb_tip = hand.keypoints[4];
      // Índice
      this.index_mcp = hand.keypoints[5];
      this.index_pip = hand.keypoints[6];
      this.index_dip = hand.keypoints[7];
      this.index_tip = hand.keypoints[8];
      // Dedo medio
      this.middle_mcp = hand.keypoints[9];
      this.middle_pip = hand.keypoints[10];
      this.middle_dip = hand.keypoints[11];
      this.middle_tip = hand.keypoints[12];
      // Anular
      this.ring_mcp = hand.keypoints[13];
      this.ring_pip = hand.keypoints[14];
      this.ring_dip = hand.keypoints[15];
      this.ring_tip = hand.keypoints[16];
      // Meñique
      this.pinky_mcp = hand.keypoints[17];
      this.pinky_pip = hand.keypoints[18];
      this.pinky_dip = hand.keypoints[19];
      this.pinky_tip = hand.keypoints[20];
    }

  // Devuelve todos los keypoints con un array
  getKeypoints() {
    return [
      this.wrist,
      this.thumb_cmc, this.thumb_mcp, this.thumb_ip, this.thumb_tip,
      this.index_mcp, this.index_pip, this.index_dip, this.index_tip,
      this.middle_mcp, this.middle_pip, this.middle_dip, this.middle_tip,
      this.ring_mcp, this.ring_pip, this.ring_dip, this.ring_tip,
      this.pinky_mcp, this.pinky_pip, this.pinky_dip, this.pinky_tip,
    ];
  }
}