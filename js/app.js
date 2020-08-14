$("#join-form")
.on("submit", function (ev, frm) {
  if (!$('#forename').val().length) {
    alert("Please enter your first name");
  } else if (!$('#surname').val().length) {
    alert("Please enter your surname");
  } else if (!$('#email').val().length) {
    alert("Please enter your email address");
  } else if (!$('#permission').prop('checked')) {
    alert("Please select the checkbox giving us permission to contact you");
  } else {
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
  }
})
// to prevent form from submitting upon successful validation
.on("submit", function(ev) {
  ev.preventDefault();
});
