<script>
  export let surveyTitle = '';
  export let questions = [];
  export let onSubmitResponse = (answers) => {};

  let currentQuestionIndex = 0;
  let kioskAnswers = {};
  let kioskSubmitted = false;
  let countdown = 3; 
  let intervalId;

  // Star Rating Interaction State
  let hoveredStarIndex = 0; 

  function handleAnswer(questionText, answerValue) {
    kioskAnswers[questionText] = answerValue;
    hoveredStarIndex = 0; // Reset star view state for the next question
    
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
    } else {
      triggerSurveyCompletion();
    }
  }

  function triggerSurveyCompletion() {
    const formattedAnswers = questions.map(q => ({
      questionText: q.questionText,
      value: kioskAnswers[q.questionText] || 'Skipped'
    }));
    
    onSubmitResponse(formattedAnswers);
    kioskSubmitted = true;
    countdown = 3; 

    intervalId = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(intervalId);
        resetKioskTerminal();
      }
    }, 1000);
  }

  function resetKioskTerminal() {
    clearInterval(intervalId);
    currentQuestionIndex = 0;
    kioskAnswers = {};
    kioskSubmitted = false;
    hoveredStarIndex = 0;
  }
</script>

<div class="w-full max-w-3xl mx-auto pt-4 animate-fade">
  {#if questions.length === 0}
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
      <div class="text-slate-500 text-4xl mb-3">📝</div>
      <p class="text-slate-300 font-medium text-base">No active fields deployed.</p>
      <p class="text-slate-500 text-xs mt-1">Populate the questionnaire structure inside the Form Designer framework first.</p>
    </div>
  {:else}
    <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
      
      <!-- Top Status Banner -->
      <div class="bg-slate-900 px-6 py-4.5 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="h-2 w-2 rounded-full bg-cyan-500 animate-pulse"></span>
          <span class="text-xs font-bold tracking-widest text-slate-400 uppercase">Terminal Mode</span>
        </div>
        <span class="text-xs font-bold bg-slate-950 px-3 py-1.5 rounded-xl text-cyan-400 border border-slate-800/80">
          Field {currentQuestionIndex + 1} of {questions.length}
        </span>
      </div>

      <!-- ACTIVE SURVEY SCREEN -->
      {#if !kioskSubmitted}
        <div class="p-12 space-y-12 text-center min-h-[380px] flex flex-col justify-between">
          
          <div class="space-y-2">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-widest block">{surveyTitle}</span>
            <h2 class="text-3xl font-extrabold tracking-tight text-white leading-tight px-4 mt-2">
              {questions[currentQuestionIndex].questionText}
            </h2>
          </div>

          <div class="w-full">
            
            <!-- 1. UPGRADED 5-SMILEY MATRIX WITH LABELS -->
            {#if questions[currentQuestionIndex].type === 'smiley'}
              <div class="space-y-6">
                <div class="flex items-center justify-center space-x-3 sm:space-x-4 md:space-x-6">
                  
                  <!-- ANGRY -->
                  <div class="flex flex-col items-center space-y-2.5 group">
                    <button on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, '🤬 Angry')} class="text-5xl md:text-6xl transform active:scale-95 hover:bg-slate-800/80 transition-all p-4 bg-slate-950 rounded-full border border-slate-800 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/10 shadow-md duration-150" type="button">
                      🤬
                    </button>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-red-400/80 transition-colors">Angry</span>
                  </div>

                  <!-- DISSATISFIED -->
                  <div class="flex flex-col items-center space-y-2.5 group">
                    <button on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, '😞 Dissatisfied')} class="text-5xl md:text-6xl transform active:scale-95 hover:bg-slate-800/80 transition-all p-4 bg-slate-950 rounded-full border border-slate-800 hover:border-orange-400/60 hover:shadow-lg hover:shadow-orange-400/10 shadow-md duration-150" type="button">
                      😞
                    </button>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-orange-400/80 transition-colors">Sad</span>
                  </div>

                  <!-- NEUTRAL -->
                  <div class="flex flex-col items-center space-y-2.5 group">
                    <button on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, '😐 Neutral')} class="text-5xl md:text-6xl transform active:scale-95 hover:bg-slate-800/80 transition-all p-4 bg-slate-950 rounded-full border border-slate-800 hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-400/10 shadow-md duration-150" type="button">
                      😐
                    </button>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-400/80 transition-colors">Neutral</span>
                  </div>

                  <!-- SATISFIED -->
                  <div class="flex flex-col items-center space-y-2.5 group">
                    <button on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, '😊 Satisfied')} class="text-5xl md:text-6xl transform active:scale-95 hover:bg-slate-800/80 transition-all p-4 bg-slate-950 rounded-full border border-slate-800 hover:border-lime-400/60 hover:shadow-lg hover:shadow-lime-400/10 shadow-md duration-150" type="button">
                      😊
                    </button>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-lime-400/80 transition-colors">Happy</span>
                  </div>

                  <!-- DELIGHTED -->
                  <div class="flex flex-col items-center space-y-2.5 group">
                    <button on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, '🤩 Delighted')} class="text-5xl md:text-6xl transform active:scale-95 hover:bg-slate-800/80 transition-all p-4 bg-slate-950 rounded-full border border-slate-800 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/10 shadow-md duration-150" type="button">
                      🤩
                    </button>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-400/80 transition-colors">Delighted</span>
                  </div>

                </div>
              </div>
            {/if}

            <!-- 2. TRADITIONAL 5-STAR RATING WITH HOVER STATE -->
            {#if questions[currentQuestionIndex].type === 'stars'}
              <div class="space-y-4">
                <div class="flex items-center justify-center space-x-4 py-4" on:mouseleave={() => hoveredStarIndex = 0}>
                  {#each [1, 2, 3, 4, 5] as starValue}
                    <button 
                      on:mouseenter={() => hoveredStarIndex = starValue}
                      on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, `${starValue} Stars`)}
                      class="text-6xl transform transition-all duration-100 focus:outline-none active:scale-75 hover:scale-110"
                      type="button"
                    >
                      <svg 
                        class="h-16 w-16 transition-colors duration-100 {starValue <= hoveredStarIndex ? 'text-amber-400 fill-amber-400' : 'text-slate-700 fill-slate-800'}" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                      </svg>
                    </button>
                  {/each}
                </div>
                <div class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {#if hoveredStarIndex > 0}
                    Rating: <span class="text-amber-400 font-bold">{hoveredStarIndex} / 5</span>
                  {:else}
                    Select a rating
                  {/if}
                </div>
              </div>
            {/if}

            <!-- 3. MULTIPLE CHOICE RADIO LAYOUT -->
            {#if questions[currentQuestionIndex].type === 'multiple-choice'}
              <div class="flex flex-col space-y-2.5 max-w-md mx-auto">
                {#each questions[currentQuestionIndex].options as choiceSelection}
                  <button on:click={() => handleAnswer(questions[currentQuestionIndex].questionText, choiceSelection)} class="w-full text-center bg-slate-950 border border-slate-800 hover:bg-slate-800/60 hover:border-cyan-500/40 text-sm font-bold py-4 rounded-2xl transition-all duration-150 text-slate-300 shadow-sm active:scale-[0.99]">
                    {choiceSelection}
                  </button>
                {/each}
              </div>
            {/if}

            <!-- 4. SHORT ANSWER FIELD -->
            {#if questions[currentQuestionIndex].type === 'text'}
              <div class="space-y-4 max-w-xl mx-auto">
                <textarea id="kiosk-text-area" rows="4" placeholder="Tap here to share your detailed comments..." class="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-2xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"></textarea>
                <button on:click={() => {
                  const comments = document.getElementById('kiosk-text-area').value;
                  handleAnswer(questions[currentQuestionIndex].questionText, comments || 'No Comments Logged');
                }} class="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-cyan-600/10 active:scale-[0.99] transition-all duration-150">
                  Submit Feedback
                </button>
              </div>
            {/if}

          </div>

          <div class="text-[10px] text-slate-600 tracking-wider font-semibold">
            SECURE CLIENT TERMINAL
          </div>

        </div>
      {:else}
        
        <!-- AUTOMATED RESET WINDOW -->
        <div class="p-16 text-center space-y-6 min-h-[380px] flex flex-col justify-center items-center animate-fade">
          <div class="h-20 w-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center text-4xl font-bold shadow-inner">
            ✓
          </div>
          <div class="space-y-2">
            <h2 class="text-3xl font-extrabold text-white tracking-tight">Response Submitted</h2>
            <p class="text-slate-400 text-sm max-w-xs mx-auto">Thank you for your feedback! Your data package has been compiled and secured.</p>
          </div>
          
          <div class="pt-4">
            <div class="inline-flex items-center space-x-2 bg-slate-950 px-4 py-2 rounded-full border border-slate-800/80">
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cycling in</span>
              <span class="text-xs font-extrabold text-cyan-400 font-mono w-4">{countdown}s</span>
            </div>
          </div>
        </div>

      {/if}
    </div>
  {/if}
</div>