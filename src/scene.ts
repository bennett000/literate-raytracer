// ## Siene
//
// We'll use the `getScene` function to create a `Scene` object
// our `Scene` object will essentially be a dictionary containing
//   * Camera details including position
//   * Spherical geometry to render using mathematical spheres
//   * Triangle geometry to render using vertecies
//   * Lighting details
//
// In the real world we'd likely use something a bit more sophisticated like a graph
// but for now, this will do.
type Triangle = { material: number, points: Matrix3_1[] };
function getScene(sphereCount = 57, minOrbit = 3) {
  // Our scene is going to be a proof of concept, can we render a bunch of simple
  // objects at reasonable speed. Mathematical spheres are some of the simplest
  // objects to render and store.
  //
  // ### Setup The Scene Dependencies
  //
  // we don't have a sophisticated geometry system.  We'll be generating
  // that here in a sub optimal way for a real app.
  //
  // Starting with a means of computing a triangle's normal
  // triangles.map((t, i) => {
  const triangleToNormal = (t: Triangle) => {
    const v0v1 = subtract3_1(t.points[1], t.points[0]);
    const v0v2 = subtract3_1(t.points[2], t.points[0]);
    const normal = normalize3_1(multiply3_1(v0v1, v0v2));
    return normal;
  };
  // we'll need a place to cache triangle normals
  let triangleNormals: Matrix3_1[] = [];

  //
  // <a name="spheres"></a>
  // #### Build the Spheres
  //
  // We'll have one large static sphere in the centre and many other spheres
  // that we'll animate around the scene
  const spheres = (function () {
    // we'll also need to store the spheres somewhere
    const s: { radius: number, point: Matrix3_1, material: number }[] = [];

    // we'll initialize the spheres so they're not immediately overlapping
    // in order to do that we'll increment the radius for each sphere we add
    // to the scene
    let prevRadius = 0;
    // ##### Build a each sphere
    for (let i = 0; i < sphereCount; i += 1) {
      let radius = 0.1;
      let material = Math.floor(Math.random() * 5 + 2);
      // make the first circle large
      // make the second circle tiny
      // make all the rest randomly modest
      if (i === 0) {
        radius = minOrbit - 1;
      } else if (i === 1) {
        radius = 0.05;
        material = 1;
      } else {
        radius = (Math.random() / 2) + 0.1;
      }

      // build a simple sphere object
      s.push({
        radius,
        point: [
          // we'll start the spheres on the x axis
          i === 0 
          // the first sphere will be a the origin
          ? 0 
          // the other spheres will fan out along the x axis
          : minOrbit + i * 0.25 + radius + prevRadius,
          // all sphere's we'll be
          5, 0
        ] as Matrix3_1,
        // each sphere has a "pointer" to a `material`
        // the "pointer" is an index in the `scene.materials` array
        material,
      });

      // update the radius for the next sphere
      prevRadius = radius;
    }

    // ##### We now have some spheres!

    return s;
  }());

  //
  // <a name="triangles"></a>
  // #### Triangles
  //
  // Triangles and ray intersections are harder to calculate than sphere intersections
  // we'll be focusing more on triangles later.  Right now we have some just to demonstrate
  // shadows
  //
  // Our scene has two triangles that make up the "floor plane" or our scene
  //
  // each triangle has a "pointer" to a `material`
  // the "pointer" is an index in the `scene.materials` array
  //
  // each triangle also has three points
  const triangles = [
      {
        material: 0,
        points: [
          [g_floorPlaneSize, 0, -g_floorPlaneSize],
          [-g_floorPlaneSize, 0, -g_floorPlaneSize],
          [-g_floorPlaneSize, 0, g_floorPlaneSize],
        ] as Matrix3_1[],
      },
      {
        material: 0,
        points: [
          [-g_floorPlaneSize, 0, g_floorPlaneSize],
          [g_floorPlaneSize, 0, g_floorPlaneSize],
          [g_floorPlaneSize, 0, -g_floorPlaneSize],
        ] as Matrix3_1[],
      },
    ];
    // now that we have some triangles, let's pre-compute the normals
    triangleNormals = triangles.map(triangleToNormal);

  //
  // <a name="materials"></a>
  // #### Materials
  //
  // materials are currently a bit of a mess.  The objects do double duty in both
  // the Blinn Phong (BP) model and in the PBR model
  //
  // * `colour` means "diffuse colour" in BP, and  "albedo" in PBR
  // * `ambient` means "% ambient contribution" in BP, and "ao" in PBR 
  // * `diffuse` means "% diffuse contribution" in BP, and "roughness" in PBR
  // * `specular` means "% specular contribution" in BP, and "metallic" in PBR
  // * `refraction` (future)
  // * `isTranslucent` (future)
  const materials = [
    // we'll hard code these ones in some places
    {
      colour: [200, 200, 200] as Matrix3_1,
      ambient: 0.1,
      diffuse: 0.8,
      specular: 0.02,
      refraction: 1.0,
      isTranslucent: false,
    },
    {
      colour: [255, 255, 150] as Matrix3_1,
      ambient: 0.1,
      diffuse: 0.999999,
      specular: 0.99999,
      refraction: 1.0,
      isTranslucent: true,
    },
    // the rest of these we'll pick from randomly
    {
      colour: [100, 0, 0] as Matrix3_1,
      ambient: 0.01,
      diffuse: 0.5,
      specular: 0.1,
      refraction: 1.0,
      isTranslucent: false,
    },
    {
      colour: [150, 0, 150] as Matrix3_1,
      ambient: 0.01,
      diffuse: 0.5,
      specular: 0.1,
      refraction: 1.0,
      isTranslucent: false,
    },
    {
      colour: [0, 150, 50] as Matrix3_1,
      ambient: 0.01,
      diffuse: 0.5,
      specular: 0.1,
      refraction: 1.0,
      isTranslucent: false,
    },
    {
      colour: [10, 10, 200] as Matrix3_1,
      ambient: 0.01,
      diffuse: 0.5,
      specular: 0.1,
      refraction: 1.0,
      isTranslucent: false,
    },
    {
      colour: [50, 50, 50] as Matrix3_1,
      ambient: 0.2,
      diffuse: 0.01,
      specular: 0.999,
      refraction: 1.0,
      isTranslucent: false,
    },
  ];

  //
  // <a name="scene"></a>
  // ### The Actual Scene Object
  return {
    // let's build a camera
    camera: {
      point: [0, 5, 50] as Matrix3_1,
      fieldOfView: 45,
      rotation: [0, 0, 0] as Matrix3_1,
      up: [0, 1, 0] as Matrix3_1,
    },
    // for simplicity our lights are just a single point in space
    lights: [[-25, 30, 10], [0, 3, 0]] as Matrix3_1[],
    // place the materials object in the scene
    materials,
    // place the spheres object in the scene
    spheres,
    // place the triangles object in the scene
    triangles,
    // we'll calculate normals on the fly
    // and provide a mechanism for consumers that allows them to run a function on each
    // triangle, thereby they can be sure their loops iterate over all the triangles only
    // once
    triangleNormals(onEach: (normal: Matrix3_1, t: Triangle, i: number) => any, useCache = false) {
      if (useCache) {
        triangles.forEach((triangle, i) => onEach(triangleNormals[i], triangle, i));
        return triangleNormals;
      }

      triangleNormals = triangles.map((t, i) => {
        const normal = triangleToNormal(t);
        onEach(normal, t, i);
        return normal;
      });

      return triangleNormals;
    }
  }
}

