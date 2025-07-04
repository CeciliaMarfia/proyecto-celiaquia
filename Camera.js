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
    const container = document.getElementById('video-wrapper');
    container.style.width = sourceWidth + 'px';
    container.style.height = sourceHeight + 'px';

    this.video.width = sourceWidth;
    this.video.height = sourceHeight;

    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      canvas.style.width = sourceWidth + 'px';
      canvas.style.height = sourceHeight + 'px';
    }
  }


  start(canvasInstance) {
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

          // El contenedor se va a adaptar al tamaño del video
          self.video.addEventListener('loadedmetadata', () => {
            self.updateDimensions(self.video.videoWidth, self.video.videoHeight);
          });
        },
        // errorCallback
        function (err) {
        });
    }
  }

  stop() {
    this.webcamStream.getTracks().forEach(function (track) {
      track.stop();
    });
  }
}