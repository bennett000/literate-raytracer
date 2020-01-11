// ## Utility Functions
// In order to make things more readable and avoid excessive duplication we want to have
// some functions that contain that repetition.  These are our utility functions
//
// <a name="throwIfFalsey"></a>
// ## Throw If Falsey
// Throw an error if `thingToTest` is false like
// _optionally_ we'll take a custom `Error` constructor
function throwIfFalsey(thingToTest: unknown, reason: string, Ctor = Error): asserts thingToTest {
  if (!thingToTest) {
    throw new Ctor(`Literate Ray Tracer: ${reason}`);
  }
}

//
// <a name="getUniformLocation"></a>
// ## getUniformLocation
//
// gets and validates that we got a uniform from our webgl program
// there are more graceful ways to handle GL failures than throwing
// and we'll be upgrading this later
function getUniformLocation(gl: WebGLRenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error('could not get uniform location ' + name);
    }
    return location;
}

interface UniformDescription {
    length?: number;
    name: string;
    type: string;
    children?: UniformDescription[];
}

interface UniformSetter {
    (value: any, unit?: any): void;
}

interface UniformDictionary {
    [key: string]: UniformSetter | UniformDictionary | UniformSetter[] | UniformDictionary[];
}

//
// <a name="getUniformSetters"></a>
// ## getUniformSetters
//
// this function creates and object that models the uniforms in a given webgl
// program
//
// if a uniform is a scalar/primitive (int, float, vec3, mat4) the object
// will have a property with the same name, its value is a function that will set
// the uniform
//
// if the uniform is an array, the object will have a property with the same name,
// that is an array who's elements will be of the array's type
//
// if the unform is a struct type, the object will have a property with the same name,
// its value will be a JS object who's properties will be of the types outlined in the
// struct
//
// example:
//
// WebGL
//
// ```
// uniform vec3 v3;
// uniform int values[2];
// 
// struct Thing {
//   int prop1;
//   float prop2;
// } 
// uniform Thing thing;
// ```
// would convert to a JS object that looks like:
//
// ```
// {
//   v3: (arrayValue) => // sets uniform for you
//   values: [(value) => /* sets uniform */, (value) => /* sets uniform */]
//   thing: {
//     prop1: (value) => // sets uniform
//     prop2: (value) => // sets uniform
//   } 
// }
// ```
//
// This allows the consumer to set things at a very granual (and inexpensive) level
//
function getUniformSetters(gl: WebGLRenderingContext, program: WebGLProgram, desc: UniformDescription[]) {
    const setVec3 = (loc: WebGLUniformLocation, v: Matrix3_1) => {
        gl.uniform3fv(loc, v);
    };
    const setFloat = (loc: WebGLUniformLocation, f: number) => {
        gl.uniform1f(loc, f);
    };
    const setInt = (loc: WebGLUniformLocation, i: number) => {
        gl.uniform1i(loc, i);
    };

    const buildSetter = (
        { name, type }: UniformDescription,
        prefix: string,
        postfix: string,
    ) => {
        const loc = getUniformLocation(gl, program, prefix + name + postfix);
        switch (type) {
            case 'int':
                return (value: number) => setInt(loc, value);
            case 'float':
                return (value: number) => setFloat(loc, value);
            case 'mat4':
                return (value: Matrix4_4) => gl.uniformMatrix4fv(loc, false, value);
            case 'sampler2D':
                return (texture: WebGLTexture, unit: number) => {
                    gl.activeTexture((gl as any)[`TEXTURE${unit}`]);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.uniform1i(loc, unit);
                };
            case 'vec3':
                return (value: Matrix3_1) => setVec3(loc, value);
            default:
                throw new Error('unsupported GLSL type ' + type);
        }
    };

    const createReduceUniformDescription = (prefix: string) => (
        dictionary: UniformDictionary, 
        d: UniformDescription
    ) => {
        const { children, length, name } = d;
        if (length && children && children.length) {
            const arr: UniformDictionary[] = []
            dictionary[name] = arr;
            for (let i = 0; i < length; i += 1) {
                arr.push(children.reduce(
                    createReduceUniformDescription(prefix + name + `[${i}].`), 
                    {}
                ));
            }
        } else if (length) {
            const arr: UniformSetter[] = []
            dictionary[name] = arr;
            for (let i = 0; i < length; i += 1) {
                arr.push(buildSetter(d, prefix, `[${i}]`));
            }
        } else if (children && children.length) {
            dictionary[name] = children.reduce(
                createReduceUniformDescription(prefix + name + '.'),
                {}
            );
        } else {
            dictionary[name] = buildSetter(d, prefix, '');
        }

        return dictionary;
    };
     
    return desc.reduce(createReduceUniformDescription(''), {});
}

//
// <a name="tryCatch"></a>
// ## tryCatch
//
// `try`/`catch` is notoriously hard for JS engines to optimize
// let's hack around that
// NOTE: We should avoid throwing in general, so hopefully we do not
// use this too much
function tryCatch(thing: Function, happy: (...args: any[]) => void, sad: (error: Error) => void) {
    try {
        happy(thing());
    } catch (e) {
        sad(e);
    }
}

//
// <a name="glslAccessor"></a>
// ## glslAccessor
//
// WebGL 1.0 shaders do not allow us to arbitrarily access an array elemetn.  For example
//
// ```
// uniform int a;
// uniform int foo[5];
//
// void main() {
//   int b = foo[a]; // NOT ALLOWED 😭
// }
// ```
//
// we can work around this limitation by writing a switch/case statement, which
// we also don't have, so we'll use ifs 😂
// we don't want to write those by hand if we don't have to though
//
// let's automate
function glslAccessor(type: string, uniformName: string, functionName: string, length: number, defaultElement = 0) {
    // setup a string with the function declaration
    let str = `${type} ${functionName}(int index) {
`;

    // write an if that returns all the known values
    for (let i = 0; i < length; i += 1) {
        str += `  if (index == ${i}) {
    return ${uniformName}[${i}];
  }
`; 
    }

    // return the default in all other cases
    str += `  return ${uniformName}[${defaultElement}];
}
`;

  return str;
}

//
// <a name="fourByteFromFloat"></a>
// ## fourByteFromFloat
//
// we're going to be packing data into WebGL textures and that's going to require
// us to encode JavaScript floats into 4x unsigned byte RGBA values
function fourByteFromFloat(
  float: number, bytes = new Uint8Array(4), unsigned = false
) {
  const positiveFloat = float < 0 ? float * -1 : float;
  const bit0 = positiveFloat % 256;
  let bit1 = Math.floor(positiveFloat / 256);
  let bit2 = 0;
  let bit3 = 0;

  if (bit1 > 255) {
    bit2 = Math.floor(positiveFloat / 256 / 256);
    bit1 = bit1 % 256;
  }

  if (bit2 > 255) {
    bit3 = Math.floor(positiveFloat / 256 / 256 / 256);
    bit2 = Math.floor(positiveFloat / 256 / 256) % 256;
  }

  if (bit3 > 255) {
    bit3 = 255;
  }

  if (unsigned === false) {
    if (bit3 > 127) {
      bit3 = 127;
    }
    if (float < 0) {
      if (bit3 === 0) {
        bit3 = 255;
      } else {
        bit3 += 127
      }
    }
  }

  bytes[0] = bit3;
  bytes[1] = bit2;
  bytes[2] = bit1;
  bytes[3] = bit0;

  return bytes;
}
