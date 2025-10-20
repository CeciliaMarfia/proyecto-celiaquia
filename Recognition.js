var detectorPoses, detectorHands;

export async function loadPoseNet(model, detectorConfig) {
  try {
    detectorPoses = await poseDetection.createDetector(model, detectorConfig);
    console.log("Detector de poses creado exitosamente");
  } catch (error) {
    console.error("Error al crear detector de poses:", error);
    throw error;
  }
}

export async function loadHandNet(model, detectorConfig) {
  try {
    detectorHands = await handPoseDetection.createDetector(model, detectorConfig);
    console.log("Detector de manos creado exitosamente");
  } catch (error) {
    console.error("Error al crear detector de manos:", error);
    throw error;
  }
}

export function estimatePoses(image) {
  if (!detectorPoses) {
    console.error("Detector de poses no inicializado");
    return [];
  }
  return detectorPoses.estimatePoses(image);
}

export function estimateHands(image, estimationConfig) {
  if (!detectorHands) {
    console.error("Detector de manos no inicializado");
    return [];
  }
  return detectorHands.estimateHands(image, estimationConfig);
}