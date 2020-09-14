var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

var is_record = window.location.href.search("westminster-temporary-traffic-measures") > 0;

var mymap = L.map('mapid').setView([51.505, -0.147], 15);


L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWJldmVybGV5IiwiYSI6ImNrMm9qMTNieDB4OHAzYm56ZjNqaDY1ZjYifQ.8f0Lz6dUbO3R1eNzuJPeTg', {
    tileSize: 512,
    maxZoom: 18,
    zoomOffset: -1,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11' // Or streets-v11 outdoors-v11 dark-v10
}).addTo(mymap);

function onEachFeature(feature, layer) {

    var id = feature.properties.id;

    layer.bindPopup("Loading...", {
        //minWidth : 300,
        maxWidth : getPopupWidth(),
        maxHeight: getPopupHeight()
    }).on('popupopen', function (e) {
        var point = {
            id:               feature.properties.id,
            has_image:        feature.properties.has_image,
            html:             feature.properties.html,
            subject:          feature.properties.subject,
            feedback:         feature.properties.feedback,
            is_record:        feature.properties.is_record,
            thumbnail_width:  feature.properties.thumbnail_width,
            thumbnail_height: feature.properties.thumbnail_height
        };
        marker_popup(e, point);
    });
}

if (!is_record) { setup_layers(); }


var markers = L.markerClusterGroup({
});

fetch("/traffic-json/points?is_record=" + is_record)
    .then(function(response) { return response.json() })
    .then(function(json) {
        var geoJsonLayer = L.geoJSON([json], {

            style: function (feature) {
                return feature.properties && feature.properties.style;
            },
            onEachFeature: onEachFeature,
        });
        markers.addLayer(geoJsonLayer);
        mymap.addLayer(markers);
        if (json.features.length && !getUrlParameter('ward')) {
            mymap.fitBounds(markers.getBounds());
        }
    });

if (getUrlParameter('ward')) {
    fetch("/traffic-json/ward/" + getUrlParameter('ward'))
	.then(function(response) { return response.json() })
	.then(function(json) {
	    var geoJsonLayer = L.geoJSON(json, {

		style: function (feature) {
		    return {
			fill: false
		    };
		},
	    }).addTo(mymap);
            mymap.fitBounds(geoJsonLayer.getBounds());
	});

} else {
    fetch("/traffic-json/outline")
	.then(function(response) { return response.json() })
	.then(function(json) {
	    var geoJsonLayer = L.geoJSON([json], {

		style: function (feature) {
		    return {
			fill: false
		    };
		},
	    }).addTo(mymap);
	});
}

var subjects;
fetch("/traffic-json/subjects")
    .then(function(response) { return response.json() })
    .then(function(json) {
        subjects = json;
    });

var popup = L.popup();

function onMapClick(e) {
        var content;
        if (is_record) {
            content = '<h5>Add point</h5>'
                + '<form method="post">'
                + '<input type="hidden" name="is_record" value="1">'
                + '<input type="hidden" name="password" value="' + getUrlParameter('allow-edit') + '">'
                + '<div class="form-group">'
                + '<label for="comment">Title:</label>'
                + '<input type="text" name="comment" class="form-control">'
                + '</div>';
        } else {
            content = '<h5>Add comment</h5>'
                + '<form method="post">'
                + '<div class="form-group">'
                + '<select class="form-control" id="subject_id" name="subject_id">'
                + '<option value="" disabled selected>&lt;select category&gt;</option>';
                subjects.forEach(function (item, index){
                    content = content + '<option value="' + item.id + '">' + item.title + '</option>';
                });
                content = content + '</select></div>';
                content = content + '<div class="form-group"><textarea name="comment" rows="5" class="form-control"></textarea></div>';
        }

        content = content
                + '<input class="lat" type="hidden" name="lat" value="' + e.latlng.lat + '">'
                + '<input class="long" type="hidden" name="long" value="' + e.latlng.lng + '">'
                + '<div class="form-group"><label for="photo">Photo (optional)</label><input type="file" name="file" class="form-control-file" id="photo"></div>'
                + '<div class="alert alert-danger error-message" role="alert" style="display:none"></span></div>'
                + '<div class="d-flex justify-content-end"><button type="submit" class="btn btn-primary trigger">Submit</button></div></form>';

        var pop = L.popup({minWidth: 300})
            .setLatLng(e.latlng)
            .setContent(content)
            .openOn(mymap);
}

if (is_record && getUrlParameter('allow-edit')) { mymap.on('click', onMapClick); }

