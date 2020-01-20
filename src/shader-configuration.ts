// ## Shader Configuration
//
function getShaderConfiguration(scene: Scene) {
  // We'll put all of our configuration into an object
  // because much of our configuration is directly injected into GLSL code
  // and because WebGL's GLSL is ancient we're encoding our numbers as strings.
  // We're doing this to stop WebGL from complaining that `1` is not a float
  // this version of GLSL will want a full `1.0`
  return {
    // anti aliasing, 1, 2, or 4
    aa: 1,
    // acceleration config
    acceleration: {
      // how many "plane set normals" will we have (note we have no plans for this _not_
      // to be 7, this is here for deduplication)
      numPlaneSetNormals: 7,
      // how many "extents" objects do we have in our accelerator?
      numExtents: 1,
    },
    // The colour of the background (if rays hit nothing this is the colour of the pixel) 
    bg: {
      r: '0.05',
      g: '0.05',
      b: '0.05',
    },
    // F0 is a setting in our PBR (physics based rendering) system that
    // deals with reflections in Fresnel equations
    defaultF0: '0.04',
    // Our shaders work with floating points.  Floating points have tiny decimals at
    // the ends which can make comparisions tricky.  `epsilon` gives us a small value
    // we can use to help work around some of the even smaller decimals.
    epsilon: '0.00005',
    // we need a proxy for infinity
    infinity: '99999999999999999999999999999999999999.0',
    // how many lights are in the scene?
    lightCount: scene.lights.length,
    // how many materials are in the scene?
    materialCount: scene.materials.length,
    // how many octree nodes can we visit?
    octreeNodeIterationMax: Math.ceil((scene.triangles.length + scene.spheres.length) / 2),
    // we will be packing floats into 8 bit unsigned integer quads (RGBA) and we
    // will want a mechanism for preserving fractions, we can do so by multiplying
    // or dividing by a factor
    packedFloatMultiplier: PACKED_FLOAT_MULTIPLIER + '.0',
    // phongSpecular is a variable in our Blinn Phong (old school) system
    // that helps us control specular (shiny) lighting
    // it's a string
    phongSpecularExp: '32.0',
    // the shading model we'll be using
    // 1 for Blinn Phong, 0 for PBR
    shadingModel: 0,
    // how many spheres are in the scene?
    sphereCount: scene.spheres.length,
    // how many triangles are in the scene?
    triangleCount: scene.triangles.length,
  };
}
