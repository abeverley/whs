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

    layer.bindPopup("Loading...").on('popupopen', function (e) {
        var point = {
            id:               feature.properties.id,
            has_image:        feature.properties.has_image,
            html:             feature.properties.html,
            subject:          feature.properties.subject,
            thumbnail_width:  feature.properties.thumbnail_width,
            thumbnail_height: feature.properties.thumbnail_height
        };
        marker_popup(e, point);
    });
}

var markers = L.markerClusterGroup({
});

fetch("/traffic-json/points")
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
        if (json.features.length) {
            mymap.fitBounds(markers.getBounds());
        }
    });

var subjects;
fetch("/traffic-json/subjects")
    .then(function(response) { return response.json() })
    .then(function(json) {
        subjects = json;
    });

var popup = L.popup();

function onMapClick(e) {
        var content = '<h5>Add comment</h5>'
                + '<form method="post">'
                + '<div class="form-group">'
                + '<select class="form-control" id="subject_id" name="subject_id">'
                + '<option value="" disabled selected>&lt;select category&gt;</option>';
        subjects.forEach(function (item, index){
            content = content + '<option value="' + item.id + '">' + item.title + '</option>';
        });
        content = content + '</select></div>'
                + '<div class="form-group"><textarea name="comment" rows="5" class="form-control"></textarea></div>'
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

mymap.on('click', onMapClick);

var marker_popup = function (e, point) {
    var popup = e.target.getPopup();
    popup.setContent(function(ef){
        var $element = $('<div><p>'+point.html+'</p></div>');
        if (point.subject) {
            $element.prepend('<h6>' + point.subject + '</h6>');
        }
        if (point.has_image) {
            $element.find('.loading').show();
            var $image_link = $('<a href="#" data-toggle="modal" data-target="#modal-image"></a>');
            var $image = $('<div class="container"><div class="spinner"></div><img width="'
                + point.thumbnail_width + '" height="' + point.thumbnail_height
                + '" class="overlay" data-point-id="'+ point.id +'"></div>');
            var $image2 = $image.find('.overlay');
            $image2.attr('src', '/traffic-json/thumbnail/' + point.id);
            $image.appendTo($image_link);
            $image_link.appendTo($element);
            $element.find('.loading').hide();
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
            $popup.hide();
            var mark = L.marker([$popup.find('.lat').val(), $popup.find('.long').val()]).addTo(mymap);

            mark.bindPopup("Loading...").on('popupopen', function (e) {
                marker_popup(e, point);
            });
        }
    }).fail(function(jqXHR) {
        $form.find('button').html('Submit').prop("disabled",false);
        $form.find('.error-message').text("Sorry, submission failed: " + jqXHR.statusText);
        $form.find('.alert').show();
    });
});

$('#modal-image').on('show.bs.modal', function (event) {
    var link = $(event.relatedTarget);
    var point_id = link.find('img').data('point-id');
    var modal = $(this);
    modal.find('.modal-body img').remove();
    var $img = $('<img width="100%">').attr('src', '/traffic-json/image/' + point_id);
    modal.find('.modal-body').empty().append($img);
})
