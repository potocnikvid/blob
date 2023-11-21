let fft;
let audio;
let volume = 0.5;
let easycam;
let font;
let waveformHistory = [];
let tunnelLength = 5; // The maximum number of waveform frames to store
let angleSpacing; // To be calculated based on the waveform length
let dispersalSlider;
let volumeSlider;
let lengthSlider;
let detailSlider;
let particleSizeSlider;
let particleSizeDispSlider;
let ringSizeSlider;
let hueSlider;
let spacingSlider;
let songSelect;
let width = window.innerWidth;
let height = window.innerHeight;

// Variable to hold the starting hue value, which will be animated over time
let startHue = 0;
let hueRange = 90; // 1/3 of the full 360° hue range for a full rainbow


function preload() {
  audio = loadSound("./assets/baiana.mp3");
  font = loadFont("./assets/Inconsolata-Medium.ttf");
}

function setup() {
  createCanvas(width, height, WEBGL);
  let initDistance = (width + height) / 7; // This is a simplistic approach
  easycam = createEasyCam().setDistance(initDistance);
  
  fft = new p5.FFT();
  audio.loop();

  textFont(font, 12);

  // Create a slider to control the volume
  volumeSlider = createSlider(0, 1, volume, 0.01);
  volumeSlider.position(20, 25);
  
  // Create a slider to control the dispersal of the waveform
  dispersalSlider = createSlider(1, 3, 1.5, 0.1);
  dispersalSlider.position(20, 70);

  // Create a slider to control the length of the waveform
  lengthSlider = createSlider(1, 100, 10, 5);
  lengthSlider.position(20, 115);

  // Create a slider to control the detail of the waveform
  detailSlider = createSlider(1, 20, 18, 1);
  detailSlider.position(20, 160);

  // Create a slider to control the mean size of the particles
  particleSizeSlider = createSlider(1, 15, 5, 1);
  particleSizeSlider.position(20, 205);

  // Create a slider to control the dispersal of the particle size
  particleSizeDispSlider = createSlider(-1, 1, 0, 0.1);
  particleSizeDispSlider.position(20, 250);

  // Create a sider to control the ring size
  ringSizeSlider = createSlider(0.5, 2, 1, 0.1);
  ringSizeSlider.position(20, 295);

  // Create a slider to control the hue range
  hueSlider = createSlider(0, 360, 90, 1);
  hueSlider.position(20, 340);

  // Create a slider to control the spacing
  spacingSlider = createSlider(0, 100, 20, 1);
  spacingSlider.position(20, 385);
  
  // Create a button to select a song
  songSelect = createSelect();
  songSelect.position(width/2 - 100,20);
  songSelect.option('Baiana', ['baiana']);
  songSelect.option('Carambolage', ['carambolage']);
  songSelect.option('Dexter', ['dexter']);
  songSelect.option('Drava', ['drava']);
  songSelect.option('Eventually', ['eventually']);
  songSelect.option('Gymnopedie', ['gymnopedie']);
  songSelect.option('Its That Time', ['itsthattime']);
  songSelect.option('Lost', ['lost']);
  songSelect.option('Moje Milo', ['mojemilo']);
  songSelect.option('Not', ['not']);
  songSelect.option('Neskoncno dolgi objemi', ['objemi']);
  songSelect.option('Looking at you pager', ['pager']);
  songSelect.option('Rumble', ['rumble']);
  songSelect.option('Style', ['style']);
  songSelect.option('Everybody loves the sunshine', ['sunshine']);
  songSelect.option('Tobogan', ['tobogan']);
  songSelect.changed(mySelectEvent);
}
function mySelectEvent() {
  audio.pause();
  audio = loadSound("./assets/" + songSelect.value() + ".mp3");
  audio.loop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  easycam.setViewport([0, 0, windowWidth, windowHeight]);

  // Update the camera distance based on the new window size.
  let newDistance = (windowWidth + windowHeight) / 6; // Adjust this formula as needed
  easycam.setDistance(newDistance);
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    audio.jump(audio.currentTime() - 5);
  } else if (keyCode === RIGHT_ARROW) {
    audio.jump(audio.currentTime() + 5);
  } else if (keyCode === UP_ARROW) {
    volume += 0.1;
    audio.setVolume(volume);
    volumeSlider.value(volume);
  } else if (keyCode === DOWN_ARROW) {
    volume -= 0.1;
    audio.setVolume(volume);
    volumeSlider.value(volume);
  } else if (keyCode === ENTER) {
    if (audio.isPlaying()) {
      audio.pause();
      noLoop();
    } else {
      audio.play();
      loop();
    }
  } else if (keyCode === 32) {
    audio.jump(0);
  }
}


