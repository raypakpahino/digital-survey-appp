<script>
  export let responses = [];
  export let surveys = [];
  export let activeSurveyId = "";
  export let onRefreshData = () => {};

  const API_BASE = "/api";

  let activeViewMode = "analytics";
  let startDate = "";
  let endDate = "";
  let activePreset = "ALL";
  
  // MULTI-TABLET FILTERING STATE
  let selectedDevices = [];

  // Active question focus for full-screen expanded mode
  let focusedQuestion = null;

  // NOTIFICATION PANEL STATE
  let isNotificationOpen = false;
  let expandedAlertIds = new Set();

  $: selectedSurveyObj = surveys.find((s) => s._id === activeSurveyId) || surveys[0] || null;

  $: if (surveys.length > 0 && (!activeSurveyId || !surveys.some(s => s._id === activeSurveyId))) {
    activeSurveyId = surveys[0]._id;
  }

  const SLICE_COLORS = [
    '#10b981', // emerald-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#f43f5e'  // rose-500
  ];

  function cleanString(str) {
    return String(str || '').trim().toLowerCase();
  }

  $: displayedQuestions = selectedSurveyObj ? selectedSurveyObj.questions : [];

  $: availableDevices = Array.from(new Set(
    responses
      .filter((r) => selectedSurveyObj && cleanString(r.surveyTitle) === cleanString(selectedSurveyObj.title))
      .map((r) => r.deviceId || "Tablet-A")
  )).sort();

  $: filteredResponses = responses.filter((r) => {
    if (!selectedSurveyObj) return false;
    
    if (cleanString(r.surveyTitle) !== cleanString(selectedSurveyObj.title)) return false;

    if (selectedDevices.length > 0) {
      const respDevice = r.deviceId || "Tablet-A";
      if (!selectedDevices.includes(respDevice)) return false;
    }

    if (startDate || endDate) {
      const responseTime = new Date(r.timestamp).getTime();
      
      if (startDate) {
        const startBoundary = new Date(`${startDate}T00:00:00`).getTime();
        if (responseTime < startBoundary) return false;
      }
      
      if (endDate) {
        const endBoundary = new Date(`${endDate}T23:59:59.999`).getTime();
        if (responseTime > endBoundary) return false;
      }
    }

    return true;
  });

  $: lowRatingAlerts = filteredResponses.filter((r) => {
    return (r.answers || []).some((ans) => {
      const val = String(ans.value || '').toUpperCase();
      return (
        val.includes('ANGRY') || 
        val.includes('SAD') || 
        val.includes('1 STARS') || 
        val.includes('2 STARS') || 
        val === '1 STAR' || 
        val === '2 STARS'
      );
    });
  }).map((r) => {
    const badRatings = (r.answers || []).filter((ans) => {
      const val = String(ans.value || '').toUpperCase();
      return (
        val.includes('ANGRY') || 
        val.includes('SAD') || 
        val.includes('1 STARS') || 
        val.includes('2 STARS') || 
        val === '1 STAR' || 
        val === '2 STARS'
      );
    });

    return {
      responseId: r._id,
      deviceId: r.deviceId || "Tablet-A",
      timestamp: r.timestamp,
      badRatings,
      allAnswers: r.answers || []
    };
  });

  function toggleExpandAlert(id) {
    if (expandedAlertIds.has(id)) {
      expandedAlertIds.delete(id);
    } else {
      expandedAlertIds.add(id);
    }
    expandedAlertIds = expandedAlertIds;
  }

  function toggleDeviceFilter(devId) {
    if (selectedDevices.includes(devId)) {
      selectedDevices = selectedDevices.filter((d) => d !== devId);
    } else {
      selectedDevices = [...selectedDevices, devId];
    }
  }

  function clearDeviceFilters() {
    selectedDevices = [];
  }

  function applyDatePreset(presetKey) {
    activePreset = presetKey;
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (presetKey === 'TODAY') {
      startDate = todayStr;
      endDate = todayStr;
    } else if (presetKey === '7DAYS') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const pYear = past7.getFullYear();
      const pMonth = String(past7.getMonth() + 1).padStart(2, '0');
      const pDay = String(past7.getDate()).padStart(2, '0');
      startDate = `${pYear}-${pMonth}-${pDay}`;
      endDate = todayStr;
    } else if (presetKey === '30DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const pYear = past30.getFullYear();
      const pMonth = String(past30.getMonth() + 1).padStart(2, '0');
      const pDay = String(past30.getDate()).padStart(2, '0');
      startDate = `${pYear}-${pMonth}-${pDay}`;
      endDate = todayStr;
    } else {
      startDate = "";
      endDate = "";
    }
  }

  function clearFilters() {
    startDate = "";
    endDate = "";
    activePreset = "ALL";
    selectedDevices = [];
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
    responses = responses.filter((r) => cleanString(r.surveyTitle) !== cleanString(targetTitle));

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
    let titleText = selectedSurveyObj.title || "Form Matrix";

    function formatValueForExcel(rawVal, qType) {
      if (!rawVal || rawVal === "N/A" || rawVal === "Skipped") return "N/A";

      const valStr = String(rawVal).toUpperCase();
      const normType = String(qType || '').toUpperCase().replace(/_/g, '-');

      if (normType.includes('SMILEY') || valStr.includes('DELIGHTED') || valStr.includes('HAPPY') || valStr.includes('ANGRY')) {
        if (valStr.includes('ANGRY')) return "1";
        if (valStr.includes('SAD')) return "2";
        if (valStr.includes('NEUTRAL')) return "3";
        if (valStr.includes('HAPPY') || valStr.includes('SATISFIED')) return "4";
        if (valStr.includes('DELIGHTED')) return "5";
      }

      if (normType.includes('STARS') || valStr.includes('STARS') || valStr.includes('STAR')) {
        const match = valStr.match(/\d+/);
        if (match) return match[0];
      }

      return rawVal
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/[^\x20-\x7E]/g, '')
        .trim() || rawVal;
    }

    let headers = ["Record ID", "Tablet Site ID", "Submission Timestamp"];
    targetQuestions.forEach((q) => headers.push(q.questionText));

    let rowsHtml = filteredResponses.map((r, index) => {
      let recId = r._id ? r._id.slice(-8) : `LOG-${index + 1}`;
      let tabletId = r.deviceId || "Tablet-A";
      let timestamp = new Date(r.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      let rowCells = [
        `<td style="font-family: 'Consolas', monospace; font-weight: bold; color: #0284c7; text-align: center; padding: 8px 12px;">${recId}</td>`,
        `<td style="font-family: 'Consolas', monospace; font-weight: bold; color: #059669; text-align: center; padding: 8px 12px;">${tabletId}</td>`,
        `<td style="white-space: nowrap; color: #475569; text-align: center; padding: 8px 12px;">${timestamp}</td>`
      ];

      targetQuestions.forEach((q) => {
        let answerObj = (r.answers || []).find((ans) => cleanString(ans.questionText) === cleanString(q.questionText));
        let rawVal = answerObj ? answerObj.value : "N/A";
        let formattedVal = formatValueForExcel(rawVal, q.type);

        let isNumeric = /^[1-5]$/.test(formattedVal);
        let alignStyle = isNumeric ? "text-align: center; font-weight: bold; color: #0f172a;" : "text-align: left; color: #334155;";

        rowCells.push(`<td style="padding: 8px 12px; ${alignStyle}">${formattedVal}</td>`);
      });

      let bgColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `<tr style="background-color: ${bgColor};">${rowCells.join('')}</tr>`;
    }).join('');

    let headerCells = headers.map(h => 
      `<th style="background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 10pt; padding: 10px 14px; text-align: center; border: 1px solid #1e293b; white-space: nowrap;">${h}</th>`
    ).join('');

    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; }
          td { border: 1px solid #cbd5e1; vertical-align: middle; }
        </style>
      </head>
      <body>
        <h2 style="font-family: 'Segoe UI', Arial, sans-serif; color: #0284c7; font-weight: bold; font-size: 14pt; margin-bottom: 2px;">${titleText} — Response Matrix</h2>
        <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #64748b; font-size: 8pt; margin-top: 0; margin-bottom: 10px;">Generated Report Timestamp: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const fileName = specificQuestion 
      ? `${titleText.replace(/[^\w\s]/gi, '').replace(/\s+/g, "_")}_${specificQuestion.questionText.replace(/[^\w\s]/gi, '').replace(/\s+/g, "_")}_Field_Report.xls`
      : `${titleText.replace(/[^\w\s]/gi, '').replace(/\s+/g, "_")}_Response_Matrix.xls`;

    const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getQuestionAnalytics(question, sourceDataset) {
    const validEntries = sourceDataset.filter((r) => {
      const ans = (r.answers || []).find((a) => cleanString(a.questionText) === cleanString(question.questionText));
      return ans && ans.value !== undefined && ans.value !== "" && ans.value !== "No Response";
    });

    const total = validEntries.length;

    if (total === 0) {
      return { counts: {}, total: 0, breakdowns: [], conicGradient: "conic-gradient(#1e293b 0% 100%)", rawAnswersList: [] };
    }

    const counts = {};
    const rawAnswersList = [];

    validEntries.forEach((r) => {
      const ans = (r.answers || []).find((a) => cleanString(a.questionText) === cleanString(question.questionText));
      const val = ans ? ans.value : "Skipped";
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

<div class="w-full h-auto lg:h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4 lg:gap-5 animate-fade overflow-y-auto lg:overflow-hidden box-border p-1 relative">
  
  <!-- LEFT SIDE CONTROL PANEL (FIXED SIDEBAR ON LAPTOP & DESKTOP) -->
  <div class="w-full lg:w-64 bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 box-border shadow-lg">
    
    <!-- TARGET FORM SELECTOR -->
    <div class="flex-1 space-y-2">
      <div>
        <h3 class="text-[11px] font-bold text-white uppercase tracking-wider">Select Target Form</h3>
        <p class="text-[10px] text-slate-400 mt-0.5 leading-tight hidden lg:block">
          Choose a form sequence to analyze metrics and export logs.
        </p>
      </div>

      <div class="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto custom-scrollbar max-h-32 lg:max-h-48 pb-1 lg:pb-0">
        {#each surveys as survey}
          <button
            on:click={() => {
              activeSurveyId = survey._id;
              clearFilters();
            }}
            class="min-w-[130px] lg:w-full text-left border px-3 py-2 rounded-xl transition-all duration-150 flex flex-col gap-0.5 active:scale-[0.98] group shrink-0 {activeSurveyId === survey._id ? 'bg-cyan-600/10 border-cyan-500 text-white shadow-sm' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400'}"
          >
            <span class="text-xs font-bold transition-colors truncate {activeSurveyId === survey._id ? 'text-cyan-400' : 'text-slate-300 group-hover:text-cyan-400'}">
              {survey.title}
            </span>
            <span class="text-[9px] text-slate-500 font-medium uppercase font-mono tracking-wider">
              {responses.filter((r) => cleanString(r.surveyTitle) === cleanString(survey.title)).length} Logs
            </span>
          </button>
        {/each}
      </div>
    </div>

    <!-- TABLET DEVICE FILTERING SECTION -->
    <div class="flex-1 pt-2 sm:pt-0 lg:pt-2 border-t sm:border-t-0 lg:border-t sm:border-l lg:border-l-0 sm:pl-3 lg:pl-0 border-slate-800/80 space-y-1.5 shrink-0">
      <div class="flex items-center justify-between">
        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tablet Site Filter</span>
        {#if selectedDevices.length > 0}
          <button on:click={clearDeviceFilters} class="text-[9px] font-bold text-rose-400 hover:underline">
            All Tablets
          </button>
        {/if}
      </div>

      <div class="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto custom-scrollbar pt-0.5">
        {#if availableDevices.length === 0}
          <span class="text-[9px] text-slate-500 font-mono col-span-2">No device logs available</span>
        {:else}
          {#each availableDevices as devId}
            {@const isSelected = selectedDevices.includes(devId)}
            <button
              on:click={() => toggleDeviceFilter(devId)}
              class="w-full px-2 py-1 rounded-lg text-[9px] font-mono font-bold transition-all border flex items-center justify-between shadow-xs active:scale-95 truncate {isSelected ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}"
              title={devId}
            >
              <span class="truncate pr-0.5">🏷️ {devId}</span>
              {#if isSelected}<span class="shrink-0 text-emerald-400">✓</span>{/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- DATE FILTERS PANEL -->
    <div class="flex-1 pt-2 sm:pt-0 lg:pt-2 border-t sm:border-t-0 lg:border-t border-slate-800/80 space-y-2 shrink-0">
      <div class="flex items-center justify-between">
        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date Filters</span>
        {#if startDate || endDate || activePreset !== 'ALL'}
          <button on:click={clearFilters} class="text-[9px] font-bold text-rose-400 hover:underline">
            Reset
          </button>
        {/if}
      </div>

      <!-- QUICK PRESET BUTTONS -->
      <div class="space-y-1">
        <span class="text-[9px] text-slate-500 font-bold uppercase block">Quick Ranges</span>
        <div class="grid grid-cols-4 gap-1">
          <button
            on:click={() => applyDatePreset('ALL')}
            class="py-1 px-0.5 rounded-md text-[9px] font-bold transition-all border {activePreset === 'ALL' ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-400'}"
          >
            All
          </button>
          <button
            on:click={() => applyDatePreset('TODAY')}
            class="py-1 px-0.5 rounded-md text-[9px] font-bold transition-all border {activePreset === 'TODAY' ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-400'}"
          >
            Today
          </button>
          <button
            on:click={() => applyDatePreset('7DAYS')}
            class="py-1 px-0.5 rounded-md text-[9px] font-bold transition-all border {activePreset === '7DAYS' ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-400'}"
          >
            7 Days
          </button>
          <button
            on:click={() => applyDatePreset('30DAYS')}
            class="py-1 px-0.5 rounded-md text-[9px] font-bold transition-all border {activePreset === '30DAYS' ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs' : 'bg-slate-950 border-slate-800 text-slate-400'}"
          >
            30 Days
          </button>
        </div>
      </div>

      <!-- DATE ONLY INPUTS -->
      <div class="grid grid-cols-2 lg:grid-cols-1 gap-1.5 pt-0.5">
        <div class="space-y-0.5">
          <label for="start-date" class="text-[9px] text-slate-500 font-bold uppercase">From Date</label>
          <input
            id="start-date"
            type="date"
            bind:value={startDate}
            on:change={() => (activePreset = 'CUSTOM')}
            class="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-200 px-2 py-1 rounded-md focus:outline-none focus:border-cyan-500 cursor-pointer"
          />
        </div>
        <div class="space-y-0.5">
          <label for="end-date" class="text-[9px] text-slate-500 font-bold uppercase">To Date</label>
          <input
            id="end-date"
            type="date"
            bind:value={endDate}
            on:change={() => (activePreset = 'CUSTOM')}
            class="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-200 px-2 py-1 rounded-md focus:outline-none focus:border-cyan-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- RIGHT MAIN ANALYTICS WORKSPACE -->
  <div class="flex-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 flex flex-col h-full overflow-hidden box-border shadow-lg">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/40 pb-3 shrink-0 gap-2">
      <div>
        <h2 class="text-sm sm:text-base font-bold text-white tracking-tight border-l-2 border-cyan-500 pl-2.5">
          {selectedSurveyObj ? selectedSurveyObj.title : 'No Layout Selected'}
        </h2>
        <p class="text-[11px] text-slate-400 mt-0.5">
          Showing <span class="text-cyan-400 font-bold">{filteredResponses.length}</span> matching submission records 
          {#if selectedDevices.length > 0}
            (Filtered by: <span class="text-emerald-400 font-mono font-bold">{selectedDevices.join(', ')}</span>)
          {/if}.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-1.5">
        
        <!-- LOW RATING NOTIFICATION BELL BUTTON -->
        <button
          on:click={() => (isNotificationOpen = !isNotificationOpen)}
          class="relative bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 p-2 rounded-lg transition-all active:scale-95 flex items-center justify-center shadow-xs"
          title="View Low Rating Notifications"
        >
          <span class="text-sm">🔔</span>
          {#if lowRatingAlerts.length > 0}
            <span class="absolute -top-1 -right-1 bg-rose-600 text-white font-mono font-bold text-[9px] h-4 min-w-[1.1rem] px-0.5 rounded-full flex items-center justify-center animate-pulse border border-slate-900">
              {lowRatingAlerts.length}
            </span>
          {/if}
        </button>

        <div class="bg-slate-950 p-0.5 border border-slate-800 rounded-lg flex items-center space-x-1">
          <button
            on:click={() => (activeViewMode = "analytics")}
            class="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all {activeViewMode === 'analytics' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
          >
            📊 Analytics
          </button>
          <button
            on:click={() => (activeViewMode = "table")}
            class="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all {activeViewMode === 'table' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
          >
            📋 Log Matrix
          </button>
        </div>

        <button
          on:click={() => exportToExcel()}
          disabled={filteredResponses.length === 0}
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 px-2.5 rounded-lg transition-all active:scale-[0.98] flex items-center space-x-1 disabled:opacity-20"
        >
          <span>📥</span> <span>Export CSV</span>
        </button>

        <button
          on:click={clearAllSurveyResponses}
          disabled={filteredResponses.length === 0}
          class="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-[11px] py-1.5 px-2.5 rounded-lg transition-all active:scale-[0.98] disabled:opacity-20"
          title="Delete all submission logs for this form"
        >
          <span>🗑️ Clear All</span>
        </button>
      </div>
    </div>

    <!-- MAIN GRID CARDS (2 COLUMNS ON LAPTOPS) -->
    <div class="flex-1 overflow-y-auto mt-3 custom-scrollbar pr-1 box-border">
      {#if !selectedSurveyObj || filteredResponses.length === 0}
        <div class="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
          No submission records match your active search filter parameters.
        </div>

      {:else if activeViewMode === "analytics"}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 pb-4">
          {#each displayedQuestions as question}
            {@const stats = getQuestionAnalytics(question, filteredResponses)}
            {@const isPieEligible = isPieChartType(question.type)}
            
            <div 
              on:click={() => openQuestionModal(question)}
              class="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs cursor-pointer transition-all duration-200 group"
            >
              <div class="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
                <div class="space-y-0.5">
                  <span class="text-[9px] font-bold text-cyan-400 uppercase font-mono tracking-wider flex items-center space-x-1">
                    <span>Field #{selectedSurveyObj.questions.findIndex(q => cleanString(q.questionText) === cleanString(question.questionText)) + 1} • {question.type}</span>
                    <span class="text-slate-500 text-[9px] hidden sm:inline">🔍 Click to enlarge</span>
                  </span>
                  <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-100 transition-colors leading-snug">{question.questionText}</h4>
                </div>
                <span class="text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800 shrink-0">
                  {stats.total} {stats.total === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {#if isPieEligible}
                <div class="flex flex-row items-center gap-3 sm:gap-4 pt-0.5">
                  <div class="relative shrink-0 flex items-center justify-center">
                    <div
                      class="w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-md transition-all duration-300 border border-slate-800/60"
                      style="background: {stats.conicGradient};"
                    ></div>
                    <div class="absolute w-10 h-10 sm:w-12 sm:h-12 bg-slate-950 rounded-full border border-slate-800 flex items-center justify-center">
                      <span class="text-[9px] font-mono font-bold text-slate-400">{stats.total} Logs</span>
                    </div>
                  </div>

                  <div class="flex-1 space-y-1 w-full">
                    {#each stats.breakdowns as item}
                      <div class="flex items-center justify-between text-[11px] bg-slate-900/80 border border-slate-800/60 px-2.5 py-1 rounded-md">
                        <div class="flex items-center space-x-1.5 truncate pr-1">
                          <span class="w-2 h-2 rounded-full shrink-0" style="background-color: {item.color};"></span>
                          <span class="text-slate-200 font-medium truncate text-[10px] sm:text-[11px]">{item.label}</span>
                        </div>
                        <span class="font-mono text-cyan-400 font-bold text-[10px] shrink-0">
                          {item.percentage}% <span class="text-slate-500 text-[9px]">({item.count})</span>
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>

              {:else}
                <div class="space-y-2">
                  {#each stats.breakdowns as item}
                    <div class="space-y-0.5">
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-300 font-semibold truncate max-w-[160px] sm:max-w-[200px]">{item.label}</span>
                        <span class="font-mono text-cyan-400 font-bold text-[10px]">{item.percentage}% <span class="text-slate-500 text-[9px]">({item.count})</span></span>
                      </div>
                      <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
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
        <div class="border border-slate-800 rounded-xl bg-slate-950/40 box-border overflow-x-auto mb-3">
          <table class="w-full border-collapse text-left text-xs text-slate-300 whitespace-nowrap min-w-full">
            <thead class="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-xs">
              <tr>
                <th class="p-2.5 pl-3 border-r border-slate-800/60 w-10 text-center">Action</th>
                <th class="p-2.5 border-r border-slate-800/60 w-20">ID Token</th>
                <th class="p-2.5 border-r border-slate-800/60 w-28">Tablet Site</th>
                <th class="p-2.5 border-r border-slate-800/60 w-36">Date & Time</th>
                {#each displayedQuestions as question}
                  <th class="p-2.5 border-r border-slate-800/60 max-w-xs truncate">{question.questionText}</th>
                {/each}
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              {#each filteredResponses as response}
                <tr class="hover:bg-slate-950/60 transition-all">
                  <td class="p-2 border-r border-slate-800/40 text-center">
                    <button
                      on:click={() => deleteSingleResponse(response._id)}
                      class="text-slate-500 hover:text-rose-400 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 p-1 rounded-md transition-all"
                      title="Delete entry"
                    >
                      🗑️
                    </button>
                  </td>
                  <td class="p-2.5 font-mono text-cyan-400 font-semibold border-r border-slate-800/40 truncate max-w-[90px]">
                    {response._id ? response._id.slice(-6) : 'Log'}
                  </td>
                  <td class="p-2.5 border-r border-slate-800/40">
                    <span class="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-mono font-bold px-1.5 py-0.5 rounded text-[10px]">
                      🏷️ {response.deviceId || 'Tablet-A'}
                    </span>
                  </td>
                  <td class="p-2.5 text-slate-400 border-r border-slate-800/40 font-mono text-[10px]">
                    {new Date(response.timestamp).toLocaleString()}
                  </td>
                  {#each displayedQuestions as question}
                    {@const answerVal = (response.answers || []).find((a) => cleanString(a.questionText) === cleanString(question.questionText))?.value || 'N/A'}
                    <td class="p-2.5 border-r border-slate-800/40 text-slate-200">
                      <span class="text-slate-300 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded">
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

<!-- LOW RATING NOTIFICATION POPUP DRAWER -->
{#if isNotificationOpen}
  <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end animate-fade">
    <div class="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between shadow-2xl space-y-4 box-border overflow-y-auto custom-scrollbar">
      
      <div class="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
        <div class="flex items-center space-x-2.5">
          <div class="h-9 w-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-lg text-rose-400 shadow-md">
            🚨
          </div>
          <div>
            <h2 class="text-base font-black text-white tracking-tight">Low Rating Incident Log</h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Found <strong class="text-rose-400 font-mono">{lowRatingAlerts.length}</strong> flagged submissions for 
              <strong class="text-cyan-400">{selectedSurveyObj?.title || 'Form'}</strong>
            </p>
          </div>
        </div>

        <button
          on:click={() => (isNotificationOpen = false)}
          class="text-slate-400 hover:text-white bg-slate-950 border border-slate-800 p-2 rounded-lg transition-all active:scale-95"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
        {#if lowRatingAlerts.length === 0}
          <div class="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            🎉 No below-average ratings recorded for this form!
          </div>
        {:else}
          {#each lowRatingAlerts as alert}
            {@const isExpanded = expandedAlertIds.has(alert.responseId)}

            <div class="bg-slate-950 border border-rose-900/50 hover:border-rose-700/80 p-4 rounded-xl space-y-3 shadow-md transition-all">
              
              <div class="flex items-center justify-between border-b border-slate-900 pb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                    🏷️ {alert.deviceId}
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">
                    ID: {alert.responseId ? alert.responseId.slice(-6) : 'Log'}
                  </span>
                </div>
                <span class="text-[10px] font-mono text-slate-400 font-semibold">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
              </div>

              <div class="space-y-1.5">
                <span class="text-[9px] font-bold text-rose-400 uppercase tracking-widest block font-mono">Flagged Issue:</span>
                {#each alert.badRatings as bad}
                  <div class="text-xs font-bold text-rose-200 bg-rose-950/60 border border-rose-800/60 px-3 py-2 rounded-lg flex items-center justify-between shadow-inner">
                    <span class="truncate pr-2">{bad.questionText}</span>
                    <span class="font-mono text-rose-300 font-black text-xs shrink-0 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/50">{bad.value}</span>
                  </div>
                {/each}
              </div>

              <div class="pt-0.5">
                <button
                  on:click={() => toggleExpandAlert(alert.responseId)}
                  class="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-between"
                >
                  <span>{isExpanded ? "▼ Hide Full Submission" : "▶ Inspect Full Submission"}</span>
                  <span class="text-[10px] text-cyan-400 font-mono">{alert.allAnswers.length} Fields</span>
                </button>

                {#if isExpanded}
                  <div class="mt-2 bg-slate-900/90 border border-slate-800 p-3 rounded-lg space-y-2 animate-fade">
                    <span class="text-[9px] uppercase font-mono font-bold text-cyan-400 block border-b border-slate-800 pb-1">
                      Complete User Submission Breakdown:
                    </span>
                    <div class="space-y-1.5">
                      {#each alert.allAnswers as ans}
                        {@const isBadVal = alert.badRatings.some(b => b.questionText === ans.questionText)}
                        <div class="p-2 rounded text-xs flex flex-row items-center justify-between gap-1 {isBadVal ? 'bg-rose-950/40 border border-rose-900/40 text-rose-200' : 'bg-slate-950/80 border border-slate-800 text-slate-300'}">
                          <span class="font-medium text-slate-300 truncate pr-2">{ans.questionText}:</span>
                          <span class="font-bold font-mono {isBadVal ? 'text-rose-400' : 'text-cyan-300'}">{ans.value || 'N/A'}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

            </div>
          {/each}
        {/if}
      </div>

      <div class="pt-2 border-t border-slate-800 text-center shrink-0">
        <button
          on:click={() => (isNotificationOpen = false)}
          class="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 rounded-lg border border-slate-800 transition-all shadow-md"
        >
          Close Drawer
        </button>
      </div>

    </div>
  </div>
{/if}

<!-- FULLSCREEN FOCUS MODE -->
{#if focusedQuestion}
  {@const modalStats = getQuestionAnalytics(focusedQuestion, filteredResponses)}
  {@const isPie = isPieChartType(focusedQuestion.type)}

  <div class="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl p-4 sm:p-6 flex flex-col justify-between animate-fullscreen-expand overflow-y-auto custom-scrollbar box-border">
    
    <div class="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0 gap-3">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded">
            {focusedQuestion.type} Focused Inspection
          </span>
          <span class="text-xs font-bold text-slate-500">
            Field #{selectedSurveyObj.questions.findIndex(q => cleanString(q.questionText) === cleanString(focusedQuestion.questionText)) + 1}
          </span>
        </div>
        <h1 class="text-lg sm:text-2xl font-extrabold text-white tracking-tight leading-tight">{focusedQuestion.questionText}</h1>
      </div>

      <button 
        on:click={closeQuestionModal} 
        class="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-lg shrink-0"
        title="Exit Focus View"
      >
        ✕
      </button>
    </div>

    <!-- MAIN FOCUS WORKSPACE -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 my-4 overflow-hidden box-border">
      
      <!-- LEFT: FILTER CONTROL PANEL -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4 shrink-0 shadow-xl">
        <div class="space-y-3">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 class="text-xs font-bold text-white uppercase tracking-wider">Field Filter Parameters</h3>
            {#if startDate || endDate || activePreset !== 'ALL'}
              <button on:click={clearFilters} class="text-xs font-bold text-rose-400 hover:underline">
                Reset
              </button>
            {/if}
          </div>

          <div class="space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Quick Date Ranges</span>
            <div class="grid grid-cols-4 gap-1">
              <button
                on:click={() => applyDatePreset('ALL')}
                class="py-1.5 rounded-lg text-xs font-bold transition-all border {activePreset === 'ALL' ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'}"
              >
                All
              </button>
              <button
                on:click={() => applyDatePreset('TODAY')}
                class="py-1.5 rounded-lg text-xs font-bold transition-all border {activePreset === 'TODAY' ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'}"
              >
                Today
              </button>
              <button
                on:click={() => applyDatePreset('7DAYS')}
                class="py-1.5 rounded-lg text-xs font-bold transition-all border {activePreset === '7DAYS' ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'}"
              >
                7 Days
              </button>
              <button
                on:click={() => applyDatePreset('30DAYS')}
                class="py-1.5 rounded-lg text-xs font-bold transition-all border {activePreset === '30DAYS' ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'}"
              >
                30 Days
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-1 gap-2 pt-0.5">
            <div class="space-y-0.5">
              <label for="focus-start-date" class="text-[10px] font-bold text-slate-400 uppercase block">From Date</label>
              <input
                id="focus-start-date"
                type="date"
                bind:value={startDate}
                on:change={() => (activePreset = 'CUSTOM')}
                class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
              />
            </div>
            <div class="space-y-0.5">
              <label for="focus-end-date" class="text-[10px] font-bold text-slate-400 uppercase block">To Date</label>
              <input
                id="focus-end-date"
                type="date"
                bind:value={endDate}
                on:change={() => (activePreset = 'CUSTOM')}
                class="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div class="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-0.5">
          <span class="text-[9px] uppercase font-mono font-bold text-slate-500">Filtered Entry Count</span>
          <p class="text-lg font-mono font-bold text-cyan-400">{modalStats.total} Submissions</p>
        </div>
      </div>

      <!-- RIGHT: ENLARGED CHART -->
      <div class="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-xl">
        
        {#if isPie}
          <div class="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 overflow-hidden">
            <div class="relative shrink-0 flex items-center justify-center">
              <div
                class="w-44 h-44 sm:w-52 sm:h-56 rounded-full shadow-xl transition-all duration-300 border-2 border-slate-800/80"
                style="background: {modalStats.conicGradient};"
              ></div>
              <div class="absolute w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 rounded-full border border-slate-800 flex flex-col items-center justify-center shadow-inner">
                <span class="text-lg sm:text-xl font-bold text-cyan-400 font-mono">{modalStats.total}</span>
                <span class="text-[9px] font-mono text-slate-500 uppercase font-bold">Total Logs</span>
              </div>
            </div>

            <div class="flex-1 w-full space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {#each modalStats.breakdowns as item}
                <div class="flex items-center justify-between text-xs bg-slate-950/80 border border-slate-800/80 px-3 py-2 rounded-xl shadow-xs">
                  <div class="flex items-center space-x-2 truncate pr-2">
                    <span class="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style="background-color: {item.color};"></span>
                    <span class="text-slate-100 font-bold truncate">{item.label}</span>
                  </div>
                  <span class="font-mono text-cyan-400 font-extrabold text-xs shrink-0">
                    {item.percentage}% <span class="text-slate-500 text-[10px] font-semibold">({item.count})</span>
                  </span>
                </div>
              {/each}
            </div>
          </div>

        {:else}
          <div class="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2 justify-center flex flex-col">
            {#each modalStats.breakdowns as item}
              <div class="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-100 font-bold truncate max-w-xs">{item.label}</span>
                  <span class="font-mono text-cyan-400 font-bold text-xs">{item.percentage}% <span class="text-slate-500 text-[10px]">({item.count})</span></span>
                </div>
                <div class="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 p-0.5">
                  <div
                    class="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-500"
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
    <div class="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 gap-3">
      <button
        on:click={closeQuestionModal}
        class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700/80 transition-all shadow-md active:scale-95"
      >
        ← Return
      </button>

      <button
        on:click={() => exportToExcel(focusedQuestion)}
        class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
      >
        <span>📥</span> <span>Export Field CSV</span>
      </button>
    </div>

  </div>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 8px; }

  @keyframes fullscreenExpand {
    0% { transform: scale(0.97); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  .animate-fullscreen-expand {
    animation: fullscreenExpand 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>