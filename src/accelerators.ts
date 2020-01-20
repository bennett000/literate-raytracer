const negInfinity = [-Infinity, -Infinity, -Infinity] as Matrix3_1;
const posInfinity = [Infinity, Infinity, Infinity] as Matrix3_1;
const NUM_PLANE_SET_NORMALS = 7;

// in order to store related data in shared textures/memory we'll want a common
// and safe way of accessing that data
//
// `TextureDataStructureElement` defines the basic interface we'll use to safely
// access and build our texture memory in JS
abstract class TextureDataStructureElement {
    // our class will take an array of numbers and keep it internal
    // this is our memory
    protected constructor(protected _data: number[]) {}
    // we need to understand our place (address) in memory
    protected _index = -1;

    // let's provide a means of getting the size
    abstract get size(): number;

    // let's allow others to get our addres and let's make sure we don't accidentially 
    // change our ddress
    get index() {
        return this._index;
    }

    protected checkBounds(index: number) {
        if (index > this.size) {
            throw new RangeError('TextureDataStructureElement: out of bounds ' + index + ' vs ' + this.size);
        }
    }

    // we'll also want to some helpers
    setFloat(value: number, index: number, arr: number[] = []) {
        this.checkBounds(index);
        fourByteFromFloat(value * PACKED_FLOAT_MULTIPLIER, arr);
        this._data[this._index + index * 4 + 0] = arr[0];
        this._data[this._index + index * 4 + 1] = arr[1];
        this._data[this._index + index * 4 + 2] = arr[2];
        this._data[this._index + index * 4 + 3] = arr[3];
    }

    setInt(value: number, index: number, arr: number[] = []) {
        this.checkBounds(index);
        fourByteFromFloat(value, arr);
        this._data[this._index + index * 4 + 0] = arr[0];
        this._data[this._index + index * 4 + 1] = arr[1];
        this._data[this._index + index * 4 + 2] = arr[2];
        this._data[this._index + index * 4 + 3] = arr[3];
    }

    setUint(value: number, index: number, arr: number[] = []) {
        this.checkBounds(index);
        fourByteFromFloat(value, arr, true);
        this._data[this._index + index * 4 + 0] = arr[0];
        this._data[this._index + index * 4 + 1] = arr[1];
        this._data[this._index + index * 4 + 2] = arr[2];
        this._data[this._index + index * 4 + 3] = arr[3];
    }

    getFloat(index: number) {
        this.checkBounds(index);
        return fourByteToFloat(
            this._data[this._index + index * 4 + 0],
            this._data[this._index + index * 4 + 1],
            this._data[this._index + index * 4 + 2],
            this._data[this._index + index * 4 + 3],
        ) / PACKED_FLOAT_MULTIPLIER;
    }

    getInt(index: number) {
        this.checkBounds(index);
        return fourByteToFloat(
            this._data[this._index + index * 4 + 0],
            this._data[this._index + index * 4 + 1],
            this._data[this._index + index * 4 + 2],
            this._data[this._index + index * 4 + 3],
        );
    }

    getUint(index: number) {
        this.checkBounds(index);
        return fourByteToFloat(
            this._data[this._index + index * 4 + 0],
            this._data[this._index + index * 4 + 1],
            this._data[this._index + index * 4 + 2],
            this._data[this._index + index * 4 + 3],
            true,
        );
    }
}

// we'll use vec3's for vertexes, colours, and normals
class Vec3 extends TextureDataStructureElement {
    static create(vec3data: number[], x = 0, y = 0, z = 0) {
        return new Vec3(vec3data, x, y, z);
    }

    static size() { return 3 * 4; }

    get size() { return Vec3.size() }

    get x() {
        return this.getFloat(0);
    }

    set x(v: number) {
        this.setFloat(v, 0);
    }

    get y() {
        return this.getFloat(1);
    }

    set y(v: number) {
        this.setFloat(v, 1);
    }

    get z() {
        return this.getFloat(2);
    }

    set z(v: number) {
        this.setFloat(v, 2);
    }

