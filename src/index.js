// ThreeJS and Third-party deps
import * as THREE from "three"
import * as dat from 'dat.gui'
import Stats from "three/examples/jsm/libs/stats.module"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

// Core boilerplate code deps
import { createCamera, createRenderer, runApp, getDefaultUniforms } from "./core-utils"

import vertex from "./shaders/vertex.glsl"
import fragment from "./shaders/fragment.glsl"

global.THREE = THREE
// previously this feature is .legacyMode = false, see https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
// turning this on has the benefit of doing certain automatic conversions (for hexadecimal and CSS colors from sRGB to linear-sRGB)
THREE.ColorManagement.enabled = true

/**************************************************
 * 0. Tweakable parameters for the scene
 *************************************************/
const params = {
  // general scene params
  rotateSpeed: 0.4,
  noiseAlgoName: "perlin",
  noiseAlgo: { value: 1 },
  randomFactor: { value: 0.02 },
  noiseRange: { value: 2.0 },
  colorVariance: { value: 1.3}
}
const uniforms = getDefaultUniforms()
// WIDTH of the cube of particles
const WIDTH = 100
// TOTAL = total number of particles
const TOTAL = Math.pow(WIDTH, 3)

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
let camera = createCamera(50, 0.01, 1000, { x: 0, y: 1.8, z: 4 })

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

    scene.background = new THREE.Color(0x222222)

    this.geometry = new THREE.BufferGeometry()

    let positions = new Float32Array(TOTAL*3)
    // for identifying each particle, like an id
    let reference = new Float32Array(TOTAL*2)

    for (let i = 0; i < TOTAL; i++) {
      let x = (i%WIDTH)/WIDTH * 2 - 1
      let y = (Math.floor(i/WIDTH)%WIDTH)/WIDTH * 2 - 1
      // ~~ is alternative for Math.floor(), provided that the target is already positive number
      let z = ~~(i/(WIDTH*WIDTH))/WIDTH * 2 - 1

      // think of xx,yy to be particle coordinates of a 2D plane of the same number of particles
      // with width and height of 1000 (1000 squared = Math.pow(100, 3))
      let xx = (i%1000)/1000
      let yy = ~~(i/1000)/1000

      positions.set([x,y,z], i*3)
      reference.set([xx,yy], i*2)
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions,3))
    this.geometry.setAttribute('reference', new THREE.BufferAttribute(reference,2))
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...uniforms,
        noiseAlgo: params.noiseAlgo,
        noiseRange: params.noiseRange,
        randomFactor: params.randomFactor,
        colorVariance: params.colorVariance
      },
      blending: THREE.AdditiveBlending,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      // it seems that when dealing with Points of transparency, you should turn depthTest to false in order for the points to be displayed correctly
      depthTest: false
    })

    this.particles = new THREE.Points(this.geometry, this.material)
    this.particles.rotation.y = Math.PI / 4
    scene.add(this.particles)

    // GUI controls
    const gui = new dat.GUI()
    gui.add(params, "rotateSpeed", 0, 1, 0.01)
    gui.add(params, "noiseAlgoName", ["perlin", "voronoi"]).name("noiseAlgo").onChange((val) => {
      if (val == "perlin") {
        params.noiseAlgo.value = 1
      } else if (val == "voronoi") {
        params.noiseAlgo.value = 2
      }
    })
    gui.add(params.noiseRange, "value", 2, 5, 0.1).name("noiseRange")
    gui.add(params.randomFactor, "value", 0, 0.1, 0.01).name("randomFactor")
    gui.add(params.colorVariance, "value", 0, 3.0, 0.05).name("colorVariance")

    // Stats - show fps
    this.stats1 = new Stats()
    this.stats1.showPanel(0) // Panel 0 = fps
    this.stats1.domElement.style.cssText = "position:absolute;top:0px;left:0px;"
    // this.container is the parent DOM element of the threejs canvas element
    this.container.appendChild(this.stats1.domElement)
  },
  // @param {number} interval - time elapsed between 2 frames
  // @param {number} elapsed - total time elapsed since app start
  updateScene(interval, elapsed) {
    this.controls.update()
    this.stats1.update()

    this.particles.rotation.y += interval * params.rotateSpeed
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
