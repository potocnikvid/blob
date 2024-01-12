var NoiseBlob = function(_renderer, _analyzer, _light){ 
  this.is_init = false;
  this.show_hdr = true;

  this.renderer = _renderer;
  this.audio_analyzer = _analyzer;
  this.light = _light;

  this.w = _renderer.w;
  this.h = _renderer.h;

  this.init_texture();
  this.init_shader();
  this.init_scene();
  this.init_cubemap();
};

NoiseBlob.prototype.update = function(){ 
  var _shdrs = [
      this.shdr_mesh, 
      this.shdr_wire, 
      this.shdr_points, 
      this.shdr_pop_points, 
      this.shdr_pop_wire, 
      this.shdr_pop_points_out, 
      this.shdr_pop_wire_out, 
      this.shdr_shadow
  ];
  var _shdrs_size = _shdrs.length;
  for(var i = 0; i < _shdrs_size; i++){
      _shdrs[i].uniforms.u_is_init.value = this.is_init;
      _shdrs[i].uniforms.u_t.value = this.timer;
      
      // Pike
      _shdrs[i].uniforms.u_audio_high.value = this.audio_analyzer.get_high();

      _shdrs[i].uniforms.u_audio_mid.value = this.audio_analyzer.get_mid();
      _shdrs[i].uniforms.u_audio_bass.value = this.audio_analyzer.get_bass();
      _shdrs[i].uniforms.u_audio_level.value = this.audio_analyzer.get_level();
      _shdrs[i].uniforms.u_audio_history.value = this.audio_analyzer.get_history();
  }

  // this.update_shadow_map();
  this.update_cubemap();

  var _cam = this.renderer.get_camera();
  this.renderer.renderer.render( this.scene, _cam);

  if(!this.is_init){ 
      this.is_init = true;

      console.log("NoiseBlob : is initiated");
  }

  this.timer = this.renderer.get_timer();
};

NoiseBlob.prototype.update_shadow_map = function(){
  var _shadow_cam = this.light.get_light();
  var _shdow_fbo = this.light.get_shadow_frame_buffer();

  this.renderer.renderer.render(this.shadow_scene, _shadow_cam, _shdow_fbo);

  var _light_pos = this.light.get_light_pos();
  _light_pos.applyMatrix4(this.renderer.matrix.modelViewMatrix);
  
  var _shadow_matrix = new THREE.Matrix4();
  _shadow_matrix.identity();
  _shadow_matrix.multiplyMatrices ( 
      this.light.get_light().projectionMatrix, 
      this.light.get_light().modelViewMatrix );

  this.shdr_mesh.uniforms.u_light_pos.value = _light_pos;
  this.shdr_mesh.uniforms.u_shadow_matrix.value = _shadow_matrix;
  this.shdr_mesh.uniforms.u_shadow_map.value = this.light.get_shadow_map();
};