    protected constructor(data: number[], x = 0, y = 0, z = 0) {
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

    fromMatrix3_1(m31: Matrix3_1) {
        this.x = m31[0];
        this.y = m31[1];
        this.z = m31[2];
    }

    fromMatrix4_4(m44: Matrix4_4) {
        this.x = m44[12];
        this.y = m44[13];
        this.z = m44[14];
    }

    toMatrix3_1(m31 = [0, 0, 0] as Matrix3_1): Matrix3_1 {
        m31[0] = this.x;
        m31[1] = this.y;
        m31[2] = this.z;

        return m31;
    }
}

// we need triangles for just about everything except perfect spheres
class Triangle2 extends TextureDataStructureElement {
    static create(data: number[], a: Vec3, b: Vec3, c: Vec3, material = -1) {
        return new Triangle2(data, a, b, c, material);
    }

    static size() {
        return 4 * 4;
    }

    get size() { return Triangle2.size() }

    get material() {
        return this._data[this._index + 3];
    }

    set material(material: number) {
        this._data[this._index + 3] = material;
    }

    protected constructor(data: number[], public a: Vec3, public b: Vec3, public c: Vec3, material = -1) {
        super(data);
        this._index = data.push(a.index) - 1;
        data.push(b.index);
        data.push(c.index);
        data.push(material);
    }

