<script>
  export let surveyTitle = "";
  export let questions = [];
  export let surveys = [];
  export let activeSurveyId = "";
  export let onSaveSurvey = (title, qs) => {};
  export let onSelectSurvey = (id) => {};
  export let onCreateNewSurvey = () => {};

  // Local Draft State (prevents Kiosk and App from reacting until Save is clicked)
  let localTitle = "";
  let localQuestions = [];

  // Re-sync the local working copy when the parent changes the active survey
  $: {
    let dummy = activeSurveyId; // Tells Svelte to re-run this block on ID change
    localTitle = surveyTitle || "";
    localQuestions = JSON.parse(JSON.stringify(questions || []));
  }

  const availableComponents = [
    {
      type: "smiley",
      icon: "😊",
      label: "Smiley Matrix",
      desc: "CSAT smiley faces",
    },
    {
      type: "stars",
      icon: "⭐",
      label: "Star Scale",
      desc: "1-5 star rating review",
    },
    {
      type: "multiple-choice",
      icon: "🔘",
      label: "Multiple Choice",
      desc: "Radio button selection",
    },
    {
      type: "text",
      icon: "📝",
      label: "Short Answer",
      desc: "Open text area feedback",
    },
  ];

  function dropComponent(type) {
    let defaultText = "";
    let defaultOptions = [];

    if (type === "smiley")
      defaultText = "How would you rate your experience today?";
    if (type === "stars")
      defaultText = "How would you rate our speed of service?";
    if (type === "multiple-choice") {
      defaultText = "Would you recommend us to a friend?";
      defaultOptions = ["Definitely Yes", "Maybe", "No"];
    }
    if (type === "text") defaultText = "Do you have any additional comments?";

    localQuestions = [
      ...localQuestions,
      { 
        type, 
        questionText: defaultText, 
        questionImage: "",
        isRequired: false, 
        allowMultiple: false, 
        enableOptionImages: false, 
        options: defaultOptions,
        optionImages: {}
      }
    ];
  }

  function addOption(qIndex) {
    localQuestions[qIndex].options = [
      ...localQuestions[qIndex].options,
      `Option ${localQuestions[qIndex].options.length + 1}`,
    ];
  }

  function removeQuestion(index) {
    localQuestions = localQuestions.filter((_, i) => i !== index);
  }

  function removeOption(qIndex, optIndex) {
    const optionName = localQuestions[qIndex].options[optIndex];
    localQuestions[qIndex].options = localQuestions[qIndex].options.filter(
      (_, i) => i !== optIndex,
    );
    if (localQuestions[qIndex].optionImages && localQuestions[qIndex].optionImages[optionName]) {
      delete localQuestions[qIndex].optionImages[optionName];
    }
  }

  function updateOptionImageUrl(question, optionKey, urlValue) {
    if (!question.optionImages) {
      question.optionImages = {};
    }
    question.optionImages[optionKey] = urlValue;
    localQuestions = localQuestions;
  }

  function handlePasteImageUrl(event, question, optionKey) {
    event.stopPropagation();
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    if (pastedText) {
      updateOptionImageUrl(question, optionKey, pastedText);
    }
  }

  function handlePasteQuestionImage(event, question) {
    event.stopPropagation();
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    if (pastedText) {
      question.questionImage = pastedText;
      localQuestions = localQuestions;
    }
  }

  function triggerExplicitSave() {
    // Send local edits back to App.svelte explicitly
    onSaveSurvey(localTitle, localQuestions);
    alert("💾 Form schema states committed and deployed successfully!");
  }

  function getNormalizedType(qType) {
    if (!qType) return "";
    return String(qType).toLowerCase().replace(/_/g, "-");
  }
</script>

<div
  class="w-full h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-8 animate-fade overflow-hidden box-border text-slate-100"
