<script>
  import { onMount, onDestroy } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  
  export let surveyTitle = "Feedback Terminal";
  export let questions = [];
  export let surveys = [];
  export let activeSurveyId = "";
  export let onSubmitResponse = (answers, deviceId) => {};
  export let onSelectSurvey = (id) => {};

  let currentQuestionIndex = 0;
  let answersAccumulator = [];
  let selectedValue = "";
  let selectedMultipleValues = [];
  let isSubmitted = false;
  let validationError = "";
  
  let hoveredStarIndex = 0;
  let autoResetTimer;
  let countdownSeconds = 4;

  // TABLET IDENTIFIER & SECURITY GATE STATE
  let deviceId = "";
  let isTerminalUnlocked = false;
  let adminPasscode = "";
  let passError = "";
  let inputDeviceName = "";

  const ADMIN_PIN = "1234";

  $: currentQuestion = questions[currentQuestionIndex] || null;

  onMount(() => {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : window.location.search);
    const paramDeviceId = urlParams.get("deviceId");
    const isDirectLink = urlParams.has("id") && (hash.startsWith("#/kiosk") || window.location.search.includes("id="));

    if (!isDirectLink) {
      activeSurveyId = "";
    }

    const savedDeviceId = localStorage.getItem("sdx_device_id");
    if (paramDeviceId) {
      deviceId = paramDeviceId;
      localStorage.setItem("sdx_device_id", paramDeviceId);
      isTerminalUnlocked = true;
    } else if (savedDeviceId) {
      deviceId = savedDeviceId;
      isTerminalUnlocked = true;
    }
  });

  function verifyAndUnlockTerminal() {
    passError = "";
    if (adminPasscode !== ADMIN_PIN) {
      passError = "Invalid Admin Password! Access Denied.";
      return;
    }

    if (!inputDeviceName.trim()) {
      passError = "Please enter a valid Tablet Name before launching.";
      return;
    }

    deviceId = inputDeviceName.trim();
    localStorage.setItem("sdx_device_id", deviceId);
    isTerminalUnlocked = true;
  }

  $: if (currentQuestionIndex !== undefined) {
    selectedValue = "";
    selectedMultipleValues = [];
    validationError = "";
  }

  const satisfactionScale = [
    { label: "ANGRY", emoji: "🤬", color: "hover:bg-rose-500/10 hover:border-rose-500 text-rose-700 bg-rose-50 border-rose-200" },
    { label: "SAD", emoji: "😞", color: "hover:bg-orange-500/10 hover:border-orange-500 text-orange-700 bg-orange-50 border-orange-200" },
    { label: "NEUTRAL", emoji: "😐", color: "hover:bg-amber-500/10 hover:border-amber-500 text-amber-700 bg-amber-50 border-amber-200" },
    { label: "HAPPY", emoji: "😊", color: "hover:bg-emerald-500/10 hover:border-emerald-500 text-emerald-700 bg-emerald-50 border-emerald-200" },
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-rose-500/10 hover:border-rose-500 text-rose-700 bg-rose-50 border-rose-200" }
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

    if (getNormalizedType(currentQuestion.type) === 'multiple-choice' && currentQuestion.allowMultiple) {
      finalValue = selectedMultipleValues.join(", ");
    }

    const isBlank = !finalValue || (typeof finalValue === 'string' && finalValue.trim() === "");
    if (currentQuestion.isRequired && isBlank) {
      validationError = "This question is required. Please provide an answer before continuing.";
      return;
    }

    answersAccumulator = [
      ...answersAccumulator,
      { questionText: currentQuestion.questionText, value: finalValue || "Skipped" }
    ];

    selectedValue = "";
    selectedMultipleValues = [];
    hoveredStarIndex = 0;
    validationError = "";

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
    countdownSeconds = 4;
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
    selectedMultipleValues = [];
    hoveredStarIndex = 0;
    validationError = "";
    isSubmitted = false;
  }

  function getNormalizedType(qType) {
    if (!qType) return '';
    return String(qType).toLowerCase().replace(/_/g, '-');
  }

  onDestroy(() => {
    clearInterval(autoResetTimer);
  });
</script>