//
// <a name="insertPointInto"></a>
// ## insertPointInto
//
// helper function for our functions that will encode things for the GPU
function insertPointInto(data: Uint8Array) {
  return (point: Matrix3_1, index: number) => {
    const x = fourByteFromFloat(point[0] * PACKED_FLOAT_MULTIPLIER);
    const y = fourByteFromFloat(point[1] * PACKED_FLOAT_MULTIPLIER);
    const z = fourByteFromFloat(point[2] * PACKED_FLOAT_MULTIPLIER);
    data[index + 0] = x[0];
    data[index + 1] = x[1];
    data[index + 2] = x[2];
    data[index + 3] = x[3];
    data[index + 4] = y[0];
    data[index + 5] = y[1];
    data[index + 6] = y[2];
    data[index + 7] = y[3];
    data[index + 8] = z[0];
    data[index + 9] = z[1];
    data[index + 10] = z[2];
    data[index + 11] = z[3];
  };
}

interface TextureDataStructureEncoding {
  data: Uint8Array;
  height: number;
  length: number;
  size: number;
  targetUniformSampler: string;
  targetUniformStruct: string;
  width: number;
}

//
// <a name="encodeTriangle"></a>
// ## encodeTriangle
function encodeTriangles(scene: Scene): TextureDataStructureEncoding {
    const size = /* a */ 3 + /* b */ 3 + /* c */ + 3 + /* normal */ + 3 + /* material */ + 1;
    const sizeRaw = size * 4;
    const length = scene.triangles.length;
    const width = length * size;
    const lengthRaw = width * 4;
    const data = new Uint8Array(lengthRaw);
    const insertPoint = insertPointInto(data);
    scene.triangleNormals((normal, t, i) => {
      const pointer = i * sizeRaw;
      insertPoint(t.points[0], 0 + pointer);
      insertPoint(t.points[1], 12 + pointer);
      insertPoint(t.points[2], 24 + pointer);
      insertPoint(normal, 36 + pointer);
      const material = fourByteFromFloat(t.material);
      data[48 + pointer] = material[0];
      data[49 + pointer] = material[1];
      data[50 + pointer] = material[2];
      data[51 + pointer] = material[3];
    }, false);

    return {
      data,
      height: 1,
      length,
      size,
      targetUniformSampler: 'trianglesData',
      targetUniformStruct: 'triangles',
      width,
    };
}

