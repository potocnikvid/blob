var m_analyzer;
var m_renderer;
// var m_mouse;
var m_render_queue;
var blob_left_renderer;
var blob_right_renderer;
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
};

const video = document.getElementsByClassName("input_video")[0];
const out = document.getElementsByClassName("output")[0];
const canvasCtx5 = out.getContext("2d");

function zColor(data) {
  const z = clamp(data.from.z + 0.5, 0, 1);
  return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}

function onResultsPose(results) {
  poseLandmarks.head = results.poseLandmarks[0];
  poseLandmarks.left_hand = results.poseLandmarks[15];
  poseLandmarks.right_hand = results.poseLandmarks[16];
  poseLandmarks.left_foot = results.poseLandmarks[27];
  poseLandmarks.right_foot = results.poseLandmarks[28];

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

  // init blob
  m_blob_left = new NoiseBlob(m_renderer, m_analyzer, m_light);
  m_blob_left.set_PBR(m_pbr);
  m_blob_left.set_position(-2, 0);

  if (_is_retina) m_blob_left.set_retina();

  // init blob
  m_blob_right = new NoiseBlob(m_renderer, m_analyzer, m_light);
  m_blob_right.set_PBR(m_pbr);
  m_blob_right.set_position(2, 0);
  
  if (_is_retina) m_blob_right.set_retina();

  blob_left_renderer = [m_blob_left.update.bind(m_blob_left)];
  blob_right_renderer = [m_blob_right.update.bind(m_blob_right)];

  // setup render queue
  m_render_queue = [m_blob_left.update.bind(m_blob_left)] //, m_blob_right.update.bind(m_blob_right)];

  // init gui
  m_ctrl = new Ctrl([m_blob_left, m_blob_right], m_light, m_pbr, m_analyzer);
};

var update = function () {
  requestAnimationFrame(update);

  // update audio analyzer
  m_analyzer.update();
  // m_analyzer.debug(document.getElementsByTagName("canvas")[0]);

  m_renderer.renderer.autoClear = true;

  // update blob
  m_blob_left.update_PBR();
  if (poseLandmarks.left_hand.visibility > 0.7)
    m_blob_left.update_position(-poseLandmarks.left_hand.x*2, -poseLandmarks.left_hand.y*2);
  m_renderer.render(blob_left_renderer);

  m_renderer.renderer.autoClear = false;

  m_blob_right.update_PBR();
  if (poseLandmarks.left_hand.visibility > 0.7)
    m_blob_right.update_position(-poseLandmarks.right_hand.x*2, -poseLandmarks.right_hand.y*2);
  m_renderer.render(blob_right_renderer);

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
