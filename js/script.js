var m_analyzer;
var m_renderer;
// var m_mouse;
var blob_lh_renderer;
var blob_rh_renderer;
var blob_lf_renderer;
var blob_rf_renderer;
var blob_head_renderer;
var blob_renderer;
var m_render_queue = [];
var m_blob;
var m_pbr;
var m_light;
var m_ctrl;
var m_device_checker;
var poseLandmarks = {
  left_hand: undefined,
  right_hand: undefined,
  head: undefined,
  left_foot: undefined,
  right_foot: undefined,
  body: undefined,
};

var noise = new Noise(Math.random());

const video = document.getElementsByClassName("input_video")[0];
const out = document.getElementsByClassName("output")[0];
const canvasCtx5 = out.getContext("2d");

function zColor(data) {
  const z = clamp(data.from.z + 0.5, 0, 1);
  return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}
function calculateAveragePoint(points) {
  if (points.length === 0) {
      return null; // Return null if the array is empty
  }
  let totalPoints = points.length;
  
  let totalX = 0, totalY = 0, totalZ = 0; totalVisibility = 0;

  points = points.filter(point => point); // Remove any null elements

  // Sum up the x, y, and z coordinates
  points.forEach(point => {
      totalX += point.x;
      totalY += point.y;
      totalZ += point.z;
      totalVisibility += point.visibility;
  });

  // Calculate the average for each coordinate
  let averageX = totalX / points.length;
  let averageY = totalY / points.length;
  let averageZ = totalZ / points.length;
  let averageVisibility = totalVisibility / totalPoints;

  // Return the average point
  return { x: averageX, y: averageY, z: averageZ, visibility: averageVisibility };
}
function onResultsPose(results) {
  poseLandmarks.head = calculateAveragePoint([
    results.poseLandmarks[0],
    results.poseLandmarks[1],
    results.poseLandmarks[2],
    results.poseLandmarks[3],
    results.poseLandmarks[4],
    results.poseLandmarks[5],
    results.poseLandmarks[6],
    results.poseLandmarks[7],
    results.poseLandmarks[8],
    results.poseLandmarks[9],
    results.poseLandmarks[10]
  ]);
  poseLandmarks.left_hand = calculateAveragePoint([
    results.poseLandmarks[15],
    results.poseLandmarks[17],
    results.poseLandmarks[19],
    results.poseLandmarks[21]
  ]);
  poseLandmarks.right_hand = calculateAveragePoint([
    results.poseLandmarks[16],
    results.poseLandmarks[18],
    results.poseLandmarks[20],
    results.poseLandmarks[22]
  ]);
  poseLandmarks.left_foot = calculateAveragePoint([
    results.poseLandmarks[27],
    results.poseLandmarks[29],
    results.poseLandmarks[31]
  ]);
  poseLandmarks.right_foot = calculateAveragePoint([
    results.poseLandmarks[28],
    results.poseLandmarks[30],
    results.poseLandmarks[32]
  ]);
  poseLandmarks.body = calculateAveragePoint([
    results.poseLandmarks[11],
    results.poseLandmarks[12],
    results.poseLandmarks[13],
    results.poseLandmarks[14],
    results.poseLandmarks[23],
    results.poseLandmarks[24],
    results.poseLandmarks[25],
    results.poseLandmarks[26]
  ]);

  document.body.classList.add("loaded");
  canvasCtx5.save();
  canvasCtx5.clearRect(0, 0, out.width, out.height);
  canvasCtx5.drawImage(results.image, 0, 0, out.width, out.height);
  drawConnectors(canvasCtx5, results.poseLandmarks, POSE_CONNECTIONS, {
    color: (data) => {
      const x0 = out.width * data.from.x;
      const y0 = out.height * data.from.y;
      const x1 = out.width * data.to.x;
      const y1 = out.height * data.to.y;

      const z0 = clamp(data.from.z + 0.5, 0, 1);
      const z1 = clamp(data.to.z + 0.5, 0, 1);

      const gradient = canvasCtx5.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
      gradient.addColorStop(1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
      return gradient;
    },
  });
  drawLandmarks(
    canvasCtx5,
    Object.values(POSE_LANDMARKS_LEFT).map(
      (index) => results.poseLandmarks[index]
    ),
    { color: zColor, fillColor: "#FF0000" }
  );
  drawLandmarks(
    canvasCtx5,
    Object.values(POSE_LANDMARKS_RIGHT).map(
      (index) => results.poseLandmarks[index]
    ),
    { color: zColor, fillColor: "#00FF00" }
  );
  drawLandmarks(
    canvasCtx5,
    Object.values(POSE_LANDMARKS_NEUTRAL).map(
      (index) => results.poseLandmarks[index]
    ),
    { color: zColor, fillColor: "#AAAAAA" }
  );
  canvasCtx5.restore();
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
  },
});
pose.onResults(onResultsPose);

const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 480,
  height: 480,
});
camera.start();

