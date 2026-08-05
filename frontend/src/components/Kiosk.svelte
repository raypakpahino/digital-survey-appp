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
    { label: "ANGRY", emoji: "🤬", color: "hover:bg-rose-500/10 hover:border-rose-500 text-rose-700 bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:text-rose-400" },
    { label: "SAD", emoji: "😞", color: "hover:bg-orange-500/10 hover:border-orange-500 text-orange-700 bg-orange-50 border-orange-200 dark:bg-slate-800 dark:border-slate-700 dark:text-orange-400" },
    { label: "NEUTRAL", emoji: "😐", color: "hover:bg-amber-500/10 hover:border-amber-500 text-amber-700 bg-amber-50 border-amber-200 dark:bg-slate-800 dark:border-slate-700 dark:text-amber-400" },
    { label: "HAPPY", emoji: "😊", color: "hover:bg-emerald-500/10 hover:border-emerald-500 text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-400" },
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-rose-500/10 hover:border-rose-500 text-rose-700 bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-slate-700 dark:text-rose-400" }
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
  }r65757

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
  });
</script>

<div class="w-full h-full min-h-full flex-1 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-3 sm:p-5 font-sans box-border overflow-hidden flex flex-col justify-between select-none">
  
  {#if !isTerminalUnlocked}
    <!-- ADMIN SECURITY GATEWAY MODAL -->
    <div in:scale={{ duration: 300, start: 0.95 }} class="w-full max-w-md mx-auto my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
      <div class="h-14 w-14 bg-[#1a2b6c] text-white rounded-2xl border border-[#1a2b6c] flex items-center justify-center mx-auto shadow-lg shadow-[#1a2b6c]/20">
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
          <label for="admin-pass" class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Admin Password</label>
          <input
            id="admin-pass"
            type="password"
            bind:value={adminPasscode}
            placeholder="Enter Admin PIN..."
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-[#1a2b6c] dark:text-white font-mono focus:outline-none focus:border-[#e31b23] font-bold"
          />
        </div>

        <div class="space-y-1">
          <label for="device-name" class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Tablet / Device Name</label>
          <input
            id="device-name"
            type="text"
            bind:value={inputDeviceName}
            placeholder="e.g. Galaxy Tab A11"
            class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm text-[#1a2b6c] dark:text-white font-bold focus:outline-none focus:border-[#e31b23]"
          />
        </div>

        {#if passError}
          <p class="text-xs text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-2.5 rounded-xl text-center animate-pulse">{passError}</p>
        {/if}

        <button
          type="submit"
          class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 border border-transparent"
          style="color: #ffffff !important; font-weight: 800 !important; background-color: #1a2b6c !important;"
        >
          <span style="color: #ffffff !important; font-weight: 800 !important;">Unlock Terminal & Launch ➔</span>
        </button>
      </form>
    </div>

  {:else}
    <!-- MAIN WORKSPACE CONTAINER -->
    <main class="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-between min-h-0 py-1 box-border">
      {#if !activeSurveyId || !surveyTitle || questions.length === 0}
        
        <!-- SELECTION LAUNCHER MENU CARD -->
        <div in:scale={{ duration: 300, start: 0.96 }} class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between my-auto">
          
          <!-- TOP HEADER WITH TABLET ID -->
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <div class="flex items-center space-x-2">
              <div class="h-2.5 w-2.5 rounded-full bg-[#e31b23] animate-pulse"></div>
              <span class="text-xs font-black font-mono tracking-widest text-[#1a2b6c] dark:text-cyan-400 uppercase">
                {surveyTitle || "FEEDBACK TERMINAL"}
              </span>
            </div>

            <div class="flex items-center space-x-2">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">TABLET ID:</span>
              <span class="bg-[#1a2b6c] text-white font-mono font-bold text-xs px-3 py-1 rounded-full flex items-center space-x-1.5 shadow-xs" style="background-color: #1a2b6c !important; color: #ffffff !important;">
                <svg class="w-3.5 h-3.5 fill-current text-white shrink-0" viewBox="0 0 24 24" style="fill: #ffffff !important;"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
                <span style="color: #ffffff !important; font-weight: 700 !important;">{deviceId || "Unassigned"}</span>
              </span>
            </div>
          </div>

          <div class="text-center space-y-1 mb-4">
            <h1 class="text-2xl font-black tracking-tight text-[#1a2b6c] dark:text-white">Select Survey Form</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Choose an active form sequence below to launch Live Kiosk Mode on <span class="text-[#1a2b6c] dark:text-cyan-400 font-mono font-bold">{deviceId}</span>.
            </p>
          </div>

          {#if surveys.length === 0}
            <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 dark:text-slate-500 my-auto">
              No active forms available in system storage. Please create a form first in the Form Designer.
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[22rem] overflow-y-auto custom-scrollbar my-2 pr-1">
              {#each surveys.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-")) as survey}
                <button
                  on:click={() => {
                    resetTerminal();
                    onSelectSurvey(survey._id);
                  }}
                  class="text-left bg-slate-50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#e31b23] border-t-4 border-t-[#1a2b6c] rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-xs hover:shadow-md space-y-4"
                >
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <span class="h-1.5 w-1.5 rounded-full inline-block animate-pulse shrink-0" style="background-color: #10b981 !important;"></span>
                        <span>LIVE READY</span>
                      </span>
                      <span class="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                        {survey.questions?.length || 0} Fields
                      </span>
                    </div>
                    <h3 class="text-base font-bold text-[#1a2b6c] dark:text-white group-hover:text-[#e31b23] transition-colors truncate pt-1">
                      {survey.title || "Untitled Form"}
                    </h3>
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
                    <span class="text-[11px] text-slate-600 dark:text-slate-400 font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Tap to start terminal</span>
                    <span class="text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 group-hover:scale-105 bg-[#1a2b6c] group-hover:bg-[#e31b23] text-white" style="color: #ffffff !important; background-color: #1a2b6c !important;">
                      <span style="color: #ffffff !important; font-weight: 800 !important;">Launch</span>
                      <span class="transform group-hover:translate-x-1 transition-transform" style="color: #ffffff !important;">➔</span>
                    </span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}

          <!-- FOOTER INSIDE MODAL -->
          <div class="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
            <span>🔒 Secure Enterprise Client Terminal</span>
            <span>Terminal Kiosk Mode</span>
          </div>
        </div>

      {:else if isSubmitted}
        <!-- SUBMISSION CONFIRMATION -->
        <div in:scale={{ duration: 400, start: 0.95 }} class="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl flex flex-col items-center justify-center text-center space-y-4 my-auto">
          <div class="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
            <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          </div>
          <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-[#1a2b6c] dark:text-white">
            Thank You!
          </h2>
          <p class="text-xs sm:text-base text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
            Your response has been securely registered. Terminal resets in 
            <span class="text-[#e31b23] font-mono font-bold text-base sm:text-lg px-1">{countdownSeconds}s</span>...
          </p>
        </div>

      {:else}
        <!-- ACTIVE FORM FILLING CANVAS -->
        <div key={currentQuestionIndex} in:fly={{ y: 15, duration: 350 }} class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between overflow-hidden box-border my-auto h-full">
          
          <!-- TOP PROGRESS TRACKER -->
          <div class="space-y-1 shrink-0 w-full">
            <div class="flex items-center justify-between text-[11px] font-mono font-bold">
              <span class="text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-0.5 rounded-full">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span class="text-slate-500 dark:text-slate-400 font-semibold">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Completed
              </span>
            </div>

            <div class="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                class="h-full bg-gradient-to-r from-[#1a2b6c] to-[#e31b23] transition-all duration-300 rounded-full"
                style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%"
              ></div>
            </div>
          </div>

          <!-- QUESTION HEADER & LARGER VISIBLE IMAGE AREA -->
          <div class="text-center space-y-2 shrink-0 py-2">
            {#if currentQuestion.isRequired}
              <div class="flex items-center justify-center">
                <span class="text-rose-600 dark:text-rose-400 font-bold text-[10px] bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-2.5 py-0.5 rounded-full">* Required Field</span>
              </div>
            {/if}

            {#if currentQuestion.questionImage}
              <!-- EXPANDED IMAGE BOUNDS WITH FULL UNCROPPED VISIBILITY -->
              <div class="max-h-56 sm:max-h-72 w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-sm flex items-center justify-center p-2">
                <img src={currentQuestion.questionImage} alt={currentQuestion.questionText} class="w-full h-full object-contain rounded-xl" />
              </div>
            {/if}

            <h1 class="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[#1a2b6c] dark:text-white leading-tight px-2">
              {currentQuestion.questionText}
            </h1>

            {#if validationError}
              <div class="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1 rounded-xl inline-block animate-pulse">
                ⚠️ {validationError}
              </div>
            {/if}
          </div>

          <!-- DYNAMIC RESPONSE CANVAS -->
          <div class="w-full flex-1 flex flex-col justify-center min-h-0 box-border py-2 my-auto overflow-y-auto custom-scrollbar">
            
            {#if getNormalizedType(currentQuestion.type) === 'smiley'}
              <div class="grid grid-cols-1 landscape:grid-cols-5 gap-3 w-full max-w-3xl landscape:max-w-4xl mx-auto my-auto items-center">
                {#each satisfactionScale as option}
                  <button 
                    on:click={() => handleSelectOption(`${option.emoji} ${option.label}`)}
                    class="flex flex-col items-center justify-center p-3.5 sm:p-5 rounded-2xl border transition-all duration-200 group active:scale-95 shadow-sm bg-slate-50 dark:bg-slate-950 {option.color}">
                    <span class="text-4xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-200 select-none filter drop-shadow-xs">
                      {option.emoji}
                    </span>
                    <span class="mt-2 text-xs font-black tracking-widest uppercase font-mono text-slate-700 dark:text-slate-300">
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
                    class="text-5xl sm:text-8xl transform hover:scale-125 active:scale-95 transition-all duration-150 outline-none select-none filter drop-shadow-xs focus:outline-none"
                    style="color: {starValue <= (hoveredStarIndex || 0) ? '#e31b23' : '#cbd5e1'}"
                  >
                    {starValue <= (hoveredStarIndex || 0) ? '★' : '☆'}
                  </button>
                {/each}
              </div>

            {:else if getNormalizedType(currentQuestion.type) === 'multiple-choice'}
              {@const optCount = currentQuestion.options?.length || 0}
              
              <div class="w-full my-auto space-y-4">
                <div class="grid {getGridClass(optCount)} gap-3.5 w-full items-center justify-center">
                  {#if currentQuestion.options && optCount > 0}
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
                        class="w-full text-left bg-slate-50 dark:bg-slate-950 border rounded-2xl p-3.5 sm:p-4 transition-all shadow-sm active:scale-[0.98] flex flex-col justify-between group h-auto {currentQuestion.allowMultiple && isSelected ? 'border-[#e31b23] bg-rose-50/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-[#e31b23]/30' : 'border-slate-200 dark:border-slate-800 hover:border-[#e31b23] text-slate-800 dark:text-slate-100'}"
                      >
                        {#if imgUrl}
                          <div class="w-full h-28 sm:h-36 shrink-0 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 shadow-inner mb-2">
                            <img src={imgUrl} alt={option} class="w-full h-full object-contain rounded-lg" />
                          </div>
                        {/if}

                        <div class="flex items-center justify-between w-full shrink-0 pt-1">
                          <span class="text-sm sm:text-base font-bold group-hover:text-[#e31b23] transition-colors truncate">{option}</span>
                          {#if currentQuestion.allowMultiple}
                            <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ml-1 {isSelected ? 'bg-[#e31b23] border-[#e31b23] text-white font-bold text-xs' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'}">
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
                    class="w-full max-w-md mx-auto bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-3.5 px-4 text-sm rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 block"
                    style="color: #ffffff !important; background-color: #1a2b6c !important;"
                  >
                    <span style="color: #ffffff !important; font-weight: 800 !important;">Confirm & Continue ➔</span>
                  </button>
                {/if}
              </div>

            {:else}
              <form on:submit|preventDefault={advanceStep} class="w-full max-w-xl mx-auto space-y-3 my-auto">
                <input 
                  type="text" 
                  bind:value={selectedValue}
                  on:input={() => (validationError = "")}
                  placeholder={currentQuestion.isRequired ? "Type your response here (Required)..." : "Type your response here..."}
                  class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[#1a2b6c] dark:text-white placeholder-slate-400 rounded-2xl p-4 text-base outline-none transition-all shadow-inner {validationError ? 'border-rose-500 focus:border-rose-400' : 'focus:border-[#e31b23] focus:ring-2 focus:ring-rose-500/20'}"
                />
                <button 
                  type="submit"
                  class="w-full bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-extrabold py-4 px-5 text-base rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center space-x-2"
                  style="color: #ffffff !important; font-weight: 800 !important; background-color: #1a2b6c !important;"
                >
                  <span style="color: #ffffff !important; font-weight: 800 !important;">Submit Response ➔</span>
                </button>
              </form>
            {/if}

          </div>

          <!-- FOOTER INSIDE FORM CARD -->
          <div class="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono tracking-wider font-semibold">
            <span>🔒 Secure Enterprise Client Terminal</span>
            <span>Terminal Kiosk Mode</span>
          </div>
        </div>            
      {/if}
    </main>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
</style>