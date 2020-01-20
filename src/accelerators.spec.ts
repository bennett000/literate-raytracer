describe('accelerator functions', () => {
  describe('TextureDataStructureElement', () => {
    let data: number[] = [];

    class Foo extends TextureDataStructureElement {
      static create() {
        return new Foo();
      }
      // must initialize, usually the constructor would take data as an argument
      protected constructor() {
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

    let example: Foo = Foo.create();
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
      const data: number[] = [];
      const e = Extents.create(data);
      expect(e.getInt(0)).toBe(-1);
    });

    it('starts with +/- its min/max size', () => {
      const data: number[] = [];
      const e = Extents.create(data);
      for (let i = 0; i < NUM_PLANE_SET_NORMALS; i += 1) {
        expect(Math.floor(e.getPlaneExtent(i, 0))).toBe(Math.floor(MAX_GL_INT / PACKED_FLOAT_MULTIPLIER));
        expect(Math.floor(e.getPlaneExtent(i, 1))).toBe(Math.floor(MIN_GL_INT / PACKED_FLOAT_MULTIPLIER));
      }
    });

    it('axis align bounds a single triangle', () => {
      const planeSetNormals = getPlaneSetNormals();
      let data: number[] = [];
      const sceneExtents = Extents.create(data);
      const triangles = [[
        [1, 1, 0],
        [-1, 0, 0],
        [1, 0, 0],
      ]] as Matrix3_1[][];

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
      let data: number[] = [];
      const sceneExtents = Extents.create(data);
      const triangles = [[
        [1, 1, 0],
        [-1, 0, 0],
        [1, 0, 0],
      ],[
        [1, -1, -1],
        [1, 1, 0],
        [1, -1, 0],
      ]] as Matrix3_1[][];

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
    let extentsData: number[];
    let sceneExtents: Extents;
    let extentsList: Extents[] = [];

    let triangles: Matrix3_1[][] = [];

    const reset = (t: Matrix3_1[][] = []) => {
      extentsData = [];
      extentsList = [];
      sceneExtents = Extents.create(extentsData);
      if (t.length) {
        triangles = t;
      } else {
        triangles = [[
          [1, 1, 0],
          [-1, 0, 0],
          [1, 0, 0],
        ], [
          [1, 1, -10],
          [-1, 0, -10],
          [1, 0, -10],
        ]] as Matrix3_1[][];
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

    }

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
