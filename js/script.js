var m_analyzer;
var m_renderer;
// var m_mouse;
var m_render_queue;
var m_blob;
var m_pbr;
var m_light;
var m_ctrl;
var m_device_checker;
var poseLandmarks = {left_hand: undefined, right_hand: undefined, head: undefined, left_foot:undefined, right_foot:undefined}

const video = document.getElementsByClassName("input_video")[0];
const out = document.getElementsByClassName("output")[0];
const canvasCtx5 = out.getContext("2d");

function zColor(data) {
    const z = clamp(data.from.z + 0.5, 0, 1);
    return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
  }
  
  function onResultsPose(results) {
    console.log(results)
    poseLandmarks.head = results.poseLandmarks[0]
    poseLandmarks.left_hand = results.poseLandmarks[15]
    poseLandmarks.right_hand = results.poseLandmarks[16]
    poseLandmarks.left_foot = results.poseLandmarks[27]
    poseLandmarks.right_foot = results.poseLandmarks[28]

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
  m_blob = new NoiseBlob(m_renderer, m_analyzer, m_light);
  m_blob.set_PBR(m_pbr);
  if (_is_retina) m_blob.set_retina();

  // setup render queue
  m_render_queue = [m_blob.update.bind(m_blob)];

  // init gui
  m_ctrl = new Ctrl(m_blob, m_light, m_pbr, m_analyzer);

};

var update = function () {
  requestAnimationFrame(update);

  // update audio analyzer
  m_analyzer.update();
  // m_analyzer.debug(document.getElementsByTagName("canvas")[0]);

  // update blob
  m_blob.update_PBR();

  // update pbr
  m_pbr.exposure = 5 + 30 * m_analyzer.get_level();

  // update light
  if (m_ctrl.params.light_ziggle) m_light.ziggle(m_renderer.timer);

  // update renderer
  // if(m_ctrl.params.cam_ziggle)
  //     m_renderer.ziggle_cam(m_analyzer.get_history());
  m_renderer.render(m_render_queue);
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
