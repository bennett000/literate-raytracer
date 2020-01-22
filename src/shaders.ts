// ## Shader
// Shaders are programs that run on the GPU.  In OpenGL and specifically WebGL
// there are two different programs that work together.  There's a vertex shader
// and there's a fragment shader.  They're both part of a _rasterization_ pipeline
//
// we're not rasterizing (much).
//
// Instead of rasterizing 3D objects as OpenGL intended, we'll be rasterizing a
// rectangle the size of our view 😂
//
// Normally in OpenGL we'd run a _vertex_ shader on each point in a triangle, and for each
// _fragment_ (pixel) in the triangle, we'd run a _fragment_ shader to compute the colour.
//
// * Our vertex shader will essentially do "nothing", and we can not think about it too much
// * Our fragment shader will run on each pixel and is essentially the "body" of this application
//
// For more information on [shaders checkout WebGL Fundamentals](https://webglfundamentals.org/ "Deeply learn about shaders")
//
// <a name="vertexShader"></a>
// ### Vertex Shader
//
// Our vertex shader code is a simple string
function getVertexSource() {
  return `` +
    // Vertex shaders can take two types of input
    // * `attribute`s
    // *  uniforms`
    //
    // In this app we can effectively ignore the vertex shader and we won't be binding
    // and uniforms to it
    //
    // The only attributes we'll use are the 3 points of each of the 2 triangles
    // that make up our rectangle
    `
    attribute vec4 a_position; ` +
    // our main function in this version of GLSL has one obligation and that is to set
    // `gl_Position` to some value.  `gl_Position` is a `vec4` x/y/z/w
    `    void main() {
       gl_Position = a_position;
    }
`;
}