var submit_feedback = function($form) {
    $form.find('.alert').hide();
    $form.find('button').html('Submitting...').prop("disabled",true);

    var formdata = false;
    if (window.FormData){
        formdata = new FormData($form.get(0));
    }

    $.ajax({
        url: '/traffic-json/submit',
        data: formdata ? formdata : $form.serialize(),
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST'
    }).done(function(point) {
        if (point.is_error) {
            $form.find('button').html('Submit').prop("disabled",false);
            $form.find('.error-message').text(point.message);
            $form.find('.alert').show();
        } else {
            $form.find('.error-message').text();
            if ($form.data('is-feedback')) {
                $form.html('<div class="alert alert-success mt-2" role="alert">Thank you for your feedback</div>');
            } else {
                $popup.hide();
                var mark = L.marker([$popup.find('.lat').val(), $popup.find('.long').val()]).addTo(mymap);
                mark.bindPopup("Loading...").on('popupopen', function (e) {
                    marker_popup(e, point);
                });
            }
        }
    }).fail(function(jqXHR) {
        $form.find('button').html('Submit').prop("disabled",false);
        $form.find('.error-message').text("Sorry, submission failed: " + jqXHR.statusText);
        $form.find('.alert').show();
    });
};

var marker_popup = function (e, point) {
    var popup = e.target.getPopup();
    popup.setContent(function(ef){
        var $element = $('<div>'+point.html+'</div>');
        if (point.subject && !point.is_record) {
            $element.prepend('<h6>' + point.subject + '</h6>');
        }
        if (point.is_record) {
            var $feedback = $('<p style="margin:0 0 5px 0; font-size:14px"></p>');
            $feedback.append('&#x1f44d; ' + point.feedback.keep);
            $feedback.append('<span style="margin-left:15px"></span>&#x1F610; ' + point.feedback.improve);
            $feedback.append('<span style="margin-left:15px"></span>&#x1f44e; ' + point.feedback.remove);
            $feedback.append('<span style="margin-left:50px"></span>ID ' + point.id);
            $feedback.appendTo($element);
        }
        var $row = $('<div class="row"></div>');
        if (point.has_image) {
            $element.find('.loading').show();
            var $image_link = $('<a href="#" data-toggle="modal" data-target="#modal-image"></a>');
            var $image = $('<div style="display:grid"><div class="spinner"></div><img width="'
                + point.thumbnail_width + '" height="' + point.thumbnail_height
                + '" class="overlay" data-point-id="'+ point.id +'"></div>');
            if (point.is_record) {
                $image.find('.overlay').addClass('overlay-fill');
            }
            var $image2 = $image.find('.overlay');
            $image2.attr('src', '/traffic-json/thumbnail/' + point.id);
            $image.appendTo($image_link);
            var $col = $('<div class="col-lg-6" style="padding:0"></div>');
            $image_link.appendTo($col);
            $col.appendTo($row);
            $element.find('.loading').hide();
        }

        if (point.is_record) {
            var $options = $('<form method="post" data-is-feedback="1">'
                + '<input type="hidden" name="is_feedback" value="1">'
                + '<input type="hidden" name="point_id" value="' + point.id + '">'
                + '<h6>Select an option:</h6>'
                + '<div class="btn-group-toggle" data-toggle="buttons">'
                + '<label class="btn btn-success mb-2" style="width:100%">'
                + '<input type="radio" name="feedback" value="keep" autocomplete="off"> Keep as is'
                + '</label>'
                + '<label class="btn btn-warning mb-2" style="width:100%">'
                + '<input type="radio" name="feedback" value="improve" autocomplete="off"> Keep but improve'
                + '</label>'
                + '<label class="btn btn-danger mb-2" style="width:100%">'
                + '<input type="radio" name="feedback" value="remove" autocomplete="off"> Not helping healthy streets'
                + '</label>'
                + '</div>'
                + '<div class="form-group">'
                + '<label for="postcode">Your postcode (first part only):</label>'
                + '<input type="text" name="postcode" class="form-control">'
                + '</div>'
                + '<div class="form-group">'
                + '<label for="comment">Comments:</label>'
                + '<input type="text" name="comment" class="form-control">'
                + '</div>'
                + '<div class="alert alert-danger error-message" role="alert" style="display:none"></span></div>'
                + '<div class="d-flex justify-content-end"><button type="submit" class="btn btn-primary trigger">Submit</button></div>'
                + '</form>');
            var $col = $('<div class="col-lg-6"></div>');
            $options.appendTo($col);
            $col.appendTo($row);
        }
        var $container = $('<div class="container"></div>');
        $row.appendTo($container);
        $container.appendTo($element);

        //  Check if mobile to open a modal instead, otherwise the popup is too
        //  small to complete (within the map)
        if (typeof window.orientation !== 'undefined' || screen.width <= 480 || screen.height < 480) {

            // Empty previous modal
            $('#modal-popup .modal-body').empty();

            // Add popup data to modal
            $element.appendTo($('#modal-popup .modal-body'));
            $('#modal-popup').modal();

            // Add on close event
            $(document).on('hide.bs.modal','#modal-popup', function () {
                mymap.closePopup();
            });

            $element.on('click', '.trigger', function(e) {
                e.preventDefault();
                var $form = $element.find('form');
                submit_feedback($form);
            });
        }

        return $element.html();
    });
    popup.update(); // Does nothing?
};

