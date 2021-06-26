const MMDModelInformationArray = {};
const MMDAnimationArray = {};
const MMDAnimationInformationArray = {};

const MMDContainer = document.getElementById("MMDContainer");

// MMDScene

const MMDScene = new THREE.Scene();
MMDScene.background = new THREE.Color("#FFFFFF");
const MMDSceneFog = new THREE.Fog(MMDScene.background, 5, 500);

//const MMDGridHelper = new THREE.PolarGridHelper( 30, 10 );
const MMDGridHelper = new THREE.GridHelper(100, 16);
MMDScene.add( MMDGridHelper );

const MMDAxesHelper = new THREE.AxesHelper(25);
MMDScene.add( MMDAxesHelper );

const MMDAmbientLight = new THREE.AmbientLight( 0x787878 ); //0x888888?
MMDScene.add( MMDAmbientLight );

const MMDLight = new THREE.DirectionalLight( 0x666666 );
MMDLight.shadow.bias = 0.0001;
MMDLight.position.set(0, 10, 0);
MMDScene.add( MMDLight );

const MMDCameraOffset = new THREE.Object3D();
const MMDCamera = new THREE.PerspectiveCamera( 45, MMDContainer.clientWidth / MMDContainer.clientHeight, 1, 2000 );
const Camera = new THREE.PerspectiveCamera( 45, MMDContainer.clientWidth / MMDContainer.clientHeight, 1, 2000 );
const ActiveCamera = Camera;
MMDCameraOffset.add( MMDCamera );
MMDScene.add( MMDCameraOffset );
MMDScene.add( Camera );
Camera.position.set(0, 10, 30);

//

const MMDRenderer = new THREE.WebGLRenderer( { antialias: true } );
MMDRenderer.setPixelRatio( window.devicePixelRatio );
MMDRenderer.setSize( MMDContainer.clientWidth, MMDContainer.clientHeight );
MMDContainer.appendChild( MMDRenderer.domElement );

const MMDOutlineEffector = new THREE.OutlineEffect( MMDRenderer );

// STATS

const stats = new Stats();
MMDContainer.appendChild( stats.dom );

// model
const MMDHelper = new THREE.MMDAnimationHelper({afterglow: 1.0});

const MMDLoader = new THREE.MMDLoader();

const CameraControls = new THREE.TrackballControls( Camera, MMDRenderer.domElement );

MMDHelper.add(MMDCamera);

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {
	Camera.aspect = MMDContainer.clientWidth / MMDContainer.clientHeight;
	MMDCamera.aspect = MMDContainer.clientWidth / MMDContainer.clientHeight;
	
	Camera.updateProjectionMatrix();
	MMDCamera.updateProjectionMatrix();

	MMDOutlineEffector.setSize( MMDContainer.clientWidth, MMDContainer.clientHeight );
}

//

function MMDRenderLoop() {
	if (!performMMDRenderLoop.checked) return;

	requestAnimationFrame(MMDRenderLoop);
	
	stats.begin();

	CameraControls.update();
	
	MMDHelper.update( MMDClock.getDelta() );
	MMDOutlineEffector.render( MMDScene, ActiveCamera );

	updateManipulator();
	
	stats.end();
}

const MMDClock = new THREE.Clock();

if (!WEBGL.isWebGLAvailable) {
	const warning = WEBGL.getWebGLErrorMessage();
	MMDContainer.appendChild(warning);
	MMDContainer.appendChild("<br>It seems that your browser doesn't support WebGL.");
}