//
// <a name="fragmentShader"></a>
// ### Fragment Shader
//
// The fragment shader is the body of our application it figures out what colour to make
// each pixel
function getFragmentSource(config: ConfigShader) {
  // for brevity's sake break out the config values
  const { 
    aa, acceleration, bg, defaultF0, epsilon, infinity,
    lightCount, packedFloatMultiplier, 
    octreeNodeIterationMax, octreeNodeMaxContents, phongSpecularExp, 
    priorityQueueMax, shadingModel, sphereCount, triangleCount,
  } = config;

  let shadingFragment;
  let shadingDeclarations;
  if (shadingModel === 0) {
    shadingDeclarations = getShaderPbrDeclarations()
    shadingFragment = getShaderPbr(defaultF0, lightCount);
  } else {
    shadingDeclarations = getShaderPhongDeclarations();
    shadingFragment = getShaderPhong(phongSpecularExp, lightCount);
  }

  // Then we'll get into the source
  // we start by telling WebGL what level of precision we require with floats
  // we could probably get away with highp but mediump is more universally supported
  return `precision mediump float; ` +

// we should load up our structs
getShaderStructs({ priorityQueueMax }) +

// we have a few constants, `bg`, the background colour is configurable
`
const vec3 bgColour = vec3(${bg.r}, ${bg.g}, ${bg.b});
const float PI = ${Math.PI};
const float refractionMedium = 1.0;
` +

// uniforms are values uploaded by javascript, there are a few essentialls here
`
uniform float aspectRatio;
uniform vec3 cameraPos;
uniform mat4 cameraMatrix;
uniform float height;
uniform float scale;
uniform float width;
` + 
     
// we have a few "look up" tables here
// GLSL arrays in this version aren't so much random access chunks of memory
// as they are "fixed access" chunks of memory.  GLSL wants to know up front
// exactly how much space to use.
//
// _Additionally_ outside of loops we are _not allowed_ to reference arrays 
// with variables.  This is a seemingly severe limitation but we can hack
// around it
//
//
`
uniform PointLight pointLights[${lightCount}];

uniform sampler2D extentsData ;
uniform TextureDataStructure extents;

uniform sampler2D materialsData ;
uniform TextureDataStructure materials;

uniform sampler2D octreeData ;
uniform TextureDataStructure octree;

uniform sampler2D spheresData;
uniform TextureDataStructure spheres;

uniform sampler2D trianglesData;
uniform TextureDataStructure triangles;
` +

// in GLSL if you want to call your functions "out of the order their written" you'll
// need to declare them upfront
`
float sphereIntersection(Sphere sphere, Ray ray);
TriangleDistance triangleIntersection(Triangle triangle, Ray ray);
SphereDistance intersectSpheres(Ray ray, bool useAnyHit);
TriangleDistance intersectTriangles(Ray ray, bool useAnyHit);
vec3 cast1(Ray ray);
vec3 cast2(Ray ray);
vec3 cast3(Ray ray);
bool isLightVisible(vec3 pt, vec3 light, vec3 normal);
vec3 primaryRay(float xo, float yo);
Material getMaterial(int index);
Triangle getTriangle(int index);
Sphere getSphere(int index);
float getExtents(int id, int plane, int index);
int getExtentsMeshId(int id);
int getExtentsMeshType(int id);
int getOctreeNodeExtentsId(int id);
Hit bvhIntersection(Ray ray);
Hit miss(Ray ray);
bool getOctreeNodeIsLeaf(int index);
int getOctreeNodeChildIndex(int index, int childIndex);
void priorityQueuePush(PriorityQueue q, PriorityQueueElement elements[${priorityQueueMax}], int octree, float distance);
PriorityQueueElement createPriorityQueueElement(int index);
PriorityQueueElement priorityQueuePop(PriorityQueue q, PriorityQueueElement elements[${priorityQueueMax}]);
int getOctreeNodeExtentsListId(int index, int element);
` +
getShaderUtilityDeclarations() +
shadingDeclarations +
glslAccessor('PriorityQueueElement', 'getPriorityQueueElement', priorityQueueMax) +

// acceleration data structure requirements
`
vec3 planeSetNormals[${acceleration.numPlaneSetNormals}];

void initPlaneSetNormals() {
    planeSetNormals[0] = vec3(1.0, 0.0, 0.0);
    planeSetNormals[1] = vec3(0.0, 1.0, 0.0); 
    planeSetNormals[2] = vec3(0.0, 0.0, 1.0); 
    planeSetNormals[3] = vec3( ${Math.sqrt(3.0) / 3.0},  ${Math.sqrt(3.0) / 3.0}, ${Math.sqrt(3.0) / 3.0}); 
    planeSetNormals[4] = vec3(${-Math.sqrt(3.0) / 3.0},  ${Math.sqrt(3.0) / 3.0}, ${Math.sqrt(3.0) / 3.0}); 
    planeSetNormals[5] = vec3(${-Math.sqrt(3.0) / 3.0}, ${-Math.sqrt(3.0) / 3.0}, ${Math.sqrt(3.0) / 3.0}); 
    planeSetNormals[6] = vec3( ${Math.sqrt(3.0) / 3.0}, ${-Math.sqrt(3.0) / 3.0}, ${Math.sqrt(3.0) / 3.0});
}
` + 

// customize the main function
getFragmentShaderMain(aa) +

// add the shading functions
shadingFragment +

getShaderUtility(epsilon) +

//
// <a name="primaryRay"></a>
// #### primaryRay
//
// the primaryRay function computes the primary ray from the pinhole camera location
// to the _portion of the pixel_ specified by `xo` and `yo`
`
vec3 primaryRay(float xo, float yo) {
    float px = gl_FragCoord.x;
    float py = gl_FragCoord.y;

    float x = (2.0 * (px + xo) / width - 1.0) * scale;
    float y = (2.0 * (py + yo) / height - 1.0) * scale * 1.0 / aspectRatio;

    vec3 dir = vec3(0.0, 0.0, 0.0);

    dir.x = x    * cameraMatrix[0][0] + y * cameraMatrix[1][0] + -1.0 * cameraMatrix[2][0];
    dir.y = y    * cameraMatrix[0][1] + y * cameraMatrix[1][1] + -1.0 * cameraMatrix[2][1];
    dir.z = -1.0 * cameraMatrix[0][2] + y * cameraMatrix[1][2] + -1.0 * cameraMatrix[2][2];

    Ray ray = Ray(cameraPos, normalize(dir), refractionMedium);

    return cast1(ray);
}
` +

// miss
`
Hit miss(Ray ray) {
    return Hit(
        -1.0,
        Material(vec3(0.0, 0.0, 0.0), 0.0, 0.0, 0.0, 0.0, false),
        vec3(0.0, 0.0, 0.0),
        vec3(0.0, 0.0, 0.0),
        ray
    );
}
`+
//
// <a name="trace"></a>
// #### trace
//
// the trace function checks if a ray intersects _any_ spheres _or_ triangles
// in the scene.  In the future it's ripe for "acceleration"
`
Hit trace(Ray ray) {
    SphereDistance sd = intersectSpheres(ray, false);
    TriangleDistance td = intersectTriangles(ray, false);
    if (sd.distance <= 0.0 && td.distance <= 0.0) {
        return miss(ray);
    }

    if (sd.distance >= 0.0 && td.distance >= 0.0) {
        if (sd.distance < td.distance) {
        vec3 pointAtTime = ray.point + vec3(ray.vector.xyz * sd.distance);
        vec3 normal = sphereNormal(sd.sphere, pointAtTime);

        return Hit(
            sd.distance,
            getMaterial(sd.sphere.material),
            normal,
            sd.sphere.point,
            ray
        );
        } else {
        return Hit(
            td.distance,
            getMaterial(td.triangle.material),
            td.triangle.normal,
            td.intersectPoint,
            ray
        );
        }
    }


    if (sd.distance >= 0.0) {
    vec3 pointAtTime = ray.point + vec3(ray.vector.xyz * sd.distance);
    vec3 normal = sphereNormal(sd.sphere, pointAtTime);

    return Hit(
        sd.distance,
        getMaterial(sd.sphere.material),
        normal,
        sd.sphere.point,
        ray
    );
    }

    return Hit(
        td.distance,
        getMaterial(td.triangle.material),
        td.triangle.normal,
        td.intersectPoint,
        ray
    );
}
` +

// the `castX` functions cast rays and call a surface function to
// get the colour
//
// right now they're a mess in that they are being hard code toggled
// to produce results
`
vec3 cast1(Ray ray) {
    Hit hit = trace(ray);

    if (hit.distance < 0.0) {
        return bgColour;
    }

    return surface1(hit);
}

vec3 cast2(Ray ray) {
    Hit hit = trace(ray);

    if (hit.distance < 0.0) {
        return bgColour;
    }

    return surface2(hit);
}

vec3 cast3(Ray ray) {
    Hit hit = trace(ray);

    if (hit.distance < 0.0) {
        return bgColour;
    }

    return vec3(1.0, 1.0, 1.0);
}
` +

// ray spehre intersection iterator
`
SphereDistance intersectSpheres(Ray ray, bool useAnyHit) {
    SphereDistance sd = SphereDistance(-1.0, Sphere(
        vec3(0.0, 0.0, 0.0), 
        -1.0,
        0));
    for (int i = 0; i < ${sphereCount}; i += 1) {
        Sphere s = getSphere(i);
        float dist = sphereIntersection(s, ray);
        if (dist >= 0.0) {
            // we're temporarily hacking in an object that casts no shadow 
            Material m = getMaterial(sd.sphere.material);
            if (sd.distance <= 0.0 || dist < sd.distance) {
                if (useAnyHit == false || m.isTranslucent == false) {
                    sd.distance = dist;
                    sd.sphere = s;
                }
            }
            if (useAnyHit) {
                // we're temporarily hacking in an object that casts no shadow 
                if (m.isTranslucent != false) {
                    sd.distance = dist;
                    sd.sphere = s;
                    return sd;
                }
            }
        }
    }
    return sd;
}
` +

// Ray triangle intersection iterator
`
TriangleDistance intersectTriangles(Ray ray, bool useAnyHit) {
    TriangleDistance least = TriangleDistance(
        -1.0, 
        Triangle(
            vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.0), 
            vec3(0.0, 0.0, 0.0), 
            0),
        vec3(0.0, 0.0, 0.0),
        0.0,
        0.0);

    for (int i = 0; i < ${triangleCount}; i += 1) {
        Triangle t = getTriangle(i);
        TriangleDistance td = triangleIntersection(t, ray);
        if (td.distance >= 0.0) {
            // we're temporarily hacking in an object that casts no shadow 
            Material m = getMaterial(td.triangle.material);
            if (least.distance <= 0.0 || td.distance < least.distance) {
                if (useAnyHit == false || m.isTranslucent == false) {
                    least = td;
                }
            }
            if (useAnyHit == true) {
                // we're temporarily hacking in an object that casts no shadow 
                if (m.isTranslucent != false) {
                    return td;
                }
            }
        }
    }
    return least;
}
` +

// calculate the intersection of a ray and a triangle
`
TriangleDistance triangleIntersection(Triangle triangle, Ray ray) {
    TriangleDistance td = TriangleDistance(
        -1.0, 
        triangle,
        vec3(0.0, 0.0, 0.0),
        0.0,
        0.0);

    // compute full scale normal
    vec3 v0v1 = triangle.b - triangle.a;
    vec3 v0v2 = triangle.c - triangle.a;
    vec3 pvec = cross(ray.vector, v0v2);
    float det = dot(v0v1, pvec);

    if (abs(det) < ${epsilon}) {
        return td;
    }

    float invDet = 1.0 / det;

    vec3 tvec = ray.point - triangle.a;
    float u = dot(tvec, pvec) * invDet;
    if (u < 0.0 || u > 1.0) {
        return td;
    }

    vec3 qvec = cross(tvec, v0v1);
    float v = dot(ray.vector, qvec) * invDet;
    if (v < 0.0 || (u + v) > 1.0) {
        return td;
    }

    td.u = u;
    td.v = v;
    td.distance = dot(v0v2, qvec) * invDet;
    td.intersectPoint = vec3(triangle.a.xyz + u * v0v1.xyz + v * v0v2.xyz);

    return td;
}

float sphereIntersection(Sphere sphere, Ray ray) {
    vec3 eyeToCentre = sphere.point - ray.point;
    float v = dot(eyeToCentre, ray.vector);
    float eoDot = dot(eyeToCentre, eyeToCentre);
    float discriminant = (sphere.radius * sphere.radius) - eoDot + (v * v);

    if (discriminant < 0.0) {
        return -1.0;
    }

    return v - sqrt(discriminant);
}
` +

// ray "extents" intersection

`
ExtentsIntersect extentsIntersection(
    int extentId,
    float preComputedNumerator[${acceleration.numPlaneSetNormals}],
    float preComputedDenominator[${acceleration.numPlaneSetNormals}],
    float tNear,
    float tFar,
    int planeIndex
) {
    for (int i = 0; i < ${acceleration.numPlaneSetNormals}; i += 1) {
        float di0 = getExtents(extentId, i, 0);
        float di1 = getExtents(extentId, i, 1);
        float tNearExtents = (di0 - preComputedNumerator[i]) / preComputedDenominator[i];
        float tFarExtents = (di1 - preComputedNumerator[i]) / preComputedDenominator[i];
        if (preComputedDenominator[i] < 0.0) {
            float t = tNearExtents;
            tNearExtents = tFarExtents;
            tFarExtents = t;
        }
        if (tNearExtents > tNear) {
            tNear = tNearExtents;
            planeIndex = i;
        }
        if (tFarExtents < tFar) {
            tFar = tFarExtents;
        }
        if (tNear > tFar) {
            return ExtentsIntersect(-1.0, -1.0, -1);
        }
    }
    return ExtentsIntersect(tNear, tFar, planeIndex);
}
` +

// ray bounding volume hierarchy intersection

`
Hit bvhIntersection(Ray ray) {
    float preComputedNumerator[${acceleration.numPlaneSetNormals}];
    float preComputedDenominator[${acceleration.numPlaneSetNormals}];

    for (int i = 0; i < ${acceleration.numPlaneSetNormals}; i += 1) {
        preComputedNumerator[i] = dot(planeSetNormals[i], ray.point);
        preComputedDenominator[i] = dot(planeSetNormals[i], ray.vector);
    }

    int planeIndex;
    float tNear = 0.0; 
    float tFar = ${infinity}; // tNear, tFar for the intersected extents
    
    int octreeExtentsId = getOctreeNodeExtentsId(0);
    ExtentsIntersect ei = extentsIntersection(octreeExtentsId, preComputedNumerator, preComputedDenominator, tNear, tFar, planeIndex);
    if (ei.tNear < 0.0 && ei.tFar < 0.0 && ei.planeIndex < 0) { return miss(ray);
    }

    float tHit = tFar;

    // create a priority queue
    PriorityQueueElement elements[${priorityQueueMax}];
    for (int i = 0; i < ${priorityQueueMax}; i += 1) {
        elements[i] = createPriorityQueueElement(i);
    }
    PriorityQueue pq = PriorityQueue(
        elements[0],
        0
    );

    // add the root node
    priorityQueuePush(pq, elements, 0, ${infinity});

    for (int i = 0; i < ${octreeNodeIterationMax}; i += 1) {
        PriorityQueueElement node = priorityQueuePop(pq, elements);
        if (node.index == -1) {
            return miss(ray);
        }

        if (getOctreeNodeIsLeaf(node.octree)) {
            for (int j = 0; j < ${octreeNodeMaxContents}; j += 1) {
                int extentId = getOctreeNodeExtentsListId(node.octree, j);
                if (extentId == -1) {
                    break;
                }
                // IT'S GO TIME HERE !!!
                int meshId = getExtentsMeshId(extentId);
                int meshType = getExtentsMeshType(extentId);
                if (meshType == 0) {
                    // sphere
                    Sphere s = getSphere(meshId);
                    float dist = sphereIntersection(s, ray);
                    if (dist >= 0.0) {
                        // we have a hit
                        Material m = getMaterial(s.material);
                        vec3 pointAtTime = ray.point + vec3(ray.vector.xyz * dist);
                        vec3 normal = sphereNormal(s, pointAtTime);
                        return Hit(
                            dist,
                            m,
                            normal,
                            s.point,
                            ray
                        );
                    }
                } else {
                    // triangle
                    Triangle t = getTriangle(meshId);
                    TriangleDistance td = triangleIntersection(t, ray);
                    if (td.distance >= 0.0) {
                        // we have a hit
                        return Hit(
                            td.distance,
                            getMaterial(t.material),
                            t.normal,
                            td.intersectPoint,
                            ray
                        );
                    }
                }
            }
        } else {
            for (int j = 0; j < 8; j += 1) {
                float tNearChild = 0.0;
                float tFarChild = tFar;
                int childId = getOctreeNodeChildIndex(node.octree, j);
                if (childId >= 0) {
                    int childExtentsId = getOctreeNodeExtentsId(childId);
                    if (childExtentsId >= 0) {
                        ExtentsIntersect intersect = extentsIntersection(childExtentsId, preComputedNumerator, preComputedDenominator, tNearChild, tFarChild, planeIndex);
                        float t;
                        if (intersect.tNear < 0.0 && intersect.tFar >= 0.0) {
                            t = intersect.tFar;
                        } else {
                            t = intersect.tNear;
                        }
                        priorityQueuePush(pq, elements, childId, t);
                    }
                }
            }
        }
    }

    return miss(ray);
}
` +

// is there a light visible from a point? (shadows)
`
bool isLightVisible(vec3 pt, vec3 light, vec3 normal) {
    vec3 unit = normalize(light - pt);
    Ray ray = Ray(pt + vec3(normal.xyz + ${epsilon}), unit, refractionMedium);
    SphereDistance sd = intersectSpheres(ray, true);

    if (sd.distance > 0.0) {
        return false;
    }

    TriangleDistance td = intersectTriangles(ray, true);

    return td.distance < 0.0;
}
` +


// we will need some functions to transform data in data structures to more meaningful
// structures we can work with
//
// getTriangle

`
Triangle getTriangle(int index) {
    int expandedIndex = index * triangles.size;
    float len = float(triangles.size * triangles.length);

    vec3 a = vec3(
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 0, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 1, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 2, len)), false) / ${packedFloatMultiplier}
    );

    vec3 b = vec3(
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 3, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 4, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 5, len)), false) / ${packedFloatMultiplier}
    );

    vec3 c = vec3(
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 6, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 7, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 8, len)), false) / ${packedFloatMultiplier}
    );

    vec3 normal = vec3(
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 9, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 10, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 11, len)), false) / ${packedFloatMultiplier}
    );

    int material = int(fourByteToFloat(texture2D(trianglesData, indexToCoord(expandedIndex + 12, len)), false));

    return Triangle(a, b, c, normal, material);
}
` +

// We'll want a function for fetching spheres
`
Sphere getSphere(int index) {
    int expandedIndex = index * spheres.size;
    float len = float(spheres.size * spheres.length);

    vec3 centre = vec3(
        fourByteToFloat(texture2D(spheresData, indexToCoord(expandedIndex + 0, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(spheresData, indexToCoord(expandedIndex + 1, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(spheresData, indexToCoord(expandedIndex + 2, len)), false) / ${packedFloatMultiplier}
    );

    float radius = fourByteToFloat(texture2D(spheresData, indexToCoord(expandedIndex + 3, len)), false) / ${packedFloatMultiplier};
    int material = int(fourByteToFloat(texture2D(spheresData, indexToCoord(expandedIndex + 4, len)), false));

    return Sphere(centre, radius, material);
}` +

// We'll want a function for fetching materials
`
Material getMaterial(int index) {
    int expandedIndex = index * materials.size;
    float len = float(materials.size * materials.length);

    vec3 colourOrAlbedo = vec3(
        fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 0, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 1, len)), false) / ${packedFloatMultiplier},
        fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 2, len)), false) / ${packedFloatMultiplier}
    );

    float ambient = fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 3, len)), false) / ${packedFloatMultiplier};
    float diffuseOrRough = fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 4, len)), false) / ${packedFloatMultiplier};
    float specularOrMetal = fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 5, len)), false) / ${packedFloatMultiplier};
    float refraction = fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 6, len)), false) / ${packedFloatMultiplier};
    bool isTranslucent = false;
    if (int(fourByteToFloat(texture2D(materialsData, indexToCoord(expandedIndex + 7, len)), false)) == 1) {
        isTranslucent = true;
    }

    return Material(colourOrAlbedo, ambient, diffuseOrRough, specularOrMetal, refraction, isTranslucent);
}` +

// We'll want a function for getting extents information
`
float getExtents(int id, int plane, int index) {
    int expandedIndex = id * octree.size;
    float len = float(extents.size * extents.length);
    return fourByteToFloat(
        texture2D(extentsData, indexToCoord(expandedIndex + plane * 2 + index, len)), 
        false
    );
}
` +

// We'll want a function for getting extents mesh information
`
int getExtentsMeshId(int id) {
    int expandedIndex = id * octree.size;
    float len = float(extents.size * extents.length);
    return int(fourByteToFloat(
        texture2D(extentsData, indexToCoord(expandedIndex, len)), 
        false
    ));
}
` +

// We'll want a function for getting extents mesh type information
`
int getExtentsMeshType(int id) {
    int expandedIndex = id * octree.size;
    float len = float(extents.size * extents.length);
    return int(fourByteToFloat(
        texture2D(extentsData, indexToCoord(expandedIndex + 1, len)), 
        false
    ));
}
` +

// We'll want a function for getting octreeNodeExtentsId
`
int getOctreeNodeExtentsId(int index) {
    int expandedIndex = index * octree.size;
    float len = float(octree.size * octree.length);
    return int(
        fourByteToFloat(
            texture2D(octreeData, indexToCoord(expandedIndex + 9, len)), 
            false
        )
    );
}
` +

// We'll want to get the start of the node's contents' extents
`
int getOctreeNodeExtentsListId(int index, int element) {
    int expandedIndex = index * octree.size;
    float len = float(octree.size * octree.length);
    return int(
        fourByteToFloat(
            texture2D(octreeData, indexToCoord(expandedIndex + element + 10, len)), 
            false
        )
    );
}
` +

// We'll want a function for getting octreeNodeIsLeaf
`
bool getOctreeNodeIsLeaf(int index) {
    int expandedIndex = index * octree.size;
    float len = float(octree.size * octree.length);
    int flag = int(
        fourByteToFloat(
            texture2D(octreeData, indexToCoord(expandedIndex, len)), 
            false
        )
    );
    if (flag == 1) {
        return true;
    } else {
        return false;
    }
}
` +

// We'll want a function for getting octreeNodeChildIndex
`
int getOctreeNodeChildIndex(int index, int childIndex) {
    int expandedIndex = index * octree.size;
    float len = float(octree.size * octree.length);
    return int(
        fourByteToFloat(
            texture2D(octreeData, indexToCoord(expandedIndex + 1 + childIndex, len)), 
            false
        )
    );
}
` +

`
PriorityQueueElement createPriorityQueueElement(int index) {
    return PriorityQueueElement(index, -1, 0.0, -1);
}
` +

`
void priorityQueuePush(PriorityQueue q, PriorityQueueElement elements[${priorityQueueMax}], int octree, float distance) {
    PriorityQueueElement newEl = getPriorityQueueElement(elements, q.length);
    q.length += 1;
    newEl.distance = distance;
    newEl.octree = octree;

    // it's a new Queue
    if (q.head.index == -1) {
        newEl.index = 0;
        q.head = newEl;

        q.length += 1;
        return;
    }

    // time for a new head
    if (distance < q.head.distance) {
        newEl.next = q.head.index;
        q.head = newEl;

        q.length += 1;
        return;
    }

    // it's the new tail
    if (q.head.next == -1) {
        q.head.next = newEl.index;

        q.length += 1;
        return;
    }

    // find the place to insert
    PriorityQueueElement current = q.head;
    for (int i = 0; i < ${priorityQueueMax}; i += 1) {
        PriorityQueueElement next = getPriorityQueueElement(elements, current.next);
        if (distance < next.distance) {
            newEl.next = next.index;
            current.next = newEl.index;

            q.length += 1;
            return;
        }

        if (next.next == -1) {
            next.next = newEl.index;

            q.length += 1;
            return;
        }

        current = next;
    }
}
` +

`
PriorityQueueElement priorityQueuePop(PriorityQueue q, PriorityQueueElement elements[${priorityQueueMax}]) {
    PriorityQueueElement ret = q.head;
    if (ret.next == -1) {
        return ret;
    }
    q.head = getPriorityQueueElement(elements, ret.next);
    return ret;
}
` +

`
`;

}