function draw() {
  background(0);

  fill(255);
  stroke(255);



  // Set the volume based on the slider value
  volume = volumeSlider.value()
  audio.setVolume(volume);

  // Set the dispersal based on the slider value
  let dispersal = dispersalSlider.value();

  // Set the length based on the slider value
  let tunnelLength = lengthSlider.value();
  if (waveformHistory.length > tunnelLength) {
    waveformHistory.splice(0, 1);
  }

  // Set the detail based on the slider value
  let detail = map(detailSlider.value(), 1, 20, 20, 1);

  // Set the particle size based on the slider value
  let particleSize = particleSizeSlider.value()

  // Set the particle size dispersal based on the slider value
  let particleSizeDisp = particleSizeDispSlider.value()

  // Set the ring size based on the slider value
  let ringSize = ringSizeSlider.value()

  // Set the hue range based on the slider value
  let hueRange = hueSlider.value()

  // Set the spacing based on the slider value
  let spacing = spacingSlider.value()

  fill(0)
  stroke(0);
  // Set the color mode to HSB with a range of 360 for hue, 100 for saturation and brightness
  colorMode(HSB, 360, 100, 100); // Set color mode to HSB
  translate(0, 0, -width / 2); // Offset the view
  // Get the current waveform and add to the front of the history
  let waveform = fft.waveform();
  waveformHistory.unshift(waveform); // Add current waveform to the beginning of the array

  // Limit the history size, removing the oldest at the end of the array
  if (waveformHistory.length > tunnelLength) {
    waveformHistory.pop();
  }

  // Calculate the angle spacing based on the length of the waveform array
  angleSpacing = TWO_PI / waveform.length;

  // Animate the start hue to cycle through the rainbow
  startHue += 1;
  if (startHue > 360) {
    startHue = 0; // Reset the hue to cycle again
  }

  // Go through waveform history from oldest to newest
  for (let i = waveformHistory.length - 1; i >= 0; i--) {
    let historyWaveform = waveformHistory[i];

    // Map the history index to a hue value within the current hue range
    let hueValue =
      (startHue + map(i, 0, waveformHistory.length - 1, 0, hueRange)) % 360;

    for (let j = 0; j < historyWaveform.length; j += detail) {
      let r = map(historyWaveform[j], -1, 1, 150/dispersal*ringSize, 250*dispersal*ringSize);
      let angle = j * angleSpacing;
      let x = r * cos(angle);
      let y = r * sin(angle);
      let z = (waveformHistory.length - i) * spacing; // Place older waveforms further back

      push(); // Save the current state of rotation and translation
      translate(x, y, z);
      let boxSize = map(historyWaveform[j], -1, 1, particleSize - particleSize*particleSizeDisp, particleSize + particleSize*particleSizeDisp); // Size of the box
      fill(hueValue, 255 - boxSize * 10, 100);
      box(boxSize); // Draw the box with the specified size
      pop(); // Restore the
    }


  

  }

  //   push();
  // fill(220);
  // translate(0, 0, -102);
  // box(224, 264, 200);
  // pop();

  // fill(120);
  // ellipse(0, -20, 100, 100);
  // fill(60);
  // ellipse(0, -20, 40, 40);
  // fill(120);
  // rect(-28, 50, 56, 14);
  // ellipse(54, -20, 5, 5);
  // ellipse(-54, -20, 5, 5);
  // ellipse(-28, -66, 5, 5);
  // ellipse(28, -66, 5, 5);
  // ellipse(-28, 26, 5, 5);
  // ellipse(28, 26, 5, 5);
}




