export class Camera {
  constructor() {
    navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
    this.video = document.querySelector('video');

    // Agregar listener para redimensionamiento
    window.addEventListener('resize', () => this.handleResize());
  }

  getVideo() {
    return this.video;
  }

  handleResize() {
    if (!this.webcamStream) return;

    const track = this.webcamStream.getTracks()[0];
    const settings = track.getSettings();
    this.updateDimensions(settings.width, settings.height);
  }

  updateDimensions(sourceWidth, sourceHeight) {
    // Guarda dimensiones del contenedor
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Usa dimensiones del contenedor para asignarle al video y al canvas asi no hay que hacer conversiones
    this.video.width = containerWidth;
    this.video.height = containerHeight;

    const canvas = document.querySelector('canvas');
    canvas.width = containerWidth;
    canvas.height = containerHeight;
  }

  start(canvas) {
    var self = this;
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
        // constraints
        {
          video: true,
          audio: false
        },
        // successCallback
        async function (localMediaStream) {
          self.video.srcObject = localMediaStream;
          self.webcamStream = localMediaStream;

          const { width, height } = self.webcamStream.getTracks()[0].getSettings();
          self.updateDimensions(width, height);
        },
        // errorCallback
        function (err) {
          console.log("The following error occured: " + err);
        });
    } else {
      console.log("getUserMedia not supported");
    }
  }

  stop() {
    this.webcamStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
}