function getShaderUtilityDeclarations() {
    return `
bool areEqualish(float a, float b);
vec2 indexToCoord(int index, float len);
float fourByteToFloat(vec4 value, bool isUnsigned);
float sRgb8ChannelToLinear(float colour8);
vec3 sRgb8ToLinear(vec3 srgb8);
float linearChannelToSrgbF(float linear);
vec3 linearToSrgbF(vec3 linear);
vec3 sphereNormal(Sphere sphere, vec3 pos);

`;
}

function getShaderUtility(epsilon: string) {
  return `
` +

// are two floating points roughly equal?
`
bool areEqualish(float a, float b) {
    if (abs(a - b) < ${epsilon}) {
        return true;
    }
    return false;
}
` +

// we will need a function that can get random data out of textures
`
vec2 indexToCoord(int index, float len) {
    return vec2(
        (float(index + 0) + 0.5) / len,
        0.0
    );
}

` + 

// we need a function to convert encoded floats back to floats
// this is interesting as JS converts to RGBA unsigned integers, then
// GL converts those to 0.0-1.0 range, then we convert that back to integers
// and finally back to floats 
`
float fourByteToFloat(vec4 value, bool isUnsigned) {
    /** NOTE also converts from float percentages of 255 to "whole" numbers */
    float sign;
    float bigEndOrZero;
    float bigEnd;

    if (isUnsigned == true) {
        return float(value.r * 255.0 * 256.0 * 256.0 * 256.0 + 
                    value.g * 255.0 * 256.0 * 256.0 +
                    value.b * 255.0 * 256.0 +
                    value.a * 255.0);
    } else {
        sign = value.r * 255.0 > 127.0 ? -1.0 : 1.0; 
        bigEndOrZero = value.r * 255.0 == 255.0 ? 0.0 : value.r;
        bigEnd = bigEndOrZero > 127.0 ? bigEndOrZero - 127.0 : bigEndOrZero;

        return sign * (
        bigEnd * 255.0 * 256.0 * 256.0 * 256.0 +
        value.g * 255.0 * 256.0 * 256.0 +
        value.b * 255.0 * 256.0 +
        value.a * 255.0
        );
    }
}
` +

// colour space conversion functions
`
float sRgb8ChannelToLinear(float colour8) {
    const float sThresh = 0.04045;

    float colourf = colour8 / 255.0;
    if (colourf <= sThresh) {
        return colourf / 12.92;
    }

    return pow((colourf + 0.055) / 1.055, 2.4);
}

vec3 sRgb8ToLinear(vec3 srgb8) {
    return vec3(
        sRgb8ChannelToLinear(srgb8.r),
        sRgb8ChannelToLinear(srgb8.g),
        sRgb8ChannelToLinear(srgb8.b)
        );
}

float linearChannelToSrgbF(float linear) {
    if (linear <= 0.0031308) {
        return (linear * 12.92);
    }

    return (1.055 * pow(linear, 1.0/2.4) - 0.055);
}

vec3 linearToSrgbF(vec3 linear) {
    return vec3(
        linearChannelToSrgbF(linear.r),
        linearChannelToSrgbF(linear.g),
        linearChannelToSrgbF(linear.b)
    );
}

` +

// compute the normal of a sphere
`
vec3 sphereNormal(Sphere sphere, vec3 pos) {
    return normalize(pos - sphere.point);
}
` +


`
`;
}
