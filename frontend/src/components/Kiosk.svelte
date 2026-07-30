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

  // TABLET IDENTIFIER STATE
  let deviceId = "Tablet-A";
  let isEditingDeviceId = false;
  let tempDeviceId = "";

  $: currentQuestion = questions[currentQuestionIndex] || null;

  onMount(() => {
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : window.location.search);
    const paramDeviceId = urlParams.get("deviceId");
    const isDirectLink = urlParams.has("id") && (hash.startsWith("#/kiosk") || window.location.search.includes("id="));

    if (!isDirectLink) {
      activeSurveyId = "";
    }

    if (paramDeviceId) {
      deviceId = paramDeviceId;
      localStorage.setItem("sdx_device_id", paramDeviceId);
    } else {
      const savedDeviceId = localStorage.getItem("sdx_device_id");
      if (savedDeviceId) {
        deviceId = savedDeviceId;
      }
    }
  });

  function unlockDeviceIdEdit() {
    const pass = prompt("Admin authorization required to modify Terminal Device ID:");
    if (pass === "admin" || pass === "1234") {
      tempDeviceId = deviceId;
      isEditingDeviceId = true;
    } else if (pass !== null) {
      alert("Unauthorized access key.");
    }
  }

  function saveCustomDeviceId() {
    if (tempDeviceId.trim()) {
      deviceId = tempDeviceId.trim();
      localStorage.setItem("sdx_device_id", deviceId);
    }
    isEditingDeviceId = false;
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
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-cyan-500/10 hover:border-cyan-500 text-cyan-700 bg-cyan-50 border-cyan-200" }
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

<!-- STRICT LIGHT MODE ENFORCEMENT WITH SODEXO COLOR PALETTE -->
<div class="w-full h-full flex flex-col items-center p-3 sm:p-6 bg-[#f8fafc] text-slate-800 font-sans box-border overflow-y-auto custom-scrollbar relative selection:bg-cyan-100">
  
  <!-- HEADER BAR: SHOWN ONLY DURING FORM SELECTION OR UNLESS ACTIVE FORM IS RUNNING FOR CLIENTS -->
  {#if !activeSurveyId || !surveyTitle || questions.length === 0}
    <header class="w-full max-w-5xl h-14 px-5 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shrink-0 shadow-sm transition-all z-10">
      <div class="flex items-center space-x-3 min-w-0">
        <div class="h-2.5 w-2.5 rounded-full bg-cyan-600 animate-pulse shadow-sm shrink-0"></div>
        <span class="text-xs sm:text-sm font-black font-mono tracking-widest text-[#1a2b6c] uppercase truncate leading-none">
          {surveyTitle || "Feedback Terminal"}
        </span>
      </div>

      <div class="flex items-center space-x-2 shrink-0">
        {#if isEditingDeviceId}
          <div class="flex items-center space-x-1.5 bg-slate-50 border border-cyan-500 rounded-full px-2.5 py-1">
            <input
              type="text"
              bind:value={tempDeviceId}
              placeholder="Tablet-A"
              class="bg-transparent text-xs text-[#1a2b6c] px-1 py-0 font-mono focus:outline-none w-20 font-bold"
            />
            <button 
              on:click={saveCustomDeviceId} 
              class="bg-[#1a2b6c] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all hover:bg-blue-900"
            >
              Save
            </button>
          </div>
        {:else}
          <button
            on:dblclick={unlockDeviceIdEdit}
            class="bg-slate-100 hover:bg-slate-200 text-[#1a2b6c] border border-slate-200 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider flex items-center space-x-1.5 shadow-xs transition-all cursor-default"
            title="Double-click (Admin) to configure device name"
          >
            <svg class="w-3.5 h-3.5 fill-current text-cyan-600" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
            <span>{deviceId}</span>
          </button>
        {/if}
      </div>
    </header>
  {/if}

  <!-- MAIN KIOSK BODY WORKSPACE (RESPONSIVE PORTRAIT & LANDSCAPE LAYOUTS) -->
  <main class="w-full max-w-5xl flex-1 flex flex-col justify-center py-4 sm:py-6 z-10">
    {#if !activeSurveyId || !surveyTitle || questions.length === 0}
      <!-- SELECTION LAUNCHER MENU -->
      <div in:scale={{ duration: 300, start: 0.96 }} class="w-full max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 space-y-6 shadow-xl relative overflow-hidden">
        
        <div class="text-center space-y-2 border-b border-slate-100 pb-5">
          <div class="h-14 w-14 rounded-2xl bg-[#1a2b6c] text-white flex items-center justify-center font-bold text-2xl mx-auto mb-2 shadow-lg shadow-[#1a2b6c]/20">
            <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/></svg>
          </div>
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-[#1a2b6c]">Select Survey Form</h1>
          <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Choose an active form sequence below to launch Live Kiosk Mode on <span class="text-cyan-700 font-mono font-bold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">{deviceId}</span>.
          </p>
        </div>

        {#if surveys.length === 0}
          <div class="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center text-xs sm:text-sm text-slate-400">
            No active forms available in system storage. Please create a form first in the Form Designer.
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1">
            {#each surveys.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-")) as survey}
              <button
                on:click={() => {
                  resetTerminal();
                  onSelectSurvey(survey._id);
                }}
                class="text-left bg-slate-50 hover:bg-white border border-slate-200 hover:border-cyan-500 border-t-4 border-t-[#1a2b6c] rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-sm hover:shadow-md space-y-4 hover:-translate-y-0.5"
              >
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live Ready</span>
                    </span>
                    <span class="text-[11px] font-mono text-slate-500 font-bold">
                      {survey.questions?.length || 0} Fields
                    </span>
                  </div>
                  <h3 class="text-base font-bold text-[#1a2b6c] group-hover:text-cyan-700 transition-colors truncate pt-1">
                    {survey.title || "Untitled Form"}
                  </h3>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span class="text-[11px] text-slate-500 font-medium group-hover:text-slate-800 transition-colors">Tap to start terminal</span>
                  <span 
                    class="text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-all flex items-center space-x-1.5 group-hover:scale-105 bg-[#1a2b6c] text-white"
                  >
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
      <div in:scale={{ duration: 400, start: 0.95 }} class="text-center space-y-5 py-8 sm:py-12 bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl max-w-2xl mx-auto">
        <div class="h-16 w-16 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
          <svg class="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
        </div>
        <h2 class="text-2xl sm:text-4xl font-black tracking-tight text-[#1a2b6c]">
          Thank You!
        </h2>
        <p class="text-xs sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
          Your feedback has been securely registered. Terminal resets in 
          <span class="text-cyan-700 font-mono font-bold text-base sm:text-lg px-1">{countdownSeconds}s</span>...
        </p>
      </div>

    {:else}
      <!-- ACTIVE QUESTIONNAIRE WORKSPACE -->
      <div key={currentQuestionIndex} in:fly={{ y: 15, duration: 350 }} class="space-y-6 sm:space-y-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xl max-w-3xl mx-auto w-full">
        
        <div class="text-center space-y-2 sm:space-y-3">
          <div class="flex items-center justify-center space-x-2">
            <span class="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-widest uppercase font-mono">QUESTION {currentQuestionIndex + 1} OF {questions.length}</span>
            {#if currentQuestion.isRequired}
              <span class="text-rose-600 font-bold text-[10px] bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">* Required Field</span>
            {/if}
          </div>

          <!-- QUESTION HEADER IMAGE (FRAME REFINED FOR PERFECT FIT) -->
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
                  style="color: {starValue <= (hoveredStarIndex || 0) ? '#f59e0b' : '#cbd5e1'}"
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
                      class="w-full text-left bg-slate-50 border rounded-2xl p-3.5 transition-all shadow-xs active:scale-[0.98] flex flex-col justify-between group {currentQuestion.allowMultiple && isSelected ? 'border-cyan-600 bg-cyan-50 text-cyan-900' : 'border-slate-200 hover:border-cyan-400 text-slate-800'}"
                    >
                      <!-- PERFECT IMAGE FRAMING FOR CHOICE PICTURES -->
                      {#if imgUrl}
                        <div class="w-full aspect-square mb-3 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-2 shadow-inner">
                          <img src={imgUrl} alt={option} class="w-full h-full object-contain rounded-lg" />
                        </div>
                      {/if}

                      <div class="flex items-center justify-between w-full">
                        <span class="text-sm sm:text-base font-bold group-hover:text-cyan-700 transition-colors">{option}</span>
                        {#if currentQuestion.allowMultiple}
                          <div class="w-5 h-5 rounded-md border flex items-center justify-center transition-all {isSelected ? 'bg-cyan-600 border-cyan-600 text-white font-bold text-xs' : 'border-slate-300 bg-white'}">
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
                  class="w-full bg-[#1a2b6c] hover:bg-blue-900 text-white font-bold py-3.5 px-5 text-sm rounded-xl transition-all shadow-md active:scale-[0.98] mt-4 flex items-center justify-center space-x-2"
                >
                  <span>Confirm & Continue</span>
                  <span>➔</span>
                </button>
              {/if}
            </div>

          {:else}
            <!-- SHORT ANSWER TEXT INPUT -->
            <form on:submit|preventDefault={advanceStep} class="max-w-lg mx-auto space-y-4 px-2">
              <input 
                type="text" 
                bind:value={selectedValue}
                on:input={() => (validationError = "")}
                placeholder={currentQuestion.isRequired ? "Type your response here (Required)..." : "Type your response here..."}
                class="w-full bg-slate-50 border text-[#1a2b6c] placeholder-slate-400 rounded-xl p-4 text-sm sm:text-base outline-none transition-all shadow-inner {validationError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'}"
              />
              <button 
                type="submit"
                class="w-full bg-[#1a2b6c] hover:bg-blue-900 text-white font-bold py-3.5 px-5 text-sm rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Submit Response ➔
              </button>
            </form>
          {/if}
        </div>

      </div>
    {/if}
  </main>

  <!-- FOOTER -->
  <footer class="w-full max-w-5xl border-t border-slate-200/80 pt-3 flex flex-col md:flex-row items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono tracking-wider font-semibold gap-2 shrink-0 z-10">
    <span>🔒 Secure Enterprise Client Terminal</span>
    {#if activeSurveyId && !isSubmitted && questions.length > 0}
      <div class="w-full md:w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden border border-slate-200">
        <div 
          class="h-full bg-[#1a2b6c] transition-all duration-300 rounded-full" 
          style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%">
        </div>
      </div>
    {/if}
    <span>System v2.4.0</span>
  </footer>

</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
</style>