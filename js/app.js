$("#join-form")
.on("submit", function (ev, frm) {
  $('#form-submit').html('Submitting...');
  $.ajax({
    url: "/cgi-bin/join.cgi",
    method: "POST",
    data: $(ev.target).serialize(),
    dataType: "json",
    success: function(data) {
      $(ev.target)[0].reset();
      $("#thanks").show();
      $('#form-submit').hide();
    },
    error: function(xhr, textStatus, error){
      $('#form-error').html("Form submission failed: " + error);
      $('#form-error').show();
      $('#form-submit').html('Submit');
      console.log(xhr.statusText);
      console.log(textStatus);
      console.log(error);
    }
  });
})
// to prevent form from submitting upon successful validation
.on("submit", function(ev) {
  ev.preventDefault();
});