//
// <a name="encodeSphere"></a>
// ## encodeSphere
function encodeSpheres(scene: Scene): TextureDataStructureEncoding {
    const size = /* centre */ 3 +  /* radius */ + 1 + /* material */ + 1;
    const sizeRaw = size * 4;
    const length = scene.spheres.length;
    const width = length * size;
    const lengthRaw = width * 4;
    const data = new Uint8Array(lengthRaw);

    const insertPoint = insertPointInto(data);
    scene.spheres.forEach((sphere, i) => {
      const pointer = i * sizeRaw;
      insertPoint(sphere.point, 0 + pointer);
      const radius = fourByteFromFloat(sphere.radius * PACKED_FLOAT_MULTIPLIER);
      data[12 + pointer] = radius[0];
      data[13 + pointer] = radius[1];
      data[14 + pointer] = radius[2];
      data[15 + pointer] = radius[3];
      const material = fourByteFromFloat(sphere.material);
      data[16 + pointer] = material[0];
      data[17 + pointer] = material[1];
      data[18 + pointer] = material[2];
      data[19 + pointer] = material[3];
    }, false);

    return {
      data,
      height: 1,
      length,
      size,
      targetUniformSampler: 'spheresData',
      targetUniformStruct: 'spheres',
      width,
    };
}


//
// <a name="createDataTexture"></a>
// ### createDataTexture
//
// we need a way of giving the GPU lots of data about things like verticies, bounding boxes
// etc.  We can pack this info into a "data texture"
function createDataTexture(gl: WebGLRenderingContext, width: number, height: number, data: Uint8Array, unit: number) {
    const texture = gl.createTexture();
    throwIfFalsey(texture, 'could not create data texture');
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

    return texture;
}

