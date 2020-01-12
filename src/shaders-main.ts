function getFragmentShaderMain(aa: number) {

  return `
` +

//
// <a name="fragmentMain"></a>
// #### Fragment Main
//
// Like the vector shader, the fragment shader also has to have a main function
// in the fragment shader, our requirement is to set `gl_FragColor`.  `gl_FragColor` is
// a `vec4` r/g/b/a
//
// we'll also initialize any constant arrays we have
`
void main() {
  initPlaneSetNormals();
` + 

// next we'll pick an anti-aliasing mode
(aa === 4 ? mainBody4x() : (aa === 2 ? mainBody2x() : mainBody1x())) +

`
}
`;

}

function mainBody1x() {
  return '  gl_FragColor = vec4(primaryRay(0.5, 0.5).rgb, 1.0);';
}

function mainBody2x() {
  return `
  vec3 total = vec3(0.0);

  total += primaryRay(0.25, 0.25).rgb;
  total += primaryRay(0.75, 0.75).rgb;

  gl_FragColor = vec4(total.rgb / 2.0, 1.0);
`;
}

function mainBody4x() {
  return `
  vec3 total = vec3(0.0);

  total += primaryRay(0.25, 0.25).rgb;
  total += primaryRay(0.75, 0.25).rgb;
  total += primaryRay(0.75, 0.75).rgb;
  total += primaryRay(0.25, 0.75).rgb;

  gl_FragColor = vec4(total.rgb / 4.0, 1.0);
`;
}
