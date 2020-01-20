# Literate Ray Tracer Fork

This is a [fork](https://github.com/tmcw/literate-raytracer) of [literate-ray-tracer](http://macwright.org/literate-raytracer/ "Literate ray tracer")

This is a literate [raytracer](http://en.wikipedia.org/wiki/Ray_tracing_(graphics)),
written in Javascript. The 
are all one part: you can understand the implementation by reading it in combination
with literate-style code comments.

This is intended as a learning platform for those trying to connect the mathematical
and engineering explanations of raytracing and understand the behavior of the algorithm
well enough to do interesting things.

[See It Live Here](https://literate-raytracer.michaeljbennett.info "Live version of this book")

###

Please [report and defects here](https://github.com/bennett000/literate-raytracer/issues "Report an issue with the book") and we'll attempt to address the issue in the next release


## Having Fun With The Code

Unlike the original, the JavaScript parts of this codebase are written in TypeScript,
consequently you'll need some tooling to play.

By JS community standards the requirements are minimal... if there's demand to include the raw JS we can arrange that.

Right now the source is all under `src/` in TypeScript files.

### Installing Dependencies

You'll need a relatively modern version of [node js](https://nodejs.org/en/ "Node JS a CLI based JS environment").  With that installed navigate to the source folder and `npm install` _or alternatively_ `yarn install`

### Running in Dev Mode

* `npm run dev` _or alternatively_ `yarn dev` will watch for changes to `*.ts` files and build an `index.js`.  Open `index.html` (the one in the source root) and refresh it to play.  Every time you change TS files, the project will auto rebuild, you just need to refresh the browser.
* `npm run build` _or alternatively_ `yarn build` is effectively `dev` mode but it builds the app once

### Building The Book
* `npm run doc` _or alternatively_ `yarn doc` will build the book and put it in the source
code's `doc` folder

## Platform Compatability

This project aims to be compatable with as many browsers as possible. Data on browser
compatability is [from WebGL Stats](https://stackoverflow.com/questions/41020683/max-number-of-textures-in-webgl "Stats about what browsers support what aspects of webgl)

The obvious conclusion is that in terms of compatability WebGL 2.x is not sufficient,
especially outside the desktop.  We will be working with WebGL 1.x.

Implementing a "MVP" featured ray tracer in a shader in WebGL 1.x means working within
constraints.  We want to stay within about 80%+ limits:

* 221 or less uniform bindings (including array elements and `struct` properties, ideally 
fallback to 64)
* 4096 wide/tall textures (we'll use these extensively for data)
* 16 or less texture units (ideally try and fall back to 8)

We will only use "stock" features, no extensions.  Our constraint is memory.

### Things an "MVP" Needs In Memory

In terms of memory the most space we have is in texture data, _but_ we "only" get 
16*4096*4096*4 (RGBA) bytes (1,073,741,824), so about a gigabyte... which many cards
_might_ not actually support.  Nevertheless, even 256MB can get us a lot.

We also have 221 uniforms we can use, the limits on these would be something like 
221*`mat4` (4 * 4 * 221 * 4 (float) bytes, or 14,144KB)

Our naive storage plan will assume 4 byte floats (RGBA) and look something like:

*Core 8*

_(R) means will need refresh on animate_

* (R) vec3 dictionary (verts, colours, normals), 5,592,405 (4096*4096/3) which dictates
constraints for some of the other structures
* triangles 699,050 (2048*2048/6, 3x *vec3 verts, 1x *vec3 normal, 1x *material)
* spheres 5,592,405 (2048*2048/3, 1x *vec3 centre, 1x radius, 1x *material (this
would exceed our *vec3 limit and is not a realistic upper bound)) 
* materials won't need _this_ much space.  materials have other complexities/branches
* mesh (2048*2048/2)
* (R) extents (bounding boxes) 5,592,405 (2048*2048*3, 1x min, 1x max, 1x *mesh)
* (R) octree size depends on triangles/spheres
* texture cubemap

*note* most of these numbers are well beyond what we could realistically render, and
cummulatively outside the capacity of the less powerful GPUs out there.

Given upload times to the GPU this might be too much even at low counts, and other
solutions may need to be explored

*8-16*

* texture colours/albedos
* texture metallics/speculars
* texture diffuse/roughness
* texture normals
* texture colours/albedos
* texture metallics/speculars
* texture diffuse/roughness
* texture normals


## License

In the spirit of the base code, this code and accompanying text is released under CC0, or Public Domain where applicable.