    onEach(callback: (v: Vec3) => void) {
        callback(this.a);
        callback(this.b);
        callback(this.c);
    }
}

// since spheres are cheap _and_ look better than triangle based alternatives
// we'll use them too
class Sphere extends TextureDataStructureElement {
    static create(data: number[], centre: Vec3, radius: number, material = -1)  {
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

    set material(material: number) {
        this._data[this._index + 2] = material;
    }

    get radius() {
        return this._data[this._index + 1];
    }

    set radius(radius: number) {
        this._data[this._index + 1] = radius;
    }

    protected constructor(data: number[], public centre: Vec3, radius: number, material = -1) {
        super(data);
        this._index = data.push(centre.index) - 1;
        data.push(radius);
        data.push(material);
    }
}

class BBox {
    static readonly negInfinity = [-Infinity, -Infinity, -Infinity] as Matrix3_1;
    static readonly posInfinity = [Infinity, Infinity, Infinity] as Matrix3_1;
    static create() {
        return new BBox();
    }
    bounds: [Matrix3_1, Matrix3_1] = [BBox.posInfinity, BBox.negInfinity];
    protected constructor(min = BBox.negInfinity, max = BBox.posInfinity) {
        this.bounds[0] = max;
        this.bounds[1] = min;
    }
    centroid() {
        return [
            (this.bounds[0][0] + this.bounds[1][0]) * 0.5,
            (this.bounds[0][1] + this.bounds[1][1]) * 0.5,
            (this.bounds[0][2] + this.bounds[1][2]) * 0.5,
        ] as Matrix3_1;
    }
    extendBy(p: Matrix3_1) {
        if (p[0] < this.bounds[0][0]) { this.bounds[0][0] = p[0]; } 
        if (p[1] < this.bounds[0][1]) { this.bounds[0][1] = p[1]; } 
        if (p[2] < this.bounds[0][2]) { this.bounds[0][2] = p[2]; } 
        if (p[0] > this.bounds[1][0]) { this.bounds[1][0] = p[0]; } 
        if (p[1] > this.bounds[1][1]) { this.bounds[1][1] = p[1]; } 
        if (p[2] > this.bounds[1][2]) { this.bounds[1][2] = p[2]; } 

        return this;
    }
    min() {
        return this.bounds[0];
    }
    max() {
        return this.bounds[1];
    }
}

class Extents extends TextureDataStructureElement {
    static create(data: number[], index = -1, op = createObjectPool(createMatrix3_1)) {
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

    set mesh(value: number) {
        this.setInt(value, 0);
    };

    get type() {
        return this.getInt(1);
    }

    // 0 sphere, 1 triangle
    set type(t: number) {
        if (t === 1) {
            this.setInt(1, 1);
        } else {
            this.setInt(0, 1);
        }
    }

    protected constructor(data: number[], index = -1, private op = createObjectPool(createMatrix3_1)) {
        super(data);
        if (index >= 0) {
            this._index = index;
        } else {
            this.init(data);
        }
    }

    private init(data: number[]) {
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

    extendBy(e: Extents): void {
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
    getPlaneExtent(plane: number, extent: number) {
        return this.getFloat(plane * 2 + extent + 2);
    }

    setPlaneExtent(value: number, plane: number, extent: number) {
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



type NOctreeNode = null | OctreeNode;
class OctreeNode extends TextureDataStructureElement {
    static create(octreeData: number[], extentsData: number[], index = -1) {
        return new OctreeNode(octreeData, extentsData, index);
    }

    static size() {
        return /* isLeaf int */ 4 /* eight ints per child index */ + 8 * 4 
        /* int index for extents */ + 4 /* index slots for contained extents */ + Octree.MAX_CONTENTS * 4;
    }


    extents: Extents;
    private _extentsListLength = 0;

    get size() {
        return OctreeNode.size();
    }
    get isLeaf() { return this._data[this._index + 3] === 1; }
    set isLeaf(value: boolean) { this._data[this._index + 3] = value === true ? 1 : 0; }

    protected constructor(octreeData: number[], private extentsData: number[], index = -1) {
        super(octreeData);
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
        } else {
            this.extents = Extents.create(this.extentsData);
            this.init(octreeData);
        }
    }

    private init(octreeData: number[]) {
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

    getChildIndex(index: number) {
        if (index > 7) {
            throw new RangeError('OctreeNode: get child out of bounds ' + index);
        }
        return this.getInt(index + 1);
    }

    setChildIndex(value: number, index: number) {
        if (index > 7) {
            throw new RangeError('OctreeNode: set child out of bounds ' + index);
        }
        this.setInt(value, index + 1);
    }

    extentsListElementIndex(index: number) {
        if (index > Octree.MAX_CONTENTS) {
            throw new RangeError('OctreeNode: extentListElement out of bounds ' + index);
        }
        return this.getInt(10 + index);
    }

    extentsListLength() {
        return this._extentsListLength;
    }

    onEach(callback: (n: OctreeNode) => void) {
        for (let i = 0; i < 8; i += 1) {
            const index = this.getChildIndex(i);
            if (index < 0) {
                continue;
            }
            const node = OctreeNode.create(this._data, this.extentsData, index);
            callback(node)
        }
    }

    extentsListEach(callback: (e: Extents) => void) {
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

    extentsListPush(e: Extents) {
        const nextIndex = this._extentsListLength;
        this._extentsListLength += 1;
        this.setInt(e.index, nextIndex + 10);

        return this._extentsListLength;
    }
}

class Octree {
    static MAX_CONTENTS = 16;
    static MAX_DEPTH = 16;
    static create(sceneExtents: Extents, extentsData: number[], octreeData: number[] = []) {
        return new Octree(sceneExtents, extentsData, octreeData);
    }

    bbox = BBox.create();
    root = OctreeNode.create(this.octreeData, this.extentsData);

    protected constructor(sceneExtents: Extents, private extentsData: number[], private octreeData: number[] = []) {
        const xDiff = sceneExtents.getPlaneExtent(0, 1) - sceneExtents.getPlaneExtent(0, 0);
        const yDiff = sceneExtents.getPlaneExtent(1, 1) - sceneExtents.getPlaneExtent(1, 0);
        const zDiff = sceneExtents.getPlaneExtent(2, 1) - sceneExtents.getPlaneExtent(2, 0);
        const maxDiff = Math.max(xDiff, Math.max(yDiff, zDiff));
        const minPlusMax = [
            sceneExtents.getPlaneExtent(0, 0) + sceneExtents.getPlaneExtent(0, 1),
            sceneExtents.getPlaneExtent(1, 0) + sceneExtents.getPlaneExtent(1, 1),
            sceneExtents.getPlaneExtent(2, 0) + sceneExtents.getPlaneExtent(2, 1),
        ] as Matrix3_1;
        this.bbox.bounds[0][0] = (minPlusMax[0] - maxDiff) * 0.5;
        this.bbox.bounds[0][1] = (minPlusMax[1] - maxDiff) * 0.5;
        this.bbox.bounds[0][2] = (minPlusMax[2] - maxDiff) * 0.5;
        this.bbox.bounds[1][0] = (minPlusMax[0] + maxDiff) * 0.5;
        this.bbox.bounds[1][1] = (minPlusMax[1] + maxDiff) * 0.5;
        this.bbox.bounds[1][2] = (minPlusMax[2] + maxDiff) * 0.5;

    }

    private _build(node: OctreeNode, bbox: BBox) {
        if (node.isLeaf) {
            node.extentsListEach((e) => {
                node.extents.extendBy(e);
            });
        } else {
            for (let i = 0; i < 8; ++i) {
                const childIndex = node.getChildIndex(i);
                if (childIndex >= 0) {
                    const childBBox = BBox.create();;
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

    private _insert(node: OctreeNode, extents: Extents, bbox: BBox, depth: number) {
        if (node.isLeaf) {
            if (node.extentsListLength() < Octree.MAX_CONTENTS || depth === Octree.MAX_DEPTH) {
                node.extentsListPush(extents);
            } else {
                node.isLeaf = false;
                // Re-insert extents held by this node
                while (node.extentsListLength()) {
                    const ne = node.extentsListPop();
                    if (!ne) { break; }
                    this._insert(node, ne, bbox, depth);
                }
                // Insert new extent
                this._insert(node, extents, bbox, depth);
            }
        } else {
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
            } else {
                childBBox.bounds[0][0] = bbox.bounds[0][0];
                childBBox.bounds[1][0] = nodeCentroid[0];
            }
            // y-axis
            if (extentsCentroid[1] > nodeCentroid[1]) {
                childIndex += 2;
                childBBox.bounds[0][1] = nodeCentroid[1];
                childBBox.bounds[1][1] = bbox.bounds[1][1];
            } else {
                childBBox.bounds[0][1] = bbox.bounds[0][1];
                childBBox.bounds[1][1] = nodeCentroid[1];
            }
            // z-axis
            if (extentsCentroid[2] > nodeCentroid[2]) {
                childIndex += 1;
                childBBox.bounds[0][2] = nodeCentroid[2];
                childBBox.bounds[1][2] = bbox.bounds[1][2];
            } else {
                childBBox.bounds[0][2] = bbox.bounds[0][2];
                childBBox.bounds[1][2] = nodeCentroid[2];
            }

            // Create the child node if it doesn't exist yet and then insert the extents in it
            let nc = node.getChildIndex(childIndex);
            let nodeChild: OctreeNode;
            if (nc < 0) {
                nodeChild = OctreeNode.create(this.octreeData, this.extentsData);
                node.setChildIndex(nodeChild.index, childIndex);
            } else {
                nodeChild = OctreeNode.create(this.octreeData, this.extentsData, nc); 
            }
            this._insert(nodeChild, extents, childBBox, depth + 1);
        }
    }

    build() {
        this._build(this.root, this.bbox);
    }

    onEach(cb: (node: OctreeNode) => void) {
        const walk = (root: OctreeNode) => {
            cb(root);
            root.onEach(walk);
        };
        walk(this.root);
    }

    insert(extents: Extents) {
        this._insert(this.root, extents, this.bbox, 0);
    }

    encode(): { extents: TextureDataStructureEncoding, octree: TextureDataStructureEncoding } {
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

function getPlaneSetNormals() {
    return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [ Math.sqrt(3) / 3,  Math.sqrt(3) / 3, Math.sqrt(3) / 3],
        [-Math.sqrt(3) / 3,  Math.sqrt(3) / 3, Math.sqrt(3) / 3],
        [-Math.sqrt(3) / 3, -Math.sqrt(3) / 3, Math.sqrt(3) / 3],
        [ Math.sqrt(3) / 3, -Math.sqrt(3) / 3, Math.sqrt(3) / 3],
    ] as Matrix3_1[];
}
