// ## GL 
//
// WebGL is an incredibly flexibile tool.  Consequently we need to have some opinions about
// how we're going to use it
interface ProgramContext {
    positionBuffer: WebGLBuffer;
    positionLocation: number;
    program: WebGLProgram;
}

//
// <a name="getGlError"></a>
// ### getGlError
//
// sometimes we'll want to query WebGL for errors
function getGlError(gl: WebGLRenderingContext) {
  const error = gl.getError();
  switch (error) {
    case gl.NO_ERROR:
      return '';
    case gl.INVALID_ENUM:
      return 'invalid enum';
    case gl.INVALID_VALUE:
      return 'invalid value';
    case gl.INVALID_OPERATION:
      return 'invalid operation';
    case gl.INVALID_FRAMEBUFFER_OPERATION:
      return 'invalid framebuffer operation';
    case gl.OUT_OF_MEMORY:
      return 'out of memory';
    case gl.CONTEXT_LOST_WEBGL:
      return 'lost context';
    default:
      return 'unknown GL error';
  }
}


//
// <a name="createShader"></a>
// ### createShader
//
// We need a mechanism for compiling shader programs and checking if they failed to compile.
// In this case `type` is a property of the brower's `WebGLRenderingContext`
function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  // WebGL is flexible.  Before we even compile the sahder we need to allocate
  // a place to store it in the GPU, lets do that now
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }

  // with some memory in hand we can load in some source code and compile
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  // we need to manually confirm that everything is okay
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  // if we fail there might be some more info
  if (gl.isContextLost() === false) {
    // if it's not okay let's figure out why
    const log = gl.getShaderInfoLog(shader);
    // and we'll clean up
    gl.deleteShader(shader);

    console.error('raw shader log: ' + log);
  }

  return null;
}

//
// <a name="crateProgram"></a>
// ### createProgram
//
// WebGL programs have two components, vertex shaders, and fragment shaders.
// Because WebGL is flexibile we could conceivably use one vertex shader with
// multiple fragment shaders, or vice versa.
//
// In order to make a working program we need to `link` a vertex shader and a
// fragment shader
function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  // first let's get some memory to store the program
  const program = gl.createProgram();
  // and make sure we get that memory
  if (!program) {
    return null;
  }

  // then we can attach the two shaders via reference
  gl.attachShader(program, vertexShader);
  let err = getGlError(gl);
  if (err) {
    console.error('Attach Vertex GL Error', err)
    return null;
  }
  gl.attachShader(program, fragmentShader);
  err = getGlError(gl);
  if (err) {
    console.error('Attach Fragment GL Error', err)
    return null;
  }

  // and finally call link
  gl.linkProgram(program);
  err = getGlError(gl);
  if (err) {
    console.error('Link GL Error', err)
    return null;
  }

  // Again, we need to manually check for success
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  // if we fail there might be some more info
  if (gl.isContextLost() === false) {
    // and if things are bad, let's find out why
    const log = 'Vertex log: ' + gl.getShaderInfoLog(vertexShader) + '\n' +
      'Fragment log: ' + gl.getShaderInfoLog(fragmentShader) + '\n' +
      'Program log: ' + gl.getProgramInfoLog(program) + '\n' +
      'GL Error: ' + getGlError(gl);

    // and clean up
    gl.deleteProgram(program);
    console.error('raw program log: ' + log);
  }
  return null;
}