NoiseBlob.prototype.init_shader = function(){
  var screen_res = 'vec2( ' + this.w.toFixed( 1 ) +', ' + this.h.toFixed( 1 ) + ')';
  
  function load(_vert, _frag){
      return new THREE.ShaderMaterial( 
      { 
          defines: {
              SCREEN_RES: screen_res
          },
          uniforms: {
              u_t: {value: 0},
              u_is_init: {value: false},
              u_audio_high: {value: 0.},
              u_audio_mid: {value: 0.},
              u_audio_bass: {value: 0.},
              u_audio_level: {value: 0.},
              u_audio_history: {value: 0.}
          },
          vertexShader:   _vert,
          fragmentShader: _frag
      });
  };

  this.shdr_cubemap = new THREE.ShaderMaterial( 
      { 
          defines: {
              SCREEN_RES: screen_res
          },
          uniforms: {
              u_cubemap: {value: this.cubemap},
              u_cubemap_b: {value: this.cubemap_b},
              u_exposure: {value: 2.},
              u_gamma: {value: 2.2}
          },
          // vertexShader:   skybox_vert,
          // fragmentShader: skybox_frag
      });

  // scene shdr
  this.shdr_mesh = load(blob_vert, blob_frag);
  this.shdr_wire = load(blob_vert, blob_frag);
  this.shdr_points = load(blob_vert, blob_frag);
  this.shdr_shadow = load(blob_vert, blob_frag);
  this.shdr_pop_points = load(blob_vert, blob_frag);
  this.shdr_pop_wire = load(blob_vert, blob_frag);
  this.shdr_pop_points_out = load(blob_vert, blob_frag);
  this.shdr_pop_wire_out = load(blob_vert, blob_frag);

  this.shdr_mesh.extensions.derivatives = true;

  this.shdr_mesh.defines.IS_MESH = 'true';
  this.shdr_mesh.defines.HAS_SHADOW = 'true';
  this.shdr_wire.defines.IS_WIRE = 'true';
  this.shdr_points.defines.IS_POINTS = 'true';
  this.shdr_shadow.defines.IS_SHADOW = 'true';
  this.shdr_pop_points.defines.IS_POINTS = 'true';
  this.shdr_pop_points.defines.IS_POP = 'true';
  this.shdr_pop_wire.defines.IS_WIRE = 'true';
  this.shdr_pop_wire.defines.IS_POP = 'true';
  this.shdr_pop_points_out.defines.IS_POINTS = 'true';
  this.shdr_pop_points_out.defines.IS_POP_OUT = 'true';
  this.shdr_pop_wire_out.defines.IS_WIRE = 'true';
  this.shdr_pop_wire_out.defines.IS_POP_OUT = 'true';

  var _light_pos = this.light.get_light_pos();
  _light_pos.applyMatrix4(this.renderer.matrix.modelViewMatrix);
  
  var _shadow_matrix = new THREE.Matrix4();
  _shadow_matrix.identity();
  _shadow_matrix.multiplyMatrices ( 
      this.light.get_light().projectionMatrix, 
      this.light.get_light().modelViewMatrix );

  this.shdr_mesh.uniforms.u_light_pos = {value: _light_pos};
  this.shdr_mesh.uniforms.u_shadow_matrix = {value: _shadow_matrix};
  this.shdr_mesh.uniforms.u_shadow_map = {value: this.light.get_shadow_map()};
  this.shdr_mesh.uniforms.u_debug_shadow = {value: false};
  this.shdr_points.uniforms.tex_sprite = {value: this.tex_sprite};
  this.shdr_pop_points.uniforms.tex_sprite = {value: this.tex_sprite};
  this.shdr_pop_wire.uniforms.tex_sprite = {value: this.tex_sprite};
  this.shdr_pop_points_out.uniforms.tex_sprite = {value: this.tex_sprite};
  this.shdr_pop_wire_out.uniforms.tex_sprite = {value: this.tex_sprite};
  
  this.shdr_points.blending = THREE.AdditiveBlending;
  this.shdr_wire.blending = THREE.AdditiveBlending;
  this.shdr_pop_points.blending = THREE.AdditiveBlending;
  this.shdr_pop_wire.blending = THREE.AdditiveBlending;
  this.shdr_pop_points_out.blending = THREE.AdditiveBlending;
  this.shdr_pop_wire_out.blending = THREE.AdditiveBlending;
  
  this.shdr_wire.transparent = true;
  this.shdr_points.transparent = true;
  this.shdr_pop_points.transparent = true;
  this.shdr_pop_wire.transparent = true;
  this.shdr_pop_points_out.transparent = true;
  this.shdr_pop_wire_out.transparent = true;


  this.shdr_wire.depthTest = false;
  this.shdr_points.depthTest = false;
  this.shdr_pop_points.depthTest = false;
  this.shdr_pop_wire.depthTest = false;
  this.shdr_pop_points_out.depthTest = false;
  this.shdr_pop_wire_out.depthTest = false;
};

NoiseBlob.prototype.init_texture = function(){
  this.tex_sprite = new THREE.TextureLoader().load( "assets/sprite_additive_rect.png" );
  // this.tex_sprite = new THREE.TextureLoader().load( "assets/warped_grid_texture.png" );

  this.tex_sprite.wrapS = THREE.ClampToEdgeWrapping;
  this.tex_sprite.wrapT = THREE.ClampToEdgeWrapping;
  this.tex_sprite.magFilter = THREE.LinearFilter;
  this.tex_sprite.minFilter = THREE.LinearFilter;
};

