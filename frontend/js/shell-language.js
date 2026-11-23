/* frontend/js/shell-language.js
   The shared English/Kinyarwanda switch for the application shell.

   How it works
     - Every page puts two buttons marked data-shell-lang="en" and "rw" in the
       top bar. This file wires them.
     - An element translates in one of two ways: its English text is a key in
       the dictionary below, or it carries a data-rw="…" attribute on the page.
       data-rw covers page-specific wording; the dictionary covers wording that
       repeats across screens.
     - The chosen language is stored in localStorage under "ehumure_language"
       and announced on the document as the "ehumure:language" event, so the
       screening flow and the dashboards redraw themselves in the new language.

   The dictionary is grouped by area and every key appears exactly once.
*/
(function () {
  var rw = {

    /* -- Shell, roles and common actions ---------------------------------- */
    "Healthy Body. Peaceful Mind. Better Tomorrow.": "Umubiri muzima. Umutima utuje. Ejo heza.",
    "Theme": "Imigaragarire",
    "Sign out": "Sohoka",
    "Refresh": "Ongera urebe",
    "Search": "Shakisha",
    "Clear search": "Siba ibyashakishijwe",
    "Return to sign in": "Subira ku kwinjira",
    "Approve": "Emeza",
    "Reject": "Hakana",
    "Show": "Erekana",
    "Hide": "Hisha",
    "Full name": "Amazina yose",
    "District": "Akarere",
    "Facility": "Ivuriro",
    "Username": "Izina ukoresha",
    "Password": "Ijambo ry'ibanga",
    "Choose a username": "Hitamo izina ukoresha",
    "Work role": "Umwanya w'akazi",
    "Facility type": "Ubwoko bw'ivuriro",
    "Rwanda mobile number": "Nimero ya telefone yo mu Rwanda",
    "NCD nurse": "Umuforomo w'indwara zitandura",
    "Psychiatric nurse": "Umuforomo w'indwara zo mu mutwe",
    "Clinical psychologist": "Inzobere mu mitekerereze",
    "Facility administrator": "Umuyobozi w'ivuriro",
    "System administrator": "Umuyobozi mukuru wa sisitemu",
    "Health center or clinic": "Ikigo nderabuzima cyangwa ivuriro",
    "District hospital": "Ibitaro by'akarere",
    "Could not reach the server.": "Ntibyashobotse kugera kuri seriveri.",
    "Enter 10 digits beginning 072, 073, 078 or 079. Do not add +250.": "Andika imibare 10 itangirira kuri 072, 073, 078 cyangwa 079. Ntushyiremo +250.",

    /* -- Home page -------------------------------------------------------- */
    "Staff sign in": "Injira abakozi",

    /* -- Sign in ---------------------------------------------------------- */
    "Staff access": "Uruhushya rw'abakozi",
    "Sign in": "Injira",
    "Select your facility, then enter your approved staff account.": "Hitamo ivuriro ukoreramo, hanyuma winjire ukoresheje konti yemejwe.",
    "System administrator sign-in. No facility is selected for this account.": "Kwinjira k'umuyobozi wa sisitemu. Konti ye ntihuzwa n'ivuriro.",
    "Facility staff": "Abakozi b'ivuriro",
    "Health center or hospital": "Ivuriro cyangwa ibitaro",
    "Request a staff account": "Saba konti y'akazi",
    "Register a hospital or clinic": "Andikisha ibitaro cyangwa ivuriro",
    "Set up the first system administrator": "Shyiraho umuyobozi wa mbere wa sisitemu",
    "Staff access is approved by a facility administrator. If your facility isn't listed, ask your system administrator to add it.": "Uruhushya rw'abakozi rwemezwa n'umuyobozi w'ivuriro. Niba ivuriro ryawe ritagaragara, saba umuyobozi wa sisitemu kurongeramo.",
    "Choose a facility": "Hitamo ivuriro",
    "Choose a district": "Hitamo akarere",
    "Choose a district first": "Banza uhitemo akarere",
    "No facilities in this district": "Nta mavuriro ari muri aka karere",
    "No facilities are configured yet. Register your facility or contact the system administrator.": "Nta vuriro rirashyirwaho. Iyandikishe ivuriro cyangwa ubaze umuyobozi wa sisitemu.",
    "Checking your account…": "Kugenzura konti yawe…",
    "Enter your system administrator username and password.": "Andika izina ukoresha n'ijambo ry'ibanga by'umuyobozi wa sisitemu.",
    "Choose your facility and enter your username and password.": "Hitamo ivuriro ryawe hanyuma wandike izina ukoresha n'ijambo ry'ibanga.",
    "System administrator created. Sign in using the account you just created.": "Umuyobozi wa sisitemu yashyizweho. Injira ukoresheje konti umaze gukora.",

    /* -- Request staff access --------------------------------------------- */
    "Request an account": "Saba konti",
    "Choose your district and facility. The facility administrator reviews your request before you can sign in. If your facility isn't listed, ask your system administrator to add it.": "Hitamo akarere n'ivuriro. Umuyobozi w'ivuriro azasuzuma ubusabe bwawe mbere yo kwinjira. Niba ivuriro ryawe ritagaragara, saba umuyobozi wa sisitemu kuyongeramo.",
    "Submit request": "Ohereza ubusabe",
    "Submitting your access request to the facility administrator…": "Kohereza ubusabe bwo kwinjira ku muyobozi w'ivuriro…",
    "Request submitted. A facility administrator must approve it before you can sign in.": "Ubusabe bwoherejwe. Umuyobozi w'ivuriro agomba kubwemeza mbere yo kwinjira.",
    "Complete all fields before submitting.": "Uzuza ahantu hose mbere yo kohereza.",

    /* -- Register a facility ---------------------------------------------- */
    "Facility registration": "Iyandikisha ry'ivuriro",
    "Register your hospital or clinic": "Andikisha ibitaro cyangwa ivuriro byawe",
    "Submit registration": "Ohereza iyandikisha",

    /* -- System setup ------------------------------------------------------ */
    "One-time system setup": "Igenamiterere rikorwa rimwe",
    "Create the system administrator": "Shyiraho umuyobozi wa sisitemu",
    "This account manages facility registrations and system-wide oversight. It does not belong to a hospital or clinic. Facility heads register their own facilities and approve staff access.": "Iyi konti igenzura iyandikwa ry'amavuriro na sisitemu yose. Ntihuzwa n'ibitaro cyangwa ivuriro. Abayobozi b'amavuriro biyandikisha kandi bakemeza abakozi babo.",
    "Setup key": "Urufunguzo rw'igenamiterere",
    "Create system administrator": "Shyiraho umuyobozi wa sisitemu",

    /* -- Nurse workspace --------------------------------------------------- */
    "Nurse workspace": "Ahakorerwa n'umuforomo",
    "Screening dashboard": "Imbonerahamwe y'isuzuma",
    "Find a patient, continue pending work, or review completed screenings.": "Shakisha umurwayi, ukomeze akazi katarangiye, cyangwa urebe isuzuma ryarangiye.",
    "Register patient": "Andikisha umurwayi",
    "Find a patient": "Shakisha umurwayi",
    "Search by patient code": "Shakisha ukoresheje kode y'umurwayi",
    "Patient code": "Kode y'umurwayi",
    "Continue a visit": "Komeza isura",
    "Pending screenings": "Isuzuma ritararangira",
    "Completed work": "Akazi karangiye",
    "My screenings": "Isuzuma nakoze",
    "Screening flow": "Uko isuzuma rikorwa",
    "Patient record": "Dosiye y'umurwayi",
    "Register a patient": "Andikisha umurwayi",
    "Use the generated code throughout the visit. Do not enter a name.": "Koresha kode yakozwe mu gihe cy'isura. Ntushyiremo izina.",
    "Age": "Imyaka",
    "Long-term condition": "Indwara idakira",
    "Diabetes": "Diyabete",
    "Hypertension": "Umuvuduko ukabije w'amaraso",
    "Cardiovascular disease (heart disease)": "Indwara z'umutima n'imitsi y'amaraso",
    "Chronic respiratory disease": "Indwara zidakira z'ubuhumekero",
    "Cancer": "Kanseri",
    "Other": "Ibindi",
    "Specify the condition": "Sobanura indwara",
    "Specify other long-term condition": "Sobanura indi ndwara idakira",
    "Specify the other condition (2 to 120 characters).": "Sobanura indi ndwara ukoresheje inyuguti 2 kugeza kuri 120.",
    "Sector": "Umurenge",
    "Phone number": "Nimero ya telefone",
    "Back to dashboard": "Subira ku mbonerahamwe",
    "Patient code · no name": "Kode y'umurwayi · nta zina",
    "Copy code": "Koporora kode",
    "Patient code copied.": "Kode y'umurwayi yakoporowe.",
    "Copy is unavailable in this browser. Select the code to copy it.": "Koporora ntibiboneka muri iyi mushakisha. Hitamo kode uyikoporore.",
    "Copy failed. Select the code and copy it.": "Koporora byanze. Hitamo kode uyikoporore.",
    "Complete age, condition, sector and phone number.": "Uzuza imyaka, indwara, umurenge na nimero ya telefone.",
    "Enter an age from 18 to 120.": "Andika imyaka iri hagati ya 18 na 120.",
    "Enter exactly 10 digits, with no spaces or +250.": "Andika imibare 10 neza, nta mwanya cyangwa +250.",
    "Use digits only.": "Koresha imibare gusa.",
    "Start with a Rwanda mobile prefix: 072, 073, 078 or 079.": "Tangira na kode ya telefone yo mu Rwanda: 072, 073, 078 cyangwa 079.",
    "Enter a valid mobile number, not the same digit repeated.": "Andika nimero ya telefone nyayo, ntusubiremo umubare umwe gusa.",
    "Saving patient record…": "Kubika dosiye y'umurwayi…",
    "Patient registered. Ask for consent before screening.": "Umurwayi yanditswe. Saba uruhushya mbere yo kumusuzuma.",
    "Patient could not be registered.": "Ntibyashobotse kwandika umurwayi.",
    "Searching this facility…": "Gushakisha muri iri vuriro…",
    "Enter a patient code such as P001.": "Andika kode y'umurwayi nka P001.",
    "Patient not found in this facility.": "Nta murwayi ufite iyi kode muri iri vuriro.",
    "Resume screening": "Komeza isuzuma",
    "Start a new screening": "Tangira isuzuma rishya",
    "Previous screening results": "Ibyavuye mu isuzuma rishize",
    "No completed screenings are recorded for this patient yet.": "Nta suzuma ryarangiye ry'uyu murwayi riranditswe.",
    "An unfinished screening is saved. Resume it to continue at the last unanswered question.": "Hari isuzuma ritarangiye ryabitswe. Rikomeze aho ryahagarariye.",
    "No pending screenings. Started screenings appear here until completed.": "Nta suzuma ritararangira. Isuzuma ryatangiye rigaragara hano kugeza rirangiye.",
    "No completed screenings yet.": "Nta suzuma rirarangira.",
    "Loading pending screenings…": "Gukurura isuzuma ritararangira…",
    "Loading completed screenings…": "Gukurura isuzuma ryarangiye…",
    "Could not load pending screenings. Check the server.": "Ntibyashobotse kureba isuzuma ritararangira. Reba seriveri.",
    "Could not load completed screenings.": "Ntibyashobotse kureba isuzuma ryarangiye.",
    "Progress saved.": "Aho ugeze habitswe.",
    "Saving progress…": "Kubika aho ugeze…",
    "Progress could not be saved.": "Ntibyashobotse kubika aho ugeze.",
    "Screening saved.": "Isuzuma ryabitswe.",

    /* -- Specialist workspace ---------------------------------------------- */
    "Follow-up": "Gukurikirana",
    "Open alerts": "Integuza zifunguye",
    "Assigned to me": "Ibyo nahawe",
    "Appointments": "Gahunda",
    "My appointments": "Gahunda zanjye",
    "Scheduled care": "Ubuvuzi buteganyijwe",
    "Review the patient code and plan a follow-up appointment.": "Suzuma kode y'umurwayi kandi utegure gahunda yo kumukurikirana.",
    "No open alerts. New alerts will appear here.": "Nta nteguza zifunguye. Integuza nshya zizagaragara hano.",
    "Loading alerts…": "Gukurura integuza…",
    "Loading appointments…": "Gukurura gahunda…",
    "No appointments are scheduled.": "Nta gahunda zateganyijwe.",
    "Assign to me": "Mpa iyi nteguza",
    "Review alert": "Reba integuza",
    "Appointment date and time": "Itariki n'isaha bya gahunda",
    "Book appointment": "Teganya gahunda",
    "Back to alerts": "Subira ku nteguza",

    /* -- Administration ----------------------------------------------------- */
    "Waiting for you": "Bigutegereje",
    "Facility registrations": "Amavuriro yiyandikishije",
    "System overview": "Incamake ya sisitemu",
    "All facilities and their staff": "Amavuriro yose n'abakozi bayo",
    "Activity record": "Amateka y'ibikorwa",
    "System audit log": "Amateka y'ibikorwa bya sisitemu",
    "Facility performance": "Imikorere y'ivuriro",
    "My facility at a glance": "Incamake y'ivuriro ryanjye",
    "Counts only. No patient codes and no answers are shown here.": "Imibare gusa. Nta kode z'abarwayi cyangwa ibisubizo bigaragara hano.",
    "Facility administration": "Ubuyobozi bw'ivuriro",
    "Pending staff requests": "Ubusabe bw'abakozi butegereje",
    "Staff who asked to work at your facility. Approving creates their account.": "Abakozi basabye gukora mu ivuriro ryawe. Kwemeza bituma konti yabo ishyirwaho.",
    "No staff requests are waiting for review.": "Nta busabe bw'abakozi butegereje gusuzumwa.",
    "No facility registrations are waiting for review.": "Nta ivuriro ryiyandikishije ritegereje gusuzumwa.",
    "No audit entries yet.": "Nta mateka y'ibikorwa arahari."
  };

  var controls = document.querySelectorAll("[data-shell-lang]");
  var observer = null;

  function apply(code) {
    // The observer re-runs apply() on every DOM change. Pause it while we
    // write, or our own writes queue more mutations and we loop.
    if (observer) observer.disconnect();
    document.documentElement.lang = code;

    document.querySelectorAll("h1,h2,h3,p,label,button,a,.eyebrow,.role-badge,strong,small,span,option,div").forEach(function (el) {
      if (el.children.length) return;
      var current = el.textContent.trim();
      var original = el.getAttribute("data-shell-en");
      var rendered = el.getAttribute("data-shell-rendered");
      // Re-cache when the app has written new text. Without this check the
      // first string an element ever showed (a status such as "Saving…") is
      // treated as its permanent English source and written back forever, so
      // status messages and loading text could never be replaced.
      if (!original || (current !== original && current !== rendered)) {
        if (!current) return;
        original = current;
        el.setAttribute("data-shell-en", original);
      }
      var translated = code === "rw" ? (rw[original] || el.getAttribute("data-rw") || original) : original;
      // Record what we are about to render before writing it, so a nested
      // apply() triggered by this write does not mistake our own translation
      // for new text from the app and cache it as the English source.
      el.setAttribute("data-shell-rendered", translated);
      if (el.textContent !== translated) el.textContent = translated;
    });

    document.querySelectorAll("input[placeholder]").forEach(function (el) {
      var original = el.getAttribute("data-shell-placeholder-en") || el.placeholder;
      if (!el.hasAttribute("data-shell-placeholder-en")) el.setAttribute("data-shell-placeholder-en", original);
      el.placeholder = code === "rw" ? (rw[original] || original) : original;
    });

    controls.forEach(function (button) {
      var active = button.getAttribute("data-shell-lang") === code;
      button.classList.toggle("secondary", !active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.applyShellLanguage = apply;
  window.getShellLanguage = function () {
    try { return localStorage.getItem("ehumure_language") || "en"; } catch (e) { return "en"; }
  };

  observer = new MutationObserver(function () { apply(window.getShellLanguage()); });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  controls.forEach(function (button) {
    button.addEventListener("click", function () {
      var code = button.getAttribute("data-shell-lang");
      try { localStorage.setItem("ehumure_language", code); } catch (e) {}
      apply(code);
      document.dispatchEvent(new CustomEvent("ehumure:language", { detail: { language: code } }));
    });
  });

  apply(window.getShellLanguage());
})();
