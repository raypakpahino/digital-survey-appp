<script>
  export let surveyTitle = "";
  export let questions = [];
  export let surveys = [];
  export let activeSurveyId = "";
  export let onSaveSurvey = (title, qs) => {};
  export let onSelectSurvey = (id) => {};
  export let onCreateNewSurvey = () => {};

  let localTitle = "";
  let localQuestions = [];
  let saveContainerRef;
  let lastLoadedSurveyId = "";

  // DRAGGABLE RESIZER STATE
  let leftPanelWidth = 320;
  let isResizing = false;

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
    const minWidth = 220;
    const maxWidth = 500;
    const updatedWidth = leftPanelWidth + event.movementX;

    if (updatedWidth >= minWidth && updatedWidth <= maxWidth) {
      leftPanelWidth = updatedWidth;
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

  $: if (activeSurveyId !== lastLoadedSurveyId || localQuestions.length === 0) {
    lastLoadedSurveyId = activeSurveyId;
    localTitle = surveyTitle || "";
    localQuestions = (questions || []).map((q) => ({
      ...q,
      skipLogic: q.skipLogic ? {
        enabled: Boolean(q.skipLogic.enabled),
        dependsOnIndex: q.skipLogic.dependsOnIndex ?? 0,
        requiredValue: q.skipLogic.requiredValue || ""
      } : {
        enabled: false,
        dependsOnIndex: 0,
        requiredValue: ""
      }
    }));
  }

  const availableComponents = [
    {
      type: "smiley",
      svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z",
      label: "Smiley Matrix",
      desc: "CSAT smiley faces",
    },
    {
      type: "stars",
      svgPath: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
      label: "Star Scale",
      desc: "1-5 star rating review",
    },
    {
      type: "multiple-choice",
      svgPath: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z",
      label: "Multiple Choice",
      desc: "Radio button selection",
    },
    {
      type: "text",
      svgPath: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
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
        optionImages: {},
        skipLogic: {
          enabled: false,
          dependsOnIndex: 0,
          requiredValue: ""
        }
      }
    ];
  }

  // REORDER QUESTION UP/DOWN WITH SKIP LOGIC RE-INDEX SAFETY
  function moveQuestion(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= localQuestions.length) return;

    const updated = [...localQuestions];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);

    // Auto-adjust skip logic pointers so dependencies remain accurate after swap
    updated.forEach((q, idx) => {
      if (q.skipLogic && q.skipLogic.enabled) {
        if (q.skipLogic.dependsOnIndex === index) {
          q.skipLogic.dependsOnIndex = targetIndex;
        } else if (q.skipLogic.dependsOnIndex === targetIndex) {
          q.skipLogic.dependsOnIndex = index;
        }
        // Safety check: Question 1 can never depend on a previous question
        if (idx === 0) {
          q.skipLogic.enabled = false;
        }
      }
    });

    localQuestions = updated;
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

  function handleQuestionImageUpload(event, question) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      question.questionImage = e.target.result;
      localQuestions = localQuestions;
    };
    reader.readAsDataURL(file);
  }

  function handleOptionImageUpload(event, question, optionKey) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (!question.optionImages) question.optionImages = {};
      question.optionImages[optionKey] = e.target.result;
      localQuestions = localQuestions;
    };
    reader.readAsDataURL(file);
  }

  function removeQuestionImage(question) {
    question.questionImage = "";
    localQuestions = localQuestions;
  }

  function removeOptionImage(question, optionKey) {
    if (question.optionImages && question.optionImages[optionKey]) {
      delete question.optionImages[optionKey];
      localQuestions = localQuestions;
    }
  }

  function scrollToSave() {
    if (saveContainerRef) {
      saveContainerRef.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  }

  function triggerExplicitSave() {
    onSaveSurvey(localTitle, localQuestions);
    alert("💾 Form schema committed and deployed successfully!");
  }

  function getNormalizedType(qType) {
    if (!qType) return "";
    return String(qType).toLowerCase().replace(/_/g, "-");
  }

  function getDependedOptions(dependedIndex) {
    if (dependedIndex === null || dependedIndex === undefined || !localQuestions[dependedIndex]) return [];
    const targetQ = localQuestions[dependedIndex];
    const type = getNormalizedType(targetQ.type);

    if (type === 'smiley') {
      return ["ANGRY", "SAD", "NEUTRAL", "HAPPY", "DELIGHTED"];
    }
    if (type === 'stars') {
      return ["1 Stars", "2 Stars", "3 Stars", "4 Stars", "5 Stars"];
    }
    if (type === 'multiple-choice') {
      return targetQ.options || [];
    }
    return [];
  }
</script>

<div class="w-full min-h-full flex flex-col lg:flex-row animate-fade overflow-visible box-border text-slate-800 dark:text-slate-100 pb-16 relative select-none">
  <!-- LEFT SIDEBAR: TOOLBOX -->
  <div
    class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shrink-0 flex flex-col justify-between shadow-md h-fit lg:sticky lg:top-4 box-border self-start z-10 transition-none"
    style="width: {leftPanelWidth}px;"
  >
    <div class="space-y-6">
      <div>
        <h3 class="text-sm font-bold text-[#1a2b6c] dark:text-white uppercase tracking-wider">
          Form Components
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          Click a layout element below to drop it instantly into your design canvas workspace.
        </p>
      </div>

      <div class="space-y-3">
        {#each availableComponents as comp}
          <button
            on:click={() => dropComponent(comp.type)}
            class="w-full text-left bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 hover:border-[#e31b23] p-3.5 rounded-xl flex items-center space-x-3.5 transition-all group active:scale-[0.98]"
          >
            <div
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-10 w-10 rounded-xl flex items-center justify-center group-hover:bg-rose-50 dark:group-hover:bg-rose-950/30 group-hover:border-[#e31b23] group-hover:text-[#e31b23] transition-all shadow-xs shrink-0 text-slate-600 dark:text-slate-300"
            >
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d={comp.svgPath}/>
              </svg>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#e31b23] transition-all">
                {comp.label}
              </p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                {comp.desc}
              </p>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div class="pt-6 border-t border-slate-200 dark:border-slate-800/80 mt-6 hidden lg:block">
      <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/40 p-4 rounded-xl text-center shadow-inner">
        <span class="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase block">Interactive Canvas</span>
        <p class="text-[11px] text-slate-500 mt-1 leading-normal">
          Requires manual verification commitment before loading onto terminals.
        </p>
      </div>
    </div>
  </div>

  <!-- INTERACTIVE RESIZER HANDLE -->
  <div
    on:mousedown={startResizing}
    class="hidden lg:flex w-4 cursor-col-resize items-center justify-center shrink-0 group transition-colors z-20 hover:bg-rose-500/10 active:bg-rose-500/20"
    title="Drag left/right to resize panels"
  >
    <div class="w-1.5 h-16 rounded-full bg-slate-300 dark:bg-slate-700/80 group-hover:bg-[#e31b23] transition-colors shadow-sm"></div>
  </div>

  <!-- RIGHT: DESIGN CANVAS WORKSPACE -->
  <div class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 sm:p-8 flex flex-col shadow-md h-auto overflow-visible box-border min-w-0">
    
    <!-- TOP CONTROL BAR -->
    <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 shadow-inner">
      <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label for="survey-selector" class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
          Target Schema:
        </label>
        <select
          id="survey-selector"
          value={activeSurveyId}
          on:change={(e) => onSelectSurvey(e.target.value)}
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#1a2b6c] dark:text-cyan-400 font-bold text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#e31b23] transition-all w-full sm:w-auto flex-1 cursor-pointer"
        >
          {#if surveys.length === 0}
            <option value="" disabled>No surveys available</option>
          {:else}
            {#each surveys as survey}
              <option value={survey._id}>
                {survey.title || "Untitled Form"} ({survey.questions?.length || 0} fields)
              </option>
            {/each}
          {/if}
        </select>
      </div>

      <div class="flex items-center space-x-2">
        {#if localQuestions.length > 0}
          <button
            type="button"
            on:click={scrollToSave}
            class="bg-[#1a2b6c] hover:bg-[#e31b23] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-200 shrink-0 flex items-center justify-center space-x-2 active:scale-95 shadow-md hover:shadow-lg hover:shadow-[#e31b23]/20 border border-[#1a2b6c] dark:border-slate-700"
            style="color: #ffffff !important;"
            title="Scroll down to Save button"
          >
            <svg class="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24" style="fill: #ffffff !important;"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>
            <span style="color: #ffffff !important; font-weight: 700 !important;">Jump to Save</span>
          </button>
        {/if}

        <button
          on:click={onCreateNewSurvey}
          class="bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center space-x-1.5 active:scale-[0.98]"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          <span>Create New Form</span>
        </button>
      </div>
    </div>

    <!-- Title Input Section -->
    <div class="space-y-2.5 shrink-0 mt-6">
      <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block" for="form-heading">Form Name Header</label>
      <input
        id="form-heading"
        type="text"
        bind:value={localTitle}
        class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 text-base text-[#1a2b6c] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-[#e31b23] transition-all font-semibold shadow-inner"
        placeholder="Enter survey identity..."
      />
    </div>

    <hr class="border-slate-200 dark:border-slate-800/80 my-6 shrink-0" />

    <!-- Header Grid Tracker -->
    <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/40 pb-3 shrink-0">
      <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Canvas Stack</h3>
      <span class="text-xs font-bold bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-md text-[#1a2b6c] dark:text-cyan-400 border border-slate-200 dark:border-slate-800">{localQuestions.length} Items</span>
    </div>

    <!-- EXPANDABLE FIELD CANVAS -->
    <div class="mt-6 box-border flex-1">
      {#if localQuestions.length === 0}
        <div class="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 dark:text-slate-500 text-sm leading-relaxed mt-2">
          Canvas is completely empty. Click components from the left toolbox bar to assemble your form configuration layout.
        </div>
      {:else}
        <div class="flex flex-col gap-6">
          {#each localQuestions as question, index}
            {@const normType = getNormalizedType(question.type)}

            <div class="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 p-6 rounded-2xl space-y-5 group hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-950 transition-all duration-200 shadow-xs relative">
              
              <!-- Card Header -->
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 space-y-3">
                  <div class="flex items-center space-x-2.5">
                    
                    <!-- REORDER BUTTONS & INDEX BADGE -->
                    <div class="flex items-center space-x-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-xs">
                      <span class="text-slate-700 dark:text-slate-300 px-2 text-xs font-mono font-bold">{index + 1}</span>
                      
                      <div class="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-1 pr-0.5 space-y-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          on:click={() => moveQuestion(index, -1)}
                          class="p-0.5 text-[9px] font-bold text-slate-500 hover:text-[#1a2b6c] dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move Question Up"
                          aria-label="Move Question Up"
                        >▲</button>
                        <button
                          type="button"
                          disabled={index === localQuestions.length - 1}
                          on:click={() => moveQuestion(index, 1)}
                          class="p-0.5 text-[9px] font-bold text-slate-500 hover:text-[#1a2b6c] dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                          title="Move Question Down"
                          aria-label="Move Question Down"
                        >▼</button>
                      </div>
                    </div>

                    <span class="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 text-[#1a2b6c] dark:text-cyan-400 border border-slate-200 dark:border-slate-800 tracking-wider font-mono">{question.type}</span>
                    {#if question.isRequired}
                      <span class="text-[9px] uppercase font-bold px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 tracking-wider font-mono">REQUIRED</span>
                    {/if}
                    {#if question.skipLogic?.enabled}
                      <span class="text-[9px] uppercase font-bold px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 tracking-wider font-mono">CONDITIONAL SKIP</span>
                    {/if}
                  </div>

                  <input
                    type="text"
                    bind:value={question.questionText}
                    class="w-full bg-transparent border-b border-transparent text-[#1a2b6c] dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-slate-300 dark:focus:border-slate-700 py-1 text-base font-semibold transition-all"
                  />

                  <!-- FILE UPLOADER: HEADER IMAGE -->
                  <div class="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
                    <span class="text-[11px] font-mono font-bold text-[#1a2b6c] dark:text-cyan-400 shrink-0 flex items-center space-x-1">
                      <svg class="w-3.5 h-3.5 fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                      <span>Header Image:</span>
                    </span>
                    
                    {#if question.questionImage}
                      <div class="flex items-center space-x-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
                        <img src={question.questionImage} alt="Header Preview" class="h-10 w-10 object-cover rounded-lg border border-slate-300 dark:border-slate-700" />
                        <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">Image Attached</span>
                        <button
                          type="button"
                          on:click={() => removeQuestionImage(question)}
                          class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 px-2 py-1 rounded-lg transition-all"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    {:else}
                      <label class="cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center space-x-2 transition-all w-fit active:scale-95 shadow-xs">
                        <svg class="w-4 h-4 fill-current text-slate-500" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                        <span>Choose Picture File</span>
                        <input type="file" accept="image/*" on:change={(e) => handleQuestionImageUpload(e, question)} class="hidden" />
                      </label>
                    {/if}
                  </div>
                </div>

                <button
                  on:click={() => removeQuestion(index)}
                  class="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-1.5 rounded-xl transition-all shrink-0 shadow-xs"
                >
                  Delete
                </button>
              </div>

              <!-- Options Subgrid for Multiple Choice -->
              {#if normType === "multiple-choice"}
                <div class="pl-0 sm:pl-2 pt-4 border-t border-slate-200 dark:border-slate-900/80 mt-2 space-y-3">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Configure Choice Options:</span>
                  <div class="grid grid-cols-1 gap-3">
                    {#each question.options as option, optIndex}
                      <div class="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                        <div class="flex items-center space-x-2">
                          <input
                            type="text"
                            bind:value={question.options[optIndex]}
                            placeholder={`Option ${optIndex + 1}`}
                            class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-[#1a2b6c] dark:text-slate-200 px-3 py-2 focus:outline-none focus:border-[#e31b23] w-full font-medium"
                          />
                          <button
                            on:click={() => removeOption(index, optIndex)}
                            class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-sm px-2 font-bold transition-all"
                          >✕</button>
                        </div>

                        {#if question.enableOptionImages}
                          <div class="flex items-center space-x-3 pl-2 pt-1">
                            <span class="text-[10px] font-mono text-[#1a2b6c] dark:text-cyan-400 shrink-0 flex items-center space-x-1">
                              <svg class="w-3.5 h-3.5 fill-current inline-block mr-1" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                              <span>Option Picture:</span>
                            </span>
                            
                            {#if question.optionImages && question.optionImages[option]}
                              <div class="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg">
                                <img src={question.optionImages[option]} alt="Option Preview" class="h-7 w-7 object-cover rounded-md border border-slate-300 dark:border-slate-700" />
                                <button type="button" on:click={() => removeOptionImage(question, option)} class="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline">Remove</button>
                              </div>
                            {:else}
                              <label class="cursor-pointer bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold flex items-center space-x-1.5 transition-all w-fit active:scale-95">
                                <svg class="w-3.5 h-3.5 fill-current text-slate-500" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                                <span>Browse File</span>
                                <input type="file" accept="image/*" on:change={(e) => handleOptionImageUpload(e, question, option)} class="hidden" />
                              </label>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {/each}

                    <button
                      on:click={() => addOption(index)}
                      class="border border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900/20 hover:bg-slate-100 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:text-[#1a2b6c] dark:hover:text-slate-200 rounded-xl text-xs font-bold py-2.5 transition-all shadow-xs flex items-center justify-center space-x-1"
                    >
                      <span>+ Insert Option</span>
                    </button>
                  </div>
                </div>
              {/if}

              <!-- TOGGLES SECTION -->
              <div class="pt-4 border-t border-slate-200 dark:border-slate-900/80 space-y-3 max-w-md">
                {#if normType === 'multiple-choice'}
                  <!-- 1. ENABLE IMAGES -->
                  <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Enable images for options</span>
                    <button
                      type="button"
                      on:click={() => {
                        question.enableOptionImages = !question.enableOptionImages;
                        if (!question.optionImages) question.optionImages = {};
                      }}
                      class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-300 dark:border-slate-700/80 {question.enableOptionImages ? 'bg-[#1a2b6c] border-[#1a2b6c]' : 'bg-slate-200 dark:bg-slate-800'}"
                    >
                      <div class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.enableOptionImages ? 'translate-x-6' : 'translate-x-0'}"></div>
                    </button>
                  </div>

                  <!-- 2. ALLOW MULTIPLE -->
                  <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
                    <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Allow selection of multiple options</span>
                    <button
                      type="button"
                      on:click={() => (question.allowMultiple = !question.allowMultiple)}
                      class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-300 dark:border-slate-700/80 {question.allowMultiple ? 'bg-[#1a2b6c] border-[#1a2b6c]' : 'bg-slate-200 dark:bg-slate-800'}"
                    >
                      <div class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.allowMultiple ? 'translate-x-6' : 'translate-x-0'}"></div>
                    </button>
                  </div>
                {/if}

                <!-- 3. REQUIRED QUESTION -->
                <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Required question</span>
                  <button
                    type="button"
                    on:click={() => (question.isRequired = !question.isRequired)}
                    class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-300 dark:border-slate-700/80 {question.isRequired ? 'bg-[#1a2b6c] border-[#1a2b6c]' : 'bg-slate-200 dark:bg-slate-800'}"
                  >
                    <div class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.isRequired ? 'translate-x-6' : 'translate-x-0'}"></div>
                  </button>
                </div>

                <!-- 4. CONDITIONAL SKIP LOGIC TOGGLE & CONTROLS -->
                {#if index > 0}
                  <div class="p-3.5 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center">
                        <span class="text-xs font-semibold text-slate-700 dark:text-slate-300">Enable Skip Logic Rule</span>
                      </div>
                      <button
                        type="button"
                        on:click={() => {
                          if (!question.skipLogic) {
                            question.skipLogic = { enabled: true, dependsOnIndex: 0, requiredValue: "" };
                          } else {
                            question.skipLogic.enabled = !question.skipLogic.enabled;
                            if (question.skipLogic.enabled && (question.skipLogic.dependsOnIndex === null || question.skipLogic.dependsOnIndex === undefined)) {
                              question.skipLogic.dependsOnIndex = 0;
                            }
                          }
                          localQuestions = [...localQuestions];
                        }}
                        class="w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none border border-slate-300 dark:border-slate-700/80 {question.skipLogic?.enabled ? 'bg-[#1a2b6c] border-[#1a2b6c]' : 'bg-slate-200 dark:bg-slate-800'}"
                      >
                        <div class="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out {question.skipLogic?.enabled ? 'translate-x-6' : 'translate-x-0'}"></div>
                      </button>
                    </div>

                    {#if question.skipLogic?.enabled}
                      <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                        <span class="text-[10px] font-mono font-bold text-[#1a2b6c] dark:text-cyan-400 uppercase tracking-wide block">Show Question #{index + 1} ONLY IF:</span>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label class="text-[9px] font-bold text-slate-400 block mb-1">Previous Question</label>
                            <select
                              bind:value={question.skipLogic.dependsOnIndex}
                              on:change={() => { question.skipLogic.requiredValue = ""; localQuestions = [...localQuestions]; }}
                              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#1a2b6c] dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#e31b23]"
                            >
                              {#each localQuestions.slice(0, index) as prevQ, pIdx}
                                <option value={pIdx}>Question {pIdx + 1}: {prevQ.questionText.slice(0, 24)}...</option>
                              {/each}
                            </select>
                          </div>

                          <div>
                            <label class="text-[9px] font-bold text-slate-400 block mb-1">Answer Equals</label>
                            <select
                              bind:value={question.skipLogic.requiredValue}
                              class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-[#1a2b6c] dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:border-[#e31b23]"
                            >
                              <option value="">Select Trigger Value...</option>
                              {#each getDependedOptions(question.skipLogic.dependsOnIndex) as optionValue}
                                <option value={optionValue}>{optionValue}</option>
                              {/each}
                            </select>
                          </div>
                        </div>
                      </div>
                    {/if}
                  </div>
                {/if}

              </div>

            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- HIGH-CONTRAST SAVE & DEPLOY BUTTON FOOTER -->
    <div
      bind:this={saveContainerRef}
      class="pt-6 mt-8 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-end shrink-0 bg-white dark:bg-slate-900 py-4"
    >
      <button
        type="button"
        on:click={triggerExplicitSave}
        disabled={localQuestions.length === 0 || !localTitle.trim()}
        class="bg-[#1a2b6c] hover:bg-[#e31b23] dark:bg-[#e31b23] dark:hover:bg-[#1a2b6c] text-white font-extrabold text-xs py-3.5 px-7 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-[#e31b23]/25 flex items-center space-x-2.5 active:scale-[0.97] hover:scale-[1.02] disabled:opacity-25 disabled:cursor-not-allowed border border-transparent"
        style="color: #ffffff !important;"
      >
        <svg class="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24" style="fill: #ffffff !important;">
          <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
        </svg>
        <span style="color: #ffffff !important; font-weight: 800 !important; tracking-wide: 0.05em;">Save & Deploy Schema</span>
      </button>
    </div>
  </div>
</div>

<!-- ICON-ONLY CIRCULAR FLOATING JUMP BUTTON -->
{#if localQuestions.length >= 2}
  <button
    type="button"
    on:click={scrollToSave}
    class="fixed bottom-6 right-6 z-40 bg-[#1a2b6c] hover:bg-[#e31b23] text-white h-12 w-12 rounded-full shadow-2xl hover:shadow-[#e31b23]/40 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-110 border-2 border-white/30 dark:border-slate-800 cursor-pointer"
    title="Jump to Save"
    aria-label="Jump to Save"
  >
    <svg class="w-5 h-5 shrink-0 fill-current text-white" viewBox="0 0 24 24" style="fill: #ffffff !important;">
      <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/>
    </svg>
  </button>
{/if}

<style>
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
</style>