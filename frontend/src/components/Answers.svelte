<script>
  export let responses = [];
  export let surveys = [];

  let selectedFilterSurveyId = surveys[0]?._id || "";

  $: selectedSurveyObj = surveys.find(s => s._id === selectedFilterSurveyId);
  $: filteredResponses = responses.filter(r => r.surveyTitle === (selectedSurveyObj?.title || ""));

  function exportToExcel() {
    if (!selectedSurveyObj || filteredResponses.length === 0) return;

    let headers = ["Record ID", "Submission Timestamp"];
    selectedSurveyObj.questions.forEach(q => {
      headers.push(q.questionText);
    });

    let rows = filteredResponses.map(r => {
      let rowData = [r._id || 'N/A', r.timestamp];
      selectedSurveyObj.questions.forEach(q => {
        let answerObj = r.answers.find(ans => ans.questionText === q.questionText);
        rowData.push(answerObj ? answerObj.value : "N/A");
      });
      return rowData;
    });

    let csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedSurveyObj.title.replace(/\s+/g, "_")}_Data_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
</script>

<div class="w-full h-[calc(100vh-5rem)] flex gap-8 animate-fade overflow-hidden box-border">
  
  <!-- LEFT COLUMN: FILTER CONTROLS TRAY PANEL -->
  <div class="w-72 bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shrink-0 flex flex-col gap-4 h-full box-border shadow-xl">
    <div>
      <h3 class="text-xs font-bold text-white uppercase tracking-wider">Select Target Form</h3>
      <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">Choose an active form sequence below to populate targeted structural feedback metrics.</p>
    </div>

    <div class="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
      {#each surveys as survey}
        <button 
          on:click={() => selectedFilterSurveyId = survey._id}
          class="w-full text-left border px-4 py-3 rounded-xl transition-all duration-150 flex flex-col gap-1 active:scale-[0.98] group {selectedFilterSurveyId === survey._id ? 'bg-cyan-600/10 border-cyan-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'}">
          <span class="text-xs font-bold transition-colors truncate {selectedFilterSurveyId === survey._id ? 'text-cyan-400' : 'text-slate-300 group-hover:text-cyan-400'}">
            {survey.title}
          </span>
          <span class="text-[10px] text-slate-500 font-medium uppercase font-mono tracking-wider">
            {responses.filter(r => r.surveyTitle === survey.title).length} Logs
          </span>
        </button>
      {/each}
    </div>
  </div>

  <!-- RIGHT COLUMN: THE DETAILED FILTERED DATA GRID -->
  <div class="flex-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col h-full overflow-hidden box-border shadow-xl">
    <div class="flex items-center justify-between border-b border-slate-800/40 pb-4 shrink-0 gap-4">
      <div>
        <h2 class="text-lg font-bold text-white tracking-tight border-l-2 border-cyan-500 pl-3">
          {selectedSurveyObj ? selectedSurveyObj.title : 'No Layout Selected'}
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">Isolating spreadsheet matrices representing active remote client hardware endpoints.</p>
      </div>

      <button 
        on:click={exportToExcel}
        disabled={filteredResponses.length === 0}
        class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-600/10 flex items-center space-x-1.5 shrink-0 disabled:opacity-20 disabled:cursor-not-allowed">
        <span>📥</span> <span>Export to Spreadsheet (.csv)</span>
      </button>
    </div>

    <div class="flex-1 overflow-auto mt-6 border border-slate-800 rounded-xl bg-slate-950/40 custom-scrollbar box-border mb-4">
      {#if !selectedSurveyObj || filteredResponses.length === 0}
        <div class="p-16 text-center text-slate-500 text-xs">
          No submission logs found for the selected form configuration model. Try completing entries via Live Kiosk Mode first!
        </div>
      {:else}
        <table class="w-full border-collapse text-left text-xs text-slate-300 whitespace-nowrap min-w-full">
          <thead class="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="p-4 pl-5 border-r border-slate-800/60 w-24">ID Token</th>
              <th class="p-4 border-r border-slate-800/60 w-32">Timestamp</th>
              {#each selectedSurveyObj.questions as question}
                <th class="p-4 border-r border-slate-800/60 max-w-xs truncate">{question.questionText}</th>
              {/each}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            {#each filteredResponses as response}
              <tr class="hover:bg-slate-950/60 transition-all">
                <td class="p-4 pl-5 font-mono text-cyan-400 font-semibold border-r border-slate-800/40 bg-slate-950/10 truncate max-w-[100px]">
                  {response._id ? response._id.slice(-6) : 'Log'}
                </td>
                <td class="p-4 text-slate-500 border-r border-slate-800/40">
                  {response.timestamp}
                </td>
                {#each selectedSurveyObj.questions as question}
                  <td class="p-4 border-r border-slate-800/40 text-slate-200">
                    {#if (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('Stars') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('⭐')}
                      <span class="text-amber-400 font-bold bg-amber-950/40 border border-amber-900/40 px-2.5 py-1 rounded-lg">
                        {response.answers.find(a => a.questionText === question.questionText)?.value || 'N/A'}
                      </span>
                    {:else if (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('Poor') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('Angry') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('😞') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('🤬')}
                      <span class="text-rose-400 font-bold bg-rose-950/40 border border-rose-900/40 px-2.5 py-1 rounded-lg">
                        {response.answers.find(a => a.questionText === question.questionText)?.value || 'N/A'}
                      </span>
                    {:else if (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('Great') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('Satisfied') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('Delighted') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('😊') || (response.answers.find(a => a.questionText === question.questionText)?.value || '').includes('🤩')}
                      <span class="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1 rounded-lg">
                        {response.answers.find(a => a.questionText === question.questionText)?.value || 'N/A'}
                      </span>
                    {:else}
                      <span class="text-slate-300 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg">
                        {response.answers.find(a => a.questionText === question.questionText)?.value || 'N/A'}
                      </span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>

</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
</style>