(function () {
  var district = document.getElementById("district");
  var facility = document.getElementById("facility");
  function say(message, error) { var el=document.getElementById("message"); el.textContent=message; el.className=error?"status error":"status"; }
  function loadFacilities() {
    facility.disabled = true;
    facility.innerHTML = '<option value="">Loading facilities…</option>';
    if (!district.value) { facility.innerHTML='<option value="">Choose a district first</option>'; return; }
    fetch("/facilities?district=" + encodeURIComponent(district.value)).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})}).then(function(o){
      if(!o.ok)throw new Error(o.data.error||"Facilities could not be loaded.");
      facility.innerHTML='<option value="">Choose a facility</option>';
      var isRw=window.getShellLanguage&&window.getShellLanguage()==="rw";
      o.data.forEach(function(f){var option=document.createElement("option");option.value=f.id;option.textContent=f.name+(f.facilityType==="district_hospital"?(isRw?" · Ibitaro by'akarere":" · District hospital"):(isRw?" · Ikigo nderabuzima/ivuriro":" · Health center/clinic"));facility.appendChild(option)});
      facility.disabled=!o.data.length;
      if(!o.data.length)facility.innerHTML='<option value="">No facilities in this district</option>';
    }).catch(function(){facility.innerHTML='<option value="">Facilities unavailable</option>';facility.disabled=true;say(navigator.onLine?"Facilities could not be loaded. Check the server.":"You are offline. Reconnect to load facilities.",true)});
  }
  fetch("/districts").then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})}).then(function(o){
    if(!o.ok)throw new Error(o.data.error||"Districts could not be loaded.");
    district.innerHTML='<option value="">Choose a district</option>';
    o.data.forEach(function(d){var option=document.createElement("option");option.value=d.name;option.textContent=d.name;district.appendChild(option)});
  }).catch(function(){district.innerHTML='<option value="">Districts unavailable</option>';say(navigator.onLine?"Districts could not be loaded. Check the server.":"You are offline. Reconnect to load districts.",true)});
  district.addEventListener("change",loadFacilities);
  document.addEventListener("ehumure:language",function(){if(district.value)loadFacilities()});
  document.getElementById("request").addEventListener("click",function(){
    var button=this;var body={fullName:document.getElementById("name").value.trim(),contact:document.getElementById("contact").value.trim(),role:document.getElementById("role").value,district:district.value,facilityId:facility.value,username:document.getElementById("username").value.trim(),password:document.getElementById("password").value};
    if(!body.fullName||!body.contact||!body.district||!body.facilityId||!body.username||!body.password){say("Complete all fields before submitting.",true);return}
    button.disabled=true;say("Submitting your access request to the facility administrator…",false);
    fetch("/staff-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){return{ok:r.ok,data:d}})}).then(function(o){if(!o.ok){say(o.data.error||"Request could not be submitted.",true);return}say(o.data.message,false);document.getElementById("password").value=""}).catch(function(){say(navigator.onLine?"Request could not reach the server. Check your connection and try again.":"You are offline. The request was not submitted.",true)}).finally(function(){button.disabled=false});
  });
})();

