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

  // DRAGGABLE RESIZER STATE
  let leftPanelWidth = 280;
  let isResizing = false;

  // DYNAMIC HOVER & RECTANGLE TOOLTIP STATE
  let activeHoveredSlice = null;
  let mousePos = { x: 0, y: 0 };

  function handleSliceMouseEnter(qIdx, item, event) {
    activeHoveredSlice = { qIdx, ...item };
    if (event) {
      mousePos = { x: event.clientX, y: event.clientY };
    }
  }

  function handleSliceMouseMove(event) {
    mousePos = { x: event.clientX, y: event.clientY };
  }

  function handleSliceMouseLeave() {
    activeHoveredSlice = null;
  }

  function startResizing(event) {
    event.preventDefault();
    isResizing = true;
    
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
  }

  function handleMouseMove(event) {
    if (!isResizing) return;
    
    const minWidth = 180;
    const maxWidth = 550;
    const newWidth = event.clientX - 260;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      leftPanelWidth = newWidth;
    }
  }

  function stopResizing() {
    if (!isResizing) return;
    isResizing = false;

    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopResizing);
  }

  $: selectedSurveyObj = surveys.find((s) => s._id === activeSurveyId) || surveys[0] || null;

  $: if (surveys.length > 0 && (!activeSurveyId || !surveys.some(s => s._id === activeSurveyId))) {
    activeSurveyId = surveys[0]._id;
  }

  const SLICE_COLORS = [
    '#06b6d4', // cyan-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#3b82f6', // blue-500
    '#f43f5e', // rose-500
    '#8b5cf6', // violet-500
    '#ec4899'  // pink-500
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

  // GUARANTEED TIMEZONE ATTACHER FOR LOG MATRIX & EXPORT
  function formatTimestampWithTimezone(rawTimestamp) {
    if (!rawTimestamp) return "N/A";
    const strVal = String(rawTimestamp).trim();
    
    // If string already contains WIB, WITA, or WIT, return as-is
    if (/WIB|WITA|WIT/i.test(strVal)) return strVal;

    let zoneLabel = "WIB";
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const tzLower = userTz.toLowerCase();
      if (tzLower.includes('makassar') || tzLower.includes('denpasar') || tzLower.includes('uata')) {
        zoneLabel = "WITA";
      } else if (tzLower.includes('jayapura') || tzLower.includes('wit')) {
        zoneLabel = "WIT";
      }
    } catch (e) {
      zoneLabel = "WIB";
    }

    const dateObj = new Date(rawTimestamp);
    if (!isNaN(dateObj.getTime())) {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
      const dateStr = new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: userTz
      }).format(dateObj);

      return `${dateStr} ${zoneLabel}`;
    }

    // Direct string append fallback for pre-formatted strings
    return `${strVal} ${zoneLabel}`;
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
      let timestamp = formatTimestampWithTimezone(r.timestamp);

      let rowCells = [
        `<td style="font-family: 'Consolas', monospace; font-weight: bold; color: #0284c7; text-align: center; padding: 8px 12px;">${recId}</td>`,
        `<td style="font-family: 'Consolas', monospace; font-weight: bold; color: #059669; text-align: center; padding: 8px 12px;">${tabletId}</td>`,
        `<td style="white-space: nowrap; color: #475569; text-align: center; padding: 8px 12px; mso-number-format:'\\@';">${timestamp}</td>`
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
        <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #64748b; font-size: 8pt; margin-top: 0; margin-bottom: 10px;">Generated Report Timestamp: ${formatTimestampWithTimezone(new Date())}</p>
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
      return { counts: {}, total: 0, breakdowns: [], rawAnswersList: [] };
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

      const startRad = ((startDeg - 90) * Math.PI) / 180;
      const endRad = ((endDeg - 90) * Math.PI) / 180;

      const r = 45;
      const x1 = 50 + r * Math.cos(startRad);
      const y1 = 50 + r * Math.sin(startRad);
      const x2 = 50 + r * Math.cos(endRad);
      const y2 = 50 + r * Math.sin(endRad);

      const largeArc = sliceDeg > 180 ? 1 : 0;
      const svgPath = total === count
        ? "M 50,5 A 45 45 0 1 1 49.99,5 Z"
        : `M 50 50 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return { label: key, count, percentage, color, startDeg, endDeg, svgPath };
    });

    return { counts, total, breakdowns, rawAnswersList };
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

<!-- RECTANGLE HOVER POPUP TOOLTIP -->
{#if activeHoveredSlice}
  <div 
    class="fixed z-50 pointer-events-none bg-slate-950/95 text-white border border-cyan-500/80 px-3 py-2 rounded-xl shadow-2xl backdrop-blur-md font-mono text-xs flex items-center space-x-2.5 transition-all duration-75 transform -translate-x-1/2 -translate-y-12"
    style="left: {mousePos.x}px; top: {mousePos.y}px;"
  >
    <div class="w-3 h-3 rounded-full shrink-0 shadow-sm" style="background-color: {activeHoveredSlice.color};"></div>
    <div class="flex items-center space-x-1.5 whitespace-nowrap">
      <span class="font-bold text-slate-100">{activeHoveredSlice.label}:</span>
      <span class="font-black text-cyan-400">{activeHoveredSlice.count}</span>
      <span class="text-slate-400 font-semibold">({activeHoveredSlice.percentage}%)</span>
    </div>
  </div>
{/if}

<div class="w-full h-auto lg:h-[calc(100vh-5rem)] flex flex-col lg:flex-row animate-fade overflow-y-auto lg:overflow-hidden box-border p-1 relative">
  
  <!-- LEFT SIDE CONTROL PANEL -->
  <div 
    class="w-full bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3 box-border shadow-lg transition-none"
    style="width: {leftPanelWidth}px;"
  >
    
    <!-- TARGET FORM SELECTOR -->
    <div class="flex-1 space-y-2">
      <div>
        <h3 class="text-[11px] font-bold text-white uppercase tracking-wider">Select Target Form</h3>
        <p class="text-[10px] text-slate-400 mt-0.5 leading-tight hidden lg:block">
          Choose an active form sequence to analyze metrics and export logs.
        </p>
      </div>

      <div class="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto custom-scrollbar max-h-32 lg:max-h-48 pb-1 lg:pb-0">
        {#each surveys as survey}
          <button
            on:click={() => {
              activeSurveyId = survey._id;
              clearFilters();
            }}
            class="min-w-[130px] lg:w-full text-left border px-3 py-2 rounded-xl transition-all duration-200 flex flex-col gap-0.5 active:scale-[0.98] hover:scale-[1.01] group shrink-0 {activeSurveyId === survey._id ? 'bg-cyan-600/10 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30' : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 text-slate-400'}"
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

    <!-- READ-ONLY TABLET SITE FILTER CHIPS (NO INLINE EDITING) -->
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
              class="w-full px-2 py-1.5 rounded-lg text-[9px] font-mono font-bold transition-all border flex items-center justify-between shadow-xs active:scale-95 cursor-pointer truncate {isSelected ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'}"
              title={devId}
            >
              <span class="truncate pr-0.5 flex items-center space-x-1">
                <svg class="w-3 h-3 fill-current inline-block shrink-0" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                <span class="truncate">{devId}</span>
              </span>
              {#if isSelected}<span class="shrink-0 text-emerald-400 font-bold ml-1">✓</span>{/if}
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

      <div class="space-y-1">
        <span class="text-[9px] text-slate-500 font-bold uppercase block">Quick Ranges</span>
        <div class="grid grid-cols-4 gap-1">
          {#each [['ALL', 'All'], ['TODAY', 'Today'], ['7DAYS', '7 Days'], ['30DAYS', '30 Days']] as [presetKey, presetLabel]}
            <button
              on:click={() => applyDatePreset(presetKey)}
              class="py-1 px-0.5 rounded-md text-[9px] font-bold transition-all border hover:scale-105 active:scale-95 cursor-pointer {activePreset === presetKey ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs ring-1 ring-cyan-500/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'}"
            >
              {presetLabel}
            </button>
          {/each}
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-1 gap-1.5 pt-0.5">
        <div class="space-y-0.5">
          <label for="start-date" class="text-[9px] text-slate-500 font-bold uppercase">From Date</label>
          <input
            id="start-date"
            type="date"
            bind:value={startDate}
            on:change={() => (activePreset = 'CUSTOM')}
            class="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-200 px-2 py-1 rounded-md focus:outline-none focus:border-cyan-500 cursor-pointer transition-all hover:border-slate-700"
          />
        </div>
        <div class="space-y-0.5">
          <label for="end-date" class="text-[9px] text-slate-500 font-bold uppercase">To Date</label>
          <input
            id="end-date"
            type="date"
            bind:value={endDate}
            on:change={() => (activePreset = 'CUSTOM')}
            class="w-full bg-slate-950 border border-slate-800 text-[11px] text-slate-200 px-2 py-1 rounded-md focus:outline-none focus:border-cyan-500 cursor-pointer transition-all hover:border-slate-700"
          />
        </div>
      </div>
    </div>
  </div>

  <!-- INTERACTIVE RESIZER DIVIDER HANDLE -->
  <div
    on:mousedown={startResizing}
    class="hidden lg:flex w-4 cursor-col-resize items-center justify-center shrink-0 group transition-colors z-20 hover:bg-cyan-500/10 active:bg-cyan-500/20"
    title="Drag left/right to resize panels"
  >
    <div class="w-1.5 h-16 rounded-full bg-slate-700/80 group-hover:bg-cyan-500 group-hover:shadow-md group-hover:shadow-cyan-500/30 group-active:bg-cyan-400 transition-all"></div>
  </div>

  <!-- RIGHT MAIN ANALYTICS WORKSPACE -->
  <div class="flex-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-4 lg:p-5 flex flex-col h-full overflow-hidden box-border shadow-lg min-w-0">
    
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
        <button
          on:click={() => (isNotificationOpen = !isNotificationOpen)}
          class="relative bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 p-2 rounded-lg transition-all active:scale-95 hover:scale-105 flex items-center justify-center shadow-xs text-amber-400 cursor-pointer"
          title="View Low Rating Notifications"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.83-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          {#if lowRatingAlerts.length > 0}
            <span 
              class="absolute -top-1 -right-1 font-mono font-bold text-[9px] h-4 min-w-[1.1rem] px-0.5 rounded-full flex items-center justify-center animate-pulse border shadow-sm"
              style="background-color: #e31b23 !important; color: #ffffff !important; border-color: #ffffff !important;"
            >
              {lowRatingAlerts.length}
            </span>
          {/if}
        </button>

        <div class="bg-slate-950 p-0.5 border border-slate-800 rounded-lg flex items-center space-x-1">
          <button
            on:click={() => (activeViewMode = "analytics")}
            class="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-105 active:scale-95 {activeViewMode === 'analytics' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
            <span>Analytics</span>
          </button>
          <button
            on:click={() => (activeViewMode = "table")}
            class="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center space-x-1.5 cursor-pointer hover:scale-105 active:scale-95 {activeViewMode === 'table' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}"
          >
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 4h16V5H4v2zm0 4h5V9H4v2zm7 0h9V9h-9v2zm-7 4h5v-2H4v2zm7 0h9v-2h-9v2zm-7 4h5v-2H4v2zm7 0h9v-2h-9v2z"/></svg>
            <span>Log Matrix</span>
          </button>
        </div>

        <button
          on:click={() => exportToExcel()}
          disabled={filteredResponses.length === 0}
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 px-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex items-center space-x-1 disabled:opacity-20 cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          <span>Export CSV</span>
        </button>

        <button
          on:click={clearAllSurveyResponses}
          disabled={filteredResponses.length === 0}
          class="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-[11px] py-1.5 px-2.5 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center space-x-1 cursor-pointer"
          title="Delete all submission logs for this form"
        >
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          <span>Clear All</span>
        </button>
      </div>
    </div>

    <!-- MAIN GRID CARDS -->
    <div class="flex-1 overflow-y-auto mt-3 custom-scrollbar pr-1 box-border">
      {#if !selectedSurveyObj || filteredResponses.length === 0}
        <div class="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
          No submission records match your active search filter parameters.
        </div>

      {:else if activeViewMode === "analytics"}
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 pb-4">
          {#each displayedQuestions as question, qIdx}
            {@const stats = getQuestionAnalytics(question, filteredResponses)}
            {@const isPieEligible = isPieChartType(question.type)}
            
            <div 
              on:click={() => openQuestionModal(question)}
              class="bg-slate-950/60 hover:bg-slate-950/95 border border-slate-800 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-950/20 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs cursor-pointer transition-all duration-300 group relative overflow-visible"
            >
              <div class="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
                <div class="space-y-0.5">
                  <span class="text-[9px] font-bold text-cyan-400 uppercase font-mono tracking-wider flex items-center space-x-1">
                    <span>Field #{selectedSurveyObj.questions.findIndex(q => cleanString(q.questionText) === cleanString(question.questionText)) + 1} • {question.type}</span>
                    <span class="text-slate-500 text-[9px] hidden sm:inline-flex items-center space-x-0.5 group-hover:text-cyan-300 transition-colors">
                      <svg class="w-3 h-3 fill-current inline-block ml-1" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                      <span>Click to enlarge</span>
                    </span>
                  </span>
                  <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-100 transition-colors leading-snug">{question.questionText}</h4>
                </div>
                <span class="text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-slate-800 shrink-0 group-hover:border-cyan-500/40 group-hover:text-cyan-300 transition-all">
                  {stats.total} {stats.total === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {#if isPieEligible}
                <div class="flex flex-row items-center gap-3 sm:gap-4 pt-0.5 relative">
                  <div class="relative shrink-0 flex items-center justify-center">
                    <svg class="w-28 h-28 transform -rotate-90 drop-shadow-md overflow-visible" viewBox="0 0 100 100">
                      {#each stats.breakdowns as item}
                        {@const isHovered = activeHoveredSlice?.qIdx === qIdx && activeHoveredSlice?.label === item.label}
                        <path
                          d={item.svgPath}
                          fill={item.color}
                          stroke="#1e293b"
                          stroke-width="0.8"
                          class="transition-all duration-300 cursor-pointer origin-center"
                          style="
                            transform: {isHovered ? 'scale(1.06)' : 'scale(1)'};
                            opacity: {activeHoveredSlice?.qIdx === qIdx && !isHovered ? 0.4 : 1};
                            filter: {isHovered ? 'drop-shadow(0px 0px 8px ' + item.color + ')' : 'none'};
                          "
                          on:mouseenter={(e) => { e.stopPropagation(); handleSliceMouseEnter(qIdx, item, e); }}
                          on:mousemove={(e) => handleSliceMouseMove(e)}
                          on:mouseleave={(e) => { e.stopPropagation(); handleSliceMouseLeave(); }}
                        />
                      {/each}
                    </svg>
                  </div>

                  <div class="flex-1 space-y-1 w-full">
                    {#each stats.breakdowns as item}
                      {@const isHovered = activeHoveredSlice?.qIdx === qIdx && activeHoveredSlice?.label === item.label}
                      
                      <div 
                        on:mouseenter={(e) => { e.stopPropagation(); handleSliceMouseEnter(qIdx, item, e); }}
                        on:mousemove={(e) => handleSliceMouseMove(e)}
                        on:mouseleave={(e) => { e.stopPropagation(); handleSliceMouseLeave(); }}
                        class="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-md transition-all duration-200 border cursor-pointer relative {isHovered ? 'bg-slate-800/90 border-cyan-500 shadow-md translate-x-1 scale-[1.02]' : 'bg-slate-900/80 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700'}"
                      >
                        <div class="flex items-center space-x-1.5 truncate pr-1">
                          <span class="w-2.5 h-2.5 rounded-full shrink-0 transition-transform {isHovered ? 'scale-125 ring-2 ring-white/20' : ''}" style="background-color: {item.color};"></span>
                          <span class="text-slate-200 font-medium truncate text-[10px] sm:text-[11px] {isHovered ? 'text-white font-bold' : ''}">{item.label}</span>
                        </div>
                        <span class="font-mono font-bold text-[10px] shrink-0 {isHovered ? 'text-cyan-300' : 'text-cyan-400'}">
                          {item.percentage}% <span class="text-slate-500 text-[9px]">({item.count})</span>
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>

              {:else}
                <div class="space-y-2">
                  {#each stats.breakdowns as item}
                    {@const isHovered = activeHoveredSlice?.qIdx === qIdx && activeHoveredSlice?.label === item.label}
                    
                    <div 
                      on:mouseenter={(e) => { e.stopPropagation(); handleSliceMouseEnter(qIdx, item, e); }}
                      on:mousemove={(e) => handleSliceMouseMove(e)}
                      on:mouseleave={(e) => { e.stopPropagation(); handleSliceMouseLeave(); }}
                      class="space-y-0.5 p-1 rounded-lg transition-all duration-200 cursor-pointer relative {isHovered ? 'bg-slate-900/90 ring-1 ring-cyan-500/40' : ''}"
                    >
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-300 font-semibold truncate max-w-[160px] sm:max-w-[200px] {isHovered ? 'text-white font-bold' : ''}">{item.label}</span>
                        <span class="font-mono font-bold text-[10px] {isHovered ? 'text-cyan-300' : 'text-cyan-400'}">{item.percentage}% <span class="text-slate-500 text-[9px]">({item.count})</span></span>
                      </div>
                      
                      <div class="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                        <div
                          class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 {isHovered ? 'from-cyan-400 to-emerald-400 shadow-md shadow-cyan-500/20' : ''}"
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
        <!-- LOG MATRIX TABLE -->
        <div class="border border-slate-800 rounded-xl bg-slate-950/40 box-border overflow-x-auto mb-3 shadow-inner">
          <table class="w-full border-collapse text-left text-xs text-slate-300 whitespace-nowrap min-w-full">
            <thead>
              <tr class="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-xs">
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
                <tr class="hover:bg-cyan-950/20 hover:border-cyan-500/40 transition-all group">
                  <td class="p-2 border-r border-slate-800/40 text-center">
                    <button
                      on:click={() => deleteSingleResponse(response._id)}
                      class="text-slate-500 hover:text-rose-400 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 p-1.5 rounded-md transition-all active:scale-95 cursor-pointer"
                      title="Delete entry"
                    >
                      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </td>
                  <td class="p-2.5 font-mono text-cyan-400 font-semibold border-r border-slate-800/40 truncate max-w-[90px] group-hover:text-cyan-300">
                    {response._id ? response._id.slice(-6) : 'Log'}
                  </td>
                  <td class="p-2.5 border-r border-slate-800/40">
                    <span class="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-mono font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center space-x-1">
                      <svg class="w-3 h-3 fill-current inline-block shrink-0" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                      <span>{response.deviceId || 'Tablet-A'}</span>
                    </span>
                  </td>
                  <td class="p-2.5 text-slate-400 border-r border-slate-800/40 font-mono text-[10px] group-hover:text-slate-200">
                    {formatTimestampWithTimezone(response.formattedTimestamp || response.timestamp)}
                  </td>
                  {#each displayedQuestions as question}
                    {@const answerVal = (response.answers || []).find((a) => cleanString(a.questionText) === cleanString(question.questionText))?.value || 'N/A'}
                    <td class="p-2.5 border-r border-slate-800/40 text-slate-200">
                      <span class="text-slate-300 bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded group-hover:border-slate-700 font-medium">
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
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
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
          class="text-slate-400 hover:text-white bg-slate-950 border border-slate-800 p-2 rounded-lg transition-all active:scale-95 hover:bg-slate-800 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
        {#if lowRatingAlerts.length === 0}
          <div class="border-2 border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            No below-average ratings recorded for this form.
          </div>
        {:else}
          {#each lowRatingAlerts as alert}
            {@const isExpanded = expandedAlertIds.has(alert.responseId)}

            <div class="bg-slate-950 border border-rose-900/50 hover:border-rose-700/80 p-4 rounded-xl space-y-3 shadow-md transition-all">
              <div class="flex items-center justify-between border-b border-slate-900 pb-2">
                <div class="flex items-center space-x-2">
                  <span class="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 font-mono font-bold px-2 py-0.5 rounded text-[10px] flex items-center space-x-1">
                    <svg class="w-3 h-3 fill-current inline-block" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                    <span>{alert.deviceId}</span>
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">
                    ID: {alert.responseId ? alert.responseId.slice(-6) : 'Log'}
                  </span>
                </div>
                <span class="text-[10px] font-mono text-slate-400 font-semibold">
                  {formatTimestampWithTimezone(alert.timestamp)}
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
                  class="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 px-3 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-between active:scale-[0.99] cursor-pointer"
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
          class="w-full bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 rounded-lg border border-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
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
        class="text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-lg shrink-0 active:scale-95 cursor-pointer"
        title="Exit Focus View"
      >
        ✕
      </button>
    </div>

    <!-- MAIN FOCUS WORKSPACE -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 my-4 overflow-hidden box-border">
      
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
              {#each [['ALL', 'All'], ['TODAY', 'Today'], ['7DAYS', '7 Days'], ['30DAYS', '30 Days']] as [presetKey, presetLabel]}
                <button
                  on:click={() => applyDatePreset(presetKey)}
                  class="py-1.5 rounded-lg text-xs font-bold transition-all border hover:scale-105 active:scale-95 cursor-pointer {activePreset === presetKey ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm' : 'bg-slate-950 border-slate-800 text-slate-400'}"
                >
                  {presetLabel}
                </button>
              {/each}
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

      <div class="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-hidden shadow-xl">
        
        {#if isPie}
          <div class="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 overflow-hidden">
            <div class="relative shrink-0 flex items-center justify-center">
              <svg class="w-48 h-48 transform -rotate-90 drop-shadow-lg overflow-visible" viewBox="0 0 100 100">
                {#each modalStats.breakdowns as item}
                  <path
                    d={item.svgPath}
                    fill={item.color}
                    stroke="#1e293b"
                    stroke-width="0.8"
                    class="transition-all duration-300 cursor-pointer origin-center hover:scale-105"
                  />
                {/each}
              </svg>
            </div>

            <div class="flex-1 w-full space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {#each modalStats.breakdowns as item}
                <div class="flex items-center justify-between text-xs bg-slate-950/80 border border-slate-800/80 px-3 py-2 rounded-xl shadow-xs hover:border-slate-700 transition-all">
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
              <div class="space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
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

    <div class="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0 gap-3">
      <button
        on:click={closeQuestionModal}
        class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700/80 transition-all shadow-md active:scale-95 cursor-pointer"
      >
        ← Return
      </button>

      <button
        on:click={() => exportToExcel(focusedQuestion)}
        class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
        <span>Export Field CSV</span>
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