>
  <!-- LEFT SIDEBAR: COMPONENT TOOLBOX TRAY -->
  <div
    class="w-full lg:w-80 bg-slate-900 border border-slate-800/80 rounded-2xl p-6 shrink-0 flex flex-col justify-between shadow-xl h-full box-border"
  >
    <div class="space-y-6">
      <div>
        <h3 class="text-sm font-bold text-white uppercase tracking-wider">
          Form Components
        </h3>
        <p class="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Click a layout element below to drop it instantly into your design
          canvas workspace.
        </p>
      </div>

      <div class="space-y-3">
        {#each availableComponents as comp}
          <button
            on:click={() => dropComponent(comp.type)}
            class="w-full text-left bg-slate-950/40 border border-slate-800/60 hover:border-cyan-500/40 p-4 rounded-xl flex items-center space-x-4 transition-all group active:scale-[0.98]"
          >
            <span
              class="text-2xl bg-slate-900 border border-slate-800 h-12 w-12 rounded-xl flex items-center justify-center group-hover:bg-cyan-950/30 group-hover:border-cyan-900/40 group-hover:text-cyan-400 transition-all shadow-inner"
              >{comp.icon}</span
            >
            <div>
              <p
                class="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-all"
              >
                {comp.label}
              </p>
              <p class="text-[11px] text-slate-400 mt-0.5 leading-normal">
                {comp.desc}
              </p>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div class="pt-6 border-t border-slate-800/80 mt-6 hidden lg:block">
      <div
        class="bg-slate-950 border border-slate-800/40 p-4 rounded-xl text-center shadow-inner"
      >
        <span
          class="text-[10px] font-bold text-slate-500 tracking-widest uppercase block"
          >Interactive Canvas</span
        >
        <p class="text-[11px] text-slate-500 mt-1 leading-normal">
          Requires manual verification commitment before loading onto terminals.
        </p>
      </div>
    </div>
  </div>

  <!-- RIGHT: THE DESIGN CANVAS WORKSPACE -->
  <div
    class="flex-1 bg-slate-900 border border-slate-800/80 rounded-2xl p-8 flex flex-col shadow-xl h-full overflow-hidden box-border"
  >
    <!-- TOP CONTROL BAR -->
    <div
      class="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 shadow-inner"
    >
      <div
        class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <label
          for="survey-selector"
          class="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
        >
          Target Schema:
        </label>
        <select
          id="survey-selector"
          value={activeSurveyId}
          on:change={(e) => onSelectSurvey(e.target.value)}
          class="bg-slate-900 border border-slate-800 text-cyan-400 font-bold text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-all w-full sm:w-auto flex-1 cursor-pointer"
        >
          {#if surveys.length === 0}
            <option value="" disabled>No surveys available</option>
          {:else}
            {#each surveys as survey}
              <option value={survey._id}>
                {survey.title || "Untitled Form"} ({survey.questions?.length ||
                  0} fields)
              </option>
            {/each}
          {/if}
        </select>
      </div>

      <button
        on:click={onCreateNewSurvey}
        class="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center space-x-1.5 active:scale-[0.98]"
      >
        <span>+</span> <span>Create New Form</span>
      </button>
    </div>

    <!-- Title Input Section -->
    <div class="space-y-3 shrink-0 mt-6">
      <label
        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block"
        for="form-heading">Form Name Header</label
      >
      <input
        id="form-heading"
        type="text"
        bind:value={localTitle}
        class="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-semibold shadow-inner"
        placeholder="Enter survey identity..."
      />
    </div>

    <hr class="border-slate-800/80 my-6 shrink-0" />

    <!-- Header Grid Tracker -->
    <div
      class="flex items-center justify-between border-b border-slate-800/40 pb-3 shrink-0"
    >
      <h3
        class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"
      >
        Active Canvas Stack
      </h3>
      <span
        class="text-xs font-bold bg-slate-950 px-2.5 py-1 rounded-md text-cyan-400 border border-slate-800"
        >{localQuestions.length} Items</span
      >
    </div>

    <!-- FIELD CANVAS CONTAINER -->
    <div
      class="flex-1 overflow-y-auto mt-6 pr-2 custom-scrollbar box-border pb-4"
    >
      {#if localQuestions.length === 0}
        <div
          class="border-2 border-dashed border-slate-800 rounded-2xl p-16 text-center text-slate-400 text-sm leading-relaxed mt-2"
        >
          Canvas is completely empty. Click components from the left toolbox bar
          to assemble your form configuration layout.
        </div>
      {:else}
        <div class="flex flex-col gap-6">
          {#each localQuestions as question, index}
            {@const normType = getNormalizedType(question.type)}

            <div
              class="bg-slate-950/60 border border-slate-800/80 p-6 rounded-2xl space-y-5 group hover:border-slate-700 hover:bg-slate-950 transition-all duration-200 shadow-sm relative"
            >
              <!-- Card Header -->
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 space-y-3">
                  <div class="flex items-center space-x-2.5">
                    <span
                      class="bg-slate-900 text-slate-300 h-6 w-6 rounded-lg text-xs font-mono border border-slate-800 flex items-center justify-center font-bold shadow-inner"
                      >{index + 1}</span
                    >
                    <span
                      class="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-md bg-slate-900 text-cyan-400 border border-slate-800 tracking-wider font-mono"
                      >{question.type}</span
                    >
                    {#if question.isRequired}
                      <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-400 border border-rose-800/60 tracking-wider font-mono">
                        REQUIRED
                      </span>
                    {/if}
                  </div>

                  <input
                    type="text"
                    bind:value={question.questionText}
                    class="w-full bg-transparent border-b border-transparent text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0 focus:border-slate-700 py-1 text-base font-semibold transition-all"
                  />

                  <!-- UNIVERSAL QUESTION HEADER IMAGE URL (FOR ALL QUESTION TYPES) -->
                  <div class="flex items-center space-x-2 pt-1" on:click|stopPropagation>
                    <span class="text-[11px] font-mono font-bold text-cyan-400 shrink-0">🖼️ Question Header Image:</span>
                    <input
                      type="text"
                      bind:value={question.questionImage}
                      on:paste={(e) => handlePasteQuestionImage(e, question)}
                      placeholder="https://example.com/header-image.jpg (Optional)"
                      class="flex-1 bg-slate-900 border border-slate-800 text-[11px] text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  on:click={() => removeQuestion(index)}
                  class="text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl transition-all shrink-0 shadow-sm"
                >
                  Delete
                </button>
              </div>

              <!-- Options Subgrid for Multiple Choice -->
              {#if normType === "multiple-choice"}
                <div
                  class="pl-0 sm:pl-2 pt-4 border-t border-slate-900/80 mt-2 space-y-3"
                >
                  <span
                    class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block"
                    >Configure Choice Options:</span
                  >
                  <div class="grid grid-cols-1 gap-3">
                    {#each question.options as option, optIndex}
                      <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 shadow-sm space-y-2">
                        <div class="flex items-center space-x-2">
                          <input
                            type="text"
                            bind:value={question.options[optIndex]}
                            placeholder={`Option ${optIndex + 1}`}
                            class="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-cyan-500 w-full font-medium"
                          />
                          <button
                            on:click={() => removeOption(index, optIndex)}
                            class="text-slate-400 hover:text-rose-400 text-sm px-2 font-bold transition-all"
                            >✕</button
                          >
                        </div>

                        <!-- Option Image URL Field -->
                        {#if question.enableOptionImages}
                          <div class="flex items-center space-x-2 pl-2 pt-1" on:click|stopPropagation>
                            <span class="text-[10px] font-mono text-cyan-400 shrink-0">🖼️ Option Image URL:</span>
                            <input
                              type="text"
                              value={question.optionImages && question.optionImages[option] ? question.optionImages[option] : ""}
                              on:input={(e) => updateOptionImageUrl(question, option, e.target.value)}
                              on:paste={(e) => handlePasteImageUrl(e, question, option)}
                              placeholder="https://images.unsplash.com/photo-..."
                              class="flex-1 bg-slate-950 border border-slate-800 text-[11px] text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        {/if}
                      </div>
                    {/each}

                    <button
                      on:click={() => addOption(index)}
                      class="border border-dashed border-slate-800 hover:border-slate-600 bg-slate-900/20 hover:bg-slate-900/40 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-bold py-2.5 transition-all shadow-sm flex items-center justify-center space-x-1"
                    >
                      <span>+ Insert Option</span>
                    </button>
                  </div>
                </div>
              {/if}

              <!-- TOGGLES SECTION -->
              <div class="pt-4 border-t border-slate-900/80 space-y-3 max-w-md">
                
                {#if normType === 'multiple-choice'}
                  <!-- 1. ENABLE IMAGES FOR OPTIONS -->
                  <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span class="text-xs font-semibold text-slate-300">Enable images for options</span>
                    <button
                      type="button"
                      on:click={() => {
                        question.enableOptionImages = !question.enableOptionImages;
                        if (!question.optionImages) question.optionImages = {};
                      }}
                      class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-700/80 {question.enableOptionImages ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-800'}"
                    >
                      <div
                        class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.enableOptionImages ? 'translate-x-6' : 'translate-x-0'}"
                      ></div>
                    </button>
                  </div>

                  <!-- 2. ALLOW SELECTION OF MULTIPLE OPTIONS -->
                  <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                    <span class="text-xs font-semibold text-slate-300">Allow selection of multiple options</span>
                    <button
                      type="button"
                      on:click={() => (question.allowMultiple = !question.allowMultiple)}
                      class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-700/80 {question.allowMultiple ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-800'}"
                    >
                      <div
                        class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.allowMultiple ? 'translate-x-6' : 'translate-x-0'}"
                      ></div>
                    </button>
                  </div>
                {/if}

                <!-- 3. REQUIRED QUESTION -->
                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                  <span class="text-xs font-semibold text-slate-300">Required question</span>
                  <button
                    type="button"
                    on:click={() => (question.isRequired = !question.isRequired)}
                    class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-700/80 {question.isRequired ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-800'}"
                  >
                    <div
                      class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.isRequired ? 'translate-x-6' : 'translate-x-0'}"
                    ></div>
                  </button>
                </div>

              </div>

            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- CANVAS FOOTER -->
    <div
      class="pt-4 border-t border-slate-800/60 flex items-center justify-end shrink-0 bg-slate-900"
    >
      <button
        on:click={triggerExplicitSave}
        disabled={localQuestions.length === 0 || !localTitle.trim()}
        class="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-3.5 px-6 rounded-xl transition-all shadow-md shadow-cyan-600/10 flex items-center space-x-2 active:scale-[0.98] disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <span>💾</span> <span>Save & Deploy Schema</span>
      </button>
    </div>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #1e293b;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #334155;
  }
</style>