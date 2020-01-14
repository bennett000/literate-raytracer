function getShaderStructs() {
  return `
` +

  // Every pixel needs to create at least one ray
  // `Ray`s are just `point`s x/y/z with a direction (`vector`), also x/y/z
  // `ior` is the "Index of Refraction" in the volume the ray was cast
`    
struct Ray {
    vec3 point;
    vec3 vector;
    float ior;
};
` +


  // `Material`s are a bit of a mess, their "shape" is shared between
  // JavaScript and GLSL, full descriptions of shape can be found in
  // [the js scene docs](scene.html#materials)
`    
struct Material {
    vec3 colourOrAlbedo;
    float ambient;
    float diffuseOrRoughness;
    float specularOrMetallic;
    float refraction;
    bool isTranslucent;
};
` +

// `Hit`s describe the intersection of a `Ray` and an object
`    
struct Hit {
    float distance;
    Material material;
    vec3 normal;
    vec3 position;
    Ray ray;
};
` +

// `Sphere`s in our case are mathematical spheres
// They are a simple point, a radius, and a pointer to an element in the `materials`
// array
`    
struct Sphere {
    vec3 point;
    float radius;
    int material;
};
` + 

// `SphereDistance` lets us return a `Sphere` and how far we are from it
`    
struct SphereDistance {
    float distance;
    Sphere sphere;
};
` + 

// `Triangle`s share a "shape" with JavaScript and are [documented here](scene.html#triangles)
`   
struct Triangle {
    vec3 a;
    vec3 b;
    vec3 c;
    vec3 normal;
    int material;
};
` +

// `TriangleDistance` lets us return a `Triangle`, how far we are from it, the
// point at which our ray intersected the triangle, and "barycentric" coordinates
// `u` and `v` for future texturing
`    
struct TriangleDistance {
    float distance;
    Triangle triangle;
    vec3 intersectPoint;
    float u;
    float v;
};
` +

// `ExtentsIntersect` describe the intersection of a ray with an extents boundary
`
struct ExtentsIntersect {
    float tNear;
    float tFar;
    int planeIndex;
};
` +

// `TextureDataStructure` describes the most basic information about how a texture is 
// encoded `length` is the number of records and `size` is the number of vec4 (RGBA)
// blocks in each record
`
struct TextureDataStructure {
    int length;
    int size;
};
` +


// `PointLight` is a wrapper around a `point`, lights will have colours in the future
`
struct PointLight {
    vec3 point;
};
` +


`
`;
}