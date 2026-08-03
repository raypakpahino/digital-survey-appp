<script>
  export let surveys = [];
  export let responseCount = 0;
  export let onCreateSurvey = () => {};
  export let onDeleteSurvey = (id) => {};
  export let onEditSurvey = (id) => {};
  export let onTestSurvey = (id) => {};
  export let onOpenShareModal = (survey) => {};
</script>

<div class="w-full space-y-8 animate-fade pb-12">
  <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-5">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-[#1a2b6c] dark:text-white">Surveys & Forms Portal</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Design questionnaires, organize remote interactive deployment hubs, and manage historical entry structures.</p>
    </div>
    
    <!-- HIGH-CONTRAST BOLD CREATE NEW FORM BUTTON -->
    <button 
      on:click={onCreateSurvey} 
      class="bg-[#1a2b6c] hover:bg-[#e31b23] text-white px-5 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#1a2b6c]/20 active:scale-[0.98] flex items-center space-x-2"
      style="color: #ffffff !important; font-weight: 700 !important; background-color: #1a2b6c !important;"
    >
      <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" style="fill: #ffffff !important;">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      <span style="color: #ffffff !important; font-weight: 700 !important;">Create New Form</span>
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- FORM LIBRARY CAPACITY STAT CARD -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Form Library Capacity</h4>
        <p class="text-3xl font-extrabold text-[#1a2b6c] dark:text-cyan-400 mt-2">{surveys.length} Deployed Schemas</p>
      </div>
      <div class="bg-slate-100 dark:bg-cyan-950/60 text-[#1a2b6c] dark:text-cyan-400 h-14 w-14 rounded-xl flex items-center justify-center border border-slate-200 dark:border-cyan-900/60 shadow-xs">
        <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2 .4-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V5h2v2h10V5h2v14z"/>
        </svg>
      </div>
    </div>
    
    <!-- AGGREGATED RESPONSES STAT CARD -->
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aggregated Responses Collected</h4>
        <p class="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{responseCount} Submissions</p>
      </div>
      <div class="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 h-14 w-14 rounded-xl flex items-center justify-center border border-emerald-200 dark:border-emerald-900/60 shadow-xs">
        <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2l5-5-1.41-1.41L13 14.17V7h-2v7.17l-2.59-2.58L7 12l5 5z"/>
        </svg>
      </div>
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
              title="Delete Survey"
            >
              ✕
            </button>

            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest font-mono">Active</span>
              </div>
              <h3 class="text-lg font-bold text-[#1a2b6c] dark:text-white tracking-tight truncate border-l-2 border-[#e31b23] pr-8 pl-3">
                {survey.title || "Untitled Form"}
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 pt-1"> Contains <span class="text-[#1a2b6c] dark:text-cyan-400 font-semibold">{survey.questions?.length || 0} layout fields</span>.</p>
            </div>

            <div class="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
              <div class="grid grid-cols-2 gap-2">
                
                <button on:click={() => onEditSurvey(survey._id)} class="w-full text-center bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold py-2.5 px-4 text-xs rounded-xl border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center space-x-2">
                  <svg class="w-4 h-4 fill-current text-slate-600 dark:text-slate-300" viewBox="0 0 24 24">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  <span>Open Designer</span>
                </button>

                <button on:click={() => onTestSurvey(survey._id)} class="w-full text-center bg-slate-100 dark:bg-cyan-950/40 hover:bg-slate-200 dark:hover:bg-cyan-950/80 text-[#1a2b6c] dark:text-cyan-400 font-bold py-2.5 px-4 text-xs rounded-xl border border-slate-200 dark:border-cyan-950/80 transition-all flex items-center justify-center space-x-2">
                  <svg class="w-4 h-4 fill-current text-[#1a2b6c] dark:text-cyan-400" viewBox="0 0 24 24">
                    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
                  </svg>
                  <span>Test Kiosk</span>
                </button>

              </div>
              
              <button on:click={() => onOpenShareModal(survey)} class="w-full bg-slate-100 dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 font-bold py-2.5 px-4 text-xs rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-all flex items-center justify-center space-x-2">
                <svg class="w-4 h-4 fill-current text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
                </svg>
                <span>Deploy & Share Form</span>
              </button>

            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>