NoiseBlob.prototype.init_scene = function(){
  // Function to create a 3D star geometry
  function createCurved3DStarGeometry(radius, innerRadius, numPoints, depth, curveAmount) {
    var geometry = new THREE.Geometry();

    function addStarPoints(z, inward) {
      for (let i = 0; i < numPoints * 2; i++) {
          var r = (i % 2 === 0) ? radius : innerRadius;
          var angle = (i / (numPoints * 2)) * Math.PI * 2;

          var x = Math.cos(angle) * r;
          var y = Math.sin(angle) * r;

          // Apply curve
          var curve = inward ? -curveAmount : curveAmount;
          var curvedZ = z + curve * Math.sin(i / numPoints * Math.PI);

          geometry.vertices.push(new THREE.Vector3(x, y, curvedZ));
      }
    }


    // Add front and back star points
    addStarPoints(depth / 2); // Front points
    addStarPoints(-depth / 2); // Back points

    // Create faces for the front and back stars
    for (let i = 0; i < numPoints * 2; i++) {
        let nextIndex = (i + 2) % (numPoints * 2);
        let innerIndex = (i + 1) % (numPoints * 2);

        // Front face
        geometry.faces.push(new THREE.Face3(0, innerIndex, nextIndex));
        // Back face
        let offset = numPoints * 2;
        geometry.faces.push(new THREE.Face3(offset, innerIndex + offset, nextIndex + offset));
    }

    // Create side faces to give depth
    for (let i = 0; i < numPoints * 2; i++) {
        let nextIndex = (i + 1) % (numPoints * 2);
        let frontIndex = i;
        let backIndex = i + numPoints * 2;

        let frontNextIndex = nextIndex;
        let backNextIndex = nextIndex + numPoints * 2;

        geometry.faces.push(new THREE.Face3(frontIndex, backIndex, frontNextIndex));
        geometry.faces.push(new THREE.Face3(backIndex, backNextIndex, frontNextIndex));
    }

    geometry.computeFaceNormals(); // Compute normals for lighting
    return geometry;
  }

  // Usage example:
  this.starGeometry = createCurved3DStarGeometry(0.5, 1, 5, 1, 0.2); // 5 points star with a depth of 1
  var material = new THREE.MeshBasicMaterial({ color: 0xfff000, wireframe: false });
  var starMesh = new THREE.Mesh(this.starGeometry, material);

  // Add starMesh to your scene
  // scene.add(starMesh);
  // this._geom = this.starGeometry;


  var _sphere_size = .5;
  var _wire_size = _sphere_size * 0.3;
  this._geom = new THREE.SphereBufferGeometry(_sphere_size, 64, 64);
  var _geom_lowres = new THREE.SphereBufferGeometry(_wire_size, 32, 32);

  this.scene = new THREE.Scene();
  // this.shadow_scene = new THREE.Scene();

  this._mesh = new THREE.Mesh(this._geom, this.shdr_mesh);
  this._points = new THREE.Points(this._geom, this.shdr_points);
  //this._shadow_mesh = new THREE.Mesh(this._geom, this.shdr_shadow);
  this._wire = new THREE.Line(_geom_lowres, this.shdr_wire);

  this._pop_points = new THREE.Points(_geom_lowres, this.shdr_pop_points);
  this._pop_wire = new THREE.Line(_geom_lowres, this.shdr_pop_wire);

  this._pop_points_out = new THREE.Points(_geom_lowres, this.shdr_pop_points_out);
  this._pop_wire_out = new THREE.Line(_geom_lowres, this.shdr_pop_wire_out);
  this.scene.add(this._mesh);
  this.scene.add(this._points);
  // this.scene.add(this._wire);

  this.scene.add(this._pop_points);
  this.scene.add(this._pop_wire);
  this.scene.add(this._pop_points_out);
  // this.scene.add(this._pop_wire_out);

  // this.shadow_scene.add(this._shadow_mesh);

  var _geom_cube = new THREE.BoxBufferGeometry(100, 100, 100);
  this._mesh_cube = new THREE.Mesh(_geom_cube, this.shdr_cubemap);

  this.scene.add(this._mesh_cube);
};

NoiseBlob.prototype.set_retina = function(){
  this.w *= .5;
  this.h *= .5;
};

