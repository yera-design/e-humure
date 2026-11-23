(function(){
  var root=document.documentElement;
  var toggles=document.querySelectorAll('[data-theme-toggle]');
  function normalize(theme){return theme==='dark'?'dark':'light'}
  function apply(theme,persist){
    theme=normalize(theme);
    root.dataset.theme=theme;
    toggles.forEach(function(button){
      button.setAttribute('aria-pressed',String(theme==='dark'));
      button.setAttribute('aria-label',theme==='dark'?'Switch to light theme':'Switch to dark theme');
      button.title=theme==='dark'?'Switch to light theme':'Switch to dark theme';
    });
    if(persist){try{localStorage.setItem('ehumure_theme',theme)}catch(e){}}
  }
  var initial='light';
  try{
    var saved=localStorage.getItem('ehumure_theme');
    initial=saved?normalize(saved):(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    localStorage.removeItem('ehumure_palette');
  }catch(e){}
  delete root.dataset.palette;
  apply(initial,false);
  toggles.forEach(function(button){button.addEventListener('click',function(){apply(root.dataset.theme==='dark'?'light':'dark',true)})});
  window.addEventListener('storage',function(event){if(event.key==='ehumure_theme')apply(event.newValue,false)});
})();