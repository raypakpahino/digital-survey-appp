<script>
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  
  export let surveyTitle = "Feedback Terminal";
  export let questions = [];
  export let onSubmitResponse = (answers) => {};

  let currentQuestionIndex = 0;
  let answersAccumulator = [];
  let selectedValue = "";
  let isSubmitted = false;
  
  // Interactive Star Hover Tracking
  let hoveredStarIndex = 0;
  let autoResetTimer;
  let countdownSeconds = 4;

  $: currentQuestion = questions[currentQuestionIndex] || null;

  const satisfactionScale = [
    { label: "ANGRY", emoji: "🤬", color: "hover:bg-rose-500/20 hover:border-rose-500 text-rose-400 bg-rose-950/20 border-rose-900/40" },
    { label: "SAD", emoji: "😞", color: "hover:bg-orange-500/20 hover:border-orange-500 text-orange-400 bg-orange-950/20 border-orange-900/40" },
    { label: "NEUTRAL", emoji: "😐", color: "hover:bg-amber-500/20 hover:border-amber-500 text-amber-400 bg-amber-950/20 border-amber-900/40" },
    { label: "HAPPY", emoji: "😊", color: "hover:bg-emerald-500/20 hover:border-emerald-500 text-emerald-400 bg-emerald-950/20 border-emerald-900/40" },
    { label: "DELIGHTED", emoji: "🤩", color: "hover:bg-cyan-500/20 hover:border-cyan-500 text-cyan-400 bg-cyan-950/20 border-cyan-900/40" }
  ];

  function handleSelectOption(value) {
    selectedValue = value;
    setTimeout(() => {
      advanceStep();
    }, 250);
  }

  function advanceStep() {
    if (!currentQuestion) return;

    answersAccumulator = [
      ...answersAccumulator,
      { questionText: currentQuestion.questionText, value: selectedValue || "Skipped" }
    ];

    selectedValue = "";
    hoveredStarIndex = 0;

    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex += 1;
    } else {
      isSubmitted = true;
      onSubmitResponse(answersAccumulator);
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
    hoveredStarIndex = 0;
    isSubmitted = false;
  }

  onDestroy(() => {
    clearInterval(autoResetTimer);
  });
</script>

<div class="w-full min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6 md:p-12 text-slate-100 font-sans selection:bg-cyan-500/30">
  
  <header class="w-full max-w-4xl flex items-center justify-between border-b border-slate-800/60 pb-6 shrink-0">
    <div class="flex items-center space-x-3">
      <div class="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
      <span class="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase">{surveyTitle}</span>
    </div>
    {#if !isSubmitted && questions.length > 0}
      <div class="bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 text-[11px] font-bold text-cyan-400 font-mono tracking-wide">
        QUESTION {currentQuestionIndex + 1} OF {questions.length}
      </div>
    {/if}
  </header>

  <main class="w-full max-w-4xl flex-1 flex flex-col justify-center my-8">
    {#if isSubmitted}
      <!-- THANK YOU SCREEN WITH ACTIVE AUTO-REFRESH ENGINE -->
      <div in:scale={{ duration: 400, start: 0.95 }} class="text-center space-y-6 py-12">
        <div class="text-6xl md:text-7xl animate-bounce">🎉</div>
        <h2 class="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Thank You!
        </h2>
        <p class="text-sm md:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
          Your responses have been securely logged. This terminal screen will automatically cycle back to the beginning in 
          <span class="text-cyan-400 font-mono font-bold text-lg px-1">{countdownSeconds}s</span>...
        </p>
        <button 
          on:click={resetTerminal}
          class="mt-4 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-6 py-3 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-xl">
          Restart Now ➔
        </button>
      </div>

    {:else if !currentQuestion}
      <div in:fade class="text-center text-slate-500 py-12 text-sm max-w-md mx-auto">
        ⚠️ No interactive questionnaire structure loaded inside this instance layout.
      </div>

    {:else}
      <div key={currentQuestionIndex} in:fly={{ y: 20, duration: 400 }} class="space-y-10 md:space-y-12">
        
        <div class="text-center space-y-2">
          <span class="text-[10px] font-bold text-slate-500 tracking-widest uppercase font-mono block">Feedback Request</span>
          <h1 class="text-2xl md:text-5xl font-black tracking-tight text-white leading-tight max-w-3xl mx-auto px-2">
            {currentQuestion.questionText}
          </h1>
        </div>

        <div class="w-full">
          {#if currentQuestion.type === 'smiley'}
            <div class="grid grid-cols-5 gap-3 md:gap-6 max-w-3xl mx-auto px-2">
              {#each satisfactionScale as option}
                <button 
                  on:click={() => handleSelectOption(`${option.emoji} ${option.label}`)}
                  class="flex flex-col items-center justify-center p-3 py-5 md:p-6 rounded-3xl border transition-all duration-200 group active:scale-95 backdrop-blur-sm shadow-lg {option.color}">
                  <span class="text-4xl md:text-6xl transform group-hover:scale-110 transition-transform duration-200 select-none filter drop-shadow-md">
                    {option.emoji}
                  </span>
                  <span class="hidden md:block mt-4 text-[10px] font-black tracking-widest uppercase font-mono opacity-60 group-hover:opacity-100">
                    {option.label}
                  </span>
                </button>
              {/each}
            </div>

          {:else if currentQuestion.type === 'stars'}
            <!-- FLUID INTERACTIVE 5-STAR RATING SYSTEM -->
            <div 
              class="flex items-center justify-center space-x-2 md:space-x-4 max-w-xl mx-auto"
              on:mouseleave={() => hoveredStarIndex = 0}
            >
              {#each [1, 2, 3, 4, 5] as starValue}
                <button 
                  type="button"
                  on:mouseenter={() => hoveredStarIndex = starValue}
                  on:click={() => handleSelectOption(`${starValue} Stars`)}
                  class="text-5xl md:text-7xl transform hover:scale-125 active:scale-95 transition-all duration-150 outline-none select-none filter drop-shadow-md focus:outline-none"
                  style="color: {starValue <= (hoveredStarIndex || 0) ? '#fbbf24' : '#334155'}"
                >
                  {starValue <= (hoveredStarIndex || 0) ? '★' : '☆'}
                </button>
              {/each}
            </div>

          {:else}
            <div class="max-w-xl mx-auto space-y-4 px-2">
              <input 
                type="text" 
                bind:value={selectedValue}
                placeholder="Type your response summary profile here..."
                class="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-600 rounded-2xl p-4 text-sm md:text-base outline-none transition-all shadow-inner"
              />
              <button 
                on:click={advanceStep}
                class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-6 text-sm rounded-2xl transition-all shadow-lg active:scale-[0.98]">
                Submit Field Input ➔
              </button>
            </div>
          {/if}
        </div>

      </div>
    {/if}
  </main>

  <footer class="w-full max-w-4xl border-t border-slate-800/40 pt-6 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-600 uppercase font-mono tracking-widest font-semibold gap-3 shrink-0">
    <span>🔒 Secure Enterprise Client Terminal</span>
    {#if !isSubmitted && questions.length > 0}
      <div class="w-full md:w-48 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800/60">
        <div 
          class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full" 
          style="width: {((currentQuestionIndex + 1) / questions.length) * 100}%">
        </div>
      </div>
    {/if}
    <span>System v2.4.0</span>
  </footer>

</div>