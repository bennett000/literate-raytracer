"use strict";
describe('accelerator functions', () => {
    describe('TextureDataStructureElement', () => {
        let data = [];
        class Foo extends TextureDataStructureElement {
            static create() {
                return new Foo();
            }
            // must initialize, usually the constructor would take data as an argument
            constructor() {
                super(data);
                // get the index
                this._index = data.push(0);
                for (let i = 1; i < this.size; i += 1) {
                    data.push(0);
                }
            }
            get size() {
                return 5 * 4;
            }
        }
        let example = Foo.create();
        beforeEach(() => {
            example = Foo.create();
        });
        it('sets the first value', () => {
            example.setFloat(5, 0);
            expect(example.getFloat(0)).toBe(5);
        });
        it('sets the second value', () => {
            example.setFloat(3, 1);
            expect(example.getFloat(1)).toBe(3);
        });
        it('sets the fifth value', () => {
            example.setFloat(1, 4);
            expect(example.getFloat(4)).toBe(1);
        });
        it('sets multiple values', () => {
            example.setFloat(22, 3);
            example.setFloat(20, 0);
            expect(example.getFloat(3)).toBe(22);
            expect(example.getFloat(0)).toBe(20);
        });
    });
    describe('extents', () => {
        it('starts with a null (-1) pointer to a mesh', () => {
            const data = [];
            const e = Extents.create(data);
            expect(e.getInt(0)).toBe(-1);
        });
        it('starts with +/- its min/max size', () => {
            const data = [];
            const e = Extents.create(data);
            for (let i = 0; i < NUM_PLANE_SET_NORMALS; i += 1) {
                expect(Math.floor(e.getPlaneExtent(i, 0))).toBe(Math.floor(MAX_GL_INT / PACKED_FLOAT_MULTIPLIER));
                expect(Math.floor(e.getPlaneExtent(i, 1))).toBe(Math.floor(MIN_GL_INT / PACKED_FLOAT_MULTIPLIER));
            }
        });
        it('axis align bounds a single triangle', () => {
            const planeSetNormals = getPlaneSetNormals();
            let data = [];
            const sceneExtents = Extents.create(data);
            const triangles = [[
                    [1, 1, 0],
                    [-1, 0, 0],
                    [1, 0, 0],
                ]];
            triangles.forEach((verts) => {
                const extent = Extents.create(data);
                // for each of the seven extent planes
                for (let plane = 0; plane < NUM_PLANE_SET_NORMALS; plane += 1) {
                    // and for each of the triangle's vertecies
                    verts.forEach((vertex) => {
                        // create the extents
                        const d = dot3_1(vertex, planeSetNormals[plane]);
                        if (d < extent.getPlaneExtent(plane, 0)) {
                            extent.setPlaneExtent(d, plane, 0);
                        }
                        if (d > extent.getPlaneExtent(plane, 1)) {
                            extent.setPlaneExtent(d, plane, 1);
                        }
                    });
                }
                // grow the scene
                sceneExtents.extendBy(extent);
            });
            // finally test the extents
            // x axis min
            expect(sceneExtents.getPlaneExtent(0, 0)).toBe(-1);
            // x axis max
            expect(sceneExtents.getPlaneExtent(0, 1)).toBe(1);
            // y axis min
            expect(sceneExtents.getPlaneExtent(1, 0)).toBe(0);
            // y axis max
            expect(sceneExtents.getPlaneExtent(1, 1)).toBe(1);
            // z axis min
            expect(sceneExtents.getPlaneExtent(2, 0)).toBe(0);
            // z axis max
            expect(sceneExtents.getPlaneExtent(2, 1)).toBe(0);
        });
        it('axis align bounds two triangles', () => {
            const planeSetNormals = getPlaneSetNormals();
            let data = [];
            const sceneExtents = Extents.create(data);
            const triangles = [[
                    [1, 1, 0],
                    [-1, 0, 0],
                    [1, 0, 0],
                ], [
                    [1, -1, -1],
                    [1, 1, 0],
                    [1, -1, 0],
                ]];
            triangles.forEach((verts, i) => {
                const extent = Extents.create(data);
                // for each of the seven extent planes
                for (let plane = 0; plane < NUM_PLANE_SET_NORMALS; plane += 1) {
                    // and for each of the triangle's vertecies
                    verts.forEach((vertex) => {
                        // create the extents
                        const d = dot3_1(vertex, planeSetNormals[plane]);
                        if (d < extent.getPlaneExtent(plane, 0)) {
                            extent.setPlaneExtent(d, plane, 0);
                        }
                        if (d > extent.getPlaneExtent(plane, 1)) {
                            extent.setPlaneExtent(d, plane, 1);
                        }
                    });
                }
                // set the mesh
                extent.mesh = i;
                // grow the scene
                sceneExtents.extendBy(extent);
            });
            // finally test the extents
            // x axis min
            expect(sceneExtents.getPlaneExtent(0, 0)).toBe(-1);
            // x axis max
            expect(sceneExtents.getPlaneExtent(0, 1)).toBe(1);
            // y axis min
            expect(sceneExtents.getPlaneExtent(1, 0)).toBe(-1);
            // y axis max
            expect(sceneExtents.getPlaneExtent(1, 1)).toBe(1);
            // z axis min
            expect(sceneExtents.getPlaneExtent(2, 0)).toBe(-1);
            // z axis max
            expect(sceneExtents.getPlaneExtent(2, 1)).toBe(0);
        });
    });
    describe('octree', () => {
        const planeSetNormals = getPlaneSetNormals();
        let extentsData;
        let sceneExtents;
        let extentsList = [];
        let triangles = [];
        const reset = (t = []) => {
            extentsData = [];
            extentsList = [];
            sceneExtents = Extents.create(extentsData);
            if (t.length) {
                triangles = t;
            }
            else {
                triangles = [[
                        [1, 1, 0],
                        [-1, 0, 0],
                        [1, 0, 0],
                    ], [
                        [1, 1, -10],
                        [-1, 0, -10],
                        [1, 0, -10],
                    ]];
            }
            triangles.forEach((verts, i) => {
                const extent = Extents.create(extentsData);
                // for each of the seven extent planes
                for (let plane = 0; plane < NUM_PLANE_SET_NORMALS; plane += 1) {
                    // and for each of the triangle's vertecies
                    verts.forEach((vertex) => {
                        // create the extents
                        const d = dot3_1(vertex, planeSetNormals[plane]);
                        if (d < extent.getPlaneExtent(plane, 0)) {
                            extent.setPlaneExtent(d, plane, 0);
                        }
                        if (d > extent.getPlaneExtent(plane, 1)) {
                            extent.setPlaneExtent(d, plane, 1);
                        }
                    });
                }
                // set the mesh
                extent.mesh = i;
                // store a reference for later
                extentsList.push(extent);
                // grow the scene
                sceneExtents.extendBy(extent);
            });
        };
        afterEach(() => {
            Octree.MAX_CONTENTS = 16;
        });
        beforeEach(() => {
            reset();
        });
        it('builds for a simple two triangle system', () => {
            const octree = Octree.create(sceneExtents, extentsData);
            // insert the extents
            extentsList.forEach((e) => {
                octree.insert(e);
            });
            // build the tree
            octree.build();
            let count = 0;
            octree.onEach(() => {
                count += 1;
            });
            expect(count).toBe(1);
        });
        it('with MAX_CONTENTS = 1 two triangles split the root for three total nodes', () => {
            Octree.MAX_CONTENTS = 1;
            const octree = Octree.create(sceneExtents, extentsData);
            // insert the extents
            extentsList.forEach((e) => {
                octree.insert(e);
            });
            // build the tree
            octree.build();
            let count = 0;
            octree.onEach(() => {
                count += 1;
            });
            expect(count).toBe(3);
        });
        it('with MAX_CONTENTS = 1 eight triangles split the root for nine total nodes', () => {
            reset([
                [
                    [10, 10, 10],
                    [0, 9, 10],
                    [10, 9, 10],
                ], [
                    [10, 10, -10],
                    [0, 9, -10],
                    [10, 9, -10],
                ], [
                    [10, -10, 10],
                    [0, -9, 10],
                    [10, -9, 10],
                ], [
                    [10, -10, -10],
                    [0, -9, -10],
                    [10, -9, -10],
                ], [
                    [-10, 10, 10],
                    [-0, 9, 10],
                    [-10, 9, 10],
                ], [
                    [-10, 10, -10],
                    [-0, 9, -10],
                    [-10, 9, -10],
                ], [
                    [-10, -10, 10],
                    [-0, -9, 10],
                    [-10, -9, 10],
                ], [
                    [-10, -10, -10],
                    [-0, -9, -10],
                    [-10, -9, -10],
                ],
            ]);
            Octree.MAX_CONTENTS = 1;
            const octree = Octree.create(sceneExtents, extentsData);
            // insert the extents
            extentsList.forEach((e) => {
                octree.insert(e);
            });
            // build the tree
            octree.build();
            let count = 0;
            let components = 0;
            octree.onEach((node) => {
                count += 1;
                components += node.extentsListLength();
            });
            expect(count).toBe(10);
            expect(components).toBe(8);
        });
    });
});
const negInfinity = [-Infinity, -Infinity, -Infinity];
const posInfinity = [Infinity, Infinity, Infinity];
const NUM_PLANE_SET_NORMALS = 7;
// in order to store related data in shared textures/memory we'll want a common
// and safe way of accessing that data
//
// `TextureDataStructureElement` defines the basic interface we'll use to safely
// access and build our texture memory in JS
class TextureDataStructureElement {
    // our class will take an array of numbers and keep it internal
    // this is our memory
    constructor(_data) {
        this._data = _data;
        // we need to understand our place (address) in memory
        this._index = -1;
    }
    // let's allow others to get our addres and let's make sure we don't accidentially 
    // change our ddress
    get index() {
        return this._index;
    }
    checkBounds(index) {
        if (index > this.size) {
            throw new RangeError('TextureDataStructureElement: out of bounds ' + index + ' vs ' + this.size);
        }
    }
    // we'll also want to some helpers
    setFloat(value, index, arr = []) {
        this.checkBounds(index);
        fourByteFromFloat(value * PACKED_FLOAT_MULTIPLIER, arr);
        this._data[this._index + index * 4 + 0] = arr[0];
        this._data[this._index + index * 4 + 1] = arr[1];
        this._data[this._index + index * 4 + 2] = arr[2];
        this._data[this._index + index * 4 + 3] = arr[3];
    }
    setInt(value, index, arr = []) {
        this.checkBounds(index);
        fourByteFromFloat(value, arr);
        this._data[this._index + index * 4 + 0] = arr[0];
        this._data[this._index + index * 4 + 1] = arr[1];
        this._data[this._index + index * 4 + 2] = arr[2];
        this._data[this._index + index * 4 + 3] = arr[3];
    }
    setUint(value, index, arr = []) {
        this.checkBounds(index);
        fourByteFromFloat(value, arr, true);
        this._data[this._index + index * 4 + 0] = arr[0];
        this._data[this._index + index * 4 + 1] = arr[1];
        this._data[this._index + index * 4 + 2] = arr[2];
        this._data[this._index + index * 4 + 3] = arr[3];
    }
    getFloat(index) {
        this.checkBounds(index);
        return fourByteToFloat(this._data[this._index + index * 4 + 0], this._data[this._index + index * 4 + 1], this._data[this._index + index * 4 + 2], this._data[this._index + index * 4 + 3]) / PACKED_FLOAT_MULTIPLIER;
    }
    getInt(index) {
        this.checkBounds(index);
        return fourByteToFloat(this._data[this._index + index * 4 + 0], this._data[this._index + index * 4 + 1], this._data[this._index + index * 4 + 2], this._data[this._index + index * 4 + 3]);
    }
    getUint(index) {
        this.checkBounds(index);
        return fourByteToFloat(this._data[this._index + index * 4 + 0], this._data[this._index + index * 4 + 1], this._data[this._index + index * 4 + 2], this._data[this._index + index * 4 + 3], true);
    }
}
// we'll use vec3's for vertexes, colours, and normals
class Vec3 extends TextureDataStructureElement {
    static create(vec3data, x = 0, y = 0, z = 0) {
        return new Vec3(vec3data, x, y, z);
    }
    static size() { return 3 * 4; }
    get size() { return Vec3.size(); }
    get x() {
        return this.getFloat(0);
    }
    set x(v) {
        this.setFloat(v, 0);
    }
    get y() {
        return this.getFloat(1);
    }
    set y(v) {
        this.setFloat(v, 1);
    }
    get z() {
        return this.getFloat(2);
    }
    set z(v) {
        this.setFloat(v, 2);
    }
    constructor(data, x = 0, y = 0, z = 0) {
        super(data);
        const x1 = fourByteFromFloat(x * PACKED_FLOAT_MULTIPLIER);
        const y1 = fourByteFromFloat(y * PACKED_FLOAT_MULTIPLIER);
        const z1 = fourByteFromFloat(z * PACKED_FLOAT_MULTIPLIER);
        this._index = data.push(x1[0]) - 1;
        data.push(x1[1]);
        data.push(x1[2]);
        data.push(y1[0]);
        data.push(y1[1]);
        data.push(y1[2]);
        data.push(z1[0]);
        data.push(z1[1]);
        data.push(z1[2]);
    }
    fromMatrix3_1(m31) {
        this.x = m31[0];
        this.y = m31[1];
        this.z = m31[2];
    }
    fromMatrix4_4(m44) {
        this.x = m44[12];
        this.y = m44[13];
        this.z = m44[14];
    }
    toMatrix3_1(m31 = [0, 0, 0]) {
        m31[0] = this.x;
        m31[1] = this.y;
        m31[2] = this.z;
        return m31;
    }
}
// we need triangles for just about everything except perfect spheres
class Triangle2 extends TextureDataStructureElement {
    constructor(data, a, b, c, material = -1) {
        super(data);
        this.a = a;
        this.b = b;
        this.c = c;
        this._index = data.push(a.index) - 1;
        data.push(b.index);
        data.push(c.index);
        data.push(material);
    }
    static create(data, a, b, c, material = -1) {
        return new Triangle2(data, a, b, c, material);
    }
    static size() {
        return 4 * 4;
    }
    get size() { return Triangle2.size(); }
    get material() {
        return this._data[this._index + 3];
    }
    set material(material) {
        this._data[this._index + 3] = material;
    }
    onEach(callback) {
        callback(this.a);
        callback(this.b);
        callback(this.c);
    }
}
// since spheres are cheap _and_ look better than triangle based alternatives
// we'll use them too
class Sphere extends TextureDataStructureElement {
    constructor(data, centre, radius, material = -1) {
        super(data);
        this.centre = centre;
        this._index = data.push(centre.index) - 1;
        data.push(radius);
        data.push(material);
    }
    static create(data, centre, radius, material = -1) {
        return new Sphere(data, centre, radius, material);
    }
    static size() {
        return 3 * 4;
    }
    get size() {
        return Sphere.size();
    }
    get material() {
        return this._data[this._index + 2];
    }
    set material(material) {
        this._data[this._index + 2] = material;
    }
    get radius() {
        return this._data[this._index + 1];
    }
    set radius(radius) {
        this._data[this._index + 1] = radius;
    }
}
class BBox {
    constructor(min = BBox.negInfinity, max = BBox.posInfinity) {
        this.bounds = [BBox.posInfinity, BBox.negInfinity];
        this.bounds[0] = max;
        this.bounds[1] = min;
    }
    static create() {
        return new BBox();
    }
    centroid() {
        return [
            (this.bounds[0][0] + this.bounds[1][0]) * 0.5,
            (this.bounds[0][1] + this.bounds[1][1]) * 0.5,
            (this.bounds[0][2] + this.bounds[1][2]) * 0.5,
        ];
    }
    extendBy(p) {
        if (p[0] < this.bounds[0][0]) {
            this.bounds[0][0] = p[0];
        }
        if (p[1] < this.bounds[0][1]) {
            this.bounds[0][1] = p[1];
        }
        if (p[2] < this.bounds[0][2]) {
            this.bounds[0][2] = p[2];
        }
        if (p[0] > this.bounds[1][0]) {
            this.bounds[1][0] = p[0];
        }
        if (p[1] > this.bounds[1][1]) {
            this.bounds[1][1] = p[1];
        }
        if (p[2] > this.bounds[1][2]) {
            this.bounds[1][2] = p[2];
        }
        return this;
    }
    min() {
        return this.bounds[0];
    }
    max() {
        return this.bounds[1];
    }
}
BBox.negInfinity = [-Infinity, -Infinity, -Infinity];
BBox.posInfinity = [Infinity, Infinity, Infinity];
class Extents extends TextureDataStructureElement {
    constructor(data, index = -1, op = createObjectPool(createMatrix3_1)) {
        super(data);
        this.op = op;
        if (index >= 0) {
            this._index = index;
        }
        else {
            this.init(data);
        }
    }
    static create(data, index = -1, op = createObjectPool(createMatrix3_1)) {
        return new Extents(data, index, op);
    }
    static size() {
        return /* 2x ints */ 8 /* 2x floats per plane */ + NUM_PLANE_SET_NORMALS * 8;
    }
    get size() {
        return Extents.size();
    }
    get mesh() {
        return this.getInt(0);
    }
    set mesh(value) {
        this.setInt(value, 0);
    }
    ;
    get type() {
        return this.getInt(1);
    }
    // 0 sphere, 1 triangle
    set type(t) {
        if (t === 1) {
            this.setInt(1, 1);
        }
        else {
            this.setInt(0, 1);
        }
    }
    init(data) {
        const mesh = fourByteFromFloat(-1);
        this._index = data.push(mesh[0]) - 1;
        data.push(mesh[1]);
        data.push(mesh[2]);
        data.push(mesh[3]);
        // type 0 for sphere
        // type 1 for triangle
        data.push(0);
        data.push(0);
        data.push(0);
        data.push(0);
        for (let i = 0; i < NUM_PLANE_SET_NORMALS; i += 1) {
            data.push(127);
            data.push(255);
            data.push(255);
            data.push(255);
            data.push(254);
            data.push(255);
            data.push(255);
            data.push(255);
        }
    }
    extendBy(e) {
        for (let i = 0; i < NUM_PLANE_SET_NORMALS; ++i) {
            const thisMin = this.getPlaneExtent(i, 0);
            const givenMin = e.getPlaneExtent(i, 0);
            if (givenMin < thisMin) {
                this.setPlaneExtent(givenMin, i, 0);
            }
            const thisMax = this.getPlaneExtent(i, 1);
            const givenMax = e.getPlaneExtent(i, 1);
            if (givenMax > thisMax) {
                this.setPlaneExtent(givenMax, i, 1);
            }
        }
    }
    // extent 0 for min, 1 for max
    getPlaneExtent(plane, extent) {
        return this.getFloat(plane * 2 + extent + 2);
    }
    setPlaneExtent(value, plane, extent) {
        this.setFloat(value, plane * 2 + extent + 2);
    }
    centroid() {
        const ret = this.op.malloc();
        ret[0] = (this.getPlaneExtent(0, 0) + this.getPlaneExtent(0, 1)) * 0.5;
        ret[1] = (this.getPlaneExtent(1, 0) + this.getPlaneExtent(1, 1)) * 0.5;
        ret[2] = (this.getPlaneExtent(2, 0) + this.getPlaneExtent(2, 1)) * 0.5;
        return ret;
    }
}
class OctreeNode extends TextureDataStructureElement {
    constructor(octreeData, extentsData, index = -1) {
        super(octreeData);
        this.extentsData = extentsData;
        this._extentsListLength = 0;
        if (index >= 0) {
            this._index = index;
            const extentsIndex = this.getInt(10);
            this.extents = Extents.create(this.extentsData, extentsIndex);
            // determine length of extent list
            for (let i = 0; i < Octree.MAX_CONTENTS; i += 1) {
                const elIndex = this.extentsListElementIndex(i);
                if (elIndex < 0) {
                    break;
                }
                this._extentsListLength = i + 1;
            }
        }
        else {
            this.extents = Extents.create(this.extentsData);
            this.init(octreeData);
        }
    }
    static create(octreeData, extentsData, index = -1) {
        return new OctreeNode(octreeData, extentsData, index);
    }
    static size() {
        return /* isLeaf int */ 4 /* eight ints per child index */ + 8 * 4
            /* int index for extents */ + 4 /* index slots for contained extents */ + Octree.MAX_CONTENTS * 4;
    }
    get size() {
        return OctreeNode.size();
    }
    get isLeaf() { return this._data[this._index + 3] === 1; }
    set isLeaf(value) { this._data[this._index + 3] = value === true ? 1 : 0; }
    init(octreeData) {
        // default to leaf
        this._index = octreeData.push(0) - 1;
        octreeData.push(0);
        octreeData.push(0);
        octreeData.push(1);
        // -1 children
        for (let i = 0; i < 8; i += 1) {
            octreeData.push(255);
            octreeData.push(0);
            octreeData.push(0);
            octreeData.push(1);
        }
        // node extents
        const extentsBytes = fourByteFromFloat(this.extents.index);
        octreeData.push(extentsBytes[0]);
        octreeData.push(extentsBytes[1]);
        octreeData.push(extentsBytes[2]);
        octreeData.push(extentsBytes[3]);
        // node's contents' extents (-1)
        for (let i = 0; i < Octree.MAX_CONTENTS; i += 1) {
            octreeData.push(255);
            octreeData.push(0);
            octreeData.push(0);
            octreeData.push(1);
        }
    }
    getChildIndex(index) {
        if (index > 7) {
            throw new RangeError('OctreeNode: get child out of bounds ' + index);
        }
        return this.getInt(index + 1);
    }
    setChildIndex(value, index) {
        if (index > 7) {
            throw new RangeError('OctreeNode: set child out of bounds ' + index);
        }
        this.setInt(value, index + 1);
    }
    extentsListElementIndex(index) {
        if (index > Octree.MAX_CONTENTS) {
            throw new RangeError('OctreeNode: extentListElement out of bounds ' + index);
        }
        return this.getInt(10 + index);
    }
    extentsListLength() {
        return this._extentsListLength;
    }
    onEach(callback) {
        for (let i = 0; i < 8; i += 1) {
            const index = this.getChildIndex(i);
            if (index < 0) {
                continue;
            }
            const node = OctreeNode.create(this._data, this.extentsData, index);
            callback(node);
        }
    }
    extentsListEach(callback) {
        for (let i = 0; i < Octree.MAX_CONTENTS; i += 1) {
            const elIndex = this.extentsListElementIndex(i);
            if (elIndex < 0) {
                break;
            }
            callback(Extents.create(this.extentsData, elIndex));
        }
    }
    extentsListPop() {
        if (this._extentsListLength <= 0) {
            return null;
        }
        const index = this._extentsListLength - 1;
        const e = Extents.create(this.extentsData, index);
        this.setInt(-1, index + 10);
        this._extentsListLength -= 1;
        return e;
    }
    extentsListPush(e) {
        const nextIndex = this._extentsListLength;
        this._extentsListLength += 1;
        this.setInt(e.index, nextIndex + 10);
        return this._extentsListLength;
    }
}
class Octree {
    constructor(sceneExtents, extentsData, octreeData = []) {
        this.extentsData = extentsData;
        this.octreeData = octreeData;
        this.bbox = BBox.create();
        this.root = OctreeNode.create(this.octreeData, this.extentsData);
        const xDiff = sceneExtents.getPlaneExtent(0, 1) - sceneExtents.getPlaneExtent(0, 0);
        const yDiff = sceneExtents.getPlaneExtent(1, 1) - sceneExtents.getPlaneExtent(1, 0);
        const zDiff = sceneExtents.getPlaneExtent(2, 1) - sceneExtents.getPlaneExtent(2, 0);
        const maxDiff = Math.max(xDiff, Math.max(yDiff, zDiff));
        const minPlusMax = [
            sceneExtents.getPlaneExtent(0, 0) + sceneExtents.getPlaneExtent(0, 1),
            sceneExtents.getPlaneExtent(1, 0) + sceneExtents.getPlaneExtent(1, 1),
            sceneExtents.getPlaneExtent(2, 0) + sceneExtents.getPlaneExtent(2, 1),
        ];
        this.bbox.bounds[0][0] = (minPlusMax[0] - maxDiff) * 0.5;
        this.bbox.bounds[0][1] = (minPlusMax[1] - maxDiff) * 0.5;
        this.bbox.bounds[0][2] = (minPlusMax[2] - maxDiff) * 0.5;
        this.bbox.bounds[1][0] = (minPlusMax[0] + maxDiff) * 0.5;
        this.bbox.bounds[1][1] = (minPlusMax[1] + maxDiff) * 0.5;
        this.bbox.bounds[1][2] = (minPlusMax[2] + maxDiff) * 0.5;
    }
    static create(sceneExtents, extentsData, octreeData = []) {
        return new Octree(sceneExtents, extentsData, octreeData);
    }
    _build(node, bbox) {
        if (node.isLeaf) {
            node.extentsListEach((e) => {
                node.extents.extendBy(e);
            });
        }
        else {
            for (let i = 0; i < 8; ++i) {
                const childIndex = node.getChildIndex(i);
                if (childIndex >= 0) {
                    const childBBox = BBox.create();
                    ;
                    const centroid = bbox.centroid();
                    // x-axis
                    childBBox.bounds[0][0] = (i & 4) ? centroid[0] : bbox.bounds[0][0];
                    childBBox.bounds[1][0] = (i & 4) ? bbox.bounds[1][0] : centroid[0];
                    // y-axis
                    childBBox.bounds[0][1] = (i & 2) ? centroid[1] : bbox.bounds[0][1];
                    childBBox.bounds[1][1] = (i & 2) ? bbox.bounds[1][1] : centroid[1];
                    // z-axis
                    childBBox.bounds[0][2] = (i & 1) ? centroid[2] : bbox.bounds[0][2];
                    childBBox.bounds[1][2] = (i & 1) ? bbox.bounds[1][2] : centroid[2];
                    // Inspect child
                    const child = OctreeNode.create(this.octreeData, this.extentsData, childIndex);
                    this._build(child, childBBox);
                    // Expand extents with extents of child
                    node.extents.extendBy(child.extents);
                }
            }
        }
    }
    _insert(node, extents, bbox, depth) {
        if (node.isLeaf) {
            if (node.extentsListLength() < Octree.MAX_CONTENTS || depth === Octree.MAX_DEPTH) {
                node.extentsListPush(extents);
            }
            else {
                node.isLeaf = false;
                // Re-insert extents held by this node
                while (node.extentsListLength()) {
                    const ne = node.extentsListPop();
                    if (!ne) {
                        break;
                    }
                    this._insert(node, ne, bbox, depth);
                }
                // Insert new extent
                this._insert(node, extents, bbox, depth);
            }
        }
        else {
            // Need to compute in which child of the current node this extents should
            // be inserted into
            const extentsCentroid = extents.centroid();
            const nodeCentroid = [
                (bbox.bounds[0][0] + bbox.bounds[1][0]) * 0.5,
                (bbox.bounds[0][1] + bbox.bounds[1][1]) * 0.5,
                (bbox.bounds[0][2] + bbox.bounds[1][2]) * 0.5,
            ];
            let childBBox = BBox.create();
            let childIndex = 0;
            // x-axis
            if (extentsCentroid[0] > nodeCentroid[0]) {
                childIndex = 4;
                childBBox.bounds[0][0] = nodeCentroid[0];
                childBBox.bounds[1][0] = bbox.bounds[1][0];
            }
            else {
                childBBox.bounds[0][0] = bbox.bounds[0][0];
                childBBox.bounds[1][0] = nodeCentroid[0];
            }
            // y-axis
            if (extentsCentroid[1] > nodeCentroid[1]) {
                childIndex += 2;
                childBBox.bounds[0][1] = nodeCentroid[1];
                childBBox.bounds[1][1] = bbox.bounds[1][1];
            }
            else {
                childBBox.bounds[0][1] = bbox.bounds[0][1];
                childBBox.bounds[1][1] = nodeCentroid[1];
            }
            // z-axis
            if (extentsCentroid[2] > nodeCentroid[2]) {
                childIndex += 1;
                childBBox.bounds[0][2] = nodeCentroid[2];
                childBBox.bounds[1][2] = bbox.bounds[1][2];
            }
            else {
                childBBox.bounds[0][2] = bbox.bounds[0][2];
                childBBox.bounds[1][2] = nodeCentroid[2];
            }
            // Create the child node if it doesn't exist yet and then insert the extents in it
            let nc = node.getChildIndex(childIndex);
            let nodeChild;
            if (nc < 0) {
                nodeChild = OctreeNode.create(this.octreeData, this.extentsData);
                node.setChildIndex(nodeChild.index, childIndex);
            }
            else {
                nodeChild = OctreeNode.create(this.octreeData, this.extentsData, nc);
            }
            this._insert(nodeChild, extents, childBBox, depth + 1);
        }
    }
    build() {
        this._build(this.root, this.bbox);
    }
    onEach(cb) {
        const walk = (root) => {
            cb(root);
            root.onEach(walk);
        };
        walk(this.root);
    }
    insert(extents) {
        this._insert(this.root, extents, this.bbox, 0);
    }
    encode() {
        const extents = {
            data: new Uint8Array(this.extentsData),
            height: 1,
            length: this.extentsData.length / 2,
            size: 2,
            targetUniformSampler: 'extentsData',
            targetUniformStruct: 'extents',
            width: this.extentsData.length,
        };
        const octree = {
            data: new Uint8Array(this.extentsData),
            height: 1,
            length: this.extentsData.length / 2,
            size: 2,
            targetUniformSampler: 'extentsData',
            targetUniformStruct: 'extents',
            width: this.extentsData.length,
        };
        return {
            extents,
            octree,
        };
    }
}
Octree.MAX_CONTENTS = 16;
Octree.MAX_DEPTH = 16;
function getPlaneSetNormals() {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [Math.sqrt(3) / 3, Math.sqrt(3) / 3, Math.sqrt(3) / 3],
        [-Math.sqrt(3) / 3, Math.sqrt(3) / 3, Math.sqrt(3) / 3],
        [-Math.sqrt(3) / 3, -Math.sqrt(3) / 3, Math.sqrt(3) / 3],
        [Math.sqrt(3) / 3, -Math.sqrt(3) / 3, Math.sqrt(3) / 3],
    ];
}
const g_cube = (function () {
    const points = [
        // front face
        0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        // right face
        0.5,
        -0.5,
        0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        0.5,
        -0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        0.5,
        // back face
        -0.5,
        -0.5,
        0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        0.5,
        0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        // left face
        -0.5,
        0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        0.5,
        -0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        // top
        0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        0.5,
        0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        0.5,
        0.5,
        0.5,
        0.5,
        // bottom
        -0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        0.5,
        0.5,
        -0.5,
        0.5,
        -0.5,
        -0.5,
        0.5,
        -0.5,
        -0.5,
        -0.5,
    ].map((p) => (p * 3.2) + 5.1);
    const triangles = [];
    for (let i = 0; i < points.length; i += 9) {
        triangles.push({
            type: 'triangle',
            material: 5,
            points: [
                [points[i + 0], points[i + 1], points[i + 2]],
                [points[i + 3], points[i + 4], points[i + 5]],
                [points[i + 6], points[i + 7], points[i + 8]],
            ],
        });
    }
    return triangles;
}());
//
// <a name="getGlError"></a>
// ### getGlError
//
// sometimes we'll want to query WebGL for errors
function getGlError(gl) {
    const error = gl.getError();
    switch (error) {
        case gl.NO_ERROR:
            return '';
        case gl.INVALID_ENUM:
            return 'invalid enum';
        case gl.INVALID_VALUE:
            return 'invalid value';
        case gl.INVALID_OPERATION:
            return 'invalid operation';
        case gl.INVALID_FRAMEBUFFER_OPERATION:
            return 'invalid framebuffer operation';
        case gl.OUT_OF_MEMORY:
            return 'out of memory';
        case gl.CONTEXT_LOST_WEBGL:
            return 'lost context';
        default:
            return 'unknown GL error';
    }
}
//
// <a name="createShader"></a>
// ### createShader
//
// We need a mechanism for compiling shader programs and checking if they failed to compile.
// In this case `type` is a property of the brower's `WebGLRenderingContext`
function createShader(gl, type, source) {
    // WebGL is flexible.  Before we even compile the sahder we need to allocate
    // a place to store it in the GPU, lets do that now
    const shader = gl.createShader(type);
    if (!shader) {
        return null;
    }
    // with some memory in hand we can load in some source code and compile
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    // we need to manually confirm that everything is okay
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    // if we fail there might be some more info
    if (gl.isContextLost() === false) {
        // if it's not okay let's figure out why
        const log = gl.getShaderInfoLog(shader);
        // and we'll clean up
        gl.deleteShader(shader);
        console.error('raw shader log: ' + log);
    }
    return null;
}
//
// <a name="crateProgram"></a>
// ### createProgram
//
// WebGL programs have two components, vertex shaders, and fragment shaders.
// Because WebGL is flexibile we could conceivably use one vertex shader with
// multiple fragment shaders, or vice versa.
//
// In order to make a working program we need to `link` a vertex shader and a
// fragment shader
function createProgram(gl, vertexShader, fragmentShader) {
    // first let's get some memory to store the program
    const program = gl.createProgram();
    // and make sure we get that memory
    if (!program) {
        return null;
    }
    // then we can attach the two shaders via reference
    gl.attachShader(program, vertexShader);
    let err = getGlError(gl);
    if (err) {
        console.error('Attach Vertex GL Error', err);
        return null;
    }
    gl.attachShader(program, fragmentShader);
    err = getGlError(gl);
    if (err) {
        console.error('Attach Fragment GL Error', err);
        return null;
    }
    // and finally call link
    gl.linkProgram(program);
    err = getGlError(gl);
    if (err) {
        console.error('Link GL Error', err);
        return null;
    }
    // Again, we need to manually check for success
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    // if we fail there might be some more info
    if (gl.isContextLost() === false) {
        // and if things are bad, let's find out why
        const log = 'Vertex log: ' + gl.getShaderInfoLog(vertexShader) + '\n' +
            'Fragment log: ' + gl.getShaderInfoLog(fragmentShader) + '\n' +
            'Program log: ' + gl.getProgramInfoLog(program) + '\n' +
            'GL Error: ' + getGlError(gl);
        // and clean up
        gl.deleteProgram(program);
        console.error('raw program log: ' + log);
    }
    return null;
}
//
// <a name="bindProgram"></a>
// ### bindProgram
//
// Our shader approach is fairly simple and we don't need much flexibility
// `bindProgram` sets up an opinionated vertex shader and a somewhat more flexibile
// fragment shader..
function bindProgram(gl, vertexSource, fragmentSource, logger) {
    // let's compile the shaders and link the program
    //
    // first create the vertex shader and bail if it fails
    logger.log('Compiling vertex shader');
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    if (!vs) {
        return null;
    }
    // then we'll create the fragment shader and bail if it fails
    logger.log('Compiling fragment shader');
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!fs) {
        return null;
    }
    // finally we'll link the shaders... and bail if they fail
    logger.log('Linking shaders');
    const program = createProgram(gl, vs, fs);
    if (!program) {
        return null;
    }
    logger.log('Binding vertex attributes');
    // our [vertex shader](./shader.html#vertexShader "our vertex shader's source") is strongly 
    // opinionated. We need to bind our position data for a quad (two triangles) to the program
    // but first we need to get the position location
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    // Next we need some memory in the GPU to upload the data to
    const positionBuffer = gl.createBuffer();
    // we might not get memory, if not, we'll return null
    if (!positionBuffer) {
        return null;
    }
    // okay, tell the GPU/WebGL where in memory we want to upload
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // then let's upload six vertices for the two triangles that will make up our
    // rectangular display
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        -1, 1,
        1, -1,
        1, -1,
        -1, 1,
        1, 1,
    ]), gl.STATIC_DRAW);
    // because we have a simple workflow we can mostly assume we're using this opinionated
    // program
    gl.useProgram(program);
    // finally let's wrap up the impportant bits in an object and give them to our consumer
    return {
        positionBuffer,
        positionLocation,
        program,
    };
}
//
// <a name="draw"></a>
// ### draw
//
// each time we want to render a frame we need to setup the program's data the way we want it
// then press "go".  This `draw` function is our "go" button.
function draw(gl, context, canvas) {
    // if the screen resized, re-initatlize the scene
    if (resize(canvas)) {
        setupScene(gl, g_scene, g_glState.uniforms);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    // clear the screen
    gl.clear(gl.COLOR_BUFFER_BIT);
    // make sure our rectangle is setup
    gl.enableVertexAttribArray(context.positionLocation);
    gl.vertexAttribPointer(context.positionLocation, 2, gl.FLOAT, false, 0, 0);
    // draw the rectangle (2 triangles, 6 vertices)
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}
//
// <a name="getUniformDescription"></a>
// ### getUniformDescription
//
// what variables are bound to our program?
function getUniformDescription(shaderConfig) {
    return [
        {
            name: 'aspectRatio',
            type: 'float',
        },
        {
            name: 'cameraMatrix',
            type: 'mat4',
        },
        {
            name: 'cameraPos',
            type: 'vec3',
        },
        {
            name: 'height',
            type: 'float',
        },
        {
            name: 'scale',
            type: 'float',
        },
        {
            name: 'width',
            type: 'float',
        },
        {
            children: [
                {
                    name: 'length',
                    type: 'int',
                },
                {
                    name: 'size',
                    type: 'int',
                },
            ],
            name: 'materials',
            type: 'struct',
        },
        {
            name: 'materialsData',
            type: 'sampler2D',
        },
        {
            children: [
                {
                    name: 'point',
                    type: 'vec3',
                },
            ],
            length: shaderConfig.lightCount,
            name: 'pointLights',
            type: 'struct'
        },
        {
            children: [
                {
                    name: 'length',
                    type: 'int',
                },
                {
                    name: 'size',
                    type: 'int',
                },
            ],
            name: 'spheres',
            type: 'struct',
        },
        {
            name: 'spheresData',
            type: 'sampler2D',
        },
        {
            children: [
                {
                    name: 'length',
                    type: 'int',
                },
                {
                    name: 'size',
                    type: 'int',
                },
            ],
            name: 'triangles',
            type: 'struct',
        },
        {
            name: 'trianglesData',
            type: 'sampler2D',
        },
    ];
}
// ## HTML
// it all begins with HTML somewhere out there we want a canvas to draw on, 
// we could create one, but for the purposes of this document it will be easier
// for us to ask the host HTML file to provide us a canvas element named `"c"`
function getHtmlCanvas(log, onLostContext) {
    const canvas = window.document.getElementById('c');
    // to keep things simple we're working in the global browser space, and we'll note
    // that with a `g_` prefix
    // let's make sure our host HTML document provided us a canvas
    // and in the spirit of readable error messages we'll use a [utility function](utility.html#throwIfFalsey "Utility Functions for Literate Ray Tracer")
    throwIfFalsey(canvas, 'requires an HTML canvas element with the id "c"');
    // now that we have a canvas we can start to do some cool stuff
    // and we'll also want to understand our tools, and when we need to 
    // recalibrate them
    //
    // let's add make sure we know when the system resets the GPU
    let lastTry = 0;
    const onRestore = () => {
        log.warn('Lost WebGL Context');
        tryCatch(onLostContext, () => lastTry = 0, (e) => {
            console.error(e.message);
            log.error('Failed to restart WebGL ' + e.message);
            setTimeout(onRestore, lastTry++);
        });
    };
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    canvas.addEventListener('webglcontexrestored', onRestore);
    // we'll want to [resize](#resize, "Resize documentation")
    // to make sure our canvas is using all of the space it can
    resize(canvas);
    return canvas;
}
//
// <a name="resize"></a>
// ### Handling Resizes
//
// when working with a canvas we might want to be able to respond to resizes
// of the browser window.  Let' handle that case
function resize(canvas) {
    // We'll lookup the size the browser is displaying the canvas.
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    // Then we'll check if the canvas is not the same size.
    if (canvas.width != displayWidth || canvas.height != displayHeight) {
        // If we have to, we'll make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        // Let's give ourselves a signal that we _did_ resize
        return true;
    }
    // In the case we did _not_ resize we should also alert our invoker
    return false;
}
function createElement(type) {
    const el = window.document.createElement(type);
    throwIfFalsey(el, 'could not create ' + type + ' html element');
    return el;
}
// numeric input will be used in several places
function createNumericInput(init, onChange) {
    const input = createElement('input');
    input.type = 'number';
    input.value = init + '';
    const onUpdate = (e) => {
        const n = parseInt(e.target.value, 10);
        onChange(n);
    };
    input.addEventListener('change', onUpdate);
    input.addEventListener('blur', onUpdate);
    return {
        element: input,
        free: () => {
            input.removeEventListener('change', onUpdate);
            input.removeEventListener('blur', onUpdate);
        },
    };
}
// buttons are a useful control to have
function createButton(label, onClick) {
    const element = createElement('button');
    element.innerHTML = label;
    const on = () => onClick();
    element.addEventListener('click', on);
    return {
        element,
        free: () => element.removeEventListener('click', on),
    };
}
// we'll want to be able to toggle things
function createToggleButton(labelA, labelB, onToggle) {
    // let's make a toggle button
    const element = createElement('button');
    // we'll use `labelA` as the first state
    let label = labelA;
    element.innerHTML = label;
    // and we'll want to manage the label and report clicks
    const onClick = () => {
        // swap the labels
        if (label === labelA) {
            label = labelB;
        }
        else {
            label = labelA;
        }
        element.innerHTML = label;
        // inform the consumer
        onToggle();
    };
    // attach the handler
    element.addEventListener('click', onClick);
    // return the element so it can be mounted
    // also provide a mechanism to release the event listener
    return {
        element,
        free: () => element.removeEventListener('click', onClick),
    };
}
// drop downs are one way to let people select between a few choices
function createDropDown(list, selected, onSelect) {
    const select = createElement('select');
    list.map((label, i) => {
        const option = createElement('option');
        if (i === selected) {
            option.selected = true;
        }
        option.value = i + '';
        option.innerHTML = label;
        select.appendChild(option);
        return option;
    });
    const onChange = (e) => {
        onSelect(parseInt(e.target.value, 10));
    };
    select.addEventListener('change', onChange);
    select.addEventListener('blur', onChange);
    return {
        element: select,
        free: () => {
            select.removeEventListener('change', onChange);
            select.removeEventListener('blour', onChange);
        },
    };
}
// and we'll provide a way to bind the optional input controls
function bindInputControls(state) {
    const inputArea = window.document.getElementById('i');
    if (!inputArea) {
        return;
    }
    const controls = [
        createToggleButton('pause', 'resume', () => {
            if (state.isAnimating) {
                state.isAnimating = false;
            }
            else {
                state.isAnimating = true;
                animate(0);
            }
        }),
        createDropDown(['PBR', 'Blinn Phong'], 0, (index) => {
            if (index === 1) {
                state.shadingModel = 1;
            }
            else {
                state.shadingModel = 0;
            }
        }),
        createDropDown(['0x AA', '2x AA', '4x AA'], 0, (index) => {
            if (index === 4) {
                state.aa = 4;
            }
            else if (index === 2) {
                state.aa = 2;
            }
            else {
                state.aa = 0;
            }
        }),
    ];
    controls.forEach(control => {
        inputArea.appendChild(control.element);
    });
    return () => {
        controls.forEach((control) => control.free());
    };
}
// we also want a function that gets us the HTML element for output logs (if any)
function getHtmlLog() {
    return window.document.getElementById('l');
}
// Welcome to the Literate Ray Tracer, a program that reads like a book.
// This book is a long winded fork of [Tom Macwright's](https://github.com/tmcw/literate-raytracer "tom macwright's literate ray tracer")
// In addition to Tom's work, the following websights were leveraged extensively
//
// * [WebGL Fundamentals](https://webglfundamentals.org/ "WebGL Fundamentals, a great source for learning WebGL from scratch"), for learning to grok WebGL
// * [Learn OpenGL](https://learnopengl.com/ "Learn OpenGL, a great source for traditional and PBR approaches to lighting and 3D"), for getting a better handle on lighting
// * [Scratchapixel](https://www.scratchapixel.com/ "Scratchapixel has loads of details on the maths behind raytracing and rasterization as well as loads of source code"), for ray tracing and more
// 
// ## How To Read This Book
//
// With any luck this book reads like any other "book" on the web in 2020
// with the literate programming twist that there's real running code snippets
// inbetween prose.
//
// The code is all real and is [written in TypeScript](https://github.com/bennett000/literate-raytracer "Literate Ray Tracer")
// and runs in a slightly "simpler" way than most web apps in 2020.
//
// To keep it simple,
//   1.  The code is all here, no libraries required
//   2.  The code all executes in the global browser space, no official "modules"
//   3.  Performance is _not_ prioritized, it's not ignored entirely but the focus is on simplicity
//
// Please [report and defects here](https://github.com/bennett000/literate-raytracer/issues "Report an issue with the book") and we'll attempt to address the issue in the next release
//
//
// ## 30,000 Foot View
//
// We're going to be working in a prety "weird" way for most JS devs, and many other devs.
// Web developers are already used to jumping from HTML to JS to CSS and back.  On top of
// that we're going to be jumping into [GLSL](https://www.khronos.org/opengl/wiki/Core_Language_(GLSL) "GL Shader Language")
// specifically an older version that is used on embedded devices and the web.  It's somewhat
// like a simplified C with a dash of C++
//
// ### Tech Overview
//
// * HTML + CSS show the 3D graphics output in a canvas
// * JavaScript controls the HTML and orchestrates the GLSL program(s)
// * GLSL compiles and runs on the GPU (video card)
//
// ### Ray Tracer Overview
//
// We'll assume the audience knows what a ray tracer is, if not, checkout the links
// at the top and wikipedia.
//
// This particular ray tracer is built to show people a bunch of fun graphics things that
// can be done in a relatively cross compatible way in the browser.  We're using WebGL
// 1.x to keep it as compatable as possible. 
//
// The high level algorithm is:
//
//  1.  For each frame JavaScript will update a 3D universe and inform the GPU
//  2.  For each _pixel_ in each frame the GPU will cast out a ray and see if it hits an object.
//      1.  If _no_ object is hit, render a background colour
//      2.  If an object is hit, check if it can see any lights, if so draw a colour, if not, a shadow
//
// Beyond that we'll also look at casting more rays to do things like reflections, and refractions
// ## Contents
// 0. [Configuration](#configuration)
// 1. [HTML _and more!_](#html)
// 2. [Application State](#state)
// 3. [Animation!](#animation)
//
// <a name="configuration"></a>
// ## 0. Configuration
//
// configuration is an important part of our application.  before we even go there we
// will want a place to provide the user and/or developer feedback.  Let's make a logger
// and we'll assume all logs are user facing
const g_logger = (function () {
    const logEl = getHtmlLog();
    return logEl ? createHtmlLogReplacement(logEl) : createConsoleLog();
}());
g_logger.log('hello world');
// `g_floorPlaneSize` is an arbitrary boundary to our scene and describes
// sizing used to bound animations and define a "floor plane" on which we
// can see shadows
const g_floorPlaneSize = 25;
const g_scene = getScene();
// We're going to be passing data into the GPU using textures, this is going to
// require some tricks/hacks, one of those is encoding floats in RGBA quads...
// our conversion is a simple integer encoding and we'll simulate decimals with
// a multiplier
const PACKED_FLOAT_MULTIPLIER = 10000;
const g_configShader = getShaderConfiguration(g_scene);
// 
// <a name="html"></a>
// ## 1. HTML _and more!_
//
// We'll [setup the HTML](html.html "HTML Setup code")
// and while we're at it we should note that from here we start down the road to
// working with the GPU.  Part of getting the canvas is gonig to be listening for
// "lost context".  The GPU is a shared resource and sometimes some of the programs
// using the GPU do not function as expected and the operating system asks the GPU
// to reset itself
//
// Let's make sure it's easy (and fast) to repeat all the things we need to do to start
// the WebGL process
//
// before we start the setup, we'll need a place we can all find the `WebGLRenderingContext`,
// essentially the API to the GPU. This seems like a silly thing to worry about _but_ the `gl` 
// context can be ["lost" at any time](https://www.khronos.org/webgl/wiki/HandlingContextLost "How to handle a lost rendering context")
//
// let's create a simple state object
const g_glState = {
    ctx: null,
    gl: null,
    uniforms: null,
    textures: {},
};
// let's make our GL setup code easy to repeat
// we'll do so with a little dependency injection via  higher order function
const createStartWebGl = (logger) => () => {
    logger.log('Starting WebGL');
    // In order to upload things to the GPU and renderthem on the canvas we'll need to work
    // with an API.  We can ask our canvas for a [WebGLRenderingContext](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext "WebGL Rendering Context is the API we use to upload stuff to the GPU");
    // which will be the API we use to upload stuff to the GPU.
    g_glState.gl = g_canvas.getContext('webgl');
    // if gl is falsey we won't handle it here, that's what the lostContext handler is for
    // however we also don't need to waste time/resources proceeding, so let's bail
    if (!g_glState.gl) {
        // there's one case where we'll want to know 
        return false;
    }
    logger.log('Got context!');
    // Okay, great, so we've got a an API that let's us talk to the GPU.  Alone that's
    // not enough for us to get started.  We need to give the GPU some code to run
    // we're going to need at least one GLSL program, that code is [located in shaders.ts](shaders.html "Our shaders, the 'body' of our program")
    g_glState.ctx = bindProgram(g_glState.gl, getVertexSource(), getFragmentSource(g_configShader), logger);
    // if something failed during compilatioin we should bail
    if (!g_glState.ctx) {
        return false;
    }
    logger.log('Setup scene and bind uniforms');
    // in typscript we're cheating with an any here
    g_glState.uniforms = getUniformSetters(g_glState.gl, g_glState.ctx.program, getUniformDescription(g_configShader));
    setupScene(g_glState.gl, g_scene, g_glState.uniforms);
    g_glState.textures = setupDataTextures(g_glState.gl, g_scene, g_glState.uniforms);
    logger.log('Drawing');
    draw(g_glState.gl, g_glState.ctx, g_canvas);
    // let's make sure things worked as expected
    const error = g_glState.gl.getError();
    if (error !== g_glState.gl.NO_ERROR && error !== g_glState.gl.CONTEXT_LOST_WEBGL) {
        return false;
    }
    return true;
};
// let's create a function we can use to either kick off or restart WebGL
const startWebGl = createStartWebGl(g_logger);
// start webgl and loadup the global logger
const g_canvas = getHtmlCanvas(g_logger, startWebGl);
// if we cannot start WebGL the first time, we have a serious problem
const didStart = tryCatch(startWebGl, (result) => {
    if (result) {
        g_logger.log('Started WebGl');
    }
    else {
        const error = 'Could not initialize WebGL on this device';
        g_logger.error(error);
        throwIfFalsey(false, error);
    }
}, (e) => {
    throwIfFalsey(false, 'WebGL failed to start ' + e.message);
});
//
// <a name="state"></a>
// ## 3. Application State
//
const g_planetStates = (function () {
    const states = [];
    for (let i = 0; i < g_scene.spheres.length; i += 1) {
        const p = g_scene.spheres[i].point;
        const x = (Math.random() - 0.5);
        const y = (Math.random() - 0.5);
        const z = (Math.random() - 0.5);
        states.push({
            matrix: translate4_4(identity4_4(), p[0], p[1], p[2]),
            vector: normalize3_1([x, y, z]),
        });
    }
    return states;
}());
const g_fps = {
    countTime: 0,
    lastTime: 0,
    frames: 0,
    sampleDuration: 5000,
};
const g_userControllableState = {
    shadingModel: 0,
    aa: 0,
    isAnimating: true,
};
//
// <a name="animate"></a>
// 4. ## Animate!
//
// start the animation by default
// on each frame...
const animate = (time) => {
    const { isAnimating } = g_userControllableState;
    // if we're not animating bail, the consumer will need to restart
    if (isAnimating === false) {
        return;
    }
    // if we somehow lost GL context skip to the next frame, this is not intentional
    // and we should restart for the consumer
    if (!g_glState.ctx || !g_glState.gl || !g_glState.uniforms) {
        requestAnimationFrame(animate);
        return;
    }
    // update our FPS state
    g_fps.frames += 1;
    g_fps.countTime += time - g_fps.lastTime;
    g_fps.lastTime = time;
    if (g_fps.countTime >= g_fps.sampleDuration) {
        console.log('fps', g_fps.frames / (g_fps.countTime / 1000));
        g_fps.frames = 0;
        g_fps.countTime = 0;
    }
    // update the state of our spheres
    g_planetStates.forEach((state, i) => {
        if (i > 0) {
            if (state.matrix[12] > g_floorPlaneSize) {
                state.vector = normalize3_1([-1, state.vector[1], state.vector[2]]);
            }
            if (state.matrix[13] > 15) {
                state.vector = normalize3_1([state.vector[0], -1, state.vector[2]]);
            }
            if (state.matrix[14] > g_floorPlaneSize) {
                state.vector = normalize3_1([state.vector[0], state.vector[1], -1]);
            }
            if (state.matrix[12] < -g_floorPlaneSize) {
                state.vector = normalize3_1([1, state.vector[1], state.vector[2]]);
            }
            if (state.matrix[13] < 0.5) {
                state.vector = normalize3_1([state.vector[0], 1, state.vector[2]]);
            }
            if (state.matrix[14] < -g_floorPlaneSize) {
                state.vector = normalize3_1([state.vector[0], state.vector[1], 1]);
            }
            const speed = Math.random() * 3 + 5;
            const x = state.vector[0] / speed;
            const y = state.vector[1] / speed;
            const z = state.vector[2] / speed;
            state.matrix = translate4_4(state.matrix, x, y, z);
            // pin the second light to the second sphere
            if (i === 1) {
                g_scene.lights[1][0] = state.matrix[12];
                g_scene.lights[1][1] = state.matrix[13];
                g_scene.lights[1][2] = state.matrix[14];
                g_glState.uniforms.pointLights[1].point(g_scene.lights[1]);
            }
        }
        const sphere = g_scene.spheres[i];
        if (i > 0) {
            sphere.point = [state.matrix[12], state.matrix[13], state.matrix[14]];
            g_planetStates[i] = state;
        }
    });
    updateSpheres(g_glState.gl, g_scene, g_glState.uniforms, g_glState.textures.spheres, 1);
    // updateTriangles(g_glState.gl, g_scene, g_glState.uniforms, g_glState.textures.triangles, 3);
    draw(g_glState.gl, g_glState.ctx, g_canvas);
    requestAnimationFrame(animate);
};
// bind some controls
bindInputControls(g_userControllableState);
// finally kick it all off
animate(0);
// one simple log class is a wrapper around a native `console`
function createConsoleLog() {
    return {
        error: console.error.bind(console),
        log: console.log.bind(console),
        warn: console.warn.bind(console),
    };
}
// a log class that outputs whatever the last thing was to an HTML element
function createHtmlLogReplacement(root) {
    const span = (thing) => {
        const s = createElement('span');
        s.innerHTML = thing;
        return s;
    };
    const log = (...stuff) => {
        const strings = stuff.map((thing) => {
            if (typeof thing === 'string') {
                return span(thing);
            }
            if (typeof thing === 'number') {
                return span(thing + '');
            }
            if (typeof thing === 'function') {
                return span('function');
            }
            if (!thing) {
                return span(`false like: (${thing})`);
            }
            const c = createElement('code');
            c.innerHTML = JSON.stringify(stuff, null, 4).replace('\n', '<br />');
            return c;
        });
        return strings;
    };
    const stuffToHtml = (el) => root.appendChild(el);
    return {
        error(...stuff) {
            root.innerHTML = '';
            log('❗', ...stuff).forEach(stuffToHtml);
        },
        log(...stuff) {
            root.innerHTML = '';
            return log('👍', ...stuff).forEach(stuffToHtml);
        },
        warn(...stuff) {
            root.innerHTML = '';
            return log('⚠', ...stuff).forEach(stuffToHtml);
        },
    };
}
function createMatrix3_1() {
    return [0, 0, 0];
}
function identity3_3() {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}
function multiply3_1(a, b, op = createObjectPool(createMatrix3_1)) {
    const v = op.malloc();
    v[0] = a[1] * b[2] - a[2] * b[1];
    v[1] = a[2] * b[0] - a[0] * b[2];
    v[2] = a[0] * b[1] - a[1] * b[0];
    return v;
}
function multiply3_3(a, b) {
    const a00 = a[0 * 3 + 0];
    const a01 = a[0 * 3 + 1];
    const a02 = a[0 * 3 + 2];
    const a10 = a[1 * 3 + 0];
    const a11 = a[1 * 3 + 1];
    const a12 = a[1 * 3 + 2];
    const a20 = a[2 * 3 + 0];
    const a21 = a[2 * 3 + 1];
    const a22 = a[2 * 3 + 2];
    const b00 = b[0 * 3 + 0];
    const b01 = b[0 * 3 + 1];
    const b02 = b[0 * 3 + 2];
    const b10 = b[1 * 3 + 0];
    const b11 = b[1 * 3 + 1];
    const b12 = b[1 * 3 + 2];
    const b20 = b[2 * 3 + 0];
    const b21 = b[2 * 3 + 1];
    const b22 = b[2 * 3 + 2];
    return [
        b00 * a00 + b01 * a10 + b02 * a20,
        b00 * a01 + b01 * a11 + b02 * a21,
        b00 * a02 + b01 * a12 + b02 * a22,
        b10 * a00 + b11 * a10 + b12 * a20,
        b10 * a01 + b11 * a11 + b12 * a21,
        b10 * a02 + b11 * a12 + b12 * a22,
        b20 * a00 + b21 * a10 + b22 * a20,
        b20 * a01 + b21 * a11 + b22 * a21,
        b20 * a02 + b21 * a12 + b22 * a22,
    ];
}
function subtract3_1(a, b, op = createObjectPool(createMatrix3_1)) {
    const v = op.malloc();
    v[0] = a[0] - b[0];
    v[1] = a[1] - b[1];
    v[2] = a[2] - b[2];
    return v;
}
function normalize3_1(m, op = createObjectPool(createMatrix3_1)) {
    const v = op.malloc();
    const length = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
    // make sure we don't divide by 0.
    if (length > 0.0000001) {
        v[0] = m[0] / length;
        v[1] = m[1] / length;
        v[2] = m[2] / length;
        return v;
    }
    console.warn('normalize3_1 has no length', m);
    v[0] = 0;
    v[1] = 0;
    v[2] = 0;
    return v;
}
function createTranslation3_3(tx, ty) {
    return [1, 0, 0, 0, 1, 0, tx, ty, 1];
}
function createRotation3_3(angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
}
function createScaling3_3(sx, sy) {
    return [sx, 0, 0, 0, sy, 0, 0, 0, 1];
}
function createProjection3_3(width, height) {
    // Note: This matrix flips the Y axis so that 0 is at the top.
    return [2 / width, 0, 0, 0, -2 / height, 0, -1, 1, 1];
}
function translate3_3(m, x, y) {
    return multiply3_3(createTranslation3_3(x, y), m);
}
function rotate3_3(m, angleInRadians) {
    return multiply3_3(createRotation3_3(angleInRadians), m);
}
function scale3_3(m, sx, sy) {
    return multiply3_3(createScaling3_3(sx, sy), m);
}
function project3_3(m, width, height) {
    return multiply3_3(createProjection3_3(width, height), m);
}
function createMatrix4_4() {
    return new Float32Array(16);
}
function copy4_4(source, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    for (let i = 0; i < source.length; i += 1) {
        v[i] = source[i];
    }
    return v;
}
function identity4_4(op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    v[0] = 1;
    v[1] = 0;
    v[2] = 0;
    v[3] = 0;
    v[4] = 0;
    v[5] = 1;
    v[6] = 0;
    v[7] = 0;
    v[8] = 0;
    v[9] = 0;
    v[10] = 1;
    v[11] = 0;
    v[12] = 0;
    v[13] = 0;
    v[14] = 0;
    v[15] = 1;
    return v;
}
function multiply4_4and3_1(a, b, op = createObjectPool(createMatrix3_1)) {
    const m = op.malloc();
    m[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12];
    m[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13];
    m[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14];
    return m;
}
function multiply4_4(a, b, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    const b00 = b[0 * 4 + 0];
    const b01 = b[0 * 4 + 1];
    const b02 = b[0 * 4 + 2];
    const b03 = b[0 * 4 + 3];
    const b10 = b[1 * 4 + 0];
    const b11 = b[1 * 4 + 1];
    const b12 = b[1 * 4 + 2];
    const b13 = b[1 * 4 + 3];
    const b20 = b[2 * 4 + 0];
    const b21 = b[2 * 4 + 1];
    const b22 = b[2 * 4 + 2];
    const b23 = b[2 * 4 + 3];
    const b30 = b[3 * 4 + 0];
    const b31 = b[3 * 4 + 1];
    const b32 = b[3 * 4 + 2];
    const b33 = b[3 * 4 + 3];
    const a00 = a[0 * 4 + 0];
    const a01 = a[0 * 4 + 1];
    const a02 = a[0 * 4 + 2];
    const a03 = a[0 * 4 + 3];
    const a10 = a[1 * 4 + 0];
    const a11 = a[1 * 4 + 1];
    const a12 = a[1 * 4 + 2];
    const a13 = a[1 * 4 + 3];
    const a20 = a[2 * 4 + 0];
    const a21 = a[2 * 4 + 1];
    const a22 = a[2 * 4 + 2];
    const a23 = a[2 * 4 + 3];
    const a30 = a[3 * 4 + 0];
    const a31 = a[3 * 4 + 1];
    const a32 = a[3 * 4 + 2];
    const a33 = a[3 * 4 + 3];
    v[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    v[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    v[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    v[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
    v[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
    v[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
    v[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
    v[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
    v[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
    v[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
    v[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
    v[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
    v[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
    v[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
    v[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
    v[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
    return v;
}
function createTranslation4_4(x, y, z, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    v[0] = 1;
    v[1] = 0;
    v[2] = 0;
    v[3] = 0;
    v[4] = 0;
    v[5] = 1;
    v[6] = 0;
    v[7] = 0;
    v[8] = 0;
    v[9] = 0;
    v[10] = 1;
    v[11] = 0;
    v[12] = x;
    v[13] = y;
    v[14] = z;
    v[15] = 1;
    return v;
}
function createXRotation4_4(angleInRadians, op = createObjectPool(createMatrix4_4)) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    const v = op.malloc();
    v[0] = 1;
    v[1] = 0;
    v[2] = 0;
    v[3] = 0;
    v[4] = 0;
    v[5] = c;
    v[6] = s;
    v[7] = 0;
    v[8] = 0;
    v[9] = -s;
    v[10] = c;
    v[11] = 0;
    v[12] = 0;
    v[13] = 0;
    v[14] = 0;
    v[15] = 1;
    return v;
}
function createYRotation4_4(angleInRadians, op = createObjectPool(createMatrix4_4)) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    const v = op.malloc();
    v[0] = c;
    v[1] = 0;
    v[2] = -s;
    v[3] = 0;
    v[4] = 0;
    v[5] = 1;
    v[6] = 0;
    v[7] = 0;
    v[8] = s;
    v[9] = 0;
    v[10] = c;
    v[11] = 0;
    v[12] = 0;
    v[13] = 0;
    v[14] = 0;
    v[15] = 1;
    return v;
}
function createZRotation4_4(angleInRadians, op = createObjectPool(createMatrix4_4)) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    const v = op.malloc();
    v[0] = c;
    v[1] = s;
    v[2] = 0;
    v[3] = 0;
    v[4] = -s;
    v[5] = c;
    v[6] = 0;
    v[7] = 0;
    v[8] = 0;
    v[9] = 0;
    v[10] = 1;
    v[11] = 0;
    v[12] = 0;
    v[13] = 0;
    v[14] = 0;
    v[15] = 1;
    return v;
}
function createScaling4_4(x, y, z, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    v[0] = x;
    v[1] = 0;
    v[2] = 0;
    v[3] = 0;
    v[4] = 0;
    v[5] = y;
    v[6] = 0;
    v[7] = 0;
    v[8] = 0;
    v[9] = 0;
    v[10] = z;
    v[11] = 0;
    v[12] = 0;
    v[13] = 0;
    v[14] = 0;
    v[15] = 1;
    return v;
}
function translate4_4(m, x, y, z, op = createObjectPool(createMatrix4_4)) {
    const t = createTranslation4_4(x, y, z, op);
    const result = multiply4_4(m, t, op);
    op.free(t);
    return result;
}
function xRotate4_4(m, angleInRadians, op = createObjectPool(createMatrix4_4)) {
    const t = createXRotation4_4(angleInRadians, op);
    const result = multiply4_4(m, t, op);
    op.free(t);
    return result;
}
function yRotate4_4(m, angleInRadians, op = createObjectPool(createMatrix4_4)) {
    const t = createYRotation4_4(angleInRadians, op);
    const result = multiply4_4(m, t, op);
    op.free(t);
    return result;
}
function zRotate4_4(m, angleInRadians, op = createObjectPool(createMatrix4_4)) {
    const t = createZRotation4_4(angleInRadians, op);
    const result = multiply4_4(m, t, op);
    op.free(t);
    return result;
}
function scale4_4(m, x, y, z, op = createObjectPool(createMatrix4_4)) {
    const t = createScaling4_4(x, y, z, op);
    const result = multiply4_4(m, t, op);
    op.free(t);
    return result;
}
function ortho4_4(left, right, bottom, top, near, far, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    v[0] = 2 / (right - left);
    v[1] = 0;
    v[2] = 0;
    v[3] = 0;
    v[4] = 0;
    v[5] = 2 / (top - bottom);
    v[6] = 0;
    v[7] = 0;
    v[8] = 0;
    v[9] = 0;
    v[10] = 2 / (near - far);
    v[11] = 0;
    v[12] = (left + right) / (left - right);
    v[13] = (bottom + top) / (bottom - top);
    v[14] = (near + far) / (near - far);
    v[15] = 1;
    return v;
}
function perspective4_4(fovRadians, aspect, near, far, op = createObjectPool(createMatrix4_4)) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRadians);
    const rangeInv = 1.0 / (near - far);
    const v = op.malloc();
    v[0] = f / aspect;
    v[1] = 0;
    v[2] = 0;
    v[3] = 0;
    v[4] = 0;
    v[5] = f;
    v[6] = 0;
    v[7] = 0;
    v[8] = 0;
    v[9] = 0;
    v[10] = (near + far) * rangeInv;
    v[11] = -1;
    v[12] = 0;
    v[13] = 0;
    v[14] = near * far * rangeInv * 2;
    v[15] = 0;
    return v;
}
function inverse4_4(m, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    const m00 = m[0 * 4 + 0];
    const m01 = m[0 * 4 + 1];
    const m02 = m[0 * 4 + 2];
    const m03 = m[0 * 4 + 3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];
    const tmp_0 = m22 * m33;
    const tmp_1 = m32 * m23;
    const tmp_2 = m12 * m33;
    const tmp_3 = m32 * m13;
    const tmp_4 = m12 * m23;
    const tmp_5 = m22 * m13;
    const tmp_6 = m02 * m33;
    const tmp_7 = m32 * m03;
    const tmp_8 = m02 * m23;
    const tmp_9 = m22 * m03;
    const tmp_10 = m02 * m13;
    const tmp_11 = m12 * m03;
    const tmp_12 = m20 * m31;
    const tmp_13 = m30 * m21;
    const tmp_14 = m10 * m31;
    const tmp_15 = m30 * m11;
    const tmp_16 = m10 * m21;
    const tmp_17 = m20 * m11;
    const tmp_18 = m00 * m31;
    const tmp_19 = m30 * m01;
    const tmp_20 = m00 * m21;
    const tmp_21 = m20 * m01;
    const tmp_22 = m00 * m11;
    const tmp_23 = m10 * m01;
    const t0 = tmp_0 * m11 +
        tmp_3 * m21 +
        tmp_4 * m31 -
        (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    const t1 = tmp_1 * m01 +
        tmp_6 * m21 +
        tmp_9 * m31 -
        (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    const t2 = tmp_2 * m01 +
        tmp_7 * m11 +
        tmp_10 * m31 -
        (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    const t3 = tmp_5 * m01 +
        tmp_8 * m11 +
        tmp_11 * m21 -
        (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);
    const det = m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3;
    if (det === 0) {
        console.warn('4x4 Matrix inversion warnining, no inverse');
    }
    const d = det !== 0 ? 1.0 / det : 0.000000001;
    v[0] = d * t0;
    v[1] = d * t1;
    v[2] = d * t2;
    v[3] = d * t3;
    v[4] =
        d *
            (tmp_1 * m10 +
                tmp_2 * m20 +
                tmp_5 * m30 -
                (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30));
    v[5] =
        d *
            (tmp_0 * m00 +
                tmp_7 * m20 +
                tmp_8 * m30 -
                (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30));
    v[6] =
        d *
            (tmp_3 * m00 +
                tmp_6 * m10 +
                tmp_11 * m30 -
                (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30));
    v[7] =
        d *
            (tmp_4 * m00 +
                tmp_9 * m10 +
                tmp_10 * m20 -
                (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20));
    v[8] =
        d *
            (tmp_12 * m13 +
                tmp_15 * m23 +
                tmp_16 * m33 -
                (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33));
    v[9] =
        d *
            (tmp_13 * m03 +
                tmp_18 * m23 +
                tmp_21 * m33 -
                (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33));
    v[10] =
        d *
            (tmp_14 * m03 +
                tmp_19 * m13 +
                tmp_22 * m33 -
                (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33));
    v[11] =
        d *
            (tmp_17 * m03 +
                tmp_20 * m13 +
                tmp_23 * m23 -
                (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23));
    v[12] =
        d *
            (tmp_14 * m22 +
                tmp_17 * m32 +
                tmp_13 * m12 -
                (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22));
    v[13] =
        d *
            (tmp_20 * m32 +
                tmp_12 * m02 +
                tmp_19 * m22 -
                (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02));
    v[14] =
        d *
            (tmp_18 * m12 +
                tmp_23 * m32 +
                tmp_15 * m02 -
                (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12));
    v[15] =
        d *
            (tmp_22 * m22 +
                tmp_16 * m02 +
                tmp_21 * m12 -
                (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02));
    return v;
}
function lookAt4_4(cameraPosition, target, up, op4_4 = createObjectPool(createMatrix4_4), op3_1 = createObjectPool(createMatrix3_1)) {
    const z1 = subtract3_1(cameraPosition, target, op3_1);
    const z = normalize3_1(z1, op3_1);
    const x1 = multiply3_1(up, z, op3_1);
    const x = normalize3_1(x1, op3_1);
    const y1 = multiply3_1(z, x, op3_1);
    const y = normalize3_1(y1, op3_1);
    const v = op4_4.malloc();
    v[0] = x[0];
    v[1] = x[1];
    v[2] = x[2];
    v[3] = 0;
    v[4] = y[0];
    v[5] = y[1];
    v[6] = y[2];
    v[7] = 0;
    v[8] = z[0];
    v[9] = z[1];
    v[10] = z[2];
    v[11] = 0;
    v[12] = cameraPosition[0];
    v[13] = cameraPosition[1];
    v[14] = cameraPosition[2];
    v[15] = 1;
    op3_1.free(x1);
    op3_1.free(x);
    op3_1.free(y1);
    op3_1.free(y);
    op3_1.free(z1);
    op3_1.free(z);
    return v;
}
function transpose4_4(m, op = createObjectPool(createMatrix4_4)) {
    const v = op.malloc();
    v[0] = m[0];
    v[1] = m[4];
    v[2] = m[8];
    v[3] = m[12];
    v[4] = m[1];
    v[5] = m[5];
    v[6] = m[9];
    v[7] = m[13];
    v[8] = m[2];
    v[9] = m[6];
    v[10] = m[10];
    v[11] = m[14];
    v[12] = m[3];
    v[13] = m[7];
    v[14] = m[11];
    v[15] = m[15];
    return v;
}
function vectorMultiply(v, m) {
    const dst = [];
    for (let i = 0; i < 4; ++i) {
        dst[i] = 0.0;
        for (let j = 0; j < 4; ++j) {
            dst[i] += v[j] * m[j * 4 + i];
        }
    }
    return dst;
}
function createObjectPool(create, initialSize = 0) {
    const pool = [];
    if (initialSize) {
        for (let i = 0; i < initialSize; i += 1) {
            pool.push(create());
        }
    }
    return {
        free(obj) {
            pool.push(obj);
        },
        malloc() {
            if (pool.length) {
                const o = pool.pop();
                if (o) {
                    return o;
                }
                return create();
            }
            return create();
        },
    };
}
function dot3_1(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function getScene(sphereCount = 57, minOrbit = 3) {
    // Our scene is going to be a proof of concept, can we render a bunch of simple
    // objects at reasonable speed. Mathematical spheres are some of the simplest
    // objects to render and store.
    //
    // ### Setup The Scene Dependencies
    //
    // we don't have a sophisticated geometry system.  We'll be generating
    // that here in a sub optimal way for a real app.
    //
    // Starting with a means of computing a triangle's normal
    // triangles.map((t, i) => {
    const triangleToNormal = (t) => {
        const v0v1 = subtract3_1(t.points[1], t.points[0]);
        const v0v2 = subtract3_1(t.points[2], t.points[0]);
        const normal = normalize3_1(multiply3_1(v0v1, v0v2));
        return normal;
    };
    // we'll need a place to cache triangle normals
    let triangleNormals = [];
    //
    // <a name="spheres"></a>
    // #### Build the Spheres
    //
    // We'll have one large static sphere in the centre and many other spheres
    // that we'll animate around the scene
    const spheres = (function () {
        // we'll also need to store the spheres somewhere
        const s = [];
        // we'll initialize the spheres so they're not immediately overlapping
        // in order to do that we'll increment the radius for each sphere we add
        // to the scene
        let prevRadius = 0;
        // ##### Build a each sphere
        for (let i = 0; i < sphereCount; i += 1) {
            let radius = 0.1;
            let material = Math.floor(Math.random() * 5 + 2);
            // make the first circle large
            // make the second circle tiny
            // make all the rest randomly modest
            if (i === 0) {
                radius = minOrbit - 1;
            }
            else if (i === 1) {
                radius = 0.05;
                material = 1;
            }
            else {
                radius = (Math.random() / 2) + 0.1;
            }
            // build a simple sphere object
            s.push({
                radius,
                point: [
                    // we'll start the spheres on the x axis
                    i === 0
                        // the first sphere will be a the origin
                        ? 0
                        // the other spheres will fan out along the x axis
                        : minOrbit + i * 0.25 + radius + prevRadius,
                    // all sphere's we'll be
                    5, 0
                ],
                // each sphere has a "pointer" to a `material`
                // the "pointer" is an index in the `scene.materials` array
                material,
            });
            // update the radius for the next sphere
            prevRadius = radius;
        }
        // ##### We now have some spheres!
        return s;
    }());
    //
    // <a name="triangles"></a>
    // #### Triangles
    //
    // Triangles and ray intersections are harder to calculate than sphere intersections
    // we'll be focusing more on triangles later.  Right now we have some just to demonstrate
    // shadows
    //
    // Our scene has two triangles that make up the "floor plane" or our scene
    //
    // each triangle has a "pointer" to a `material`
    // the "pointer" is an index in the `scene.materials` array
    //
    // each triangle also has three points
    const triangles = [
        {
            material: 0,
            points: [
                [g_floorPlaneSize, 0, -g_floorPlaneSize],
                [-g_floorPlaneSize, 0, -g_floorPlaneSize],
                [-g_floorPlaneSize, 0, g_floorPlaneSize],
            ],
        },
        {
            material: 0,
            points: [
                [-g_floorPlaneSize, 0, g_floorPlaneSize],
                [g_floorPlaneSize, 0, g_floorPlaneSize],
                [g_floorPlaneSize, 0, -g_floorPlaneSize],
            ],
        },
    ];
    // now that we have some triangles, let's pre-compute the normals
    triangleNormals = triangles.map(triangleToNormal);
    //
    // <a name="materials"></a>
    // #### Materials
    //
    // materials are currently a bit of a mess.  The objects do double duty in both
    // the Blinn Phong (BP) model and in the PBR model
    //
    // * `colour` means "diffuse colour" in BP, and  "albedo" in PBR
    // * `ambient` means "% ambient contribution" in BP, and "ao" in PBR 
    // * `diffuse` means "% diffuse contribution" in BP, and "roughness" in PBR
    // * `specular` means "% specular contribution" in BP, and "metallic" in PBR
    // * `refraction` (future)
    // * `isTranslucent` (future)
    const materials = [
        // we'll hard code these ones in some places
        {
            colour: [200, 200, 200],
            ambient: 0.1,
            diffuse: 0.8,
            specular: 0.02,
            refraction: 1.0,
            isTranslucent: false,
        },
        {
            colour: [255, 255, 150],
            ambient: 0.1,
            diffuse: 0.999999,
            specular: 0.99999,
            refraction: 1.0,
            isTranslucent: true,
        },
        // the rest of these we'll pick from randomly
        {
            colour: [100, 0, 0],
            ambient: 0.01,
            diffuse: 0.5,
            specular: 0.1,
            refraction: 1.0,
            isTranslucent: false,
        },
        {
            colour: [150, 0, 150],
            ambient: 0.01,
            diffuse: 0.5,
            specular: 0.1,
            refraction: 1.0,
            isTranslucent: false,
        },
        {
            colour: [0, 150, 50],
            ambient: 0.01,
            diffuse: 0.5,
            specular: 0.1,
            refraction: 1.0,
            isTranslucent: false,
        },
        {
            colour: [10, 10, 200],
            ambient: 0.01,
            diffuse: 0.5,
            specular: 0.1,
            refraction: 1.0,
            isTranslucent: false,
        },
        {
            colour: [50, 50, 50],
            ambient: 0.2,
            diffuse: 0.01,
            specular: 0.999,
            refraction: 1.0,
            isTranslucent: false,
        },
    ];
    //
    // <a name="scene"></a>
    // ### The Actual Scene Object
    return {
        // let's build a camera
        camera: {
            point: [0, 5, 50],
            fieldOfView: 45,
            rotation: [0, 0, 0],
            up: [0, 1, 0],
        },
        // for simplicity our lights are just a single point in space
        lights: [[-25, 30, 10], [0, 3, 0]],
        // place the materials object in the scene
        materials,
        // place the spheres object in the scene
        spheres,
        // place the triangles object in the scene
        triangles,
        // we'll calculate normals on the fly
        // and provide a mechanism for consumers that allows them to run a function on each
        // triangle, thereby they can be sure their loops iterate over all the triangles only
        // once
        triangleNormals(onEach, useCache = false) {
            if (useCache) {
                triangles.forEach((triangle, i) => onEach(triangleNormals[i], triangle, i));
                return triangleNormals;
            }
            triangleNormals = triangles.map((t, i) => {
                const normal = triangleToNormal(t);
                onEach(normal, t, i);
                return normal;
            });
            return triangleNormals;
        }
    };
}
//
// <a name="insertPointInto"></a>
// ## insertPointInto
//
// helper function for our functions that will encode things for the GPU
function insertPointInto(data) {
    return (point, index) => {
        const x = fourByteFromFloat(point[0] * PACKED_FLOAT_MULTIPLIER);
        const y = fourByteFromFloat(point[1] * PACKED_FLOAT_MULTIPLIER);
        const z = fourByteFromFloat(point[2] * PACKED_FLOAT_MULTIPLIER);
        data[index + 0] = x[0];
        data[index + 1] = x[1];
        data[index + 2] = x[2];
        data[index + 3] = x[3];
        data[index + 4] = y[0];
        data[index + 5] = y[1];
        data[index + 6] = y[2];
        data[index + 7] = y[3];
        data[index + 8] = z[0];
        data[index + 9] = z[1];
        data[index + 10] = z[2];
        data[index + 11] = z[3];
    };
}
//
// <a name="encodeTriangle"></a>
// ## encodeTriangle
function encodeTriangles(scene) {
    const size = /* a */ 3 + /* b */ 3 + /* c */ +3 + /* normal */ +3 + /* material */ +1;
    const sizeRaw = size * 4;
    const length = scene.triangles.length;
    const width = length * size;
    const lengthRaw = width * 4;
    const data = new Uint8Array(lengthRaw);
    const insertPoint = insertPointInto(data);
    scene.triangleNormals((normal, t, i) => {
        const pointer = i * sizeRaw;
        insertPoint(t.points[0], 0 + pointer);
        insertPoint(t.points[1], 12 + pointer);
        insertPoint(t.points[2], 24 + pointer);
        insertPoint(normal, 36 + pointer);
        const material = fourByteFromFloat(t.material);
        data[48 + pointer] = material[0];
        data[49 + pointer] = material[1];
        data[50 + pointer] = material[2];
        data[51 + pointer] = material[3];
    }, false);
    return {
        data,
        height: 1,
        length,
        size,
        targetUniformSampler: 'trianglesData',
        targetUniformStruct: 'triangles',
        width,
    };
}
//
// <a name="encodeSphere"></a>
// ## encodeSphere
function encodeSpheres(scene) {
    const size = /* centre */ 3 + /* radius */ +1 + /* material */ +1;
    const sizeRaw = size * 4;
    const length = scene.spheres.length;
    const width = length * size;
    const lengthRaw = width * 4;
    const data = new Uint8Array(lengthRaw);
    const insertPoint = insertPointInto(data);
    scene.spheres.forEach((sphere, i) => {
        const pointer = i * sizeRaw;
        insertPoint(sphere.point, 0 + pointer);
        const radius = fourByteFromFloat(sphere.radius * PACKED_FLOAT_MULTIPLIER);
        data[12 + pointer] = radius[0];
        data[13 + pointer] = radius[1];
        data[14 + pointer] = radius[2];
        data[15 + pointer] = radius[3];
        const material = fourByteFromFloat(sphere.material);
        data[16 + pointer] = material[0];
        data[17 + pointer] = material[1];
        data[18 + pointer] = material[2];
        data[19 + pointer] = material[3];
    }, false);
    return {
        data,
        height: 1,
        length,
        size,
        targetUniformSampler: 'spheresData',
        targetUniformStruct: 'spheres',
        width,
    };
}
//
// <a name="encodeMaterials"></a>
// ### encodeMaterials
function encodeMaterials(scene) {
    const size = /* colour */ 3 /* ambient */ + 1 /* diffuse/rough */ + 1 /* specular/metal */ + 1 /* refraction */ + 1 /* isTranslucent */ + 1;
    const sizeRaw = size * 4;
    const length = scene.spheres.length;
    const width = length * size;
    const lengthRaw = width * 4;
    const data = new Uint8Array(lengthRaw);
    const insertPoint = insertPointInto(data);
    scene.materials.forEach((m, i) => {
        const pointer = i * sizeRaw;
        insertPoint(m.colour, 0 + pointer);
        const ambient = fourByteFromFloat(m.ambient * PACKED_FLOAT_MULTIPLIER);
        data[12 + pointer] = ambient[0];
        data[13 + pointer] = ambient[1];
        data[14 + pointer] = ambient[2];
        data[15 + pointer] = ambient[3];
        const diffuse = fourByteFromFloat(m.diffuse * PACKED_FLOAT_MULTIPLIER);
        data[16 + pointer] = diffuse[0];
        data[17 + pointer] = diffuse[1];
        data[18 + pointer] = diffuse[2];
        data[19 + pointer] = diffuse[3];
        const specular = fourByteFromFloat(m.specular * PACKED_FLOAT_MULTIPLIER);
        data[20 + pointer] = specular[0];
        data[21 + pointer] = specular[1];
        data[22 + pointer] = specular[2];
        data[23 + pointer] = specular[3];
        const refraction = fourByteFromFloat(m.refraction * PACKED_FLOAT_MULTIPLIER);
        data[24 + pointer] = refraction[0];
        data[25 + pointer] = refraction[1];
        data[26 + pointer] = refraction[2];
        data[27 + pointer] = refraction[3];
        const isTranslucent = fourByteFromFloat(m.isTranslucent ? 1 : 0);
        data[28 + pointer] = isTranslucent[0];
        data[29 + pointer] = isTranslucent[1];
        data[30 + pointer] = isTranslucent[2];
        data[31 + pointer] = isTranslucent[3];
    }, false);
    return {
        data,
        height: 1,
        length,
        size,
        targetUniformSampler: 'materialsData',
        targetUniformStruct: 'materials',
        width,
    };
}
//
// <a name="encodeExtents"></a>
// ### encodeExtents
// function encodeExtents(scene: Scene): TextureDataStructureEncoding {
//   const size = /* numPlaneSetNormals */ 7 * 2;
//   const sizeRaw = size * 4;
//   const length = scene.spheres.length;
//   const width = length * size;
//   const lengthRaw = width * 4;
//   const data = new Uint8Array(lengthRaw);
//   data[12 + pointer] = ambient[0];
//   data[13 + pointer] = ambient[1];
//   data[14 + pointer] = ambient[2];
//   data[15 + pointer] = ambient[3];
// }
//
// <a name="createDataTexture"></a>
// ### createDataTexture
//
// we need a way of giving the GPU lots of data about things like verticies, bounding boxes
// etc.  We can pack this info into a "data texture"
function createDataTexture(gl, width, height, data, unit) {
    const texture = gl.createTexture();
    throwIfFalsey(texture, 'could not create data texture');
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return texture;
}
//
// <a name="setupScene"></a>
// ## setupScene
function setupScene(gl, scene, uniforms) {
    const { camera, materials, lights } = scene;
    const cameraMatrix = zRotate4_4(yRotate4_4(xRotate4_4(translate4_4(identity4_4(), camera.point[0], camera.point[1], camera.point[2]), camera.rotation[0]), camera.rotation[1]), camera.rotation[2]);
    const scale = Math.tan(Math.PI * (camera.fieldOfView * 0.5) / 180);
    const width = gl.canvas.clientWidth;
    const height = gl.canvas.clientHeight;
    const aspectRatio = width / height;
    const origin = [
        cameraMatrix[12],
        cameraMatrix[13],
        cameraMatrix[14],
    ];
    uniforms.aspectRatio(aspectRatio);
    uniforms.cameraMatrix(cameraMatrix);
    uniforms.cameraPos(origin);
    uniforms.height(height);
    uniforms.scale(scale);
    uniforms.width(width);
    lights.forEach((l, i) => {
        uniforms.pointLights[i].point(l);
    });
}
//
// function that creates and binds a data texture
function setupGenericDataTexture(gl, uniforms, encoding, unit) {
    const texture = createDataTexture(gl, encoding.width, encoding.height, encoding.data, unit);
    uniforms[encoding.targetUniformStruct].length(encoding.length);
    uniforms[encoding.targetUniformStruct].size(encoding.size);
    uniforms[encoding.targetUniformSampler](texture, unit);
    return texture;
}
function updateGenericDataTexture(gl, uniforms, encoding, texture, unit) {
    const { data, height, width } = encoding;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    uniforms[encoding.targetUniformStruct].length(encoding.length);
    uniforms[encoding.targetUniformStruct].size(encoding.size);
    uniforms[encoding.targetUniformSampler](texture, unit);
    return texture;
}
function setupSpheres(gl, scene, uniforms, unit) {
    const spheres = encodeSpheres(scene);
    return setupGenericDataTexture(gl, uniforms, spheres, unit);
}
function updateSpheres(gl, scene, uniforms, texture, unit) {
    const spheres = encodeSpheres(scene);
    return updateGenericDataTexture(gl, uniforms, spheres, texture, unit);
}
function setupTriangles(gl, scene, uniforms, unit) {
    const triangles = encodeTriangles(scene);
    return setupGenericDataTexture(gl, uniforms, triangles, unit);
}
function updateTriangles(gl, scene, uniforms, texture, unit) {
    const triangles = encodeTriangles(scene);
    return updateGenericDataTexture(gl, uniforms, triangles, texture, unit);
}
function setupMaterials(gl, scene, uniforms, unit) {
    const materials = encodeMaterials(scene);
    return setupGenericDataTexture(gl, uniforms, materials, unit);
}
function updateMaterials(gl, scene, uniforms, texture, unit) {
    const materials = encodeMaterials(scene);
    return updateGenericDataTexture(gl, uniforms, materials, texture, unit);
}
function setupDataTextures(gl, scene, uniforms) {
    const spheres = setupSpheres(gl, scene, uniforms, 1);
    const materials = setupMaterials(gl, scene, uniforms, 2);
    const triangles = setupTriangles(gl, scene, uniforms, 3);
    return {
        materials,
        spheres,
        triangles,
    };
}
// ## Shader Configuration
//
function getShaderConfiguration(scene) {
    // We'll put all of our configuration into an object
    // because much of our configuration is directly injected into GLSL code
    // and because WebGL's GLSL is ancient we're encoding our numbers as strings.
    // We're doing this to stop WebGL from complaining that `1` is not a float
    // this version of GLSL will want a full `1.0`
    return {
        // anti aliasing, 1, 2, or 4
        aa: 1,
        // acceleration config
        acceleration: {
            // how many "plane set normals" will we have (note we have no plans for this _not_
            // to be 7, this is here for deduplication)
            numPlaneSetNormals: 7,
            // how many "extents" objects do we have in our accelerator?
            numExtents: 1,
        },
        // The colour of the background (if rays hit nothing this is the colour of the pixel) 
        bg: {
            r: '0.05',
            g: '0.05',
            b: '0.05',
        },
        // F0 is a setting in our PBR (physics based rendering) system that
        // deals with reflections in Fresnel equations
        defaultF0: '0.04',
        // Our shaders work with floating points.  Floating points have tiny decimals at
        // the ends which can make comparisions tricky.  `epsilon` gives us a small value
        // we can use to help work around some of the even smaller decimals.
        epsilon: '0.00005',
        // we need a proxy for infinity
        infinity: '99999999999999999999999999999999999999.0',
        // how many lights are in the scene?
        lightCount: scene.lights.length,
        // how many materials are in the scene?
        materialCount: scene.materials.length,
        // how many octree nodes can we visit?
        octreeNodeIterationMax: Math.ceil((scene.triangles.length + scene.spheres.length) / 2),
        // we will be packing floats into 8 bit unsigned integer quads (RGBA) and we
        // will want a mechanism for preserving fractions, we can do so by multiplying
        // or dividing by a factor
        packedFloatMultiplier: PACKED_FLOAT_MULTIPLIER + '.0',
        // phongSpecular is a variable in our Blinn Phong (old school) system
        // that helps us control specular (shiny) lighting
        // it's a string
        phongSpecularExp: '32.0',
        // the shading model we'll be using
        // 1 for Blinn Phong, 0 for PBR
        shadingModel: 0,
        // how many spheres are in the scene?
        sphereCount: scene.spheres.length,
        // how many triangles are in the scene?
        triangleCount: scene.triangles.length,
    };
}
function getFragmentShaderMain(aa) {
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
function getShaderPbr(defaultF0, lightCount) {
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
function getShaderPhongDeclarations() {
    return `
vec3 surface1(Hit hit);
vec3 surface2(Hit hit);
`;
}
function getShaderPhong(phongSpecularExp, lightCount) {
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
function getShaderUtility(epsilon) {
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
function getFragmentSource(config) {
    // for brevity's sake break out the config values
    const { aa, acceleration, bg, defaultF0, epsilon, infinity, lightCount, packedFloatMultiplier, phongSpecularExp, shadingModel, sphereCount, triangleCount, } = config;
    let shadingFragment;
    let shadingDeclarations;
    if (shadingModel === 0) {
        shadingDeclarations = getShaderPbrDeclarations();
        shadingFragment = getShaderPbr(defaultF0, lightCount);
    }
    else {
        shadingDeclarations = getShaderPhongDeclarations();
        shadingFragment = getShaderPhong(phongSpecularExp, lightCount);
    }
    // Then we'll get into the source
    // we start by telling WebGL what level of precision we require with floats
    // we could probably get away with highp but mediump is more universally supported
    return `precision mediump float; ` +
        // we should load up our structs
        getShaderStructs() +
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
` +
        getShaderUtilityDeclarations() +
        shadingDeclarations +
        // acceleration data structure requirements
        `
vec3 planeSetNormals[${acceleration.numPlaneSetNormals}];

void initPlaneSetNormals() {
    planeSetNormals[0] = vec3(1.0, 0.0, 0.0);
    planeSetNormals[1] = vec3(0.0, 1.0, 0.0); 
    planeSetNormals[2] = vec3(0.0, 0.0, 1.0); 
    planeSetNormals[3] = vec3( sqrt(3.0) / 3.0,  sqrt(3.0) / 3.0, sqrt(3.0) / 3.0); 
    planeSetNormals[4] = vec3(-sqrt(3.0) / 3.0,  sqrt(3.0) / 3.0, sqrt(3.0) / 3.0); 
    planeSetNormals[5] = vec3(-sqrt(3.0) / 3.0, -sqrt(3.0) / 3.0, sqrt(3.0) / 3.0); 
    planeSetNormals[6] = vec3( sqrt(3.0) / 3.0, -sqrt(3.0) / 3.0, sqrt(3.0) / 3.0);
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
        return Hit(
            -1.0,
            Material(vec3(0.0, 0.0, 0.0), 0.0, 0.0, 0.0, 0.0, false),
            vec3(0.0, 0.0, 0.0),
            vec3(0.0, 0.0, 0.0),
            ray
        );
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
bool bvhIntersection(Ray ray) {
    float preComputedNumerator[${acceleration.numPlaneSetNormals}];
    float preComputedDenominator[${acceleration.numPlaneSetNormals}];

    for (int i = 0; i < ${acceleration.numPlaneSetNormals}; i += 1) {
        preComputedNumerator[i] = dot(planeSetNormals[i], ray.point);
        preComputedDenominator[i] = dot(planeSetNormals[i], ray.vector);
    }

    int planeIndex;
    float tNear = 0.0; 
    float tFar = ${infinity}; // tNear, tFar for the intersected extents
    
    // if (!octree->root->nodeExtents.intersect(precomputedNumerator, precomputedDenominator, tNear, tFar, planeIndex) || tFar < 0)
    // return false;

    return false;
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
    return 0.0;
}
` +
        `
`;
}
describe('We can write descriptions in blocks', () => {
    describe('We can nest descriptions', () => {
        it('we can specify sets of expectations', () => {
            expect(true).toBe(true);
        });
    });
    describe('throw handling', () => {
        it('we can expect things to throw', () => {
            expect(() => { throw new Error('foo'); }).toThrow();
        });
        it('we can expect things *not* to throw', () => {
            expect(() => { }).not.toThrow();
        });
    });
    describe('we can run things before and after each test', () => {
        let count = 0;
        beforeEach(() => {
            count += 1;
        });
        afterEach(() => {
            count += 1;
        });
        it('starts with a before each', () => {
            expect(count).toBe(1);
        });
        it('then runs an after each and another before each', () => {
            expect(count).toBe(3);
        });
    });
    describe('we can nest before and afters', () => {
        let count = 0;
        let nestedCount = 0;
        beforeEach(() => {
            count += 1;
        });
        afterEach(() => {
            count += 1;
        });
        it('runs outer specs after specs in nested describes', () => {
            expect(count).toBe(5);
            expect(nestedCount).toBe(4);
        });
        describe('we can nest more before/after eaches', () => {
            beforeEach(() => {
                nestedCount += 1;
            });
            afterEach(() => {
                nestedCount += 1;
            });
            it('runs both before eaches *before* outer specs', () => {
                expect(count).toBe(1);
                expect(nestedCount).toBe(1);
            });
            it('runs both after eaches, and both before eaches *before* outer specs', () => {
                expect(count).toBe(3);
                expect(nestedCount).toBe(3);
            });
        });
    });
});
function getSpaces(number) {
    return (new Array(number)).fill(' ').join('');
}
function initSpec() {
    const w = window;
    if (w.SPEC_STATE) {
        return w.SPEC_STATE;
    }
    const SPEC_STATE = specCreateState();
    w.SPEC_STATE = SPEC_STATE;
    setTimeout(specRunDescribes, 0);
    return w.SPEC_STATE;
}
function specCreateState() {
    return {
        after: [],
        afterHistory: [],
        before: [],
        beforeHistory: [],
        descriptions: [],
        error: null,
        expectations: [],
        failures: 0,
        indent: 0,
        log: '',
        specifications: [],
    };
}
function specLog(...args) {
    const state = initSpec();
    state.log += getSpaces(state.indent) + args.join(' ');
}
function describe(description, body) {
    const state = initSpec();
    state.descriptions.push({
        body,
        description,
    });
}
function it(should, body) {
    const state = initSpec();
    state.specifications.push({
        body,
        should,
    });
}
function specRunDescribes(isBranch = false) {
    const state = initSpec();
    if (state.descriptions.length === 0) {
        if (isBranch === false) {
            if (state.failures) {
                specLog();
                console.log('Tests:\n' + state.log);
                console.warn('Testing Complete ' + state.failures + (state.failures > 1 ? ' failures' : ' failure'));
            }
            else {
                console.log('Tests:\n' + state.log);
                specLog('Testing Complete');
            }
        }
        return;
    }
    const suite = state.descriptions.shift();
    specLog(suite.description + '\n');
    // increment and swap the various states
    state.indent += 2;
    state.afterHistory.push(state.after.length);
    state.beforeHistory.push(state.before.length);
    const remainingSuites = state.descriptions;
    state.descriptions = [];
    try {
        suite.body();
    }
    catch (e) {
        state.failures += 1;
        specLog('❗ Describe Body Error: ' + e.message + '\n');
    }
    if (state.descriptions.length) {
        // branch
        const spec = state.specifications;
        state.specifications = [];
        specRunDescribes(true);
        state.specifications = spec;
    }
    specRunSpecifications();
    // decrement and restore the various states
    state.descriptions = remainingSuites;
    state.indent -= 2;
    state.after = state.after.slice(0, state.afterHistory[state.afterHistory.length - 1]);
    state.afterHistory.pop();
    state.before = state.before.slice(0, state.beforeHistory[state.beforeHistory.length - 1]);
    state.beforeHistory.pop();
    // keep iterating
    specRunDescribes(isBranch);
}
function specRunSpecifications() {
    const state = initSpec();
    if (state.specifications.length === 0) {
        specLog('Suite Complete\n');
        return;
    }
    const spec = state.specifications.shift();
    state.indent += 2;
    try {
        state.before.forEach((cb) => cb());
        spec.body();
        state.after.forEach((cb) => cb());
        const result = specRunExpectations();
        if (result.length >= 2) {
            specLog(result.slice(0, 2) + ' ' + spec.should + ': ' + result.slice(2) + '\n');
        }
        else {
            specLog(result + ' ' + spec.should + '\n');
        }
    }
    catch (e) {
        state.failures += 1;
        specLog('❗ It Body Error: ' + e.message + '\n');
        state.indent += 2;
        specLog(e.stack);
        state.indent -= 2;
    }
    state.indent -= 2;
    specRunSpecifications();
}
function specRunExpectations() {
    const state = initSpec();
    if (state.expectations.length === 0) {
        return 'No assertions in this specification';
    }
    const final = state.expectations.reduce((s, e) => {
        if (s.didPass === false) {
            return s;
        }
        if (e.didPass === false) {
            return e;
        }
        return s;
    }, { didPass: true, reason: '' });
    state.expectations = [];
    if (final.didPass) {
        return '✅';
    }
    state.failures += 1;
    return '❌ ' + final.reason;
}
function expect(given) {
    const state = initSpec();
    return {
        not: {
            toBe(expected) {
                state.expectations.push({
                    didPass: expected !== given,
                    reason: `expected ${given} to strictly *not* equal ${expected}`,
                });
            },
            toThrow() {
                try {
                    given();
                    state.expectations.push({
                        didPass: true,
                        reason: '',
                    });
                }
                catch (e) {
                    state.expectations.push({
                        didPass: false,
                        reason: 'given function was expected not to throw, but threw with: ' + e.message || e,
                    });
                }
            },
        },
        toBe(expected) {
            state.expectations.push({
                didPass: expected === given,
                reason: `expected ${given} to strictly equal ${expected}`,
            });
        },
        toThrow() {
            try {
                given();
                state.expectations.push({
                    didPass: false,
                    reason: 'given function was expected to throw (given function did not throw)',
                });
            }
            catch (e) {
                state.expectations.push({
                    didPass: true,
                    reason: '',
                });
            }
        },
    };
}
function beforeEach(callback) {
    const state = initSpec();
    state.before.push(callback);
}
function afterEach(callback) {
    const state = initSpec();
    state.after.push(callback);
}
const MIN_GL_INT = -2147483647;
const MAX_GL_INT = 2147483647;
describe('Utility functions', () => {
    describe('Byte Converstions', () => {
        it('allows for numbers as low as -2,147,483,647', () => {
            const bytes = fourByteFromFloat(MIN_GL_INT, []);
            const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
            expect(float).toBe(MIN_GL_INT);
        });
        it('caps low numbers to -2,147,483,647', () => {
            const bytes = fourByteFromFloat(MIN_GL_INT - 1, []);
            const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
            expect(float).toBe(MIN_GL_INT);
        });
        it('allows for numbers as large as 2,147,483,647', () => {
            const bytes = fourByteFromFloat(MAX_GL_INT, []);
            const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
            expect(float).toBe(MAX_GL_INT);
        });
        it('caps large to 2,147,483,647', () => {
            const bytes = fourByteFromFloat(MAX_GL_INT + 1, []);
            const float = fourByteToFloat(bytes[0], bytes[1], bytes[2], bytes[3]);
            expect(float).toBe(MAX_GL_INT);
        });
    });
});
// ## Utility Functions
// In order to make things more readable and avoid excessive duplication we want to have
// some functions that contain that repetition.  These are our utility functions
//
// <a name="throwIfFalsey"></a>
// ## Throw If Falsey
// Throw an error if `thingToTest` is false like
// _optionally_ we'll take a custom `Error` constructor
function throwIfFalsey(thingToTest, reason, Ctor = Error) {
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
function getUniformLocation(gl, program, name) {
    const location = gl.getUniformLocation(program, name);
    if (!location) {
        throw new Error('could not get uniform location ' + name);
    }
    return location;
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
function getUniformSetters(gl, program, desc) {
    const setVec3 = (loc, v) => {
        gl.uniform3fv(loc, v);
    };
    const setFloat = (loc, f) => {
        gl.uniform1f(loc, f);
    };
    const setInt = (loc, i) => {
        gl.uniform1i(loc, i);
    };
    const buildSetter = ({ name, type }, prefix, postfix) => {
        const loc = getUniformLocation(gl, program, prefix + name + postfix);
        switch (type) {
            case 'int':
                return (value) => setInt(loc, value);
            case 'float':
                return (value) => setFloat(loc, value);
            case 'mat4':
                return (value) => gl.uniformMatrix4fv(loc, false, value);
            case 'sampler2D':
                return (texture, unit) => {
                    gl.uniform1i(loc, unit);
                    gl.activeTexture(gl.TEXTURE0 + unit);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                };
            case 'vec3':
                return (value) => setVec3(loc, value);
            default:
                throw new Error('unsupported GLSL type ' + type);
        }
    };
    const createReduceUniformDescription = (prefix) => (dictionary, d) => {
        const { children, length, name } = d;
        if (length && children && children.length) {
            const arr = [];
            dictionary[name] = arr;
            for (let i = 0; i < length; i += 1) {
                arr.push(children.reduce(createReduceUniformDescription(prefix + name + `[${i}].`), {}));
            }
        }
        else if (length) {
            const arr = [];
            dictionary[name] = arr;
            for (let i = 0; i < length; i += 1) {
                arr.push(buildSetter(d, prefix, `[${i}]`));
            }
        }
        else if (children && children.length) {
            dictionary[name] = children.reduce(createReduceUniformDescription(prefix + name + '.'), {});
        }
        else {
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
function tryCatch(thing, happy, sad) {
    try {
        happy(thing());
    }
    catch (e) {
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
function glslAccessor(type, uniformName, functionName, length, defaultElement = 0) {
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
//
// NOTE: This does not preserve fractions!
function fourByteFromFloat(float, bytes = [], unsigned = false) {
    if (unsigned === false) {
        if (float > 2147483647) {
            float = 2147483647;
        }
        if (float < -2147483647) {
            float = -2147483647;
        }
    }
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
            }
            else {
                bit3 += 127;
            }
        }
    }
    bytes[0] = bit3;
    bytes[1] = bit2;
    bytes[2] = bit1;
    bytes[3] = Math.round(bit0);
    return bytes;
}
// back to floats from four bytes
function fourByteToFloat(byte1, byte2, byte3, byte4, unsigned = false) {
    if (unsigned) {
        return byte4 +
            byte3 * 256 +
            byte2 * 256 * 256 +
            byte1 * 256 * 256 * 256;
    }
    const sign = byte1 > 127 ? -1 : 1;
    const bigEndOrZero = byte1 === 255 ? 0 : byte1;
    const bigEnd = bigEndOrZero > 127 ? bigEndOrZero - 127 : bigEndOrZero;
    return sign * (byte4 +
        byte3 * 256 +
        byte2 * 256 * 256 +
        bigEnd * 256 * 256 * 256);
}
//# sourceMappingURL=index.js.map