//
// <a name="setupScene"></a>
// ## setupScene
function setupScene(gl: WebGLRenderingContext, scene: Scene, uniforms: any) {
    const { camera, materials, lights } = scene;

    const cameraMatrix = 
    zRotate4_4(yRotate4_4(xRotate4_4(translate4_4(identity4_4(), camera.point[0], camera.point[1], camera.point[2]), camera.rotation[0]), camera.rotation[1]), camera.rotation[2]);

    const scale = Math.tan(Math.PI * (camera.fieldOfView * 0.5) / 180);

    const width = (gl.canvas as any).clientWidth;
    const height = (gl.canvas as any).clientHeight;

    const aspectRatio =  width / height;
    const origin = [
        cameraMatrix[12],
        cameraMatrix[13],
        cameraMatrix[14],
    ] as Matrix3_1;

    uniforms.aspectRatio(aspectRatio);
    uniforms.cameraMatrix(cameraMatrix);
    uniforms.cameraPos(origin);
    uniforms.height(height);
    uniforms.scale(scale);
    uniforms.width(width);

    materials.forEach((m, i) => {
        uniforms.materials[i].colourOrAlbedo(m.colour);
        uniforms.materials[i].ambient(m.ambient);
        uniforms.materials[i].diffuseOrRoughness(m.diffuse);
        uniforms.materials[i].specularOrMetallic(m.specular);
        // u.materials[i].refraction(m.refraction);
        uniforms.materials[i].isTranslucent(m.isTranslucent);
    });

    lights.forEach((l, i) => {
        uniforms.pointLights[i].point(l);
    });
}

//
// function that creates and binds a data texture
function setupGenericDataTexture(gl: WebGLRenderingContext, uniforms: any, encoding: TextureDataStructureEncoding, unit: number) {
    const texture = createDataTexture(gl, encoding.width, encoding.height, encoding.data, unit);

    uniforms[encoding.targetUniformStruct].length(encoding.length);
    uniforms[encoding.targetUniformStruct].size(encoding.size);
    uniforms[encoding.targetUniformSampler](texture, unit);

    return texture;
}

function updateGenericDataTexture(gl: WebGLRenderingContext, uniforms: any, encoding: TextureDataStructureEncoding, texture: WebGLTexture, unit: number) {
  const { data, height, width } = encoding;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

  uniforms[encoding.targetUniformStruct].length(encoding.length);
  uniforms[encoding.targetUniformStruct].size(encoding.size);
  uniforms[encoding.targetUniformSampler](texture, unit);

  return texture;
}

function setupSpheres(gl: WebGLRenderingContext, scene: Scene, uniforms: any, unit: number) {
    const spheres = encodeSpheres(scene);
    return setupGenericDataTexture(gl, uniforms, spheres, unit);
}

function updateSpheres(gl: WebGLRenderingContext, scene: Scene, uniforms: any, texture: WebGLTexture, unit: number) {
    const spheres = encodeSpheres(scene);
    return updateGenericDataTexture(gl, uniforms, spheres, texture, unit);
}

function setupTriangles(gl: WebGLRenderingContext, scene: Scene, uniforms: any, unit: number) {
    const triangles = encodeTriangles(scene);
    return setupGenericDataTexture(gl, uniforms, triangles, unit);
}

function updateTriangles(gl: WebGLRenderingContext, scene: Scene, uniforms: any, texture: WebGLTexture, unit: number) {
    const triangles = encodeTriangles(scene);
    return updateGenericDataTexture(gl, uniforms, triangles, texture, unit);
}

function setupDataTextures(gl: WebGLRenderingContext, scene: Scene, uniforms: any) {
  const spheres = setupSpheres(gl, scene, uniforms, 1);
  const triangles = setupTriangles(gl, scene, uniforms, 3);

    return {
      spheres,
      triangles,
    };
}
