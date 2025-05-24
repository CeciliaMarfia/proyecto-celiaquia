export class Camera {
  constructor() {
    navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia );
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
    // Obtener dimensiones del contenedor
    const container = document.getElementById('game-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Mantener la relación de aspecto del video
    const videoAspectRatio = sourceWidth / sourceHeight;
    const containerAspectRatio = containerWidth / containerHeight;

    let width, height;
    if (videoAspectRatio > containerAspectRatio) {
      // El video es más ancho que el contenedor
      height = containerHeight;
      width = height * videoAspectRatio;
    } else {
      // El video es más alto que el contenedor
      width = containerWidth;
      height = width / videoAspectRatio;
    }

    // Actualizar dimensiones del video y canvas
    this.video.width = width;
    this.video.height = height;
    
    const canvas = document.querySelector('canvas');
    canvas.width = width;
    canvas.height = height;

    // Centrar el video/canvas si sus dimensiones son diferentes al contenedor
    const xOffset = (containerWidth - width) / 2;
    const yOffset = (containerHeight - height) / 2;
    
    this.video.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    canvas.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
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
        async function(localMediaStream) {
          self.video.srcObject = localMediaStream;
          self.webcamStream = localMediaStream;

          const {width, height} = self.webcamStream.getTracks()[0].getSettings();
          self.updateDimensions(width, height);
        },
        // errorCallback
        function(err) {
          console.log("The following error occured: " + err);
        });
    } else {
      console.log("getUserMedia not supported");
    }  
  }

  stop() {
    this.webcamStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
}
