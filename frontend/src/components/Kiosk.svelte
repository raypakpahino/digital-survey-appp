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
    const urlParams = new URLSearchParams(window.location.hash.includes("?") ? window.location.hash.split("?")[1] : window.location.search);
    const paramDeviceId = urlParams.get("deviceId");

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
    { label: "ANGRY", emoji: "🤬", color: "hover:bg-rose-500/20 hover:border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40" },
    { label: "SAD", emoji: "😞", color: "hover:bg-orange-500/20 hover:border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40" },
    { label: "NEUTRAL", emoji: "😐", color: "hover:bg-amber-500/20 hover:border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40" },
    { label: "HAPPY", emoji: "😊", color: "hover:bg-emerald-500/20 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40" },
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-cyan-500/20 hover:border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-900/40" }
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

<div class="w-full h-full flex flex-col justify-between items-center p-4 sm:p-6 md:p-10 text-slate-800 dark:text-slate-100 font-sans box-border overflow-y-auto custom-scrollbar">
  
  <!-- HEADER -->
  <header class="w-full max-w-5xl flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4 sm:pb-5 shrink-0 gap-2">
    <div class="flex items-center space-x-3 truncate">
      <div class="h-3 w-3 rounded-full bg-cyan-500 animate-pulse shadow-lg shadow-cyan-500/50 shrink-0"></div>
      <span class="text-xs sm:text-sm font-black font-mono tracking-widest text-slate-600 dark:text-slate-300 uppercase truncate">{surveyTitle || "Feedback Terminal"}</span>
    </div>

    <div class="flex items-center space-x-2 sm:space-x-3 shrink-0">
      
      {#if isEditingDeviceId}
        <div class="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-cyan-500 rounded-full px-2 py-1">
          <input
            type="text"
            bind:value={tempDeviceId}
            placeholder="Tablet-A"
            class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-navy-950 dark:text-white px-2 py-0.5 rounded-full font-mono focus:outline-none w-24"
          />
          <button on:click={saveCustomDeviceId} class="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">Save</button>
        </div>
      {:else}
        <button
          on:click={() => { tempDeviceId = deviceId; isEditingDeviceId = true; }}
          class="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider flex items-center space-x-1 shadow-sm active:scale-95"
          title="Click to set this tablet's Site/Device Name"
        >
          <span>🏷️</span> <span>{deviceId}</span>
        </button>
      {/if}

      {#if activeSurveyId && !isSubmitted && questions.length > 0}
        <div class="bg-white dark:bg-slate-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-200 dark:border-slate-800 text-[11px] sm:text-xs font-bold text-cyan-700 dark:text-cyan-400 font-mono tracking-wide hidden sm:block">
          QUESTION {currentQuestionIndex + 1} OF {questions.length}
        </div>
        <button
          on:click={() => {
            resetTerminal();
            onSelectSurvey("");
          }}
          class="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-navy-950 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all shrink-0 active:scale-95 shadow-md"
        >
          🔄 Change Form
        </button>
      {/if}
    </div>
  </header>

  <!-- MAIN BODY -->
  <main class="w-full max-w-5xl flex-1 flex flex-col justify-center my-4 sm:my-8">
    {#if !activeSurveyId || !surveyTitle || questions.length === 0}
      <div in:scale={{ duration: 300, start: 0.96 }} class="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 md:p-12 space-y-6 sm:space-y-8 shadow-2xl backdrop-blur-xl">
        <div class="text-center space-y-3 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div class="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-cyan-100 dark:bg-cyan-600/20 border border-cyan-300 dark:border-cyan-500/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-2xl sm:text-3xl mx-auto mb-2 shadow-xl shadow-cyan-500/10">
            📱
          </div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-navy-950 dark:text-white">Select Survey Form</h1>
          <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Choose an active form sequence below to launch Live Kiosk Terminal Mode on <span class="text-cyan-600 dark:text-cyan-400 font-mono font-bold">{deviceId}</span>.
          </p>
        </div>

        {#if surveys.length === 0}
          <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500">
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
                class="text-left bg-slate-50 dark:bg-slate-950/80 hover:bg-white dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group active:scale-[0.98] shadow-md hover:shadow-cyan-500/10 min-h-[7.5rem] space-y-4"
              >
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/40 px-2 py-0.5 rounded-md">
                      Active Form
                    </span>
                    <span class="text-xs font-mono text-slate-400 dark:text-slate-500 font-bold">
                      {survey.questions?.length || 0} Fields
                    </span>
                  </div>
                  <h3 class="text-base sm:text-lg font-bold text-navy-950 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors truncate pt-1">
                    {survey.title || "Untitled Form"}
                  </h3>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-900">
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">Tap to start terminal</span>
                  <span class="text-xs font-bold bg-cyan-600 group-hover:bg-cyan-500 text-white px-3.5 py-1.5 rounded-xl shadow-md transition-all">
                    Launch →
                  </span>
                </div>
              </button>
            {/each}
          </div>
        {/if}
      </div>

    {:else if isSubmitted}
      <div in:scale={{ duration: 400, start: 0.95 }} class="text-center space-y-6 py-8 sm:py-12">
        <div class="text-6xl sm:text-7xl md:text-8xl animate-bounce">🎉</div>
        <h2 class="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-emerald-500 via-cyan-600 to-blue-600 dark:from-emerald-400 dark:via-cyan-400 dark:to-blue-500 bg-clip-text text-transparent">
          Thank You!
        </h2>
        <p class="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Your responses have been securely logged. Resetting in 
          <span class="text-cyan-600 dark:text-cyan-400 font-mono font-bold text-lg sm:text-xl px-1">{countdownSeconds}s</span>...
        </p>
        <button 
          on:click={resetTerminal}
          class="mt-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 px-6 py-3 sm:px-8 sm:py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xl">
          Restart Now ➔
        </button>
      </div>

    {:else}
      <div key={currentQuestionIndex} in:fly={{ y: 20, duration: 400 }} class="space-y-6 sm:space-y-8">
        
        <div class="text-center space-y-2 sm:space-y-3">
          <div class="flex items-center justify-center space-x-2">
            <span class="text-[11px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase font-mono">Feedback Request</span>
            {#if currentQuestion.isRequired}
              <span class="text-rose-600 dark:text-rose-400 font-bold text-xs bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md">* Required Field</span>
            {/if}
          </div>

          {#if currentQuestion.questionImage}
            <div class="max-w-xl mx-auto h-48 sm:h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl mb-4">
              <img src={currentQuestion.questionImage} alt={currentQuestion.questionText} class="w-full h-full object-cover" />
            </div>
          {/if}

          <h1 class="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-navy-950 dark:text-white leading-tight max-w-3xl mx-auto px-2">
            {currentQuestion.questionText}
          </h1>

          {#if validationError}
            <div class="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 px-4 py-2 rounded-xl inline-block mt-2 animate-pulse">
              ⚠️ {validationError}
            </div>
          {/if}
        </div>

        <div class="w-full">
          {#if getNormalizedType(currentQuestion.type) === 'smiley'}
            <div class="grid grid-cols-5 gap-2 sm:gap-4 md:gap-6 max-w-3xl mx-auto px-1 sm:px-2">
              {#each satisfactionScale as option}
                <button 
                  on:click={() => handleSelectOption(`${option.emoji} ${option.label}`)}
                  class="flex flex-col items-center justify-center p-3 py-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border transition-all duration-200 group active:scale-95 backdrop-blur-sm shadow-md {option.color}">
                  <span class="text-4xl sm:text-6xl md:text-7xl transform group-hover:scale-110 transition-transform duration-200 select-none filter drop-shadow-md">
                    {option.emoji}
                  </span>
                  <span class="hidden sm:block mt-3 md:mt-5 text-[10px] sm:text-xs font-black tracking-widest uppercase font-mono opacity-70 group-hover:opacity-100">
                    {option.label}
                  </span>
                </button>
              {/each}
            </div>

          {:else if getNormalizedType(currentQuestion.type) === 'stars'}
            <div 
              class="flex items-center justify-center space-x-2 sm:space-x-4 md:space-x-6 max-w-xl mx-auto"
              on:mouseleave={() => hoveredStarIndex = 0}
            >
              {#each [1, 2, 3, 4, 5] as starValue}
                <button 
                  type="button"
                  on:mouseenter={() => hoveredStarIndex = starValue}
                  on:click={() => handleSelectOption(`${starValue} Stars`)}
                  class="text-5xl sm:text-7xl md:text-8xl transform hover:scale-125 active:scale-95 transition-all duration-150 outline-none select-none filter drop-shadow-md focus:outline-none"
                  style="color: {starValue <= (hoveredStarIndex || 0) ? '#f59e0b' : '#cbd5e1'}"
                >
                  {starValue <= (hoveredStarIndex || 0) ? '★' : '☆'}
                </button>
              {/each}
            </div>

          {:else if getNormalizedType(currentQuestion.type) === 'multiple-choice'}
            <div class="max-w-2xl mx-auto space-y-4 px-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      class="w-full text-left bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all shadow-md active:scale-[0.99] flex flex-col justify-between group {currentQuestion.allowMultiple && isSelected ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-800 dark:text-cyan-300' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'}"
                    >
                      {#if imgUrl}
                        <div class="w-full h-32 mb-3 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                          <img src={imgUrl} alt={option} class="w-full h-full object-cover" />
                        </div>
                      {/if}

                      <div class="flex items-center justify-between w-full">
                        <span class="text-base sm:text-lg font-bold group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">{option}</span>
                        {#if currentQuestion.allowMultiple}
                          <div class="w-6 h-6 rounded-lg border flex items-center justify-center transition-all {isSelected ? 'bg-cyan-600 border-cyan-500 text-white font-bold' : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950'}">
                            {#if isSelected}✓{/if}
                          </div>
                        {:else}
                          <span class="text-slate-400 dark:text-slate-600 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 font-extrabold text-base transition-colors">➔</span>
                        {/if}
                      </div>
                    </button>
                  {/each}
                {/if}
              </div>

              {#if currentQuestion.allowMultiple}
                <button
                  on:click={advanceStep}
                  class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-6 text-sm sm:text-base rounded-2xl transition-all shadow-lg active:scale-[0.98] mt-4 flex items-center justify-center space-x-2"
                >
                  <span>Confirm & Continue</span>
                  <span>➔</span>
                </button>
              {/if}
            </div>

          {:else}
            <!-- SHORT ANSWER TEXT AREA -->
            <form on:submit|preventDefault={advanceStep} class="max-w-xl mx-auto space-y-3 sm:space-y-4 px-2">
              <input 
                type="text" 
                bind:value={selectedValue}
                on:input={() => (validationError = "")}
                placeholder={currentQuestion.isRequired ? "Type your response here (Required)..." : "Type your response here..."}
                class="w-full bg-white dark:bg-slate-900 border text-navy-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 rounded-2xl p-4 sm:p-5 text-sm sm:text-base md:text-lg outline-none transition-all shadow-inner {validationError ? 'border-rose-500 focus:border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'}"
              />
              <button 
                type="submit"
                class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 sm:py-4 px-6 text-xs sm:text-sm md:text-base rounded-2xl transition-all shadow-lg active:scale-[0.98]">
                Submit Field Input ➔
              </button>
            </form>
          {/if}
        </div>

      </div>
    {/if}
  </main>

  <!-- FOOTER -->
  <footer class="w-full max-w-5xl border-t border-slate-200 dark:border-slate-800/80 pt-4 sm:pt-5 flex flex-col md:flex-row items-center justify-between text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wider font-semibold gap-3 shrink-0">
    <span>🔒 Secure Enterprise Client Terminal</span>
    {#if activeSurveyId && !isSubmitted && questions.length > 0}
      <div class="w-full md:w-56 h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
        <div 
          class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full" 
          style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%">
        </div>
      </div>
    {/if}
    <span>System v2.4.0</span>
  </footer>

</div>

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
</style>