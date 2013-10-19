// # Setup
var c = document.getElementById('c'),
    width = 640,
    height = 480;

c.width = width;
c.height = height;

var intersection = {
    sphere: sphereIntersection
};

// Get a context in order to generate a proper data array. We aren't going to
// use traditional Canvas drawing functions like `fillRect` - instead this
// raytracer will directly compute pixel data and then put it into an image.
var ctx = c.getContext('2d'),
    data = ctx.getImageData(0, 0, width, height);

var lights = [{ x: -30, y: 2, z: 2 }];

var objects = [];
for (var x = 0; x < 2; x++) {
    for (var y = 0; y < 2; y++) {
        for (var z = 0; z < 2; z++) {
            objects.push({
                type: 'sphere',
                point: {
                    x: 2 - x * 3,
                    y: 2 + y * 3,
                    z: -5 - z * 2
                },
                color: {
                    x: 255,
                    y: 255,
                    z: 255
                },
                specular: 0.2, // Math.random() > 0.8 ? Math.random() : 0,
                radius: 1
            });
        }
    }
}

function randomColor() {
    return {
        x: Math.random() * 255,
        y: Math.random() * 255,
        z: Math.random() * 255
    }
}

var camera = {
    point: {
        x: 0,
        y: 1.8,
        z: 10
    },
    fieldOfView: 45,
    vector: {
        x: 0,
        y: 3,
        z: 0
    }
};

// # Throwing Rays
//
// For each pixel in the canvas, there needs to be at least one ray of light
// that determines its color by bouncing through the scene.
var eyeVector = Vector.unitVector(Vector.subtract(camera.vector, camera.point)),
    fovRadians = Math.PI * (camera.fieldOfView / 2) / 180,
    halfWidth = Math.tan(fovRadians),
    halfHeight = (height/width) * halfWidth,
    camerawidth = halfWidth * 2,
    cameraheight = halfHeight * 2,
    pixelWidth = camerawidth / (width - 1),
    pixelHeight = cameraheight / (height - 1),
    vpRight = Vector.unitVector(Vector.crossProduct(eyeVector, Vector.UP)),
    vpUp = Vector.unitVector(Vector.crossProduct(vpRight, eyeVector));

var index, ray, color;
for (var x = 0; x < width; x++) {
    for (var y = 0; y < height; y++) {

        var xcomp = Vector.scale(vpRight, (x * pixelWidth) - halfWidth),
            ycomp = Vector.scale(vpUp, (y * pixelHeight) - halfHeight);

        ray = {
            point: camera.point,
            vector: Vector.unitVector(Vector.add(eyeVector, xcomp, ycomp))
        };

        color = trace(ray, 0);
        index = (x * 4) + (y * width * 4),
        data.data[index + 0] = color.x;
        data.data[index + 1] = color.y;
        data.data[index + 2] = color.z;
        data.data[index + 3] = 255;
    }
}

// Now that each ray has returned and populated the `data` array with
// correctly lit colors, fill the canvas with the generated data.
ctx.putImageData(data, 0, 0);

// ## Sphere
//
// Spheres are one of the simplest objects for rays to interact with, since
// the geometrical math for finding intersections and reflections with them
// is pretty straightforward.
function sphereIntersection(sphere, ray) {

    var eye_to_center = Vector.subtract(sphere.point, ray.point),
        // the length of a
        // hypoteneuse of a right triangle with points
        // at the eye and the center of the circle, and a right
        // angle at the other point.
        v = Vector.dotProduct(eye_to_center, ray.vector),
        eoDot = Vector.dotProduct(eye_to_center, eye_to_center),
        discriminant = (sphere.radius * sphere.radius) - eoDot + (v * v);

    if (discriminant < 0) {
        return;
    } else {
        return v - Math.sqrt(discriminant);
    }
}

function sphereNormal(sphere, pos) {
    return Vector.unitVector(
        Vector.subtract(pos, sphere.point));
}

function intersectScene(ray) {
    return objects.reduce(function(mem, object) {
        var dist = intersection[object.type](object, ray);
        if (dist === undefined) return mem;
        if (dist < mem[0]) {
            return [dist, object];
        } else {
            return mem;
        }
    }, [Infinity, null]);
}

function trace(ray, depth) {
    if (depth > 3) return;

    ray.hit = null;

    var distObject = intersectScene(ray);

    if (distObject[0] === Infinity) {
        return Vector.WHITE;
    }

    var dist = distObject[0],
        object = distObject[1];

    var pointAtTime = Vector.add(ray.point, Vector.scale(ray.vector, dist));

    return surface(ray, object, pointAtTime, sphereNormal(object, pointAtTime), depth);
}

function visibleLight(pt) {
    return function(light) {
        return intersectScene({
            point: pt,
            vector: Vector.unitVector(Vector.subtract(pt, light))
        })[1] !== null;
    };
}

function surface(ray, object, pointAtTime, normal, depth) {
    var b = object.color,
        c = Vector.ZEROcp();
    var lambertCoefficient = 0.8,
        reflectance = object.specular,
        ambient = Math.max(1 - reflectance - lambertCoefficient, 0);

    var lambertAmount = 0;
    lights
        .filter(visibleLight(pointAtTime))
        .forEach(function(lightPoint) {
            var contribution = Vector.dotProduct(Vector.unitVector(
                Vector.subtract(lightPoint, pointAtTime)), normal);
            if (contribution > 0) lambertAmount += contribution;
        });

    if (object.specular) {
        var reflectedRay = {
            point: pointAtTime,
            vector: Vector.reflectThrough(ray.vector, normal)
        };
        var reflectedColor = trace(reflectedRay, ++depth);
        if (reflectedColor) {
            c = Vector.add(c, Vector.scale(reflectedColor, object.specular));
        }
    }

    lambertAmount = Math.min(1, lambertAmount);
    c = Vector.add(c, Vector.scale(b, lambertCoefficient * lambertAmount));

    c = Vector.add(c, Vector.scale(b, ambient));
    return c;
}