<div class="{activeSurveyId && surveyTitle && questions.length > 0 ? 'fixed inset-0 z-50 bg-[#f8fafc] text-slate-800 p-4 sm:p-8' : 'w-full h-full text-slate-800 dark:text-slate-100 p-2 sm:p-4'} font-sans box-border overflow-y-auto custom-scrollbar flex flex-col items-center justify-between">
  
  {#if !isTerminalUnlocked}
    <!-- ADMIN SECURITY GATEWAY MODAL -->
    <div in:scale={{ duration: 300, start: 0.95 }} class="w-full max-w-md mx-auto my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
      <div class="h-14 w-14 bg-[#1a2b6c] dark:bg-cyan-600/20 text-white dark:text-cyan-400 rounded-2xl border border-[#1a2b6c] dark:border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg shadow-[#1a2b6c]/20">
        <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
        </svg>
      </div>

      <div class="space-y-1">
        <h2 class="text-xl font-black text-[#1a2b6c] dark:text-white">Terminal Admin Gate</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Admin PIN is required to set the tablet site name and unlock terminal access.</p>
      </div>

      <form on:submit|preventDefault={verifyAndUnlockTerminal} class="space-y-4 text-left">
        <div class="space-y-1">
          <label for="admin-pass" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Admin Password</label>
          <input
            id="admin-pass"
            type="password"
            bind:value={adminPasscode}
            placeholder="Enter Admin PIN..."
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-[#1a2b6c] dark:text-white font-mono focus:outline-none focus:border-[#e31b23] font-bold"
          />
        </div>

        <div class="space-y-1">
          <label for="device-name" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tablet / Device Name</label>
          <input
            id="device-name"
            type="text"
            bind:value={inputDeviceName}
            placeholder="e.g. google tablet"
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-[#1a2b6c] dark:text-white font-bold focus:outline-none focus:border-[#e31b23]"
          />
        </div>

        {#if passError}
          <p class="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center animate-pulse">{passError}</p>
        {/if}

        <!-- HIGH-CONTRAST UNLOCK BUTTON (FIXED TEXT VISIBILITY) -->
        <button
          type="submit"
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 border border-transparent"
          style="color: #ffffff !important; font-weight: 800 !important;"
        >
          <span style="color: #ffffff !important; font-weight: 800 !important;">Unlock Terminal & Launch ➔</span>
        </button>
      </form>
    </div>

  {:else}
    <!-- HEADER BAR -->
    {#if !activeSurveyId || !surveyTitle || questions.length === 0}
      <header class="w-full max-w-5xl h-14 px-5 sm:px-6 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl flex items-center justify-between shrink-0 shadow-sm transition-all mb-4">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="h-2.5 w-2.5 rounded-full bg-[#e31b23] animate-pulse shadow-sm shrink-0"></div>
          <span class="text-xs sm:text-sm font-black font-mono tracking-widest text-[#1a2b6c] dark:text-slate-200 uppercase truncate leading-none">
            {surveyTitle || "Feedback Terminal"}
          </span>
        </div>

        <div class="flex items-center space-x-2 shrink-0">
          <span class="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400 hidden sm:inline">Assigned Tablet:</span>
          <span class="bg-[#1a2b6c] text-white dark:bg-cyan-950 dark:text-cyan-300 dark:border dark:border-cyan-800 font-mono font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center space-x-2 shadow-xs">
            <svg class="w-3.5 h-3.5 fill-current text-white dark:text-cyan-400 shrink-0" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
            <span class="truncate max-w-[150px]">{deviceId}</span>
          </span>
        </div>
      </header>
    {/if}

    <!-- MAIN BODY WORKSPACE -->
    <main class="w-full max-w-5xl flex-1 flex flex-col justify-center my-auto py-2">
      {#if !activeSurveyId || !surveyTitle || questions.length === 0}
        <!-- SELECTION LAUNCHER MENU -->
        <div in:scale={{ duration: 300, start: 0.96 }} class="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
          
          <div class="text-center space-y-3 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div class="h-16 w-16 bg-[#1a2b6c] dark:bg-cyan-600/20 text-white dark:text-cyan-400 rounded-2xl border border-[#1a2b6c] dark:border-cyan-500/30 flex items-center justify-center mx-auto shadow-lg shadow-[#1a2b6c]/20">
              <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
              </svg>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-[#1a2b6c] dark:text-white">Select Survey Form</h1>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Choose an active form sequence below to launch Live Kiosk Terminal Mode on <span class="text-[#1a2b6c] dark:text-cyan-400 font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">{deviceId}</span>.
            </p>
          </div>

          {#if surveys.length === 0}
            <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-xs sm:text-sm text-slate-400">
              No active forms available in system storage. Please create a form first in the Form Designer.
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[26rem] overflow-y-auto custom-scrollbar pr-1">
              {#each surveys.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-")) as survey}
                <button
                  on:click={() => {
                    resetTerminal();
                    onSelectSurvey(survey._id);
                  }}
                  class="text-left bg-slate-50 dark:bg-slate-950/80 hover:bg-white dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#e31b23] dark:hover:border-cyan-500 border-t-4 border-t-[#1a2b6c] rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-sm hover:shadow-md space-y-4 hover:-translate-y-0.5"
                >
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-full flex items-center space-x-1.5">
                        <span class="h-2 w-2 rounded-full inline-block animate-pulse shrink-0" style="background-color: #10b981 !important;"></span>
                        <span>LIVE READY</span>
                      </span>
                      <span class="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                        {survey.questions?.length || 0} Fields
                      </span>
                    </div>
                    <h3 class="text-base font-bold text-[#1a2b6c] dark:text-white group-hover:text-[#e31b23] dark:group-hover:text-cyan-400 transition-colors truncate pt-1">
                      {survey.title || "Untitled Form"}
                    </h3>
                  </div>

                  <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-900">
                    <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Tap to start terminal</span>
                    <span class="text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 group-hover:scale-105 bg-[#1a2b6c] group-hover:bg-[#e31b23] text-white" style="color: #ffffff !important;">
                      <span>Launch</span>
                      <span class="transform group-hover:translate-x-1 transition-transform">➔</span>
                    </span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

      {:else if isSubmitted}
        <!-- SUBMISSION CONFIRMATION -->
        <div in:scale={{ duration: 400, start: 0.95 }} class="text-center space-y-5 py-8 sm:py-12 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl max-w-2xl mx-auto">
          <div class="h-16 w-16 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          </div>
          <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-[#1a2b6c]">
            Thank You!
          </h2>
          <p class="text-xs sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Your feedback has been securely registered. Terminal resets in 
            <span class="text-[#e31b23] font-mono font-bold text-base sm:text-lg px-1">{countdownSeconds}s</span>...
          </p>
        </div>

      {:else}
        <!-- ACTIVE QUESTIONNAIRE WORKSPACE -->
        <div key={currentQuestionIndex} in:fly={{ y: 15, duration: 350 }} class="space-y-6 sm:space-y-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-3xl mx-auto w-full">
          
          <div class="space-y-2 pb-2 border-b border-slate-100">
            <div class="flex items-center justify-between text-xs font-mono font-bold">
              <span class="text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span class="text-slate-400 font-semibold">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Completed
              </span>
            </div>

            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div 
                class="h-full bg-gradient-to-r from-[#1a2b6c] to-[#e31b23] transition-all duration-300 rounded-full"
                style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%"
              ></div>
            </div>
          </div>

          <div class="text-center space-y-2 sm:space-y-3">
            <div class="flex items-center justify-center space-x-2">
              {#if currentQuestion.isRequired}
                <span class="text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">* Required Field</span>
              {/if}
            </div>

            {#if currentQuestion.questionImage}
              <div class="max-w-md mx-auto aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner my-3 flex items-center justify-center p-2">
                <img src={currentQuestion.questionImage} alt={currentQuestion.questionText} class="w-full h-full object-contain rounded-xl" />
              </div>
            {/if}

            <h1 class="text-xl sm:text-3xl font-black tracking-tight text-[#1a2b6c] leading-tight max-w-2xl mx-auto px-2">
              {currentQuestion.questionText}
            </h1>

            {#if validationError}
              <div class="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl inline-block mt-1 animate-pulse">
                ⚠️ {validationError}
              </div>
            {/if}
          </div>

          <div class="w-full pt-2">
            {#if getNormalizedType(currentQuestion.type) === 'smiley'}
              <div class="grid grid-cols-5 gap-2 sm:gap-4 max-w-2xl mx-auto px-1">
                {#each satisfactionScale as option}
                  <button 
                    on:click={() => handleSelectOption(`${option.emoji} ${option.label}`)}
                    class="flex flex-col items-center justify-center p-3 py-5 sm:p-6 rounded-2xl border transition-all duration-200 group active:scale-95 shadow-xs {option.color}">
                    <span class="text-3xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-200 select-none filter drop-shadow-xs">
                      {option.emoji}
                    </span>
                    <span class="hidden sm:block mt-2.5 text-[10px] font-black tracking-widest uppercase font-mono opacity-80 group-hover:opacity-100">
                      {option.label}
                    </span>
                  </button>
                {/each}
              </div>

            {:else if getNormalizedType(currentQuestion.type) === 'stars'}
              <div 
                class="flex items-center justify-center space-x-3 sm:space-x-5 max-w-lg mx-auto py-2"
                on:mouseleave={() => hoveredStarIndex = 0}
              >
                {#each [1, 2, 3, 4, 5] as starValue}
                  <button 
                    type="button"
                    on:mouseenter={() => hoveredStarIndex = starValue}
                    on:click={() => handleSelectOption(`${starValue} Stars`)}
                    class="text-4xl sm:text-6xl transform hover:scale-125 active:scale-95 transition-all duration-150 outline-none select-none filter drop-shadow-xs focus:outline-none"
                    style="color: {starValue <= (hoveredStarIndex || 0) ? '#e31b23' : '#cbd5e1'}"
                  >
                    {starValue <= (hoveredStarIndex || 0) ? '★' : '☆'}
                  </button>
                {/each}
              </div>

            {:else if getNormalizedType(currentQuestion.type) === 'multiple-choice'}
              <div class="max-w-2xl mx-auto space-y-4 px-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {#if currentQuestion.options && currentQuestion.options.length > 0}
                    {#each currentQuestion.options as option}
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
                        class="w-full text-left bg-slate-50 border rounded-2xl p-3.5 transition-all shadow-xs active:scale-[0.98] flex flex-col justify-between group {currentQuestion.allowMultiple && isSelected ? 'border-[#e31b23] bg-rose-50 text-rose-900' : 'border-slate-200 hover:border-[#e31b23] text-slate-800'}"
                      >
                        {#if imgUrl}
                          <div class="w-full aspect-square mb-3 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-2 shadow-inner">
                            <img src={imgUrl} alt={option} class="w-full h-full object-contain rounded-lg" />
                          </div>
                        {/if}

                        <div class="flex items-center justify-between w-full">
                          <span class="text-sm sm:text-base font-bold group-hover:text-[#e31b23] transition-colors">{option}</span>
                          {#if currentQuestion.allowMultiple}
                            <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all {isSelected ? 'bg-[#e31b23] border-[#e31b23] text-white font-bold text-xs' : 'border-slate-300 bg-white'}">
                              {#if isSelected}✓{/if}
                            </div>
                          {:else}
                            <span class="text-slate-400 group-hover:text-[#e31b23] font-extrabold text-sm transition-colors">➔</span>
                          {/if}
                        </div>
                      </button>
                    {/each}
                  {/if}
                </div>

                {#if currentQuestion.allowMultiple}
                  <button
                    on:click={advanceStep}
                    class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-bold py-3.5 px-5 text-sm rounded-xl transition-all shadow-md active:scale-[0.98] mt-4 flex items-center justify-center space-x-2"
                    style="color: #ffffff !important;"
                  >
                    <span>Confirm & Continue ➔</span>
                  </button>
                {/if}
              </div>

            {:else}
              <form on:submit|preventDefault={advanceStep} class="max-w-lg mx-auto space-y-4 px-2">
                <input 
                  type="text" 
                  bind:value={selectedValue}
                  on:input={() => (validationError = "")}
                  placeholder={currentQuestion.isRequired ? "Type your response here (Required)..." : "Type your response here..."}
                  class="w-full bg-slate-50 border text-[#1a2b6c] placeholder-slate-400 rounded-xl p-4 text-sm sm:text-base outline-none transition-all shadow-inner {validationError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 focus:border-[#e31b23] focus:ring-2 focus:ring-rose-500/20'}"
                />
                <button 
                  type="submit"
                  class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-bold py-3.5 px-5 text-sm sm:text-base rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2"
                  style="color: #ffffff !important; font-weight: 800 !important;"
                >
                  <span style="color: #ffffff !important; font-weight: 800 !important;">Submit Response ➔</span>
                </button>
              </form>
            {/if}
          </div>
        </div>
      {/if}
    </main>

    <footer class="w-full max-w-5xl border-t border-slate-200 dark:border-slate-800 pt-3 flex flex-col md:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono tracking-wider font-semibold gap-2 shrink-0">
      <span>🔒 Secure Enterprise Client Terminal</span>
      <span>System v2.4.0</span>
    </footer>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
</style>