var init = function () {
  // device_checker
  m_device_checker = new DeviceChecker();
  var _is_mobile = m_device_checker.is_mobile();
  var _is_retina = m_device_checker.is_retina();

  // init audio input analyzer
  m_analyzer = new AudioAnalyzer();
  // init mouse handler
  // m_mouse = new MouseHandler();
  // m_mouse.register_dom_events(document.body);

  // init shared renderer
  var _is_perspective = true;
  m_renderer = new ThreeSharedRenderer(_is_perspective);
  m_renderer.append_renderer_to_dom(document.body);

  m_renderer.renderer.autoClear = true;

  // init pbr
  m_pbr = new ThreePBR();
  // init light
  m_light = new ThreePointLight();

  x = 0.5;
  y = 0.5;
  scale = 0.3;

  // // init blob left hand
  // m_blob_lh = new NoiseBlob(new Noise(Math.random()), m_renderer, m_analyzer, m_light);
  // m_blob_lh.set_PBR(m_pbr);
  // m_blob_lh.set_position(-1 + x, 0.5 + y, 0, scale);

  // if (_is_retina) m_blob_lh.set_retina();
  // blob_lh_renderer = [m_blob_lh.update.bind(m_blob_lh)];


  // // init blob right hand
  // m_blob_rh = new NoiseBlob(new Noise(Math.random()), m_renderer, m_analyzer, m_light);
  // m_blob_rh.set_PBR(m_pbr);
  // m_blob_rh.set_position(1 + x, 0.5 + y, 0, scale);
  
  // if (_is_retina) m_blob_rh.set_retina();
  // blob_rh_renderer = [m_blob_rh.update.bind(m_blob_rh)];


  // // init blob left foot
  // m_blob_lf = new NoiseBlob(new Noise(Math.random()), m_renderer, m_analyzer, m_light);
  // m_blob_lf.set_PBR(m_pbr);
  // m_blob_lf.set_position(-0.5 + x, -0.5 + y, 0, scale);

  // if (_is_retina) m_blob_lf.set_retina();
  // blob_lf_renderer = [m_blob_lf.update.bind(m_blob_lf)];


  // // init blob right foot
  // m_blob_rf = new NoiseBlob(new Noise(Math.random()), m_renderer, m_analyzer, m_light);
  // m_blob_rf.set_PBR(m_pbr);
  // m_blob_rf.set_position(0.5 + x, -0.5 + y, 0, scale);

  // if (_is_retina) m_blob_rf.set_retina();
  // blob_rf_renderer = [m_blob_rf.update.bind(m_blob_rf)];


  // // init blob head
  // m_blob_head = new NoiseBlob(new Noise(Math.random()), m_renderer, m_analyzer, m_light);
  // m_blob_head.set_PBR(m_pbr);
  // m_blob_head.set_position(0 + x, 1.5 + y, 0, scale);

  // if (_is_retina) m_blob_head.set_retina();
  // blob_head_renderer = [m_blob_head.update.bind(m_blob_head)];

  // init blob
  m_blob = new NoiseBlob(new Noise(Math.random()), m_renderer, m_analyzer, m_light);
  m_blob.set_PBR(m_pbr);
  m_blob.set_position(0 + x, 0.5 + y, 0, scale * 2);

  if (_is_retina) m_blob.set_retina();
  blob_renderer = [m_blob.update.bind(m_blob)];


  // init gui
  m_ctrl = new Ctrl([m_blob, m_blob], m_light, m_pbr, m_analyzer);
};

var update = function () {
  requestAnimationFrame(update);

  // update audio analyzer
  m_analyzer.update();
  // m_analyzer.debug(document.getElementsByTagName("canvas")[0]);

  m_renderer.renderer.autoClear = true;

  movement = 1;
  
  // m_blob_lh.update_PBR();
  // if (poseLandmarks.left_hand && poseLandmarks.left_hand.visibility > 0.7)
  //   m_blob_lh.update_position(-poseLandmarks.left_hand.x*movement, -poseLandmarks.left_hand.y*movement);
  // m_renderer.render(blob_lh_renderer);

  // m_renderer.renderer.autoClear = false;

  // m_blob_rh.update_PBR();
  // if (poseLandmarks.right_hand && poseLandmarks.left_hand.visibility > 0.7)
  //   m_blob_rh.update_position(-poseLandmarks.right_hand.x*movement, -poseLandmarks.right_hand.y*movement);
  // m_renderer.render(blob_rh_renderer);

  // m_blob_lf.update_PBR();
  // if (poseLandmarks.left_foot && poseLandmarks.left_foot.visibility > 0.7)
  //   m_blob_lf.update_position(-poseLandmarks.left_foot.x*movement, -poseLandmarks.left_foot.y*movement);
  // m_renderer.render(blob_lf_renderer);

  // m_blob_rf.update_PBR();
  // if (poseLandmarks.right_foot && poseLandmarks.right_foot.visibility > 0.7)
  //   m_blob_rf.update_position(-poseLandmarks.right_foot.x*movement, -poseLandmarks.right_foot.y*movement);
  // m_renderer.render(blob_rf_renderer);

  // m_blob_head.update_PBR();
  // if (poseLandmarks.head && poseLandmarks.head.visibility > 0.7)
  //   m_blob_head.update_position(-poseLandmarks.head.x*movement, -poseLandmarks.head.y*movement);
  // m_renderer.render(blob_head_renderer);

  m_blob.update_PBR();
  if (poseLandmarks.body && poseLandmarks.body.visibility > 0.7)
    m_blob.update_position(-poseLandmarks.body.x*movement, -poseLandmarks.body.y*movement);
  m_renderer.render(blob_renderer);


  // update pbr
  m_pbr.exposure = 5 + 30 * m_analyzer.get_level();

  // update light
  if (m_ctrl.params.light_ziggle) m_light.ziggle(m_renderer.timer);

  // update renderer
  // if(m_ctrl.params.cam_ziggle)
  //     m_renderer.ziggle_cam(m_analyzer.get_history());
  
};

document.addEventListener("DOMContentLoaded", function () {
  if (
    window.location.protocol == "http:" &&
    window.location.hostname != "localhost"
  ) {
    window.open(
      "https://" + window.location.hostname + window.location.pathname,
      "_top"
    );
  } else {
    init();
    update();
  }
});
