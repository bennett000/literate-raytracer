function getShaderPbrDeclarations() {
    return `

float DistributionGGX(vec3 N, vec3 H, float roughness);
float GeometrySchlickGGX(float NdotV, float roughness);
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness);
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness);
vec3 surface1(Hit hit);
vec3 surface2(Hit hit);

`;
}

function getShaderPbr(defaultF0: string, lightCount: number) {
// PBR Computations
// essentially straight from [Learn OpenGL](https://learnopengl.com/PBR/Theory "Learn OpenGL`")
return ` 
` +

`
vec3 surfacePbrReflectance(Hit hit, vec3 N, vec3 V, vec3 R, vec3 reflectColour, vec3 refractColour) {
    Material material = hit.material;
    vec3 albedo = sRgb8ToLinear(material.colourOrAlbedo); // pow(material.colourOrAlbedo.rgb, vec3(2.2));
    float ao = material.ambient;
    float metallic = material.specularOrMetallic;
    float roughness = material.diffuseOrRoughness;

    vec3 F0 = vec3(${defaultF0}); 
    F0 = mix(F0, albedo, metallic);

    // reflectance equation
    bool didLight = false;
    vec3 Lo = vec3(0.0);
    for (int i = 0; i < ${lightCount}; i += 1) {
        if (isLightVisible(hit.position, pointLights[i].point, hit.normal) == true) {
            didLight = true;
            // calculate per-light radiance
            vec3 lightDir = pointLights[i].point - hit.position;
            float distance = length(lightDir);
            vec3 L = normalize(lightDir);
            vec3 H = normalize(V + L);
            float attenuation = 1.0 / (distance * distance);
            // @todo light colour
            vec3 lightColour = sRgb8ToLinear(vec3(255.0, 255.0, 255.0) * 35.0);
            vec3 radiance = lightColour.rgb * attenuation;

            // Cook-Torrance BRDF
            float NDF = DistributionGGX(N, H, roughness);   
            float G   = GeometrySmith(N, V, L, roughness);      
            vec3 F    = fresnelSchlickRoughness(max(dot(H, V), 0.0), F0, roughness);

            vec3 nominator    = NDF * G * F; 
            float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + 0.001; // 0.001 to prevent divide by zero.
            /** @todo use real physics, this violates the PBR to some extent */
            vec3 specular = nominator / denominator + F * reflectColour * metallic;

            // kS is equal to Fresnel
            vec3 kS = F;
            // for energy conservation, the diffuse and specular light can't
            // be above 1.0 (unless the surface emits light); to preserve this
            // relationship the diffuse component (kD) should equal 1.0 - kS.
            vec3 kD = vec3(1.0) - kS;
            // multiply kD by the inverse metalness such that only non-metals 
            // have diffuse lighting, or a linear blend if partly metal (pure metals
            // have no diffuse light).
            kD *= 1.0 - metallic;	  
            // scale light by NdotL
            float NdotL = max(dot(N, L), 0.0);        

            // add to outgoing radiance Lo
            Lo += (kD * (albedo + refractColour) / PI + specular) * radiance * NdotL;  // note that we already multiplied the BRDF by the Fresnel (kS) so we won't multiply by kS again
        }
    }

    if (didLight == false) {
        return vec3(0.0, 0.0, 0.0);
    }

    // ambient lighting (will replace this ambient lighting with 
    // environment lighting).
    vec3 ambient = vec3(0.03) * albedo * ao;

    vec3 colour = ambient + Lo;


    // HDR tonemapping
    colour = colour / (colour + vec3(1.0));

    colour = linearToSrgbF(colour);

    return colour;
}
` +

// PBR Surface functions
`
vec3 surface1(Hit hit) {
    vec3 N = hit.normal;
    vec3 V = normalize(hit.ray.point - hit.position);
    vec3 R = reflect(-V, N);  
    vec3 reflectColour = cast2(Ray(hit.position, R, hit.ray.ior)).rgb;
    vec3 refractColour = vec3(0.0, 0.0, 0.0);

    if (hit.material.isTranslucent == true) {
        if (areEqualish(hit.ray.ior, hit.material.refraction) == false) {
        }
    }

    return surfacePbrReflectance(hit, N, V, R, reflectColour, refractColour);
}

vec3 surface2(Hit hit) {
    vec3 N = hit.normal;
    vec3 V = normalize(hit.ray.point - hit.position);
    vec3 R = reflect(-V, N);   

    return surfacePbrReflectance(hit, N, V, R, vec3(1.0, 1.0, 1.0), vec3(0.0, 0.0, 0.0));
}
` +


`

float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness*roughness;
    float a2 = a*a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness) {
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}   
`; 
}