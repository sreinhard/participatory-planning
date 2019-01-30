import {
  declared,
  property,
  subclass,
} from "esri/core/accessorSupport/decorators";

// esri
import Color from "esri/Color";
import Collection from "esri/core/Collection";
import { eachAlways } from "esri/core/promiseUtils";
import { whenNotOnce } from "esri/core/watchUtils";
import Polyline from "esri/geometry/Polyline";
import SpatialReference from "esri/geometry/SpatialReference";
import Graphic from "esri/Graphic";
import GraphicsLayer from "esri/layers/GraphicsLayer";
import Layer from "esri/layers/Layer";
import SceneLayer from "esri/layers/SceneLayer";
import SimpleFillSymbol from "esri/symbols/SimpleFillSymbol";
import SceneView from "esri/views/SceneView";
import WebScene from "esri/WebScene";
import Slide from "esri/webscene/Slide";
import { tsx } from "esri/widgets/support/widget";
import Widget from "esri/widgets/Widget";

import Point = require('esri/geometry/Point');
import Polygon = require('esri/geometry/Polygon');

// Hard coded constants

export const MASKED_OBJIDS = [
  158321, 106893, 158711, 158613, 158632, 159047, 158099, 158249, 147102, 106899, 107439, 158654, 158247, 158307,
  158610, 158963, 154542, 158869, 158814, 158900, 107340, 107395, 107172, 158336, 158784, 158571, 158600, 158348,
  158955, 158205, 158883, 158431, 158326, 158353, 158449, 158587, 158251, 158857, 159069, 158706,
];

export const MASK_AREA = [
  [-8235924.058660398, 4968738.274357371],
  [-8235409.000644938, 4968717.325404106],
  [-8235333.439527529, 4968898.289607817],
  [-8235295.877979361, 4969109.891441089],
  [-8236134.357229519, 4969027.878528339],
  [-8236138.632189713, 4968850.261903069],
  [-8235919.081131686, 4968836.806196137],
  [-8235924.058660398, 4968738.274357371],
];

@subclass("app.widgets.webmapview")
export default class Scene extends declared(Widget) {

  public readonly map: WebScene = new WebScene({
    portalItem: {
      id: "8dd394c07205432bad112c21cbbc307f",
    },
  });

  @property({
    readOnly: true,
  })
  public readonly view: SceneView = new SceneView({
    map: this.map,
    ui: {
      components: [],
    },
  } as any);

  @property({
    readOnly: true,
  })
  public readonly drawLayer: GraphicsLayer = new GraphicsLayer({
    elevationInfo: {
      mode: "relative-to-scene",
    },
  });

  @property({
    readOnly: true,
  })
  public readonly highlightLayer: GraphicsLayer = new GraphicsLayer({
    elevationInfo: {
      mode: "on-the-ground",
    },
  });

  public readonly maskPolygon = new Polygon({
    rings: [MASK_AREA],
    spatialReference: SpatialReference.WebMercator,
  });

  private mapLayers: Layer[] = [];

  private sceneLayer: SceneLayer;

  public postInitialize() {

    this.map.when(() => {
      this.mapLayers = this.map.layers.toArray();
      this.map.add(this.drawLayer);
      this.map.add(this.highlightLayer);
      this.sceneLayer = this.map.layers.find((layer) => layer.type === "scene") as SceneLayer;
    });

    this.view.on("click", (event: any) => {
        console.log("Clicked A", event.mapPoint.x, event.mapPoint.y, event.mapPoint);
    });

    // Leave a reference of the view on the window for debugging
    (window as any).view = this.view;
  }

  public render() {
    return (
      <div>
        <div id="sceneView" bind={ this } afterCreate={ this._attachSceneView } />
      </div>
    );
  }

  public showMaskedBuildings(show: boolean) {
    if (show) {
      this.sceneLayer.definitionExpression = "";
      this.drawLayer.visible = false;
    } else {
      this.sceneLayer.definitionExpression = "OBJECTID NOT IN (" + MASKED_OBJIDS.join(",") + ")";
      this.drawLayer.visible = true;
    }
  }

  private _attachSceneView(sceneViewDiv: HTMLDivElement) {
    this.view.container = sceneViewDiv;
  }

  private _goToSlide(slide: Slide): IPromise {

    return this.view.goTo(slide.viewpoint).then(() => {

      this.mapLayers.forEach((layer) => {
        layer.visible = 0 <= slide.visibleLayers.findIndex((visibleLayer) => visibleLayer.id === layer.id);
      });

      // this.map.basemap = slide.basemap;

      // Wait for all layers to update after applying a new slide
      return eachAlways(this.view.layerViews.map((layerView) => {
        return whenNotOnce(layerView, "updating");
      }));
    });
  }

}