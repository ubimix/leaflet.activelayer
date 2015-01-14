var L = require('leaflet');
var rbush = require('rbush');

function getGeoJsonBoundingBox(d) {
    if (!d)
        return null;
    var geom = d.geometry;
    if (!geom || !geom.coordinates)
        return null;
    var bbox;
    if (geom.type == 'Point') {
        var coords = geom.coordinates;
        var point = L.latLng(coords[1], coords[0]);
        bbox = L.latLngBounds(point, point);
    } else {
        var layer = L.GeoJSON.geometryToLayer(geom);
        bbox = layer.getBounds();
    }
    return bbox;
    // return [ [ bbox.getSouth(), bbox.getWest() ],
    // [ bbox.getNorth(), bbox.getEast() ] ];
}
var Base;

if (L.Layer) {
    Base = L.Layer.extend({
        throttle : L.Util.throttle
    });
} else {
    Base = L.Class.extend({
        includes : [ L.Mixin.Events ],
        throttle : L.Util.limitExecByInterval
    });
}

var DataActivationLayer = Base.extend({

    /** Initializs options of this class. */
    initialize : function(options) {
        L.setOptions(this, options);
        this.setData(this.options.data);
        
    },

    // ----------------------------------------------------------------------
    onAdd : function(map) {
        this._map = map;
        this._setDelegateEvents('on');
    },

    onRemove : function(map) {
        this._setDelegateEvents('off');
        this._map = map;
    },

    // ----------------------------------------------------------------------
    // Events delegation from the map to listeners

    _setDelegateEvents : function(method) {
        var map = this._map;
        [ 'mousemove', 'click' ].forEach(function(eventType) {
            var handler = this.throttle(this._delegateEvents.bind(this, eventType), 10);
            map[method](eventType, handler);
        }, this);
    },

    _delegateEvents : function(eventType, ev) {
        if (!this.hasEventListeners(eventType))
            return;
        var map = this._map;
        var latlng = ev.latlng;
        var point = map.project(latlng);
        var radius = this._getRadius();
        var swPoint = point.add([ radius, -radius ]);
        var nePoint = point.add([ -radius, radius ]);
        var bbox = L.latLngBounds(//
        map.unproject(swPoint), //
        map.unproject(nePoint));
        var data = this.getData(bbox);
        ev.data = data;
        ev.bbox = bbox;
        ev.radius = radius;
        this.fire(eventType, ev);
    },

    _getRadius : function() {
        var radius = this.options.radius || 10;
        if (typeof radius === 'function') {
            return radius.call(this.options);
        }
        return radius;
    },

    // -----------------------------------------------------------------------

    /** Sets a new dataset in this class. */
    setData : function(data) {
        this._indexData(data);
    },

    /**
     * Implements the getData method of the IDataProvider interface.
     */
    getData : function(bbox) {
        return this._searchInBbox(bbox);
    },

    // -----------------------------------------------------------------------

    /** Indexes the specified data array using a RTree index. */
    _indexData : function(data) {
        // Data indexing
        this._rtree = rbush(9);
        data = data || [];
        var array = [];
        var that = this;
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var bbox = that._getBoundingBox(d);
            if (bbox) {
                var coords = that._toIndexKey(bbox);
                coords.data = d;
                array.push(coords);
            }
        }
        this._rtree.load(array);
    },

    /** Searches resources in the specified bounding box. */
    _searchInBbox : function(bbox) {
        var coords = this._toIndexKey(bbox);
        var array = this._rtree.search(coords);
        var result = [];
        for (var i = 0; i < array.length; i++) {
            var arr = array[i];
            result.push(arr.data);
        }
        return result;
    },

    /**
     * This method transforms a bounding box into a key for RTree index.
     */
    _toIndexKey : function(bbox) {
        var sw = bbox.getSouthWest();
        var ne = bbox.getNorthEast();
        var coords = [ sw.lat, sw.lng, ne.lat, ne.lng ];
        return coords;
    },

    /**
     * Returns an object defining a bounding box ([[south, west], [north,
     * east]]) for the specified resource. This method could be overloaded in
     * subclasses.
     */
    _getBoundingBox : getGeoJsonBoundingBox

});

module.exports = DataActivationLayer;