//
// <a name="bindProgram"></a>
// ### bindProgram
//
// Our shader approach is fairly simple and we don't need much flexibility
// `bindProgram` sets up an opinionated vertex shader and a somewhat more flexibile
// fragment shader..
function bindProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string, logger: Log): null | ProgramContext {

  // let's compile the shaders and link the program
  //
  // first create the vertex shader and bail if it fails
  logger.log('Compiling vertex shader');
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  if (!vs) {
    return null;
  }
  // then we'll create the fragment shader and bail if it fails
  logger.log('Compiling fragment shader');
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!fs) {
    return null;
  }

  // finally we'll link the shaders... and bail if they fail
  logger.log('Linking shaders');
  const program = createProgram(gl, vs, fs);
  if (!program) {
    return null;
  }
  logger.log('Binding vertex attributes');

  // our [vertex shader](./shader.html#vertexShader "our vertex shader's source") is strongly 
  // opinionated. We need to bind our position data for a quad (two triangles) to the program
  // but first we need to get the position location
  const positionLocation = gl.getAttribLocation(program, 'a_position');

  // Next we need some memory in the GPU to upload the data to
  const positionBuffer = gl.createBuffer();
  // we might not get memory, if not, we'll return null
  if (!positionBuffer) {
    return null;
  }

  // okay, tell the GPU/WebGL where in memory we want to upload
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // then let's upload six vertices for the two triangles that will make up our
  // rectangular display
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
    -1, 1,
    1, -1,
    1, -1,
    -1, 1,
    1, 1,
  ]), gl.STATIC_DRAW);

  // because we have a simple workflow we can mostly assume we're using this opinionated
  // program
  gl.useProgram(program);

  // finally let's wrap up the impportant bits in an object and give them to our consumer
  return {
    positionBuffer,
    positionLocation,
    program,
  };
}

//
// <a name="draw"></a>
// ### draw
//
// each time we want to render a frame we need to setup the program's data the way we want it
// then press "go".  This `draw` function is our "go" button.
function draw(gl: WebGLRenderingContext, context: ProgramContext, canvas: HTMLCanvasElement) {
  // if the screen resized, re-initatlize the scene
  if (resize(canvas)) {
    setupScene(gl, context, g_scene, g_configShader);
  }
  // clear the screen
  gl.clear(gl.COLOR_BUFFER_BIT);

  // make sure our rectangle is setup
  gl.enableVertexAttribArray(context.positionLocation);
  gl.vertexAttribPointer(context.positionLocation, 2, gl.FLOAT, false, 0, 0);

  // draw the rectangle (2 triangles, 6 vertices)
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

//
// <a name="getUniformDescription"></a>
// ### getUniformDescription
//
// what variables are bound to our program?
function getUniformDescription(shaderConfig: ConfigShader): UniformDescription[] {
  return [
    {
      name: 'aa',
      type: 'int',
    },
    {
      name: 'aspectRatio',
      type: 'float',
    },
    {
      name: 'cameraMatrix',
      type: 'mat4',
    },
    {
      name: 'cameraPos',
      type: 'vec3',
    },
    {
      name: 'globalAmbientIntensity',
      type: 'float',
    },
    {
      name: 'height',
      type: 'float',
    },
    {
      name: 'scale',
      type: 'float',
    },
    {
      name: 'shadingModel',
      type: 'int',
    },
    {
      name: 'width',
      type: 'float',
    },
    {
      children: [
        {
          name: 'colourOrAlbedo',
          type: 'vec3',
        },
        {
          name: 'ambient',
          type: 'float',
        },
        {
          name: 'diffuseOrRoughness',
          type: 'float',
        },
        {
          name: 'isTranslucent',
          type: 'int',
        },
        {
          name: 'refraction',
          type: 'float',
        },
        {
          name: 'specularOrMetallic',
          type: 'float',
        },
      ],
      length: shaderConfig.materialCount,
      name: 'materials',
      type: 'struct',
    },
    {
      children: [
        {
          name: 'point',
          type: 'vec3',
        },
      ],
      length: shaderConfig.lightCount,
      name: 'pointLights',
      type: 'struct'
    },
    {
      children: [
        {
          name: 'material',
          type: 'int',
        },
        {
          name: 'point',
          type: 'vec3',
        },
        {
          name: 'radius',
          type: 'float',
        },
      ],
      length: shaderConfig.sphereCount,
      name: 'spheres',
      type: 'struct',
    },
    {
      children: [
        {
          name: 'length',
          type: 'int',
        },
        {
          name: 'size',
          type: 'int',
        },
      ],
      name: 'triangles',
      type: 'struct',
    },
    {
      name: 'trianglesData',
      type: 'sampler2D',
    },
  ];
}