$('#mapid').on('click', '.trigger', function(e) {
    e.preventDefault();
    var $target = $( event.target );
    var $popup = $target.closest('.leaflet-popup');
    var $form = $popup.find('form');
    submit_feedback($form);
});

$('#modal-image').on('show.bs.modal', function (event) {
    var link = $(event.relatedTarget);
    var point_id = link.find('img').data('point-id');
    var modal = $(this);
    modal.find('.modal-body img').remove();
    var $img = $('<img width="100%">').attr('src', '/traffic-json/image/' + point_id);
    modal.find('.modal-body').empty().append($img);
})

function setup_layers() {

    var layers = {
        clwn: {
            name: "Central London Walking Network",
            url: "/traffic-json/clwn",
            fill: false,
            color: '#0f702a'
        },
        ltn: {
            name: "Suggested Low Traffic Neighbourhoods",
            url: "/traffic-json/ltn",
            fill: true,
            color: '#beb71c'
        },
        improved: {
            name: "Existing cycleways improved with Low Traffic Neighbourhood",
            url: "/traffic-json/ltn",
            fill: false,
            color: '#1843bc'
        },
        lightseg: {
            name: "Suggested lightly segregated cycle routes",
            url: "/traffic-json/lightseg",
            fill: false,
            color: '#a81d1d'
        },
        wards: {
            name: "Borough wards",
            url: "/traffic-json/wards",
            fill: true,
            color: '#7e9cf2'
        }
    };

    Object.keys(layers).forEach(function(layer_name){

        var check = $('<div class="form-check"><input type="checkbox" class="layerswitch form-check-input" id="'+layer_name+'"><label class="form-check-label" for="'+layer_name+'">'+layers[layer_name]["name"]+'</label></div>');
        $('#mapid').before(check);
        layers[layer_name]["checkbox"] = $('#'+layer_name, check).change(function() {
            if(this.checked) {
                toggle_layer(layer_name, true);
            } else {
                toggle_layer(layer_name, false);
            }
        });
    })

    var toggle_layer = function (layer_name, show) {
        if (show) {
            if (!layers[layer_name]["leaflet"]) {
                fetch('/traffic-json/' + layer_name)
                    .then(function(response) { return response.json() })
                    .then(function(json) {
                        layers[layer_name]["leaflet"] = L.geoJSON(json, {

                            style: function (feature) {
                                return {
                                    fill: layers[layer_name]["fill"],
                                    color: layers[layer_name]["color"]
                                };
                            },
                        }).addTo(mymap);
                    });
            } else {
                layers[layer_name]["leaflet"].addTo(mymap);
            }
        } else {
            layers[layer_name]["leaflet"].remove();
        }
    }

    if (getUrlParameter('clwn')) {
        toggle_layer('clwn', 1);
        layers['clwn']["checkbox"].attr('checked', true);
    }

    if (getUrlParameter('improved')) {
        toggle_layer('improved', 1);
        layers['improved']["checkbox"].attr('checked', true);
    }

    if (getUrlParameter('lightseg')) {
        toggle_layer('lightseg', 1);
        layers['lightseg']["checkbox"].attr('checked', true);
    }

    if (getUrlParameter('ltn')) {
        toggle_layer('ltn', 1);
        layers['ltn']["checkbox"].attr('checked', true);
    }

    if (getUrlParameter('wards')) {
        toggle_layer('wards', 1);
        layers['wards']["checkbox"].attr('checked', true);
    }
}

// Get popup width by screen size
function getPopupWidth() {
    factor = 2;
    if(screen.width <= 400) {
        factor = 1.3;
    }
    return Math.floor(screen.width / factor);
}

// Get popup height by screen size
function getPopupHeight() {
    factor = 2;
    if(screen.height <= 400) {
        factor = 1;
    }
    return Math.floor(screen.height / factor);
}
