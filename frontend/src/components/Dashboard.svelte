<script>
  export let surveys = [];
  export let responseCount = 0;
  export let onCreateSurvey = () => {};
  export let onDeleteSurvey = (id) => {};
  export let onEditSurvey = (id) => {};
  export let onTestSurvey = (id) => {};

  let activeShareSurvey = null;
  let showShareModal = false;

  function getKioskLink(surveyId) {
    let host = window.location.hostname;
    
    if (host === 'localhost' || host === '127.0.0.1') {
      host = '10.136.33.33'; 
    }
    
    const port = window.location.port ? `:${window.location.port}` : '';
    return `http://${host}${port}/#/kiosk?id=${surveyId}`;
  }

  function openShareHub(survey) {
    activeShareSurvey = survey;
    showShareModal = true;
  }

  function closeShareHub() {
    showShareModal = false;
    activeShareSurvey = null;
  }

  function copyKioskLink(surveyId) {
    const directLink = getKioskLink(surveyId);
    navigator.clipboard.writeText(directLink);
    alert("🚀 Network-accessible Kiosk Link copied to clipboard!");
  }
</script>

<div class="w-full space-y-8 animate-fade pb-12">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-5">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-navy-950 dark:text-white">Surveys & Forms Portal</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Design questionnaires, organize remote interactive deployment hubs, and manage historical entry structures.</p>
    </div>
    <button on:click={onCreateSurvey} class="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-600/20 active:scale-[0.98]">
      + Create New Form
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Form Library Capacity</h4>
        <p class="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-2">{surveys.length} Deployed Schemas</p>
      </div>
      <div class="text-3xl bg-slate-100 dark:bg-slate-950 h-14 w-14 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">📋</div>
    </div>
    
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aggregated Responses Collected</h4>
        <p class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{responseCount} Submissions</p>
      </div>
      <div class="text-3xl bg-slate-100 dark:bg-slate-950 h-14 w-14 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">📥</div>
    </div>
  </div>

  <div class="space-y-4">
    <h3 class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Active Survey Inventory</h3>
    
    {#if surveys.length === 0}
      <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 dark:text-slate-500 text-sm">
        No surveys inside storage ledger. Click "+ Create New Form" above to begin deployment configuration.
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each surveys as survey (survey._id)}
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-md hover:border-slate-300 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-6 relative group">
            
            <button 
              on:click={() => onDeleteSurvey(survey._id)}
              class="absolute top-4 right-4 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-800/60 hover:border-rose-300 dark:hover:border-rose-900/40 h-8 w-8 rounded-xl flex items-center justify-center text-xs transition-all opacity-0 group-hover:opacity-100 shadow-xs"
            >
              ✕
            </button>

            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <span class="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest font-mono">Active</span>
              </div>
              <h3 class="text-lg font-bold text-navy-950 dark:text-white tracking-tight truncate border-l-2 border-cyan-500 pr-8 pl-3">
                {survey.title || "Untitled Form"}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 pt-1"> Contains <span class="text-cyan-600 dark:text-cyan-400 font-semibold">{survey.questions?.length || 0} layout fields</span>.</p>
            </div>

            <div class="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <div class="grid grid-cols-2 gap-2">
                <button on:click={() => onEditSurvey(survey._id)} class="w-full text-center bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-4 text-xs rounded-xl border border-slate-200 dark:border-slate-800 transition-all">
                  🛠️ Open Designer
                </button>
                <button on:click={() => onTestSurvey(survey._id)} class="w-full text-center bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 font-bold py-2.5 px-4 text-xs rounded-xl border border-cyan-200 dark:border-cyan-950/80 transition-all">
                  📱 Test Kiosk
                </button>
              </div>
              
              <button on:click={() => openShareHub(survey)} class="w-full bg-slate-100 dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 font-bold py-2 px-4 text-xs rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-all flex items-center justify-center space-x-2">
                <span>⚡</span> <span>Deploy & Share Form</span>
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- SHARE HUB OVERLAY MODAL -->
  {#if showShareModal && activeShareSurvey}
    {@const dynamicKioskUrl = getKioskLink(activeShareSurvey._id)}
    <div class="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 text-center space-y-6 shadow-2xl relative">
        
        <button on:click={closeShareHub} class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 h-8 w-8 rounded-full flex items-center justify-center text-xs transition-all">
          ✕
        </button>

        <div class="space-y-1">
          <span class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase block">Direct Form Access</span>
          <h3 class="text-base font-extrabold text-navy-950 dark:text-white truncate max-w-[280px] mx-auto">{activeShareSurvey.title}</h3>
        </div>

        <div class="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto border-4 border-slate-200 dark:border-slate-950/20">
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={encodeURIComponent(dynamicKioskUrl)}&color=0f172a" 
            alt="Survey Kiosk Link QR Code" 
            class="h-44 w-44 block"
          />
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto px-2">
          Scan this QR code to load this specific survey configuration directly in full-screen mode on any mobile or tablet device.
        </p>

        <div class="pt-2 border-t border-slate-200 dark:border-slate-800/60">
          <button on:click={() => copyKioskLink(activeShareSurvey._id)} class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2">
            <span>🔗</span> <span>Copy Direct Form Link</span>
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>