<script>
  export let surveys = [];
  export let responseCount = 0;
  export let onCreateSurvey = () => {};
  export let onDeleteSurvey = (id) => {};
  export let onEditSurvey = (id) => {};
  export let onTestSurvey = (id) => {};
</script>

<div class="w-full space-y-8 animate-fade pb-12">
  <div class="flex items-center justify-between border-b border-slate-800/60 pb-5">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-white">Surveys & Forms Portal</h1>
      <p class="text-sm text-slate-400 mt-1">Design questionnaires, organize remote interactive deployment hubs, and manage historical entry structures.</p>
    </div>
    <button on:click={onCreateSurvey} class="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-cyan-600/10 active:scale-[0.98]">
      + Create New Form
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-md flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Form Library Capacity</h4>
        <p class="text-3xl font-extrabold text-cyan-400 mt-2">{surveys.length} Deployed Schemas</p>
      </div>
      <div class="text-3xl bg-slate-950 h-14 w-14 rounded-xl flex items-center justify-center border border-slate-800 shadow-inner">📋</div>
    </div>
    <div class="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shadow-md flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">Aggregated Responses Collected</h4>
        <p class="text-3xl font-extrabold text-emerald-400 mt-2">{responseCount} Submissions</p>
      </div>
      <div class="text-3xl bg-slate-950 h-14 w-14 rounded-xl flex items-center justify-center border border-slate-800 shadow-inner">📥</div>
    </div>
  </div>

  <div class="space-y-4">
    <h3 class="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Active Survey Inventory</h3>
    
    {#if surveys.length === 0}
      <div class="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-sm">
        No surveys inside storage ledger. Click "+ Create New Form" above to begin deployment configuration.
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {#each surveys as survey (survey._id)}
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-6 relative group">
            
            <button 
              on:click={() => onDeleteSurvey(survey._id)}
              class="absolute top-4 right-4 text-slate-500 hover:text-rose-400 bg-slate-950 hover:bg-rose-950/20 border border-slate-800/60 hover:border-rose-900/40 h-8 w-8 rounded-xl flex items-center justify-center text-xs transition-all opacity-0 group-hover:opacity-100 shadow-sm"
              title="Delete Survey Form Layout"
            >
              ✕
            </button>

            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <span class="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-widest font-mono">Active</span>
              </div>
              <h3 class="text-lg font-bold text-white tracking-tight truncate border-l-2 border-cyan-500 pr-8 pl-3">
                {survey.title}
              </h3>
              <p class="text-xs text-slate-400 pt-1"> Contains <span class="text-cyan-400 font-semibold">{survey.questions?.length || 0} layout validation fields</span> configured.</p>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
              <button 
                on:click={() => onEditSurvey(survey._id)}
                class="w-full text-center bg-slate-950 hover:bg-slate-800 text-slate-200 font-bold py-2.5 px-4 text-xs rounded-xl border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]">
                🛠️ Open Designer
              </button>
              <button 
                on:click={() => onTestSurvey(survey._id)}
                disabled={!survey.questions || survey.questions.length === 0}
                class="w-full text-center bg-cyan-950/40 hover:bg-cyan-950/80 text-cyan-400 font-bold py-2.5 px-4 text-xs rounded-xl border border-cyan-950/80 hover:border-cyan-500/40 transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed">
                📱 Test Kiosk
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>