// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, createRenderer, runApp, getDefaultUniforms, updateLoadingProgressBar } from "./core-utils"

import simVertex from "./shaders/simVertex.glsl"
import simFragment from "./shaders/simFragment.glsl"

global.THREE = THREE
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
}
const uniforms = getDefaultUniforms()
// Texture width/height for simulation
const FBO_WIDTH = 512
const FBO_HEIGHT = 512
// Water geometry size in system units
const GEOM_WIDTH = 512
const GEOM_HEIGHT = 512

/**************************************************
 * 1. Initialize core threejs components
 *************************************************/
// Create the scene
let scene = new THREE.Scene()

// Create the renderer via 'createRenderer',
// 1st param receives additional WebGLRenderer properties
// 2nd param receives a custom callback to further configure the renderer
let renderer = createRenderer({ antialias: true }, (_renderer) => {
  // best practice: ensure output colorspace is in sRGB, see Color Management documentation:
  // https://threejs.org/docs/#manual/en/introduction/Color-management
  _renderer.outputColorSpace = THREE.SRGBColorSpace
})

// Create the camera
// Pass in fov, near, far and camera position respectively
let camera = createCamera(50, 0.01, 2000, { x: 0, y: 200, z: 350 })

/**************************************************
 * 2. Build your scene in this threejs app
 * This app object needs to consist of at least the async initScene() function (it is async so the animate function can wait for initScene() to finish before being called)
 * initScene() is called after a basic threejs environment has been set up, you can add objects/lighting to you scene in initScene()
 * if your app needs to animate things(i.e. not static), include a updateScene(interval, elapsed) function in the app as well
 *************************************************/
let app = {
  async initScene() {
    // OrbitControls
    this.controls = new OrbitControls(camera, renderer.domElement)
    this.controls.enableDamping = true

    await updateLoadingProgressBar(0.1)

    scene.background = new THREE.Color(0x222222)

    const sun = new THREE.DirectionalLight( 0xFFFFFF, 5.0 )
    sun.position.set( 300, 400, 175 )
    scene.add( sun )
    const sun2 = new THREE.DirectionalLight( 0x40A040, 0.6 )
    sun2.position.set( - 100, 350, - 200 )
    scene.add( sun2 )

    const plane = new THREE.PlaneGeometry( GEOM_WIDTH, GEOM_HEIGHT, FBO_WIDTH - 1, FBO_HEIGHT - 1 )
    this.planeMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color( 0x0040C0 )
    })

    // customize THREE.MeshPhongMaterial's vertex shader with onBeforeCompile
    // userData is the bridge for passing heightmap data from gpgpu to the water material's uniforms
    this.planeMat.userData.heightmap = { value: null }
    
    this.planeMat.onBeforeCompile = (shader) => {
      shader.uniforms.heightmap = this.planeMat.userData.heightmap
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        uniform sampler2D heightmap;
        #include <common>
      `)
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
        // Compute normal from heightmap
        // adding an offset to uv and apply fract below fixed the edge-clamped texture issue
        // and we'd need to use a periodic noise to help us achieve this
        vec2 cUv = uv + vec2(0.1);
        vec2 cellSize = vec2( 1.0 / (${FBO_WIDTH.toFixed( 1 )}), 1.0 / ${FBO_HEIGHT.toFixed( 1 )} );
        vec3 objectNormal = vec3(
          ( texture2D( heightmap, fract(cUv + vec2( - cellSize.x, 0 )) ).x - texture2D( heightmap, fract(cUv + vec2( cellSize.x, 0 )) ).x ) * ${FBO_WIDTH.toFixed( 1 )} / ${GEOM_WIDTH.toFixed( 1 )},
          ( texture2D( heightmap, fract(cUv + vec2( 0, - cellSize.y )) ).x - texture2D( heightmap, fract(cUv + vec2( 0, cellSize.y )) ).x ) * ${FBO_HEIGHT.toFixed( 1 )} / ${GEOM_HEIGHT.toFixed( 1 )},
          1.0 );
      `)
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        float heightValue = texture2D( heightmap, fract(cUv) ).x;
        vec3 transformed = vec3( position.x, position.y, heightValue );
      `)
    }

    this.planeMesh = new THREE.Mesh( plane, this.planeMat )
    this.planeMesh.rotation.x = - Math.PI / 2
    // as the mesh is static, we can turn auto update off: https://threejs.org/docs/#manual/en/introduction/Matrix-transformations
    this.planeMesh.matrixAutoUpdate = false
    this.planeMesh.updateMatrix()
    scene.add( this.planeMesh )

    this.setUpFBO()

    // GUI controls
    const gui = new dat.GUI()

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)

    await updateLoadingProgressBar(1.0)
  },
  setUpFBO() {
    this.fboRT = new THREE.WebGLRenderTarget(FBO_WIDTH, FBO_HEIGHT, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    })
    this.fboScene = new THREE.Scene()
    this.fboCamera = new THREE.OrthographicCamera(-1,1,1,-1,-1,1)
    this.fboCamera.position.set(0,0,0.5)
    this.fboGeom = new THREE.PlaneGeometry(2,2)
    this.fboMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: simVertex,
      fragmentShader: simFragment
    })
    this.fboMesh = new THREE.Mesh(this.fboGeom, this.fboMat)
    this.fboScene.add(this.fboMesh)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    // render to the fbo
    renderer.setRenderTarget(this.fboRT)
    renderer.render(this.fboScene, this.fboCamera)
    // reset render target so the actual scene can be rendered next
    renderer.setRenderTarget(null)

    this.planeMat.userData.heightmap.value = this.fboRT.texture
  }
}

/**************************************************
 * 3. Run the app
 * 'runApp' will do most of the boilerplate setup code for you:
 * e.g. HTML container, window resize listener, mouse move/touch listener for shader uniforms, THREE.Clock() for animation
 * Executing this line puts everything together and runs the app
 * ps. if you don't use custom shaders, pass undefined to the 'uniforms'(2nd-last) param
 * ps. if you don't use post-processing, pass undefined to the 'composer'(last) param
 *************************************************/
runApp(app, scene, renderer, camera, true, uniforms, undefined)
