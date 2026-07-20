<script>
  export let responses = [];
  export let surveys = [];
  export let onRefreshData = () => {};

  const API_BASE = "/api";

  let selectedFilterSurveyId = surveys[0]?._id || "";
  let activeViewMode = "analytics";
  let startDate = "";
  let endDate = "";
  let activePreset = "ALL";

  // Active question focus for full-screen expanded mode
  let focusedQuestion = null;

  const SLICE_COLORS = [
    '#10b981', // emerald-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#f43f5e'  // rose-500
  ];

  $: selectedSurveyObj = surveys.find((s) => s._id === selectedFilterSurveyId);

  $: displayedQuestions = selectedSurveyObj ? selectedSurveyObj.questions : [];

  $: filteredResponses = responses.filter((r) => {
    if (r.surveyTitle !== (selectedSurveyObj?.title || "")) return false;

    if (startDate || endDate) {
      const responseTime = new Date(r.timestamp).getTime();
      if (startDate && responseTime < new Date(`${startDate}T00:00:00`).getTime()) return false;
      if (endDate && responseTime > new Date(`${endDate}T23:59:59`).getTime()) return false;
    }

    return true;
  });

  function applyDatePreset(presetKey) {
    activePreset = presetKey;
    const now = new Date();

    if (presetKey === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      startDate = todayStr;
      endDate = todayStr;
    } else if (presetKey === '7DAYS') {
      const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = past7Days.toISOString().split('T')[0];
      endDate = "";
    } else if (presetKey === '30DAYS') {
      const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = past30Days.toISOString().split('T')[0];
      endDate = "";
    } else {
      startDate = "";
      endDate = "";
    }
  }

  function clearFilters() {
    startDate = "";
    endDate = "";
    activePreset = "ALL";
  }

  async function deleteSingleResponse(responseId) {
    if (!confirm("Are you sure you want to delete this response entry?")) return;
    responses = responses.filter((r) => r._id !== responseId);

    try {
      await fetch(`${API_BASE}/responses/${responseId}`, { method: "DELETE" });
      await onRefreshData();
    } catch (err) {
      console.warn("Backend link delay, local state cleared.");
    }
  }

  async function clearAllSurveyResponses() {
    if (!selectedSurveyObj) return;
    if (!confirm(`Are you sure you want to permanently delete ALL submission logs for "${selectedSurveyObj.title}"?`)) return;

    const targetTitle = selectedSurveyObj.title;
    responses = responses.filter((r) => r.surveyTitle !== targetTitle);

    try {
      await fetch(`${API_BASE}/responses/clear-by-title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: targetTitle })
      });
      await onRefreshData();
    } catch (err) {
      console.warn("Backend link delay, local state cleared.");
    }
  }

  function exportToExcel(specificQuestion = null) {
    if (!selectedSurveyObj || filteredResponses.length === 0) return;

    let targetQuestions = specificQuestion ? [specificQuestion] : displayedQuestions;
    let headers = ["Record ID", "Submission Timestamp"];
    targetQuestions.forEach((q) => headers.push(q.questionText));

    let rows = filteredResponses.map((r) => {
      let rowData = [r._id || "N/A", new Date(r.timestamp).toLocaleString()];
      targetQuestions.forEach((q) => {
        let answerObj = r.answers.find((ans) => ans.questionText === q.questionText);
        rowData.push(answerObj ? answerObj.value : "N/A");
      });
      return rowData;
    });

    let csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

    const fileName = specificQuestion 
      ? `${specificQuestion.questionText.replace(/\s+/g, "_")}_Filtered_Field.csv`
      : `${selectedSurveyObj.title.replace(/\s+/g, "_")}_Full_Matrix.csv`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getQuestionAnalytics(question) {
    const total = filteredResponses.length;
    if (total === 0) return { counts: {}, total: 0, breakdowns: [], conicGradient: "conic-gradient(#1e293b 0% 100%)", rawAnswersList: [] };

    const counts = {};
    const rawAnswersList = [];

    filteredResponses.forEach((r) => {
      const ans = r.answers.find((a) => a.questionText === question.questionText);
      const val = ans ? ans.value : "No Response";
      counts[val] = (counts[val] || 0) + 1;
      rawAnswersList.push({
        id: r._id,
        value: val,
        timestamp: r.timestamp
      });
    });

    const sortedKeys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    let currentAngle = 0;
    const breakdowns = sortedKeys.map((key, idx) => {
      const count = counts[key];
      const percentage = ((count / total) * 100).toFixed(1);
      const color = SLICE_COLORS[idx % SLICE_COLORS.length];
      
      const startDeg = currentAngle;
      const sliceDeg = (count / total) * 360;
      currentAngle += sliceDeg;
      const endDeg = currentAngle;

      return { label: key, count, percentage, color, startDeg, endDeg };
    });

    const gradientParts = breakdowns.map((b) => `${b.color} ${b.startDeg}deg ${b.endDeg}deg`);
    const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

    return { counts, total, breakdowns, conicGradient, rawAnswersList };
  }

  function isPieChartType(qType) {
    if (!qType) return false;
    const normalized = String(qType).toUpperCase().replace(/_/g, '-');
    return ['SMILEY', 'STARS', 'MULTIPLE-CHOICE', 'MULTIPLECHOICE', 'CHOICE', 'RATING'].includes(normalized);
  }

  function openQuestionModal(q) {
    focusedQuestion = q;
  }

  function closeQuestionModal() {
    focusedQuestion = null;
  }
</script>

<div class="w-full h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-6 animate-fade overflow-hidden box-border">
  
  <!-- LEFT COLUMN -->
  <div class="w-full lg:w-72 bg-slate-900 border border-slate-800/80 rounded-2xl p-5 shrink-0 flex flex-col gap-4 h-full box-border shadow-xl">
    <div>
      <h3 class="text-xs font-bold text-white uppercase tracking-wider">Select Target Form</h3>
      <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">
        Choose an active form sequence to analyze metrics and export targeted logs.
      </p>
    </div>

    <div class="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-40 lg:max-h-none">
      {#each surveys as survey}
        <button
          on:click={() => {
            selectedFilterSurveyId = survey._id;
            clearFilters();
          }}
          class="w-full text-left border px-4 py-3 rounded-xl transition-all duration-150 flex flex-col gap-1 active:scale-[0.98] group {selectedFilterSurveyId === survey._id ? 'bg-cyan-600/10 border-cyan-500 text-white shadow-md' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400 hover:text-slate-200'}"
        >
          <span class="text-xs font-bold transition-colors truncate {selectedFilterSurveyId === survey._id ? 'text-cyan-400' : 'text-slate-300 group-hover:text-cyan-400'}">
            {survey.title}
          </span>
          <span class="text-[10px] text-slate-500 font-medium uppercase font-mono tracking-wider">
            {responses.filter((r) => r.surveyTitle === survey.title).length} Logs
          </span>
        </button>
      {/each}
    </div>

    <div class="pt-4 border-t border-slate-800/80 space-y-3 shrink-0">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Filters</span>
        {#if startDate || endDate || activePreset !== 'ALL'}
          <button on:click={clearFilters} class="text-[10px] font-bold text-rose-400 hover:underline">
            Reset Filters
          </button>
        {/if}
      </div>

      <!-- QUICK PRESET BUTTONS -->
      <div class="space-y-1">
        <span class="text-[10px] text-slate-500 font-bold uppercase block">Quick Date Ranges</span>
        <div class="grid grid-cols-4 gap-1">
          <button
            on:click={() => applyDatePreset('ALL')}
            class="py-1 px-1.5 rounded-md text-[10px] font-bold transition-all border {activePreset === 'ALL' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
          >
            All
          </button>
          <button
            on:click={() => applyDatePreset('TODAY')}
            class="py-1 px-1.5 rounded-md text-[10px] font-bold transition-all border {activePreset === 'TODAY' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
          >
            Today
          </button>
          <button
            on:click={() => applyDatePreset('7DAYS')}
            class="py-1 px-1.5 rounded-md text-[10px] font-bold transition-all border {activePreset === '7DAYS' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
          >
            7 Days
          </button>
          <button
            on:click={() => applyDatePreset('30DAYS')}
            class="py-1 px-1.5 rounded-md text-[10px] font-bold transition-all border {activePreset === '30DAYS' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
          >
            30 Days
          </button>
        </div>
      </div>

      <!-- DATE ONLY INPUTS -->
      <div class="space-y-2 pt-1">
        <div class="space-y-1">
          <label for="start-date" class="text-[10px] text-slate-500 font-bold uppercase">From Date</label>
          <input
            id="start-date"
            type="date"
            bind:value={startDate}
            on:change={() => (activePreset = 'CUSTOM')}
            class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
          />
        </div>
        <div class="space-y-1">
          <label for="end-date" class="text-[10px] text-slate-500 font-bold uppercase">To Date</label>
          <input
            id="end-date"
            type="date"
            bind:value={endDate}
            on:change={() => (activePreset = 'CUSTOM')}
            class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- RIGHT COLUMN -->
  <div class="flex-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 flex flex-col h-full overflow-hidden box-border shadow-xl">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/40 pb-4 shrink-0 gap-4">
      <div>
        <h2 class="text-lg font-bold text-white tracking-tight border-l-2 border-cyan-500 pl-3">
          {selectedSurveyObj ? selectedSurveyObj.title : 'No Layout Selected'}
        </h2>
        <p class="text-xs text-slate-400 mt-0.5">
          Showing <span class="text-cyan-400 font-bold">{filteredResponses.length}</span> matching submission records. Click any question card to open full-screen focus view.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="bg-slate-950 p-1 border border-slate-800 rounded-xl flex items-center space-x-1">
          <button
            on:click={() => (activeViewMode = "analytics")}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activeViewMode === 'analytics' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            📊 Analytics
          </button>
          <button
            on:click={() => (activeViewMode = "table")}
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all {activeViewMode === 'table' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}"
          >
            📋 Log Matrix
          </button>
        </div>

        <button
          on:click={() => exportToExcel()}
          disabled={filteredResponses.length === 0}
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-600/10 flex items-center space-x-1 disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <span>📥</span> <span>Export CSV</span>
        </button>

        <button
          on:click={clearAllSurveyResponses}
          disabled={filteredResponses.length === 0}
          class="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs py-2 px-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed"
          title="Delete all submission logs for this form"
        >
          <span>🗑️ Clear All</span>
        </button>
      </div>
    </div>

    <!-- MAIN GRID -->
    <div class="flex-1 overflow-y-auto mt-6 custom-scrollbar pr-1 box-border">
      {#if !selectedSurveyObj || filteredResponses.length === 0}
        <div class="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-500 text-xs">
          No submission records match your active search filter parameters.
        </div>

      {:else if activeViewMode === "analytics"}
        <div class="grid grid-cols-1 {displayedQuestions.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'md:grid-cols-2'} gap-6 pb-6">
          {#each displayedQuestions as question}
            {@const stats = getQuestionAnalytics(question)}
            {@const isPieEligible = isPieChartType(question.type)}
            
            <div 
              on:click={() => openQuestionModal(question)}
              class="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 space-y-4 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-cyan-500/10 hover:-translate-y-0.5 group"
            >
              <div class="flex items-start justify-between gap-3 border-b border-slate-800/60 pb-3">
                <div class="space-y-1">
                  <span class="text-[10px] font-bold text-cyan-400 group-hover:text-cyan-300 uppercase font-mono tracking-wider flex items-center space-x-1.5">
                    <span>Field #{selectedSurveyObj.questions.findIndex(q => q.questionText === question.questionText) + 1} • {question.type}</span>
                    <span class="text-slate-500 text-[10px]">🔍 Click to enlarge</span>
                  </span>
                  <h4 class="text-sm font-bold text-white group-hover:text-cyan-100 transition-colors">{question.questionText}</h4>
                </div>
                <span class="text-xs font-bold bg-slate-900 px-2.5 py-1 rounded-md text-slate-400 border border-slate-800 shrink-0">
                  {stats.total} entries
                </span>
              </div>

              {#if isPieEligible}
                <div class="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  <div class="relative shrink-0 flex items-center justify-center">
                    <div
                      class="w-36 h-36 rounded-full shadow-lg transition-all duration-300 border-2 border-slate-800/60"
                      style="background: {stats.conicGradient};"
                    ></div>
                    <div class="absolute w-16 h-16 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center">
                      <span class="text-[10px] font-mono font-bold text-slate-400">{stats.total} Logs</span>
                    </div>
                  </div>

                  <div class="flex-1 space-y-2 w-full">
                    {#each stats.breakdowns as item}
                      <div class="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800/60 px-3 py-1.5 rounded-lg">
                        <div class="flex items-center space-x-2 truncate pr-2">
                          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: {item.color};"></span>
                          <span class="text-slate-200 font-medium truncate">{item.label}</span>
                        </div>
                        <span class="font-mono text-cyan-400 font-bold text-[11px] shrink-0">
                          {item.percentage}% <span class="text-slate-500 text-[10px]">({item.count})</span>
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>

              {:else}
                <div class="space-y-3">
                  {#each stats.breakdowns as item}
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-300 font-semibold truncate max-w-[220px]">{item.label}</span>
                        <span class="font-mono text-cyan-400 font-bold">{item.percentage}% <span class="text-slate-500 text-[10px]">({item.count})</span></span>
                      </div>
                      <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                          style="width: {item.percentage}%"
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

            </div>
          {/each}
        </div>

      {:else}
        <div class="border border-slate-800 rounded-xl bg-slate-950/40 box-border overflow-x-auto mb-4">
          <table class="w-full border-collapse text-left text-xs text-slate-300 whitespace-nowrap min-w-full">
            <thead class="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-sm">
              <tr>
                <th class="p-4 pl-5 border-r border-slate-800/60 w-12 text-center">Action</th>
                <th class="p-4 border-r border-slate-800/60 w-24">ID Token</th>
                <th class="p-4 border-r border-slate-800/60 w-44">Date & Time</th>
                {#each displayedQuestions as question}
                  <th class="p-4 border-r border-slate-800/60 max-w-xs truncate">{question.questionText}</th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              {#each filteredResponses as response}
                <tr class="hover:bg-slate-950/60 transition-all">
                  <td class="p-3 border-r border-slate-800/40 text-center">
                    <button
                      on:click={() => deleteSingleResponse(response._id)}
                      class="text-slate-500 hover:text-rose-400 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 p-1.5 rounded-lg transition-all"
                      title="Delete entry"
                    >
                      🗑️
                    </button>
                  </td>
                  <td class="p-4 font-mono text-cyan-400 font-semibold border-r border-slate-800/40 bg-slate-950/10 truncate max-w-[100px]">
                    {response._id ? response._id.slice(-6) : 'Log'}
                  </td>
                  <td class="p-4 text-slate-400 border-r border-slate-800/40 font-mono text-[11px]">
                    {new Date(response.timestamp).toLocaleString()}
                  </td>
                  {#each displayedQuestions as question}
                    {@const answerVal = response.answers.find((a) => a.questionText === question.questionText)?.value || 'N/A'}
                    <td class="p-4 border-r border-slate-800/40 text-slate-200">
                      <span class="text-slate-300 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg">
                        {answerVal}
                      </span>
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

  </div>
</div>

<!-- FULLSCREEN EXPANDED FOCUS MODE WITH FILTERING & LARGE VISUALS -->
{#if focusedQuestion}
  {@const modalStats = getQuestionAnalytics(focusedQuestion)}
  {@const isPie = isPieChartType(focusedQuestion.type)}

  <div class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-6 md:p-10 flex flex-col justify-between animate-fullscreen-expand overflow-hidden box-border">
    
    <!-- TOP BAR WITH TITLE & CLOSE BUTTON -->
    <div class="flex items-start justify-between border-b border-slate-800 pb-6 shrink-0 gap-4">
      <div class="space-y-2">
        <div class="flex items-center space-x-3">
          <span class="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/80 border border-cyan-800/60 px-3 py-1 rounded-lg">
            {focusedQuestion.type} Focused Inspection
          </span>
          <span class="text-xs font-bold text-slate-500">
            Field #{selectedSurveyObj.questions.findIndex(q => q.questionText === focusedQuestion.questionText) + 1}
          </span>
        </div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">{focusedQuestion.questionText}</h1>
      </div>

      <button 
        on:click={closeQuestionModal} 
        class="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 h-11 w-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-all shadow-xl hover:scale-105 active:scale-95 shrink-0"
        title="Exit Focus View"
      >
        ✕
      </button>
    </div>

    <!-- MIDDLE WORKSPACE: FILTER BAR & ENLARGED CHART -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 my-6 overflow-hidden box-border">
      
      <!-- LEFT: FOCUSED FILTER BAR & STATS -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6 shrink-0 shadow-2xl">
        <div class="space-y-5">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Field Filter Parameters</h3>
            {#if startDate || endDate || activePreset !== 'ALL'}
              <button on:click={clearFilters} class="text-xs font-bold text-rose-400 hover:underline">
                Reset
              </button>
            {/if}
          </div>

          <!-- QUICK DATE PRESETS INSIDE FOCUS MODE -->
          <div class="space-y-2">
            <span class="text-[11px] font-bold text-slate-400 uppercase">Quick Date Ranges</span>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                on:click={() => applyDatePreset('ALL')}
                class="py-2 rounded-xl text-xs font-bold transition-all border {activePreset === 'ALL' ? 'bg-cyan-600 border-cyan-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
              >
                All
              </button>
              <button
                on:click={() => applyDatePreset('TODAY')}
                class="py-2 rounded-xl text-xs font-bold transition-all border {activePreset === 'TODAY' ? 'bg-cyan-600 border-cyan-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
              >
                Today
              </button>
              <button
                on:click={() => applyDatePreset('7DAYS')}
                class="py-2 rounded-xl text-xs font-bold transition-all border {activePreset === '7DAYS' ? 'bg-cyan-600 border-cyan-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
              >
                7 Days
              </button>
              <button
                on:click={() => applyDatePreset('30DAYS')}
                class="py-2 rounded-xl text-xs font-bold transition-all border {activePreset === '30DAYS' ? 'bg-cyan-600 border-cyan-500 text-white shadow-md' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
              >
                30 Days
              </button>
            </div>
          </div>

          <!-- DATE PICKERS INSIDE FOCUS MODE -->
          <div class="space-y-3 pt-2">
            <div class="space-y-1">
              <label for="focus-start-date" class="text-[11px] font-bold text-slate-400 uppercase block">From Date</label>
              <input
                id="focus-start-date"
                type="date"
                bind:value={startDate}
                on:change={() => (activePreset = 'CUSTOM')}
                class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2.5 rounded-xl focus:outline-none focus:border-cyan-500 cursor-pointer"
              />
            </div>
            <div class="space-y-1">
              <label for="focus-end-date" class="text-[11px] font-bold text-slate-400 uppercase block">To Date</label>
              <input
                id="focus-end-date"
                type="date"
                bind:value={endDate}
                on:change={() => (activePreset = 'CUSTOM')}
                class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2.5 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div class="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <span class="text-[10px] uppercase font-mono font-bold text-slate-500">Filtered Entry Count</span>
          <p class="text-2xl font-mono font-bold text-cyan-400">{modalStats.total} Submissions</p>
        </div>
      </div>

      <!-- RIGHT: ENLARGED CHART & DETAILED BREAKDOWNS -->
      <div class="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {#if isPie}
          <!-- ENLARGED PIE CHART & LEGEND -->
          <div class="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-12 overflow-hidden">
            <div class="relative shrink-0 flex items-center justify-center">
              <div
                class="w-56 h-56 lg:w-64 lg:h-64 rounded-full shadow-2xl transition-all duration-500 border-4 border-slate-800/80"
                style="background: {modalStats.conicGradient};"
              ></div>
              <div class="absolute w-28 h-28 lg:w-32 lg:h-32 bg-slate-950 rounded-full border-2 border-slate-800 flex flex-col items-center justify-center shadow-inner">
                <span class="text-xl lg:text-2xl font-bold text-cyan-400 font-mono">{modalStats.total}</span>
                <span class="text-[10px] font-mono text-slate-500 uppercase font-bold">Total Logs</span>
              </div>
            </div>

            <div class="flex-1 w-full space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
              {#each modalStats.breakdowns as item}
                <div class="flex items-center justify-between text-sm bg-slate-950/80 border border-slate-800/80 px-4 py-3 rounded-2xl shadow-sm">
                  <div class="flex items-center space-x-3 truncate pr-2">
                    <span class="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style="background-color: {item.color};"></span>
                    <span class="text-slate-100 font-bold truncate">{item.label}</span>
                  </div>
                  <span class="font-mono text-cyan-400 font-extrabold text-sm shrink-0">
                    {item.percentage}% <span class="text-slate-500 text-xs font-semibold">({item.count})</span>
                  </span>
                </div>
              {/each}
            </div>
          </div>

        {:else}
          <!-- ENLARGED PROGRESS BARS FOR TEXT QUESTIONS -->
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 justify-center flex flex-col">
            {#each modalStats.breakdowns as item}
              <div class="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-100 font-bold truncate max-w-md">{item.label}</span>
                  <span class="font-mono text-cyan-400 font-bold text-sm">{item.percentage}% <span class="text-slate-500 text-xs">({item.count})</span></span>
                </div>
                <div class="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                  <div
                    class="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-700 shadow-sm"
                    style="width: {item.percentage}%"
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

      </div>
    </div>

    <!-- BOTTOM ACTION BAR -->
    <div class="pt-4 border-t border-slate-800 flex items-center justify-between shrink-0 gap-4">
      <button
        on:click={closeQuestionModal}
        class="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700/80 transition-all shadow-md active:scale-95"
      >
        ← Return to Matrix Overview
      </button>

      <button
        on:click={() => exportToExcel(focusedQuestion)}
        class="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center space-x-2"
      >
        <span>📥</span> <span>Export Focused Field CSV</span>
      </button>
    </div>

  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }

  @keyframes fullscreenExpand {
    0% { transform: scale(0.96); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .animate-fullscreen-expand {
    animation: fullscreenExpand 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>