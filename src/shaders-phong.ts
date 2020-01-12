function getShaderPhongDeclarations() {
    return `
vec3 surface1(Hit hit);
vec3 surface2(Hit hit);
`;
}

function getShaderPhong(phongSpecularExp: string, lightCount: number) {
  return `
` +
// Blinn Phong functions
`
vec3 surface1(Hit hit) {
    Material material = hit.material;
    vec3 fullColour = vec3(material.colourOrAlbedo.rgb / 255.0);
    vec3 diffuse = vec3(0.0, 0.0, 0.0);
    vec3 specular = vec3(0.0, 0.0, 0.0);

    for (int i = 0; i < ${lightCount}; i += 1) {
        if (isLightVisible(hit.position, pointLights[i].point, hit.normal) == true) {
            // @todo light colour
            vec3 lightColour = vec3(1.0, 1.0, 1.0);
            vec3 lightDir = normalize(pointLights[i].point - hit.position);
            float lightIntensity = 1.0;

            // diffuse
            float dco = dot(hit.normal, lightDir);
            if (dco < 0.0) { dco = 0.0; }

            diffuse += vec3(fullColour.rgb * lightIntensity * dco);

            // specular
            vec3 halfway = normalize(lightDir - hit.ray.vector);
            float sco = dot(hit.normal, normalize(halfway));
            if (sco < 0.0) { sco = 0.0; }
            
            specular += vec3(lightColour.rgb * lightIntensity * pow(sco, ${phongSpecularExp}));
        }
    }

    // calculate ambient light
    vec3 ambient = fullColour.rgb;
    ambient = vec3(ambient.rgb + (fullColour.rgb * material.ambient));

    return ambient.rgb + diffuse.rgb * material.diffuseOrRoughness + specular.rgb * material.specularOrMetallic;
}

vec3 surface2(Hit hit) {
    Material material = hit.material;
    vec3 fullColour = vec3(material.colourOrAlbedo.rgb / 255.0);
    vec3 diffuse = vec3(0.0, 0.0, 0.0);
    vec3 specular = vec3(0.0, 0.0, 0.0);

    for (int i = 0; i < ${lightCount}; i += 1) {
        if (isLightVisible(hit.position, pointLights[i].point, hit.normal) == true) {
            // @todo light colour
            vec3 lightColour = vec3(1.0, 1.0, 1.0);
            vec3 lightDir = normalize(pointLights[i].point - hit.position);
            float lightIntensity = 1.0;

            // diffuse
            float dco = dot(hit.normal, lightDir);
            if (dco < 0.0) { dco = 0.0; }

            diffuse += vec3(fullColour.rgb * lightIntensity * dco);

            // specular
            vec3 halfway = normalize(lightDir - hit.ray.vector);
            float sco = dot(hit.normal, normalize(halfway));
            if (sco < 0.0) { sco = 0.0; }
            
            specular += vec3(lightColour.rgb * lightIntensity * pow(sco, ${phongSpecularExp}));
        }
    }

    // calculate ambient light
    vec3 ambient = fullColour.rgb;
    ambient = vec3(ambient.rgb + (fullColour.rgb * material.ambient));

    return ambient.rgb + diffuse.rgb * material.diffuseOrRoughness + specular.rgb * material.specularOrMetallic;
}

`;
}
