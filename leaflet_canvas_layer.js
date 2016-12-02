if(typeof(L) !== 'undefined') {

	L.Map.include({
		//Added
		showLabel: function (label) {
			return this.addLayer(label);
		},
		//END Added
	});

	/*L.Path.include({
		//Added
		showLabel: function (content, options) {
			if (!this.label || this.label.options !== options) {
				this.label = new LeafletLabel(options, this);
				//console.log(this.label);
			}
			
			//console.log(content)
			
			this.label.setLatLng(this._latlng);
			this.label.setContent(content);
			
			this._map.showLabel(this.label);
			//console.log(this._map);

			return this;
		},
		//END Added
	});*/

	//https://github.com/Leaflet/Leaflet.label
	//Leaflet.label, a plugin that adds labels to markers and vectors for Leaflet powered maps.
	var LeafletLabel = L.Class.extend({

		includes: L.Mixin.Events,
		options: {
			className: '',
			clickable: false,
			direction: 'right',
			noHide: false,
			offset: [12, -15], // 6 (width of the label triangle) + 6 (padding)
			opacity: 1,
			zoomAnimation: true
		},
		initialize: function (options, source) {
			L.setOptions(this, options);
			this._source = source;
			this._animated = L.Browser.any3d && this.options.zoomAnimation;
			this._isOpen = false;
		},
		onAdd: function (map) {
			this._map = map;
			this._pane = this.options.pane ? map._panes[this.options.pane] :
				this._source instanceof L.Marker ? map._panes.markerPane : map._panes.popupPane;

			if (!this._container) {
				this._initLayout();
			}


			this._pane.appendChild(this._container);
			this._initInteraction();
			this._update();
			this.setOpacity(this.options.opacity);
			map.on('moveend', this._onMoveEnd, this).on('viewreset', this._onViewReset, this);

			if (this._animated) {
				map.on('zoomanim', this._zoomAnimation, this);
			}

			if (L.Browser.touch && !this.options.noHide) {
				L.DomEvent.on(this._container, 'click', this.close, this);
				map.on('click', this.close, this);
			}
		},
		onRemove: function (map) {
			this._pane.removeChild(this._container);
			map.off({
				zoomanim: this._zoomAnimation,
				moveend: this._onMoveEnd,
				viewreset: this._onViewReset
			}, this);

			this._removeInteraction();
			this._map = null;
		},
		setLatLng: function (latlng) {
			this._latlng = L.latLng(latlng);
			if (this._map) {
				this._updatePosition();
			}
			return this;

		},
		setContent: function (content) {
			// Backup previous content and store new content
			this._previousContent = this._content;
			this._content = content;
			this._updateContent();
			return this;
		},
		close: function () {
			var map = this._map;
			if (map) {
				if (L.Browser.touch && !this.options.noHide) {
					L.DomEvent.off(this._container, 'click', this.close);
					map.off('click', this.close, this);
				}

				map.removeLayer(this);
			}
		},
		updateZIndex: function (zIndex) {
			this._zIndex = zIndex;
			if (this._container && this._zIndex) {
				this._container.style.zIndex = zIndex;
			}
		},
		setOpacity: function (opacity) {
			this.options.opacity = opacity;
			if (this._container) {
				L.DomUtil.setOpacity(this._container, opacity);
			}
		},
		_initLayout: function () {
			this._container = L.DomUtil.create('div', 'leaflet-label ' + this.options.className + ' leaflet-zoom-animated');
			this.updateZIndex(this._zIndex);
		},
		_update: function () {
			if (!this._map) { return; }
			this._container.style.visibility = 'hidden';
			this._updateContent();
			this._updatePosition();
			this._container.style.visibility = '';
		},
		_updateContent: function () {
			if (!this._content || !this._map || this._prevContent === this._content) {
				return;
			}

			if (typeof this._content === 'string') {
				this._container.innerHTML = this._content;
				this._prevContent = this._content;
				this._labelWidth = this._container.offsetWidth;
			}
		},
		_updatePosition: function () {
			var pos = this._map.latLngToLayerPoint(this._latlng);
			this._setPosition(pos);
		},
		_setPosition: function (pos) {
			var map = this._map,
				container = this._container,
				centerPoint = map.latLngToContainerPoint(map.getCenter()),
				labelPoint = map.layerPointToContainerPoint(pos),
				direction = this.options.direction,
				labelWidth = this._labelWidth,
				offset = L.point(this.options.offset);

			// position to the right (right or auto & needs to)
			if (direction === 'right' || direction === 'auto' && labelPoint.x < centerPoint.x) {

				L.DomUtil.addClass(container, 'leaflet-label-right');
				L.DomUtil.removeClass(container, 'leaflet-label-left');

				pos = pos.add(offset);

			} else { // position to the left
				L.DomUtil.addClass(container, 'leaflet-label-left');
				L.DomUtil.removeClass(container, 'leaflet-label-right');
				pos = pos.add(L.point(-offset.x - labelWidth, offset.y));
			}

			L.DomUtil.setPosition(container, pos);
		},
		_zoomAnimation: function (opt) {
			var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
			this._setPosition(pos);

		},
		_onMoveEnd: function () {
			if (!this._animated || this.options.direction === 'auto') {
				this._updatePosition();

			}
		},
		_onViewReset: function (e) {
			/* if map resets hard, we must update the label */
			if (e && e.hard) {
				this._update();
			}
		},
		_initInteraction: function () {
			if (!this.options.clickable) { return; }
			var container = this._container,
				events = ['dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu'];
			L.DomUtil.addClass(container, 'leaflet-clickable');
			L.DomEvent.on(container, 'click', this._onMouseClick, this);

			for (var i = 0; i < events.length; i++) {
				L.DomEvent.on(container, events[i], this._fireMouseEvent, this);
			}
		},
		_removeInteraction: function () {
			if (!this.options.clickable) { return; }

			var container = this._container,
				events = ['dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu'];

			L.DomUtil.removeClass(container, 'leaflet-clickable');
			L.DomEvent.off(container, 'click', this._onMouseClick, this);

			for (var i = 0; i < events.length; i++) {
				L.DomEvent.off(container, events[i], this._fireMouseEvent, this);
			}
		},
		_onMouseClick: function (e) {
			if (this.hasEventListeners(e.type)) {
				L.DomEvent.stopPropagation(e);

			}
			this.fire(e.type, {
				originalEvent: e
			});

		},
		_fireMouseEvent: function (e) {
			this.fire(e.type, {
				originalEvent: e
			});


			// TODO proper custom event propagation
			// this line will always be called if marker is in a FeatureGroup
			if (e.type === 'contextmenu' && this.hasEventListeners(e.type)) {
				L.DomEvent.preventDefault(e);
			}
			if (e.type !== 'mousedown') {
				L.DomEvent.stopPropagation(e);
			} else {
				L.DomEvent.preventDefault(e);
			}

		}

	});

/**
 * full canvas layer implementation for Leaflet
 */

L.CanvasLayer = L.Class.extend({

  includes: [L.Mixin.Events, L.Mixin.TileLoader],

  options: {
      minZoom: 0,
      maxZoom: 28,
      tileSize: 256,
      subdomains: 'abc',
      errorTileUrl: '',
      attribution: '',
      zoomOffset: 0,
      opacity: 1,
      unloadInvisibleTiles: L.Browser.mobile,
      updateWhenIdle: L.Browser.mobile,
      tileLoader: false // installs tile loading events
  },

initialize: function (options) {
    var self = this;
    options = options || {};
    //this.project = this._project.bind(this);
    this.render = this.render.bind(this);
    L.Util.setOptions(this, options);
    this._canvas = this._createCanvas();
    // backCanvas for zoom animation
    this._backCanvas = this._createCanvas();
    this._ctx = this._canvas.getContext('2d');
    this.currentAnimationFrame = -1;
    this.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
                                    return window.setTimeout(callback, 1000 / 60);
                                };
    this.cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame ||
                                window.webkitCancelAnimationFrame || window.msCancelAnimationFrame || function(id) { clearTimeout(id); };
  },

  _createCanvas: function() {
    var canvas;
    canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = this.options.zIndex || 0;
    var className = 'leaflet-tile-container leaflet-zoom-animated';
    canvas.setAttribute('class', className);
    return canvas;
  },

  onAdd: function (map) {
    this._map = map;

    // add container with the canvas to the tile pane
    // the container is moved in the oposite direction of the 
    // map pane to keep the canvas always in (0, 0)
    var tilePane = this._map._panes.tilePane;
    var _container = L.DomUtil.create('div', 'leaflet-layer');
    _container.appendChild(this._canvas);
    _container.appendChild(this._backCanvas);
    this._backCanvas.style.display = 'none';
    tilePane.appendChild(_container);

    this._container = _container;

    // hack: listen to predrag event launched by dragging to
    // set container in position (0, 0) in screen coordinates
    if (map.dragging.enabled()) {
      map.dragging._draggable.on('predrag', function() {
        var d = map.dragging._draggable;
        L.DomUtil.setPosition(this._canvas, { x: -d._newPos.x, y: -d._newPos.y });
      }, this);
    }

    map.on({ 'viewreset': this._reset }, this);
    map.on('move', this.redraw, this);
    map.on('resize', this._reset, this);
    map.on({
        'zoomanim': this._animateZoom,
        'zoomend': this._endZoomAnim
    }, this);

    if(this.options.tileLoader) {
      this._initTileLoader();
    }

    this._reset();
  },

  _animateZoom: function (e) {
      if (!this._animating) {
          this._animating = true;
      }
      var back = this._backCanvas;

      back.width = this._canvas.width;
      back.height = this._canvas.height;

      // paint current canvas in back canvas with trasnformation
      var pos = this._canvas._leaflet_pos || { x: 0, y: 0 };
      back.getContext('2d').drawImage(this._canvas, 0, 0);

      // hide original
      this._canvas.style.display = 'none';
      back.style.display = 'block';
      var map = this._map;
      var scale = map.getZoomScale(e.zoom);
      var newCenter = map._latLngToNewLayerPoint(map.getCenter(), e.zoom, e.center);
      var oldCenter = map._latLngToNewLayerPoint(e.center, e.zoom, e.center);

      var origin = {
        x:  newCenter.x - oldCenter.x,
        y:  newCenter.y - oldCenter.y
      };

      var bg = back;
      var transform = L.DomUtil.TRANSFORM;
      bg.style[transform] =  L.DomUtil.getTranslateString(origin) + ' scale(' + e.scale + ') ';
  },

  _endZoomAnim: function () {
      this._animating = false;
      this._canvas.style.display = 'block';
      this._backCanvas.style.display = 'none';
  },

  getCanvas: function() {
    return this._canvas;
  },

  getAttribution: function() {
    return this.options.attribution;
  },

  draw: function() {
    return this._reset();
  },

  onRemove: function (map) {
    this._container.parentNode.removeChild(this._container);
    map.off({
      'viewreset': this._reset,
      'move': this._render,
      'resize': this._reset,
      'zoomanim': this._animateZoom,
      'zoomend': this._endZoomAnim
    }, this);
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  setOpacity: function (opacity) {
    this.options.opacity = opacity;
    this._updateOpacity();
    return this;
  },

  setZIndex: function(zIndex) {
    this._canvas.style.zIndex = zIndex;
  },

  bringToFront: function () {
    return this;
  },

  bringToBack: function () {
    return this;
  },

  _reset: function () {
    var size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    // fix position
    var pos = L.DomUtil.getPosition(this._map.getPanes().mapPane);
    if (pos) {
      L.DomUtil.setPosition(this._canvas, { x: -pos.x, y: -pos.y });
    }
    this.onResize();
    this._render();
  },

  /*
  _project: function(x) {
    var point = this._map.latLngToLayerPoint(new L.LatLng(x[1], x[0]));
    return [point.x, point.y];
  },
  */

  _updateOpacity: function () { },

  _render: function() {
    if (this.currentAnimationFrame >= 0) {
      this.cancelAnimationFrame.call(window, this.currentAnimationFrame);
    }
    this.currentAnimationFrame = this.requestAnimationFrame.call(window, this.render);
  },

  // use direct: true if you are inside an animation frame call
  redraw: function(direct) {
    var domPosition = L.DomUtil.getPosition(this._map.getPanes().mapPane);
    if (domPosition) {
      L.DomUtil.setPosition(this._canvas, { x: -domPosition.x, y: -domPosition.y });
    }
    if (direct) {
      this.render();
    } else {
      this._render();
    }
  },

  onResize: function() {
  },

  render: function() {
    throw new Error('render function should be implemented');
  }

});

} //L defined
