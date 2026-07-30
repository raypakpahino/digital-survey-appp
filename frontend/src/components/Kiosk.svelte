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

  const ADMIN_PIN = "1234"; // Default Admin PIN

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
    { label: "ANGRY", emoji: "🤬", color: "hover:bg-rose-500/20 hover:border-rose-500 text-rose-600 bg-rose-50 border-rose-200" },
    { label: "SAD", emoji: "😞", color: "hover:bg-orange-500/20 hover:border-orange-500 text-orange-600 bg-orange-50 border-orange-200" },
    { label: "NEUTRAL", emoji: "😐", color: "hover:bg-amber-500/20 hover:border-amber-500 text-amber-600 bg-amber-50 border-amber-200" },
    { label: "HAPPY", emoji: "😊", color: "hover:bg-emerald-500/20 hover:border-emerald-500 text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-cyan-500/20 hover:border-cyan-500 text-cyan-600 bg-cyan-50 border-cyan-200" }
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

    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex += 1;
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

<div class="w-full h-full flex flex-col items-center p-3 sm:p-5 text-slate-800 font-sans box-border overflow-y-auto custom-scrollbar">
  
  {#if !isTerminalUnlocked}
    <!-- ADMIN SECURITY GATEWAY MODAL -->
    <div in:scale={{ duration: 300, start: 0.95 }} class="w-full max-w-md mx-auto my-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl text-center">
      <div class="h-16 w-16 bg-[#1a2b6c] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
        <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
      </div>

      <div class="space-y-1">
        <h2 class="text-xl font-black text-[#1a2b6c]">Terminal Admin Gate</h2>
        <p class="text-xs text-slate-500">Admin PIN is required to set the tablet site name and unlock terminal access.</p>
      </div>

      <form on:submit|preventDefault={verifyAndUnlockTerminal} class="space-y-4 text-left">
        <div class="space-y-1">
          <label for="admin-pass" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Admin Password</label>
          <input
            id="admin-pass"
            type="password"
            bind:value={adminPasscode}
            placeholder="Enter Admin PIN..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1a2b6c] font-mono focus:outline-none focus:border-cyan-500 font-bold"
          />
        </div>

        <div class="space-y-1">
          <label for="device-name" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tablet / Device Name</label>
          <input
            id="device-name"
            type="text"
            bind:value={inputDeviceName}
            placeholder="e.g. google tablet"
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-[#1a2b6c] font-bold focus:outline-none focus:border-cyan-500"
          />
        </div>

        {#if passError}
          <p class="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center animate-pulse">{passError}</p>
        {/if}

        <button
          type="submit"
          class="w-full bg-[#1a2b6c] hover:bg-blue-900 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95"
        >
          Unlock Terminal & Launch ➔
        </button>
      </form>
    </div>

  {:else}
    <!-- HEADER BAR -->
    <header class="w-full max-w-5xl h-14 px-5 sm:px-6 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shrink-0 shadow-sm my-0 py-0 transition-all">
      <div class="flex items-center space-x-3 min-w-0">
        <div class="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse shadow-sm shrink-0"></div>
        <span class="text-xs sm:text-sm font-black font-mono tracking-widest text-[#1a2b6c] uppercase truncate leading-none">
          {surveyTitle || "Feedback Terminal"}
        </span>
      </div>

      <div class="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div class="bg-slate-100 text-cyan-700 border border-slate-200 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider flex items-center space-x-1.5 shadow-xs">
          <svg class="w-3.5 h-3.5 fill-current text-cyan-600" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
          <span>{deviceId}</span>
        </div>

        {#if activeSurveyId && !isSubmitted && questions.length > 0}
          <div class="bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 text-[11px] font-bold text-cyan-700 font-mono tracking-wide hidden sm:flex items-center justify-center">
            QUESTION {currentQuestionIndex + 1} OF {questions.length}
          </div>
          
          <button
            on:click={() => {
              resetTerminal();
              onSelectSurvey("");
            }}
            class="text-xs font-bold text-slate-700 hover:text-[#1a2b6c] bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full transition-all shrink-0 active:scale-95 shadow-xs flex items-center space-x-1.5"
          >
            <svg class="w-3.5 h-3.5 fill-current text-cyan-600" viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 7 2.69 7 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C20.54 15.02 21 13.57 21 12c0-4.97-4.03-9-9-9zm0 14c-3.31 0-7-2.69-7-6 0-1.01.25-1.97.7-2.8L4.24 7.74C3.46 8.98 3 10.43 3 12c0 4.97 4.03 9 9 9v3l4-4-4-4v3z"/>
            </svg>
            <span>Change Form</span>
          </button>
        {/if}
      </div>
    </header>

    <!-- MAIN BODY WORKSPACE -->
    <main class="w-full max-w-5xl flex-1 flex flex-col justify-start pt-6 sm:pt-8">
      {#if !activeSurveyId || !surveyTitle || questions.length === 0}
        <div in:scale={{ duration: 300, start: 0.96 }} class="w-full max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-xl">
          <div class="text-center space-y-2 border-b border-slate-200 pb-4">
            <div class="h-12 w-12 rounded-2xl bg-cyan-100 border border-cyan-300 text-cyan-600 flex items-center justify-center font-bold text-2xl mx-auto mb-1 shadow-md">
              <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
            </div>
            <h1 class="text-xl sm:text-3xl font-black tracking-tight text-[#1a2b6c]">Select Survey Form</h1>
            <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Choose an active form sequence below to launch Live Kiosk Terminal Mode on <span class="text-cyan-600 font-mono font-bold">{deviceId}</span>.
            </p>
          </div>

          {#if surveys.length === 0}
            <div class="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs sm:text-sm text-slate-400">
              No active forms available in system storage. Please create a form first in the Form Designer.
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[26rem] overflow-y-auto custom-scrollbar pr-1">
              {#each surveys.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-")) as survey}
                <button
                  on:click={() => {
                    resetTerminal();
                    onSelectSurvey(survey._id);
                  }}
                  class="text-left bg-slate-50 hover:bg-white border border-slate-200 hover:border-cyan-500 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-sm min-h-[7rem] space-y-3"
                >
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded">
                        Active Form
                      </span>
                      <span class="text-[11px] font-mono text-slate-600 font-bold">
                        {survey.questions?.length || 0} Fields
                      </span>
                    </div>
                    <h3 class="text-sm sm:text-base font-bold text-[#1a2b6c] group-hover:text-cyan-600 transition-colors truncate pt-0.5">
                      {survey.title || "Untitled Form"}
                    </h3>
                  </div>

                  <div class="flex items-center justify-between pt-1.5 border-t border-slate-200">
                    <span class="text-[11px] text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Tap to start terminal</span>
                    
                    <span 
                      class="text-[11px] font-bold px-3.5 py-1 rounded-xl shadow-xs transition-all flex items-center space-x-1"
                      style="background-color: #1a2b6c !important; color: #ffffff !important;"
                    >
                      <span style="color: #ffffff !important; font-weight: 800 !important; background-color: transparent !important;">Launch</span>
                      <span style="color: #ffffff !important; font-weight: 800 !important; background-color: transparent !important;">→</span>
                    </span>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

      {:else if isSubmitted}
        <div in:scale={{ duration: 400, start: 0.95 }} class="text-center space-y-5 py-6 sm:py-10">
          <div class="h-16 w-16 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-lg">
            <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
          </div>
          <h2 class="text-2xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-emerald-500 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Thank You!
          </h2>
          <p class="text-xs sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
            Your responses have been securely logged. Resetting in 
            <span class="text-cyan-600 font-mono font-bold text-base sm:text-lg px-1">{countdownSeconds}s</span>...
          </p>
          <button 
            on:click={resetTerminal}
            class="mt-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md">
            Restart Now ➔
          </button>
        </div>

      {:else}
        <div key={currentQuestionIndex} in:fly={{ y: 15, duration: 350 }} class="space-y-4 sm:space-y-6">
          <div class="text-center space-y-1.5 sm:space-y-2">
            <div class="flex items-center justify-center space-x-2">
              <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-widest uppercase font-mono">Feedback Request</span>
              {#if currentQuestion.isRequired}
                <span class="text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">* Required Field</span>
              {/if}
            </div>

            {#if currentQuestion.questionImage}
              <div class="max-w-lg mx-auto h-40 sm:h-52 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-lg mb-3">
                <img src={currentQuestion.questionImage} alt={currentQuestion.questionText} class="w-full h-full object-cover" />
              </div>
            {/if}

            <h1 class="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#1a2b6c] leading-tight max-w-3xl mx-auto px-2">
              {currentQuestion.questionText}
            </h1>

            {#if validationError}
              <div class="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-xl inline-block mt-1 animate-pulse">
                ⚠️ {validationError}
              </div>
            {/if}
          </div>

          <div class="w-full pt-1">
            {#if getNormalizedType(currentQuestion.type) === 'smiley'}
              <div class="grid grid-cols-5 gap-2 sm:gap-4 max-w-2xl mx-auto px-1">
                {#each satisfactionScale as option}
                  <button 
                    on:click={() => handleSelectOption(`${option.emoji} ${option.label}`)}
                    class="flex flex-col items-center justify-center p-2.5 py-4 sm:p-5 rounded-2xl border transition-all duration-200 group active:scale-95 shadow-sm {option.color}">
                    <span class="text-3xl sm:text-5xl transform group-hover:scale-110 transition-transform duration-200 select-none filter drop-shadow-xs">
                      {option.emoji}
                    </span>
                    <span class="hidden sm:block mt-2 text-[9px] sm:text-[10px] font-black tracking-widest uppercase font-mono opacity-70 group-hover:opacity-100">
                      {option.label}
                    </span>
                  </button>
                {/each}
              </div>

            {:else if getNormalizedType(currentQuestion.type) === 'stars'}
              <div 
                class="flex items-center justify-center space-x-2 sm:space-x-4 max-w-lg mx-auto"
                on:mouseleave={() => hoveredStarIndex = 0}
              >
                {#each [1, 2, 3, 4, 5] as starValue}
                  <button 
                    type="button"
                    on:mouseenter={() => hoveredStarIndex = starValue}
                    on:click={() => handleSelectOption(`${starValue} Stars`)}
                    class="text-4xl sm:text-6xl transform hover:scale-125 active:scale-95 transition-all duration-150 outline-none select-none filter drop-shadow-xs focus:outline-none"
                    style="color: {starValue <= (hoveredStarIndex || 0) ? '#f59e0b' : '#cbd5e1'}"
                  >
                    {starValue <= (hoveredStarIndex || 0) ? '★' : '☆'}
                  </button>
                {/each}
              </div>

            {:else if getNormalizedType(currentQuestion.type) === 'multiple-choice'}
              <div class="max-w-xl mx-auto space-y-3 px-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                        class="w-full text-left bg-white border rounded-xl p-3 transition-all shadow-xs active:scale-[0.99] flex flex-col justify-between group {currentQuestion.allowMultiple && isSelected ? 'border-cyan-500 bg-cyan-50 text-cyan-800' : 'border-slate-200 hover:border-slate-300 text-slate-800'}"
                      >
                        {#if imgUrl}
                          <div class="w-full h-24 mb-2 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <img src={imgUrl} alt={option} class="w-full h-full object-cover" />
                          </div>
                        {/if}

                        <div class="flex items-center justify-between w-full">
                          <span class="text-sm sm:text-base font-bold group-hover:text-cyan-600 transition-colors">{option}</span>
                          {#if currentQuestion.allowMultiple}
                            <div class="w-5 h-5 rounded border flex items-center justify-center transition-all {isSelected ? 'bg-cyan-600 border-cyan-500 text-white font-bold text-xs' : 'border-slate-300 bg-slate-100'}">
                              {#if isSelected}✓{/if}
                            </div>
                          {:else}
                            <span class="text-slate-400 group-hover:text-cyan-600 font-extrabold text-sm transition-colors">➔</span>
                          {/if}
                        </div>
                      </button>
                    {/each}
                  {/if}
                </div>

                {#if currentQuestion.allowMultiple}
                  <button
                    on:click={advanceStep}
                    class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-5 text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-[0.98] mt-3 flex items-center justify-center space-x-2"
                    style="background-color: #1a2b6c !important; color: #ffffff !important;"
                  >
                    <span style="color: #ffffff !important; background-color: transparent !important;">Confirm & Continue</span>
                    <span style="color: #ffffff !important; background-color: transparent !important;">➔</span>
                  </button>
                {/if}
              </div>

            {:else}
              <form on:submit|preventDefault={advanceStep} class="max-w-lg mx-auto space-y-3 px-2">
                <input 
                  type="text" 
                  bind:value={selectedValue}
                  on:input={() => (validationError = "")}
                  placeholder={currentQuestion.isRequired ? "Type your response here (Required)..." : "Type your response here..."}
                  class="w-full bg-white border text-[#1a2b6c] placeholder-slate-400 rounded-xl p-3.5 text-sm sm:text-base outline-none transition-all shadow-inner {validationError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'}"
                />
                <button 
                  type="submit"
                  class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-5 text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-[0.98]"
                  style="background-color: #1a2b6c !important; color: #ffffff !important;"
                >
                  <span style="color: #ffffff !important; background-color: transparent !important;">Submit Field Input ➔</span>
                </button>
              </form>
            {/if}
          </div>
        </div>
      {/if}
    </main>

    <!-- FOOTER -->
    <footer class="w-full max-w-5xl border-t border-slate-200/80 pt-3 flex flex-col md:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono tracking-wider font-semibold gap-2 shrink-0">
      <span>🔒 Secure Enterprise Client Terminal</span>
      {#if activeSurveyId && !isSubmitted && questions.length > 0}
        <div class="w-full md:w-48 h-1 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
          <div 
            class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full" 
            style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%">
          </div>
        </div>
      {/if}
      <span>System v2.4.0</span>
    </footer>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
</style>