// need datgui lib & threejs lib

var Ctrl = function([_blob_left, _blob_right], _light, _pbr, _audio){
	this.params = {
		show_hdr: true,
		debug_shadow_map: false,
		audio_gain: 500.
	}
	
	// var _g_blob = new dat.GUI();
	var _g_scene = new dat.GUI({ width: 350 });

	this.blob_left = _blob_left;
	this.blob_right = _blob_right;
	this.light = _light;
	this.pbr = _pbr;
	this.audio = _audio;


	_g_scene.add({song: '' }, 'song', 
	{ 
		Baiana: 'baiana', 
		Carambolage: 'carambolage',
		Dexter: 'dexter',
		Drava: 'drava',
		Eventually: 'eventually',
		Gymnopedie: 'gymnopedie',
		ItsThatTime: 'itsthattime',
		Lost: 'lost',
		MojeMilo: 'mojemilo',
		Not: 'not',
		NeskoncnoDolgiObjemi: 'objemi',
		LookingAtYouPager: 'pager',
		Rumble: 'rumble',
		Style: 'style',
		EverybodyLovesTheSunshine: 'sunshine',
		Tobogan: 'tobogan'
	}).onChange( function(_song){
		this.audio.load_and_play_song('../assets/'+_song+'.mp3');
	}.bind(this));
    _g_scene.add(this.params, 'debug_shadow_map').onFinishChange( this.update_params.bind(this) );
    _g_scene.add(this.params, 'audio_gain', 0., 1000.).onChange( this.update_params.bind(this) );


    _g_scene.add(this.pbr, 'normal', 0., 5.);
    _g_scene.add(this.pbr, 'roughness', 0., 10.);
    _g_scene.add(this.pbr, 'metallic', 0., 10.);
    _g_scene.add(this.pbr, 'exposure', 0., 20.);
    _g_scene.add(this.pbr, 'gamma', 0., 10.);

    this.update_params();

    // dat.GUI.toggleHide();
};

Ctrl.prototype.update_params = function(){
	var _p = this.params;
	
	this.blob_left.debug_shadow_map(_p.debug_shadow_map);
	this.blob_right.debug_shadow_map(_p.debug_shadow_map);
	this.audio.set_gain(this.params.audio_gain);
	this.light.set_light_pos( new THREE.Vector3(_p.light_posx, _p.light_posy, _p.light_posz) );

};