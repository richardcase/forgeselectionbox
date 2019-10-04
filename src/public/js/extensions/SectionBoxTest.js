AutodeskNamespace("AAA.Extension");

AAA.Extension.SectionBoxTest = function(viewer, options) {
  Autodesk.Viewing.Extension.call(this, viewer, options);

  var _self = this;

  _self.load = function() {

    console.log("AAA.Extension.SectionBoxTest loaded");

    return true;
  };

  _self.onToolbarCreated = function() {
    var handleSectionBoxToolbarButton = new Autodesk.Viewing.UI.Button(
      "handleSectionboxTest"
    );
    handleSectionBoxToolbarButton.onClick = async function(e) {
        const models = _self.viewer.getVisibleModels();
        const model = models[0];

        const sbext = _self.viewer.getExtension('Autodesk.Section');
        const sectionTool = sbext.tool.getSectionBoxValues();
        const sb = sectionTool.sectionBox;
        const sbt = sectionTool.sectionBoxTransform;

        const sbTransformMatrix = new THREE.Matrix4().fromArray([
          sbt[0], sbt[1],   sbt[2],   sbt[3],
          sbt[4], sbt[5],   sbt[6],   sbt[7],
          sbt[8], sbt[9],   sbt[10],  sbt[11],
          sbt[12], sbt[13], sbt[14],  sbt[15]
        ]);
        const instanceTree = model.getData().instanceTree;
        const rootId = instanceTree.getRootId();
        
        const leafIds = await _self.getLeafNodes(model);
        const boundingBoxInfo = leafIds.map((dbId) => {
          const bbox = _self.getLeafComponentBoundingBox(model, dbId);

          return {
            bbox,
            dbId
          }
        })


        let min = new THREE.Vector3(sb[0],sb[1],sb[2]);
        let max = new THREE.Vector3(sb[3],sb[4],sb[5]);
        var sBox = new THREE.Box3(min,max);
        _self.drawBox(sBox.min,sBox.max);

        const intersect = []
        const outside = []
        const inside = []

        for (let bboxInfo of boundingBoxInfo) {
          if (sBox.containsBox(bboxInfo.bbox)) {
            inside.push(bboxInfo);
          }else if (sBox.isIntersectionBox(bboxInfo.bbox)) {
            intersect.push(bboxInfo);
          } else {
            outside.push(bboxInfo);
          }
        }

        console.log("Number inside: %d", inside.length);
        console.log("Number intersect: %d", intersect.length);
        console.log("Number outside: %d", outside.length);

        const dbIdsInside = inside.map((bboxInfo) => {
          return bboxInfo.dbId;
        });

        const dbIdsIntersect = intersect.map((bboxInfo) => {
          return bboxInfo.dbId;
        });

        console.log([...dbIdsInside, ...dbIdsIntersect]);
    };
    handleSectionBoxToolbarButton.addClass("handleSectionboxTest");
    handleSectionBoxToolbarButton.setToolTip("SectionBox Test");

    // SubToolbar
    this.subToolbar = this.viewer.toolbar.getControl("AAAToolbar")
      ? this.viewer.toolbar.getControl("AAAToolbar")
      : new Autodesk.Viewing.UI.ControlGroup("AAAToolbar");
    this.subToolbar.addControl(handleSectionBoxToolbarButton);

    this.viewer.toolbar.addControl(this.subToolbar);

  };

  _self.unload = function() {
    console.log("AAA.Extension.SectionBoxTest unloaded");

    return true;
  };

  _self.drawLines = function (coordsArray, material) {

    for (var i = 0; i < coordsArray.length; i+=2) {

        var start = coordsArray[i];
        var end = coordsArray[i+1];

        var geometry = new THREE.Geometry();

        geometry.vertices.push(new THREE.Vector3(
            start.x, start.y, start.z));

        geometry.vertices.push(new THREE.Vector3(
            end.x, end.y, end.z));

        geometry.computeLineDistances();

        var line = new THREE.Line(geometry, material);

        viewer.impl.scene.add(line);
    }
  }

  _self.drawBox = function(min, max) {

    var material = new THREE.LineBasicMaterial({
        color: 0xffff00,
        linewidth: 2
    });

    viewer.impl.matman().addMaterial(
        'ADN-Material-Line',
        material,
        true);

    _self.drawLines([

        {x: min.x, y: min.y, z: min.z},
        {x: max.x, y: min.y, z: min.z},

        {x: max.x, y: min.y, z: min.z},
        {x: max.x, y: min.y, z: max.z},

        {x: max.x, y: min.y, z: max.z},
        {x: min.x, y: min.y, z: max.z},

        {x: min.x, y: min.y, z: max.z},
        {x: min.x, y: min.y, z: min.z},

        {x: min.x, y: max.y, z: max.z},
        {x: max.x, y: max.y, z: max.z},

        {x: max.x, y: max.y, z: max.z},
        {x: max.x, y: max.y, z: min.z},

        {x: max.x, y: max.y, z: min.z},
        {x: min.x, y: max.y, z: min.z},

        {x: min.x, y: max.y, z: min.z},
        {x: min.x, y: max.y, z: max.z},

        {x: min.x, y: min.y, z: min.z},
        {x: min.x, y: max.y, z: min.z},

        {x: max.x, y: min.y, z: min.z},
        {x: max.x, y: max.y, z: min.z},

        {x: max.x, y: min.y, z: max.z},
        {x: max.x, y: max.y, z: max.z},

        {x: min.x, y: min.y, z: max.z},
        {x: min.x, y: max.y, z: max.z}],

        material);

    viewer.impl.sceneUpdated(true);
  }

  _self.getComponentBoundingBox = async function(model, dbid) {
    const fragIds = await _self.getFragIds(model, dbid)
    const fragList = model.getFragmentList()

    return _self.getModifiedWorldBoundingBox(fragIds, fragList)
  };

  _self.getLeafNodes = function(model, dbIds) {
    return new Promise((resolve, reject) => {
      try {
        const instanceTree = model.getData().instanceTree || model.getFragmentMap();

        dbIds = dbIds || instanceTree.getRootId();

        const dbIdArray = Array.isArray(dbIds)
            ? dbIds
            : [dbIds]

        const leafIds = [];
        const getLeafNodeIdsRec = (id) => {
          let childCount = 0;
          instanceTree.enumNodeChildren(id, (childId) => {
            getLeafNodeIdsRec(childId)
            ++childCount
          })

          if (childCount == 0) {
            leafIds.push(id)
          }
        }

        dbIdArray.forEach((dbId) => {
          getLeafNodeIdsRec(dbId)
        })

        return resolve(leafIds)
      } catch(ex) {
        return reject(ex)
      }
    })
  }

  _self.getFragIds = function(model, dbIds) {
    return new Promise(async(resolve, reject) => {
      try {
        const it = model.getData().instanceTree;
        dbIds = dbIds || it.getRootId();
        const dbIdArray = Array.isArray(dbIds)
          ? dbIds : [dbIds];

          const leafIds = it
            ? await _self.getLeafNodes(model, dbIdArray)
            : dbIdArray

          let fragIds = []

          for(var i=0; i < leafIds.length; ++i) {
            if (it) {
              it.enumNodeFragments(
                leafIds[i], (fragId) => {
                  fragIds.push(fragId);
                })
            } else {
              const leafFragids = _self.getLeafFragIds(model, leafIds[i])

              fragIds = [
                ...fragIds,
                ...leafFragids
              ]
            }
          }

          return resolve(fragIds)
      } catch(ex) {
        return reject(ex);
      }
    });
  }

  _self.getLeafFragIds = function(model, leafId) {
    if (model.getData().instanceTree) {
      const it = model.getData().instanceTree

      const fragIds = []

      it.enumNodeFragments(
        leafId, (fragId) => {
          fragIds.push(fragId)
        })

      return fragIds
    } else {
      const fragments = model.getData().fragments
      const fragIds = fragments.dbId2fragId[leafId]

      return !Array.isArray(fragIds) ? [fragIds]: fragIds
    }
  }

  _self.getModifiedWorldBoundingBox = function(fragIds, fragList) {
    const fragbBox = new THREE.Box3()
    const nodebBox = new THREE.Box3()

    fragIds.forEach((fragId) => {
      fragList.getWorldBounds(fragId, fragbBox)
      nodebBox.union(fragbBox)
    })

    return nodebBox
  }

  _self.getLeafComponentBoundingBox = function(model, dbId) {
    const fragIds = _self.getLeafFragIds(model, dbId);
    const fragList = model.getFragmentList();

    return _self.getModifiedWorldBoundingBox(fragIds, fragList);
  }
  
  _self.containsBox = function(planes, box) {
    const {min, max} = box;

    const vertices = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, max.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z)
    ]

    for (let vertex of vertices) {

      for (let plane of planes) {

        if (plane.distanceToPoint(vertex) < 0) {

          return false
        }
      }
    }

    return true
  }

  AAA.Extension.SectionBoxTest.prototype = Object.create(
  Autodesk.Viewing.Extension.prototype
);
AAA.Extension.SectionBoxTest.prototype.constructor = AAA.Extension.SectionBoxTest;
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  "AAA.Extension.SectionBoxTest",
  AAA.Extension.SectionBoxTest
);
