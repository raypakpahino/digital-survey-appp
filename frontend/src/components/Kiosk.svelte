<script>
  import { onMount, onDestroy } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  
  export let surveyTitle = "Feedback Terminal";
  export let questions = [];
  export let surveys = [];
  export let activeSurveyId = "";
  export let isQrMode = false;
  export let onSubmitResponse = (answers, deviceId) => {};
  export let onSelectSurvey = (id) => {};

  let currentQuestionIndex = 0;
  let answersAccumulator = [];
  let selectedValue = "";
  let otherCustomText = "";
  let selectedMultipleValues = [];
  let isSubmitted = false;
  let validationError = "";
  
  let hoveredStarIndex = 0;
  let autoResetTimer;
  let countdownSeconds = 4;

  let deviceId = "Unassigned Device";

  // FORM PIN GATE
  let selectedSurveyForPin = null;
  let enteredFormPin = "";
  let pinError = "";
  let isPinVerifiedForCurrentSurvey = false;

  // SEARCHABLE DROPDOWN COMBOBOX STATE
  let isDropdownOpen = false;
  let dropdownSearchQuery = "";
  let dropdownContainerRef;

  $: currentQuestion = questions[currentQuestionIndex] || null;
  $: currentSurvey = surveys.find(s => s._id === activeSurveyId) || null;

  function parseOptionText(opt) {
    if (typeof opt === 'string') {
      try {
        const parsed = JSON.parse(opt);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch (e) {}
      return { text: opt, targetSite: '' };
    }
    if (typeof opt === 'object' && opt !== null) return opt;
    return { text: String(opt || ''), targetSite: '' };
  }

  $: rawParsedOptions = (currentQuestion?.options || []).map(parseOptionText).filter(opt => {
    if (!opt.targetSite || opt.targetSite.trim() === "") return true;
    return String(opt.targetSite).toLowerCase().trim() === String(deviceId).toLowerCase().trim();
  }).map(opt => opt.text);

  // Force-append "Other" option if enabled via boolean flag or legacy presence
  $: availableOptions = (currentQuestion && (currentQuestion.enableOtherOption || currentQuestion.enableOtherOption === "true") && !rawParsedOptions.includes("Other")) 
    ? [...rawParsedOptions, "Other"] 
    : rawParsedOptions;

  $: filteredDropdownOptions = availableOptions.filter(optText => 
    String(optText).toLowerCase().includes(dropdownSearchQuery.trim().toLowerCase())
  );

  function handleDropdownClickOutside(event) {
    if (dropdownContainerRef && !dropdownContainerRef.contains(event.target)) {
      isDropdownOpen = false;
    }
  }

  onMount(() => {
    window.addEventListener('click', handleDropdownClickOutside);

    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : window.location.search);
    const urlSurveyId = urlParams.get("id");
    const urlSiteParam = urlParams.get("site");
    const savedDeviceId = localStorage.getItem("sdx_device_id");

    if (urlSiteParam) {
      deviceId = urlSiteParam.trim();
      localStorage.setItem("sdx_device_id", deviceId);
    } else if (savedDeviceId) {
      deviceId = savedDeviceId;
    }

    if (urlSurveyId) {
      const targetSurvey = surveys.find(s => s._id === urlSurveyId);
      if (targetSurvey) {
        if (isQrMode) {
          isPinVerifiedForCurrentSurvey = true;
          onSelectSurvey(targetSurvey._id);
          resetTerminal();
        } else {
          selectedSurveyForPin = targetSurvey;
        }
      }
    }
  });

  $: if (activeSurveyId && surveys.length > 0 && !isPinVerifiedForCurrentSurvey && !selectedSurveyForPin) {
    const matched = surveys.find(s => s._id === activeSurveyId);
    if (matched) {
      if (isQrMode) {
        isPinVerifiedForCurrentSurvey = true;
      } else {
        selectedSurveyForPin = matched;
      }
    }
  }

  function handlePromptSurveyPin(survey) {
    if (isQrMode) {
      isPinVerifiedForCurrentSurvey = true;
      onSelectSurvey(survey._id);
      selectedSurveyForPin = null;
      resetTerminal();
      return;
    }

    selectedSurveyForPin = survey;
    enteredFormPin = "";
    pinError = "";
  }

  async function verifyFormPinAndLaunch() {
    pinError = "";
    if (!selectedSurveyForPin) return;

    if (isQrMode) {
      isPinVerifiedForCurrentSurvey = true;
      onSelectSurvey(selectedSurveyForPin._id);
      selectedSurveyForPin = null;
      resetTerminal();
      return;
    }

    const cleanPin = String(enteredFormPin || "").trim();

    try {
      const res = await fetch(`/api/surveys/${selectedSurveyForPin._id}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: cleanPin })
      });

      const data = await res.json();

      if (data.success) {
        if (data.deviceName) {
          deviceId = data.deviceName;
          localStorage.setItem("sdx_device_id", deviceId);
        }

        isPinVerifiedForCurrentSurvey = true;
        onSelectSurvey(selectedSurveyForPin._id);
        selectedSurveyForPin = null;
        resetTerminal();
      } else {
        pinError = data.message || "Incorrect PIN Code!";
      }
    } catch (err) {
      pinError = "Error verifying PIN with server.";
    }
  }

  $: if (currentQuestionIndex !== undefined) {
    selectedValue = "";
    otherCustomText = "";
    selectedMultipleValues = [];
    validationError = "";
    isDropdownOpen = false;
    dropdownSearchQuery = "";
  }

  const satisfactionScale = [
    { label: "ANGRY", emoji: "🤬", color: "hover:bg-rose-50 border-rose-200 text-rose-700 bg-rose-50/50" },
    { label: "SAD", emoji: "😞", color: "hover:bg-orange-50 border-orange-200 text-orange-700 bg-orange-50/50" },
    { label: "NEUTRAL", emoji: "😐", color: "hover:bg-amber-50 border-amber-200 text-amber-700 bg-amber-50/50" },
    { label: "HAPPY", emoji: "😊", color: "hover:bg-emerald-50 border-emerald-200 text-emerald-700 bg-emerald-50/50" },
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-rose-50 border-rose-200 text-rose-700 bg-rose-50/50" }
  ];

  function handleSelectOption(value) {
    validationError = "";
    selectedValue = value;
    setTimeout(() => {
      advanceStep();
    }, 250);
  }

  function toggleMultipleOption(option) {
    validationError = "";
    if (selectedMultipleValues.includes(option)) {
      selectedMultipleValues = selectedMultipleValues.filter(o => o !== option);
    } else {
      selectedMultipleValues = [...selectedMultipleValues, option];
    }
  }

  function shouldShowQuestion(qIndex) {
    if (qIndex === 0) return true;
    const q = questions[qIndex];
    if (!q || !q.skipLogic || !q.skipLogic.enabled) return true;

    const { dependsOnIndex, requiredValue } = q.skipLogic;
    if (dependsOnIndex === null || dependsOnIndex === undefined || !requiredValue) return true;

    const dependedQuestion = questions[dependsOnIndex];
    if (!dependedQuestion) return true;

    const recordedAnswer = answersAccumulator.find(a => a.questionText === dependedQuestion.questionText);
    if (!recordedAnswer) return false;

    const cleanAnswer = String(recordedAnswer.value).toUpperCase().replace(/[^\w\s]/gi, '').trim();
    const cleanTarget = String(requiredValue).toUpperCase().replace(/[^\w\s]/gi, '').trim();

    return cleanAnswer.includes(cleanTarget) || cleanTarget.includes(cleanAnswer);
  }

  function findNextValidQuestionIndex(startIndex) {
    let nextIdx = startIndex;
    while (nextIdx < questions.length && !shouldShowQuestion(nextIdx)) {
      nextIdx += 1;
    }
    return nextIdx;
  }

  function advanceStep() {
    if (!currentQuestion) return;

    let finalValue = selectedValue;
    const normType = getNormalizedType(currentQuestion.type);

    if (normType === 'number') {
      if (finalValue !== "" && isNaN(Number(finalValue))) {
        validationError = "Please enter a valid numeric value.";
        return;
      }
    } else if (normType === 'dropdown' && selectedValue === 'Other') {
      if (!otherCustomText.trim()) {
        validationError = "Please specify your custom answer for 'Other'.";
        return;
      }
      finalValue = `Other: ${otherCustomText.trim()}`;
    } else if (normType === 'multiple-choice' && currentQuestion.allowMultiple) {
      finalValue = selectedMultipleValues.join(", ");
    }

    const isBlank = finalValue === null || finalValue === undefined || (typeof finalValue === 'string' && finalValue.trim() === "");
    if (currentQuestion.isRequired && isBlank) {
      validationError = "This question is required. Please provide an answer before continuing.";
      return;
    }

    answersAccumulator = [
      ...answersAccumulator,
      { questionText: currentQuestion.questionText, value: isBlank ? "Skipped" : String(finalValue) }
    ];

    selectedValue = "";
    otherCustomText = "";
    selectedMultipleValues = [];
    hoveredStarIndex = 0;
    validationError = "";
    isDropdownOpen = false;
    dropdownSearchQuery = "";

    const nextIndex = findNextValidQuestionIndex(currentQuestionIndex + 1);

    if (nextIndex < questions.length) {
      currentQuestionIndex = nextIndex;
    } else {
      isSubmitted = true;
      onSubmitResponse(answersAccumulator, deviceId);
      startAutoResetLoop();
    }
  }

  function startAutoResetLoop() {
    countdownSeconds = Number(currentSurvey?.autoRefreshSeconds) || 4;
    clearInterval(autoResetTimer);
    autoResetTimer = setInterval(() => {
      countdownSeconds -= 1;
      if (countdownSeconds <= 0) {
        clearInterval(autoResetTimer);
        resetTerminal();
      }
    }, 1000);
  }

  function resetTerminal() {
    clearInterval(autoResetTimer);
    currentQuestionIndex = 0;
    answersAccumulator = [];
    selectedValue = "";
    otherCustomText = "";
    selectedMultipleValues = [];
    hoveredStarIndex = 0;
    validationError = "";
    isSubmitted = false;
    isDropdownOpen = false;
    dropdownSearchQuery = "";
  }

  function getNormalizedType(qType) {
    if (!qType) return '';
    return String(qType).toLowerCase().replace(/_/g, '-');
  }

  function getGridClass(optionCount) {
    if (optionCount <= 1) return 'grid-cols-1 max-w-md mx-auto';
    if (optionCount === 2) return 'grid-cols-1 landscape:grid-cols-2 max-w-2xl mx-auto';
    if (optionCount === 3) return 'grid-cols-1 landscape:grid-cols-3 max-w-4xl mx-auto';
    if (optionCount === 4) return 'grid-cols-1 portrait:grid-cols-2 landscape:grid-cols-4 max-w-5xl mx-auto';
    if (optionCount === 5) return 'grid-cols-1 landscape:grid-cols-5 w-full mx-auto';
    if (optionCount === 6) return 'grid-cols-1 portrait:grid-cols-2 landscape:grid-cols-3 max-w-4xl mx-auto';
    return 'grid-cols-1 portrait:grid-cols-2 landscape:grid-cols-4 max-w-5xl mx-auto';
  }

  onDestroy(() => {
    clearInterval(autoResetTimer);
    window.removeEventListener('click', handleDropdownClickOutside);
  });
</script>

<div class="w-full h-full min-h-full flex-1 bg-slate-100 text-slate-800 p-3 sm:p-5 font-sans box-border overflow-hidden flex flex-col justify-between select-none">
  <main class="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-between min-h-0 py-1 box-border relative">
    
    <!-- PURE BLUR OVERLAY (EXCLUSIVELY FOR KIOSK MODE) -->
    {#if !isQrMode && (selectedSurveyForPin || (!isPinVerifiedForCurrentSurvey && activeSurveyId))}
      <div in:scale={{ duration: 200 }} class="fixed inset-0 z-50 backdrop-blur-xl bg-white/15 flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 w-full max-w-sm text-center space-y-4 shadow-2xl relative">
          <div class="space-y-1">
            <span class="text-[10px] font-mono font-extrabold text-[#e31b23] uppercase tracking-widest block">Protected Survey Terminal</span>
            <h3 class="text-lg font-black text-[#1a2b6c] truncate">
              {selectedSurveyForPin ? selectedSurveyForPin.title : surveyTitle}
            </h3>
            <p class="text-xs text-slate-500">Enter your Admin-assigned Device Access PIN to unlock this form.</p>
          </div>

          <form on:submit|preventDefault={verifyFormPinAndLaunch} class="space-y-3">
            <input 
              type="password" 
              maxlength="6" 
              bind:value={enteredFormPin} 
              placeholder="Enter PIN (e.g. 9999)" 
              class="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-lg font-mono font-bold tracking-widest text-[#1a2b6c] focus:outline-none focus:border-[#e31b23]" 
            />

            {#if pinError}
              <p class="text-xs font-bold text-rose-600 animate-pulse">{pinError}</p>
            {/if}

            <button 
              type="submit" 
              class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer" 
              style="color: #ffffff !important; background-color: #1a2b6c !important;"
            >
              <span style="color: #ffffff !important; font-weight: 800 !important;">Verify PIN & Launch ➔</span>
            </button>
          </form>
        </div>
      </div>
    {/if}

    {#if !activeSurveyId || !surveyTitle || questions.length === 0}
      
      <!-- SELECTION LAUNCHER MENU CARD -->
      <div in:scale={{ duration: 300, start: 0.96 }} class="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between my-auto">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div class="flex items-center space-x-2">
            <div class="h-2.5 w-2.5 rounded-full {isQrMode ? 'bg-cyan-600' : 'bg-[#e31b23]'} animate-pulse"></div>
            <span class="text-xs font-black font-mono tracking-widest text-[#1a2b6c] uppercase">
              {isQrMode ? "WEB QR SURVEY HUB" : (surveyTitle || "FEEDBACK TERMINAL")}
            </span>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              {isQrMode ? "LOCATION:" : "TABLET ID:"}
            </span>
            <span class="bg-[#1a2b6c] text-white font-mono font-bold text-xs px-3 py-1 rounded-full flex items-center space-x-1.5 shadow-xs" style="background-color: #1a2b6c !important; color: #ffffff !important;">
              <svg class="w-3.5 h-3.5 fill-current text-white shrink-0" viewBox="0 0 24 24" style="fill: #ffffff !important;"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
              <span style="color: #ffffff !important; font-weight: 700 !important;">{deviceId}</span>
            </span>
          </div>
        </div>

        <div class="text-center space-y-1 mb-4">
          <h1 class="text-2xl font-black tracking-tight text-[#1a2b6c]">Select Survey Form</h1>
          <p class="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {isQrMode ? "Choose a web form sequence below to launch directly." : "Choose an active form sequence below to launch Live Kiosk Mode."}
          </p>
        </div>

        {#if surveys.length === 0}
          <div class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 my-auto">
            No active forms available in storage. Please create a form first in the QR Form Designer.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[22rem] overflow-y-auto custom-scrollbar my-2 pr-1">
            {#each surveys.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-")) as survey}
              <button
                on:click={() => handlePromptSurveyPin(survey)}
                class="text-left bg-slate-50 hover:bg-white border border-slate-200 hover:border-[#e31b23] border-t-4 border-t-[#1a2b6c] rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-xs hover:shadow-md space-y-4 cursor-pointer"
              >
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                      <span class="h-1.5 w-1.5 rounded-full inline-block animate-pulse shrink-0" style="background-color: #10b981 !important;"></span>
                      <span>LIVE READY</span>
                    </span>
                    <span class="text-[10px] font-mono text-slate-500 font-bold">
                      {survey.questions?.length || 0} Fields
                    </span>
                  </div>
                  <h3 class="text-base font-bold text-[#1a2b6c] group-hover:text-[#e31b23] transition-colors truncate pt-1">
                    {survey.title || "Untitled Form"}
                  </h3>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span class="text-[11px] text-slate-600 font-semibold group-hover:text-slate-900 transition-colors">
                    {isQrMode ? "Public Web Access" : "PIN Protected"}
                  </span>
                  <span class="text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 group-hover:scale-105 bg-[#1a2b6c] group-hover:bg-[#e31b23] text-white" style="color: #ffffff !important; background-color: #1a2b6c !important;">
                    <span style="color: #ffffff !important; font-weight: 800 !important;">
                      {isQrMode ? "Launch Web Form ➔" : "Enter PIN & Launch ➔"}
                    </span>
                  </span>
                </div>
              </button>
            {/each}
          </div>
        {/if}

        <div class="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
          <span>{isQrMode ? "📱 Web Scan Responsive Terminal" : "🔒 Secure Enterprise Client Terminal"}</span>
          <span>{isQrMode ? "Public Web QR Mode" : "Terminal Kiosk Mode"}</span>
        </div>
      </div>

    {:else if isSubmitted}
      <!-- DYNAMIC SUBMISSION CONFIRMATION -->
      <div in:scale={{ duration: 400, start: 0.95 }} class="w-full max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4 my-auto">
        <div class="h-16 w-16 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
          <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
        </div>
        <h2 class="text-xl sm:text-3xl font-black tracking-tight text-[#1a2b6c] leading-snug">
          {currentSurvey?.thankYouMessage || "Thank you for your feedback! This screen will automatically refresh in a few seconds."}
        </h2>
        <p class="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
          Registered under location <span class="font-bold text-[#1a2b6c]">{deviceId}</span>. Resets to question 1 in 
          <span class="text-[#e31b23] font-mono font-bold text-base sm:text-lg px-1">{countdownSeconds}s</span>...
        </p>
      </div>

    {:else}
      <!-- ACTIVE FORM FILLING CANVAS -->
      <div key={currentQuestionIndex} in:fly={{ y: 15, duration: 350 }} class="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between overflow-visible box-border my-auto h-full">
        
        <div class="space-y-1 shrink-0 w-full">
          <div class="flex items-center justify-between text-[11px] font-mono font-bold">
            <span class="text-rose-800 bg-rose-50 border border-rose-200 px-3 py-0.5 rounded-full">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span class="text-slate-500 font-semibold">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Completed
            </span>
          </div>

          <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-[#1a2b6c] to-[#e31b23] transition-all duration-300 rounded-full"
              style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%"
            ></div>
          </div>
        </div>

        <div class="text-center space-y-2 shrink-0 py-2">
          {#if currentQuestion.isRequired}
            <div class="flex items-center justify-center">
              <span class="text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">* Required Field</span>
            </div>
          {/if}

          {#if currentQuestion.questionImage}
            <div class="max-h-56 sm:max-h-72 w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm flex items-center justify-center p-2">
              <img src={currentQuestion.questionImage} alt={currentQuestion.questionText} class="w-full h-full object-contain rounded-xl" />
            </div>
          {/if}

          <h1 class="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#1a2b6c] leading-tight px-2">
            {currentQuestion.questionText}
          </h1>

          {#if validationError}
            <div class="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl inline-block animate-pulse">
              ⚠️ {validationError}
            </div>
          {/if}
        </div>

        <div class="w-full flex-1 flex flex-col justify-center min-h-0 box-border py-2 my-auto overflow-visible">
          
          {#if getNormalizedType(currentQuestion.type) === 'smiley'}
            <div class="grid grid-cols-1 landscape:grid-cols-5 gap-3 w-full max-w-3xl landscape:max-w-4xl mx-auto my-auto items-center">
              {#each satisfactionScale as option}
                <button 
                  on:click={() => handleSelectOption(`${option.emoji} ${option.label}`)}
                  class="flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl border transition-all duration-200 group active:scale-95 shadow-sm bg-slate-50 cursor-pointer {option.color}">
                  <span class="text-4xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-200 select-none filter drop-shadow-xs">
                    {option.emoji}
                  </span>
                  <span class="mt-2 text-xs font-black tracking-widest uppercase font-mono text-slate-700">
                    {option.label}
                  </span>
                </button>
              {/each}
            </div>

          {:else if getNormalizedType(currentQuestion.type) === 'stars'}
            <div 
              class="flex items-center justify-center space-x-3 sm:space-x-8 w-full my-auto py-4"
              on:mouseleave={() => hoveredStarIndex = 0}
            >
              {#each [1, 2, 3, 4, 5] as starValue}
                <button 
                  type="button"
                  on:mouseenter={() => hoveredStarIndex = starValue}
                  on:click={() => handleSelectOption(`${starValue} Stars`)}
                  class="text-5xl sm:text-8xl transform hover:scale-125 active:scale-95 transition-all duration-150 outline-none select-none filter drop-shadow-xs focus:outline-none cursor-pointer"
                  style="color: {starValue <= (hoveredStarIndex || 0) ? '#e31b23' : '#cbd5e1'}"
                >
                  {starValue <= (hoveredStarIndex || 0) ? '★' : '☆'}
                </button>
              {/each}
            </div>

          {:else if getNormalizedType(currentQuestion.type) === 'multiple-choice'}
            <div class="w-full my-auto space-y-4">
              <div class="grid {getGridClass(availableOptions.length)} gap-3.5 w-full items-center justify-center">
                {#if availableOptions.length > 0}
                  {#each availableOptions as option}
                    {@const imgUrl = currentQuestion.enableOptionImages && currentQuestion.optionImages ? currentQuestion.optionImages[option] : ''}
                    {@const isSelected = selectedMultipleValues.includes(option)}
                    
                    <button 
                      on:click={() => {
                        if (currentQuestion.allowMultiple) {
                          toggleMultipleOption(option);
                        } else {
                          handleSelectOption(option);
                        }
                      }}
                      class="w-full text-left bg-slate-50 border rounded-2xl p-3.5 sm:p-4 transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between group h-auto cursor-pointer {currentQuestion.allowMultiple && isSelected ? 'border-[#e31b23] bg-rose-50 text-rose-900 ring-2 ring-[#e31b23]/30' : 'border-slate-200 hover:border-[#e31b23] text-slate-800'}"
                    >
                      {#if imgUrl}
                        <div class="w-full h-28 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-inner mb-2">
                          <img src={imgUrl} alt={option} class="w-full h-full object-contain rounded-lg" />
                        </div>
                      {/if}

                      <div class="flex items-center justify-between w-full shrink-0 pt-1">
                        <span class="text-sm sm:text-base font-bold group-hover:text-[#e31b23] transition-colors truncate">{option}</span>
                        {#if currentQuestion.allowMultiple}
                          <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ml-1 {isSelected ? 'bg-[#e31b23] border-[#e31b23] text-white font-bold text-xs' : 'border-slate-300 bg-white'}">
                            {#if isSelected}✓{/if}
                          </div>
                        {:else}
                          <span class="text-slate-400 group-hover:text-[#e31b23] font-extrabold text-sm transition-colors shrink-0 ml-1">➔</span>
                        {/if}
                      </div>
                    </button>
                  {/each}
                {/if}
              </div>

              {#if currentQuestion.allowMultiple}
                <button
                  on:click={advanceStep}
                  class="w-full max-w-md mx-auto bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3.5 px-4 text-sm rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 block cursor-pointer"
                  style="color: #ffffff !important; background-color: #1a2b6c !important;"
                >
                  <span style="color: #ffffff !important; font-weight: 800 !important;">Confirm & Continue ➔</span>
                </button>
              {/if}
            </div>

          {:else if getNormalizedType(currentQuestion.type) === 'dropdown'}
            <!-- ELEGANT DOWNWARD-EXPANDING COMBOBOX WITH SEARCH & "OTHER" TEXT FIELD -->
            <div class="w-full max-w-lg mx-auto space-y-4 my-auto relative" bind:this={dropdownContainerRef}>
              
              <div class="relative">
                <button 
                  type="button"
                  on:click={() => (isDropdownOpen = !isDropdownOpen)}
                  class="w-full bg-slate-50 border-2 border-slate-200 text-[#1a2b6c] font-bold rounded-2xl p-4 text-base sm:text-lg flex items-center justify-between transition-all shadow-inner focus:outline-none focus:border-[#e31b23] cursor-pointer"
                >
                  <span class={selectedValue ? "text-[#1a2b6c]" : "text-slate-400 font-normal"}>
                    {selectedValue || "Select an option from list..."}
                  </span>
                  <svg class="w-5 h-5 text-slate-500 transform transition-transform duration-200 {isDropdownOpen ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>

                {#if isDropdownOpen}
                  <div 
                    in:scale={{ duration: 150, start: 0.98 }}
                    class="absolute z-[9999] top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-64"
                  >
                    <!-- SEARCH INPUT HEADER -->
                    <div class="p-3 border-b border-slate-100 bg-slate-50 shrink-0">
                      <div class="relative flex items-center">
                        <input 
                          type="text"
                          bind:value={dropdownSearchQuery}
                          placeholder="Search choices..."
                          class="w-full bg-white border border-slate-200 text-slate-800 text-sm font-semibold rounded-xl pl-9 pr-3 py-2 outline-none focus:border-[#1a2b6c]"
                        />
                        <svg class="w-4 h-4 text-slate-400 absolute left-3 fill-current" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                      </div>
                    </div>

                    <!-- SCROLLABLE CHOICES LIST -->
                    <div class="overflow-y-auto custom-scrollbar flex-1 p-1">
                      {#if filteredDropdownOptions.length === 0}
                        <div class="p-4 text-center text-xs text-slate-400 font-semibold">
                          No matching options found.
                        </div>
                      {:else}
                        {#each filteredDropdownOptions as option}
                          {@const isSelected = selectedValue === option}
                          <button
                            type="button"
                            on:click={() => {
                              selectedValue = option;
                              if (option !== 'Other') otherCustomText = "";
                              validationError = "";
                              isDropdownOpen = false;
                            }}
                            class="w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer {isSelected ? 'bg-[#1a2b6c] text-white' : 'hover:bg-slate-100 text-slate-700'}"
                          >
                            <span class="truncate pr-2">{option}</span>
                            {#if isSelected}
                              <span class="text-xs">✓</span>
                            {/if}
                          </button>
                        {/each}
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- SMOOTH EXPANDING TEXT FIELD FOR "OTHER" OPTION -->
              {#if selectedValue === 'Other'}
                <div in:fly={{ y: -8, duration: 200 }} class="space-y-1.5 pt-1">
                  <label for="other-input" class="text-xs font-bold text-[#1a2b6c] block">Please specify your answer:</label>
                  <input
                    id="other-input"
                    type="text"
                    bind:value={otherCustomText}
                    on:input={() => (validationError = "")}
                    placeholder="Type custom response here..."
                    class="w-full bg-slate-50 border border-slate-200 text-[#1a2b6c] font-semibold rounded-2xl p-4 text-base outline-none focus:border-[#e31b23] shadow-inner"
                  />
                </div>
              {/if}

              <button 
                type="button"
                on:click={advanceStep}
                class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-4 px-5 text-base rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
                style="color: #ffffff !important; background-color: #1a2b6c !important;"
              >
                <span style="color: #ffffff !important; font-weight: 800 !important;">Confirm Selection ➔</span>
              </button>
            </div>

          {:else if getNormalizedType(currentQuestion.type) === 'number'}
            <!-- NUMBER INPUT KIOSK FIELD -->
            <form on:submit|preventDefault={advanceStep} class="w-full max-w-md mx-auto space-y-4 my-auto">
              <div class="relative flex items-center">
                <input 
                  type="number" 
                  bind:value={selectedValue}
                  on:input={() => (validationError = "")}
                  placeholder={currentQuestion.isRequired ? "Enter numeric value (Required)..." : "Enter numeric value..."}
                  class="w-full bg-slate-50 border border-slate-200 text-[#1a2b6c] font-bold rounded-2xl p-4 text-xl outline-none transition-all shadow-inner focus:border-[#e31b23] focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <button 
                type="submit"
                class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-4 px-5 text-base rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
                style="color: #ffffff !important; background-color: #1a2b6c !important;"
              >
                <span style="color: #ffffff !important; font-weight: 800 !important;">Submit Number ➔</span>
              </button>
            </form>

          {:else if getNormalizedType(currentQuestion.type) === 'date'}
            <!-- DATE PICKER KIOSK INPUT -->
            <form on:submit|preventDefault={advanceStep} class="w-full max-w-md mx-auto space-y-4 my-auto">
              <div class="relative flex items-center">
                <input 
                  type="date" 
                  bind:value={selectedValue}
                  on:input={() => (validationError = "")}
                  class="w-full bg-slate-50 border border-slate-200 text-[#1a2b6c] font-bold rounded-2xl p-4 text-lg outline-none transition-all shadow-inner focus:border-[#e31b23] focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                />
              </div>
              <button 
                type="submit"
                class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-4 px-5 text-base rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
                style="color: #ffffff !important; background-color: #1a2b6c !important;"
              >
                <span style="color: #ffffff !important; font-weight: 800 !important;">Submit Date ➔</span>
              </button>
            </form>

          {:else}
            <form on:submit|preventDefault={advanceStep} class="w-full max-w-xl mx-auto space-y-3 my-auto">
              <input 
                type="text" 
                bind:value={selectedValue}
                on:input={() => (validationError = "")}
                placeholder={currentQuestion.isRequired ? "Type your response here (Required)..." : "Type your response here..."}
                class="w-full bg-slate-50 border border-slate-200 text-[#1a2b6c] placeholder-slate-400 rounded-2xl p-4 text-base outline-none transition-all shadow-inner {validationError ? 'border-rose-500 focus:border-rose-400' : 'focus:border-[#e31b23] focus:ring-2 focus:ring-rose-500/20'}"
              />
              <button 
                type="submit"
                class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-4 px-5 text-base rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
                style="color: #ffffff !important; background-color: #1a2b6c !important;"
              >
                <span style="color: #ffffff !important; font-weight: 800 !important;">Submit Response ➔</span>
              </button>
            </form>
          {/if}

        </div>

        <div class="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
          <span>{isQrMode ? "📱 Web Scan Responsive Terminal" : "🔒 Secure Enterprise Client Terminal"}</span>
          <span>{isQrMode ? "Public Web QR Mode" : "Terminal Kiosk Mode"}</span>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
</style>