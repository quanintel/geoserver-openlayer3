/* Sửa các tham số ở dưới */
var baseUrl = "http://localhost:8080";
var workspace = "VietNam";
var layerName = "TinhVietNam";
var layerName2 = "CangBienVietNam";

var styleDefault = "TinhVietNamNgauNhienMau";
var styleDefault2 = "CangBienVietNam";

/* Sửa các tham số ở trên */

const imgLegend = (ws, sn) => {
  return `${baseUrl}/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&WIDTH=20&HEIGHT=20&STRICT=false&style=${ws}:${sn}`;
};

var layerOSM = new ol.layer.Tile({
  source: new ol.source.OSM(),
});

var layerProvince = new ol.layer.Image({
  source: new ol.source.ImageWMS({
    ratio: 1,
    url: `${baseUrl}/geoserver/${workspace}/wms`,
    params: {
      LAYERS: `${workspace}:${layerName}`,
      STYLES: styleDefault,
    },
  }),
});

var layerPort = new ol.layer.Image({
  source: new ol.source.ImageWMS({
    ratio: 1,
    url: `${baseUrl}/geoserver/${workspace}/wms`,
    params: {
      LAYERS: `${workspace}:${layerName2}`,
      STYLES: styleDefault2,
    },
  }),
});

var vietnamCenter = ol.proj.fromLonLat([105.695835, 16.762622]);

var map = new ol.Map({
  layers: [layerOSM, layerProvince, layerPort],
  target: "map",
  view: new ol.View({
    center: vietnamCenter,
    zoom: 6,
  }),
});

var styles = {
  MultiPolygon: new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "yellow",
      width: 2,
    }),
  }),
};

var styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

var vectorLayer = new ol.layer.Vector({
  style: styleFunction,
});

//Event
$("#document").ready(function () {
  map.addLayer(vectorLayer);
  $("#legend").attr("src", imgLegend(workspace, styleDefault));
  $("#legend2").attr("src", imgLegend(workspace, styleDefault2));
});

$("#switchProvince").on("change", function (e) {
  const onORoff = $(this).is(":checked") ? true : false;
  layerProvince.setVisible(onORoff);
  if (!onORoff) {
    $("#legend").attr("src", "");
    $("#legend").attr("src", "");
    return;
  }
  $("#legend").attr("src", imgLegend(workspace, styleDefault));
});

$("#switchPort").on("change", function (e) {
  const onORoff = $(this).is(":checked") ? true : false;
  layerPort.setVisible(onORoff);
  if (!onORoff) {
    $("#legend2").attr("src", "");
    return;
  }
  $("#legend2").attr("src", imgLegend(workspace, styleDefault2));
});

map.on("singleclick", async function (evt) {
  var layer = $("#switchPort").is(":checked") ? layerPort : layerProvince;
  $("#modalDetail").modal("dispose");
  var view = map.getView();
  var viewResolution = view.getResolution();
  var source = layer.getSource();
  var url = source.getGetFeatureInfoUrl(
    evt.coordinate,
    viewResolution,
    view.getProjection(),
    { INFO_FORMAT: "application/json", FEATURE_COUNT: 50 }
  );
  window.listInfor = [];
  if (url) {
    await $.ajax({
      type: "POST",
      url: url,
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function (resp) {
        if (resp && resp?.features.length > 0) {
          for (const item of resp.features) {
            listInfor.push(item.properties);
          }
          var vectorSource = new ol.source.Vector({
            features: new ol.format.GeoJSON().readFeatures(resp),
          });

          vectorLayer.setSource(vectorSource);
          $("#modalDetail").modal("show");
        }
      },
    });
  }
});

const updateFilter = (value) => {
  var filterParams = {
    FEATUREID: null,
  };

  if (value.replace(/^\s\s*/, "").replace(/\s\s*$/, "") != "") {
    filterParams["FEATUREID"] = value;
  }

  map.getLayers().forEach(function (lyr) {
    lyr.getSource().updateParams(filterParams);
  });
};

$("#modalDetail").on("show.bs.modal", function () {
  var modal = $(this);
  modal.find(".modal-title").text("Thông tin chi tiết");
  let html = ``;

  if ($("#switchPort").is(":checked")) {
    modal.find(".modal-body").html("");
    for (let index = 0; index < window.listInfor.length; index++) {
      const infor = window.listInfor[index];
      const img = INFOR_PORT.find((x) => x.name === infor.ten_cang).img;
      html += `<div class="card">
                <img src="assets/img/port/${img}" class="card-img-top" alt="...">
                <div class="card-body">
                  <h5 class="card-title">${infor.ten_cang.toUpperCase()} (${infor.loai.toUpperCase()})</h5>
                </div>
              </div>`;
    }
    modal.find(".modal-body").html(html);
    return;
  }

  html = `<table class="table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Mã</th>
              <th scope="col">Tên tỉnh</th>
            </tr>
          </thead>
          <tbody>
          `;
  for (let index = 0; index < window.listInfor.length; index++) {
    modal.find(".modal-body").html("");
    const infor = window.listInfor[index];

    html += `<tr>
              <th scope="row">${index + 1}</th>
              <td>${infor.hasc_1}</td>
              <td>${infor.name_1}</td>
            </tr>`;
  }
  html += `</tbody></table>`;
  modal.find(".modal-body").html(html);
});