NoiseBlob.prototype.init_cubemap = function(){
  var _path = "assets/";
  var _format = '.jpg';
  var _urls = [
    // _path + 'warped_grid_texture.avif', _path + 'warped_grid_texture.avif',
    // _path + 'warped_grid_texture.avif', _path + 'warped_grid_texture.avif',
    // _path + 'warped_grid_texture.avif', _path + 'warped_grid_texture.avif',
    // _path + 'noise.jpeg', _path + 'noise.jpeg',
    // _path + 'noise.jpeg', _path + 'noise.jpeg',
    // _path + 'noise.jpeg', _path + 'noise.jpeg',

      _path + 'px_3js' + _format, _path + 'nx_3js' + _format,
      _path + 'py_3js' + _format, _path + 'ny_3js' + _format,
      _path + 'pz_3js' + _format, _path + 'nz_3js' + _format
  ];
  
  this.cubemap = new THREE.CubeTextureLoader().load( _urls );
  this.cubemap.format = THREE.RGBFormat;

  _urls = [
    // _path + 'warped_grid_texture.avif', _path + 'warped_grid_texture.avif',
    // _path + 'warped_grid_texture.avif', _path + 'warped_grid_texture.avif',
    // _path + 'warped_grid_texture.avif', _path + 'warped_grid_texture.avif',
    // _path + 'noise.jpeg', _path + 'noise.jpeg',
    // _path + 'noise.jpeg', _path + 'noise.jpeg',
    // _path + 'noise.jpeg', _path + 'noise.jpeg',
      _path + 'px' + _format, _path + 'nx' + _format,
      _path + 'py' + _format, _path + 'ny' + _format,
      _path + 'pz' + _format, _path + 'nz' + _format
  ];

  this.cubemap_b = new THREE.CubeTextureLoader().load( _urls );
  this.cubemap_b.format = THREE.RGBFormat;

  this.shdr_mesh.uniforms.cubemap = {value: this.cubemap};
  this.shdr_cubemap.uniforms.u_cubemap.value = this.cubemap;

  this.shdr_mesh.uniforms.cubemap_b = {value: this.cubemap_b};
  this.shdr_cubemap.uniforms.u_cubemap_b.value = this.cubemap_b;

  this.shdr_cubemap.uniforms.u_show_cubemap = {value:this.show_hdr};
  this.shdr_mesh.defines.HAS_CUBEMAP = 'true';
};

NoiseBlob.prototype.toggle_cubemap = function(){
  this.shdr_cubemap.uniforms.u_show_cubemap.value = this.show_hdr;
};

NoiseBlob.prototype.update_cubemap = function(){
  // var _cross_fader = (Math.sin(this.audio_analyzer.get_history()) + 1.) / 2.;
  var _cross_fader = 0.;
  // var _cross_fader = 1.-this.audio_analyzer.get_level();
  this.shdr_mesh.uniforms.cross_fader = {value:_cross_fader};
  this.shdr_cubemap.uniforms.cross_fader = {value:_cross_fader};

  this.shdr_cubemap.uniforms.u_exposure.value = this.pbr.get_exposure();
  this.shdr_cubemap.uniforms.u_gamma.value = this.pbr.get_gamma();
};

NoiseBlob.prototype.set_PBR = function(_pbr){
  this.pbr = _pbr;

  this.shdr_mesh.uniforms.tex_normal = {value: this.pbr.get_normal_map()};
  this.shdr_mesh.uniforms.tex_roughness = {value: this.pbr.get_roughness_map()};
  this.shdr_mesh.uniforms.tex_metallic = {value: this.pbr.get_metallic_map()};
  
  this.shdr_mesh.uniforms.u_normal = {value: this.pbr.get_normal()};
  this.shdr_mesh.uniforms.u_roughness = {value: this.pbr.get_roughness()};
  this.shdr_mesh.uniforms.u_metallic = {value: this.pbr.get_metallic()};
  
  this.shdr_mesh.uniforms.u_exposure = {value: this.pbr.get_exposure()};
  this.shdr_mesh.uniforms.u_gamma = {value: this.pbr.get_gamma()};

  this.shdr_mesh.uniforms.u_view_matrix_inverse = {value: this.renderer.get_inversed_matrix()};

  this.shdr_mesh.defines.IS_PBR = 'true';
};

