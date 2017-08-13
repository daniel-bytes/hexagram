function appCanvas(canvas, video) {
  const ctx = canvas.getContext('2d');
  const back = document.createElement('canvas');
  const backcontext = back.getContext('2d');

  const context = new (window.AudioContext || window.webkitAudioContext)();
  const tuna = new Tuna(context);
  const bitcrusher = new tuna.Bitcrusher();
  const gainNode = context.createGain();
  
  gainNode.gain.value = 1;              
  bitcrusher.bypass = 1;

  const source = context.createMediaElementSource(video);
  source.connect(gainNode);
  gainNode.connect(bitcrusher);
  bitcrusher.connect(context.destination);

  const settings = {
    rotation: 0,
    clicked: false,
    clickPos: {
      x: 0,
      y: 0
    }
  };

  video.addEventListener('loadedmetadata', loadMetadata);
  video.addEventListener('play', draw);

  canvas.addEventListener('click', click);
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('touchstart', mouseDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('touchmove', mouseDown);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('touchend', mouseDown);

  function loadMetadata() {
    canvas.width = back.width = video.videoWidth;
    canvas.height = back.height = video.videoHeight;
  }

  function updateBitcrusher() {
    if (settings.clicked) {
      bitcrusher.bypass = 0;// - ( settings.clickPos.x * settings.clickPos.y );
      bitcrusher.bits = 16 - ( ( ( settings.clickPos.x * 16 ) % 8 ) + 4 );
      bitcrusher.normfreq = settings.clickPos.y;
      bitcrusher.bufferSize = ( settings.clickPos.x * settings.clickPos.y * 16384 ) + 256;  //256 to 16384
    }
    else {
      bitcrusher.bypass = 1;
    }
  }

  function mouseDown(e) {
    settings.clicked = true;
    settings.clickPos.x = e.clientX / canvas.height;
    settings.clickPos.y = e.clientY / canvas.width;

    updateBitcrusher();
  }

  function mouseMove(e) {
    if (!settings.clicked) return;

    settings.clickPos.x = e.clientX / canvas.height;
    settings.clickPos.y = e.clientY / canvas.width;

    updateBitcrusher();
  }

  function mouseUp(e) {
    settings.clicked = false;
    
    updateBitcrusher();
  }

  function click(e) {
    settings.rotation += 1;
  }

  function convertPixelData(pixelData) {
    for(var i = 0; i < pixelData.length; i+=4) {
      var r = pixelData[i];
      var g = pixelData[i+1];
      var b = pixelData[i+2];
      var bw = (3*r+4*g+b)>>>3;
      var rgb = [r, g, b];
      var mod4 = settings.rotation % 4;

      pixelData[i] = mod4 == 0 ? bw : rgb[settings.rotation % 3];
      pixelData[i+1] = mod4 == 0 ? bw : rgb[(settings.rotation + 1) % 3];
      pixelData[i+2] = mod4 == 0 ? bw : rgb[(settings.rotation + 2) % 3];
    }

    return pixelData;
  }

  function draw() {
    if ( video.paused || video.ended ) return;

    backcontext.drawImage(
      video, 
      0, 
      0, 
      video.clientWidth, 
      video.clientHeight);

    // Grab the pixel data from the backing canvas
    var imageData = backcontext.getImageData(0,0, video.clientWidth, video.clientHeight);

    if (settings.clicked) {
      var glitchParams = {
        seed: 1,
        quality: ( ( settings.clickPos.y * 200 ) % 80 ) + 20,
        amount:  ( ( settings.clickPos.x * 200 ) % 80 ) + 20,
        iterations: 1
      };

      glitch(glitchParams)
        .fromImageData( imageData )
        .toImageData()
        .then( function( newImageData ) {
          ctx.putImageData(newImageData, 0, 0);
          var glitchedImg = new Image();
          requestAnimationFrame( draw );
        } );
    }
    else {
      imageData.data = convertPixelData(imageData.data);
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame( draw );
    }
  }
}

window.addEventListener('load', function() {
  appCanvas(
    document.getElementById('canvas'),
    document.getElementById('video')
  )
})