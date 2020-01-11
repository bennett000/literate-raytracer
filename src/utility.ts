// ## Utility Functions
// Utility functions can help us make our code more readable
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
    (value: any): void;
}

interface UniformDictionary {
    [key: string]: UniformSetter | UniformDictionary | UniformSetter[] | UniformDictionary[];
}

//
// <a name="getUniformSetters"></a>
// ## getUniformSetters
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

// `try`/`catch` is notoriously hard for JS engines to optimize
// let's hack around that
function tryCatch(thing: Function, happy: (...args: any[]) => void, sad: (error: Error) => void) {
    try {
        happy(thing());
    } catch (e) {
        sad(e);
    }
}