NoiseBlob.prototype.set_position = function(x, y, z, scale) {
  this._mesh.scale.set(scale, scale, scale);
  this._points.scale.set(scale, scale, scale);
  this._pop_points.scale.set(scale, scale, scale);
  this._pop_wire.scale.set(scale, scale, scale);
  this._pop_points_out.scale.set(scale, scale, scale);
  this._pop_wire_out.scale.set(scale, scale, scale);
  this._wire.scale.set(scale, scale, scale);
  this._mesh_cube.scale.set(scale, scale, scale);
  // this._shadow_mesh.scale.set(scale, scale, scale);

  this._mesh.position.x += x
  this._mesh.position.y += y
  this._mesh.position.z += z
  this._mesh_initial_pos = this._mesh.position.clone();

  this._points.position.x += x
  this._points.position.y += y
  this._points.position.z += z
  this._points_initial_pos = this._points.position.clone();

  this._wire.position.x += x
  this._wire.position.y += y
  this._wire.position.z += z
  this._wire_initial_pos = this._wire.position.clone();

  this._pop_points.position.x += x
  this._pop_points.position.y += y
  this._pop_points.position.z += z
  this._pop_points_initial_pos = this._pop_points.position.clone();

  this._pop_wire.position.x += x
  this._pop_wire.position.y += y
  this._pop_wire.position.z += z
  this._pop_wire_initial_pos = this._pop_wire.position.clone();

  this._pop_points_out.position.x += x
  this._pop_points_out.position.y += y
  this._pop_points_out.position.z += z
  this._pop_points_out_initial_pos = this._pop_points_out.position.clone();

  this._pop_wire_out.position.x += x
  this._pop_wire_out.position.y += y
  this._pop_wire_out.position.z += z
  this._pop_wire_out_initial_pos = this._pop_wire_out.position.clone();

  this._mesh_cube.position.x += x
  this._mesh_cube.position.y += y
  this._mesh_cube.position.z += z
  this._mesh_cube_initial_pos = this._mesh_cube.position.clone();

  // this._shadow_mesh.position.x += x
  // this._shadow_mesh.position.y += y
  // this._shadow_mesh.position.y += y
  // this._shadow_mesh_initial_pos = this._shadow_mesh.position.clone();


}

NoiseBlob.prototype.update_position = function(x, y, z) {
  this._mesh.position.x = this._mesh_initial_pos.x + x
  this._mesh.position.y = this._mesh_initial_pos.y + y
  // this._mesh.position.z = this._mesh_initial_pos.z + y

  this._points.position.x = this._points_initial_pos.x + x
  this._points.position.y = this._points_initial_pos.y + y
  // this._points.position.z = this._points_initial_pos.z + z

  this._wire.position.x = this._wire_initial_pos.x + x
  this._wire.position.y = this._wire_initial_pos.y + y
  // this._wire.position.z = this._wire_initial_pos.z + z

  this._pop_points.position.x = this._pop_points_initial_pos.x + x
  this._pop_points.position.y = this._pop_points_initial_pos.y + y
  // this._pop_points.position.z = this._pop_points_initial_pos.z + z

  this._pop_wire.position.x = this._pop_wire_initial_pos.x + x
  this._pop_wire.position.y = this._pop_wire_initial_pos.y + y
  // this._pop_wire.position.z = this._pop_wire_initial_pos.z + z

  this._pop_points_out.position.x = this._pop_points_out_initial_pos.x + x
  this._pop_points_out.position.y = this._pop_points_out_initial_pos.y + y
  // this._pop_points_out.position.z = this._pop_points_out_initial_pos.z + z

  this._pop_wire_out.position.x = this._pop_wire_out_initial_pos.x + x
  this._pop_wire_out.position.y = this._pop_wire_out_initial_pos.y + y
  // this._pop_wire_out.position.z = this._pop_wire_out_initial_pos.z + z

  this._mesh_cube.position.x = this._mesh_cube_initial_pos.x + x
  this._mesh_cube.position.y = this._mesh_cube_initial_pos.y + y
  // this._mesh_cube.position.z = this._mesh_cube_initial_pos.z + z

  // this._shadow_mesh.position.x = this._shadow_mesh_initial_pos.x + x
  // this._shadow_mesh.position.y = this._shadow_mesh_initial_pos.y + y
  // this._shadow_mesh.position.z = this._shadow_mesh_initial_pos.z + z

}

NoiseBlob.prototype.update_PBR = function(){
  this.shdr_mesh.uniforms.u_normal.value = this.pbr.get_normal();
  this.shdr_mesh.uniforms.u_roughness.value = this.pbr.get_roughness();
  this.shdr_mesh.uniforms.u_metallic.value = this.pbr.get_metallic();
  
  this.shdr_mesh.uniforms.u_exposure.value = this.pbr.get_exposure();
  this.shdr_mesh.uniforms.u_gamma.value = this.pbr.get_gamma();

  this.shdr_mesh.uniforms.u_view_matrix_inverse.value = this.renderer.get_inversed_matrix();

  this.shdr_mesh.uniforms.tex_normal.value = this.pbr.get_normal_map();
  this.shdr_mesh.uniforms.tex_roughness.value = this.pbr.get_roughness_map();
  this.shdr_mesh.uniforms.tex_metallic.value = this.pbr.get_metallic_map();

};

NoiseBlob.prototype.debug_shadow_map = function(_show){
  this.shdr_mesh.uniforms.u_debug_shadow.value = _show;
};