<script>
  import { onMount } from "svelte";
  import Dashboard from "./components/Dashboard.svelte";
  import FormBuilder from "./components/FormBuilder.svelte";
  import Kiosk from "./components/Kiosk.svelte";
  import Answers from "./components/Answers.svelte";

  const API_BASE = "/api";

  let activeTab = "surveys";
  let surveysList = [];
  let responses = [];
  let activeSurveyId = "";
  let isOfflineMode = false;
  let isDedicatedKioskMode = false;
  let isSidebarVisible = true;

  function switchTab(tab) {
    activeTab = tab;
    if (!isDedicatedKioskMode) {
      window.location.hash = `/${tab}`;
    }
  }

  function normalizeSurvey(s) {
    if (!s) return s;
    return {
      ...s,
      questions: (s.questions || []).map((q) => ({
        ...q,
        questionImage: q.questionImage || '',
        isRequired: Boolean(q.isRequired),
        allowMultiple: Boolean(q.allowMultiple),
        enableOptionImages: Boolean(q.enableOptionImages),
        options: q.options || [],
        optionImages: q.optionImages || {}
      }))
    };
  }

  onMount(async () => {
    await refreshDataLedger();

    const hash = window.location.hash;
    const urlParams = new URLSearchParams(
      hash.includes("?")
        ? hash.split("?")[1]
        : window.location.search
    );
    const targetSurveyId = urlParams.get("id");

    if (targetSurveyId || hash.startsWith("#/kiosk")) {
      if (targetSurveyId) {
        isDedicatedKioskMode = true;
        isSidebarVisible = false;
        activeSurveyId = targetSurveyId;
      }
      activeTab = "kiosk";
    } else {
      const route = hash.replace("#/", "").split("?")[0];
      if (["surveys", "builder", "kiosk", "answers"].includes(route)) {
        activeTab = route;
      } else {
        window.location.hash = "/surveys";
      }
    }
  });

  async function refreshDataLedger() {
    try {
      const surveyRes = await fetch(`${API_BASE}/surveys`);
      if (!surveyRes.ok) {
        throw new Error(`HTTP error! status: ${surveyRes.status}`);
      }
      const surveyData = await surveyRes.json();
      if (surveyData.success) {
        surveysList = (surveyData.surveys || []).map(normalizeSurvey);
        isOfflineMode = false;
      }

      const responseRes = await fetch(`${API_BASE}/responses`);
      if (responseRes.ok) {
        const responseData = await responseRes.json();
        if (responseData.success && responseData.responses) {
          responses = responseData.responses;
        }
      }
    } catch (err) {
      console.warn("Backend API endpoint unreachable or DB offline:", err);
      isOfflineMode = true;
    }
  }

  $: activeSurveyTitles = surveysList.map((s) => s.title);
  $: validResponsesCount = responses.filter((r) =>
    activeSurveyTitles.includes(r.surveyTitle)
  ).length;

  $: activeSurvey = surveysList.find((s) => s._id === activeSurveyId) || {
    title: "",
    questions: [],
  };

  function handleCreateNewSurvey() {
    const draftId = `DRAFT-${Date.now()}`;
    const newDraftSurvey = {
      _id: draftId,
      title: "New Custom Form Schema",
      questions: [],
      isDraft: true
    };
    
    surveysList = [...surveysList, newDraftSurvey];
    activeSurveyId = draftId;
    switchTab("builder");
  }

  async function persistActiveSurveyState(updatedTitle, updatedQuestions) {
    if (!activeSurveyId) return;

    // Apply FormBuilder draft changes to live state ONLY upon saving
    activeSurvey.title = updatedTitle;
    activeSurvey.questions = updatedQuestions;

    if (String(activeSurveyId).startsWith("DRAFT-") || activeSurvey.isDraft) {
      try {
        const res = await fetch(`${API_BASE}/surveys`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: activeSurvey.title,
            questions: activeSurvey.questions,
          }),
        });
        const data = await res.json();
        if (data.success && data.survey) {
          const normalized = normalizeSurvey(data.survey);
          surveysList = surveysList.map((s) =>
            s._id === activeSurveyId ? normalized : s
          );
          activeSurveyId = normalized._id;
        }
      } catch (err) {
        console.error("Error creating survey in database:", err);
      }
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/surveys/${activeSurveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activeSurvey.title,
          questions: activeSurvey.questions,
        }),
      });
      const data = await res.json();
      if (data.success && data.survey) {
        const normalized = normalizeSurvey(data.survey);
        surveysList = surveysList.map((s) => (s._id === activeSurveyId ? normalized : s));
      } else {
        await refreshDataLedger();
      }
    } catch (err) {
      console.error("Error updating survey in database:", err);
    }
  }

  async function handleDeleteSurvey(id) {
    try {
      if (!String(id).startsWith("DRAFT-") && !String(id).startsWith("LOCAL-")) {
        await fetch(`${API_BASE}/surveys/${id}`, { method: "DELETE" });
      }
      surveysList = surveysList.filter((s) => s._id !== id);
      if (activeSurveyId === id) {
        activeSurveyId = "";
      }
      await refreshDataLedger();
    } catch (err) {
      surveysList = surveysList.filter((s) => s._id !== id);
    }
  }

  // UPDATED: Now receives deviceId from Kiosk and registers it in MongoDB
  async function registerResponse(formattedAnswers, deviceId) {
    try {
      const res = await fetch(`${API_BASE}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyTitle: activeSurvey.title,
          deviceId: deviceId || "Tablet-A",
          answers: formattedAnswers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await refreshDataLedger();
      }
    } catch (err) {}
  }

  function handleSelectAndEdit(id) {
    activeSurveyId = id;
    switchTab("builder");
  }

  function handleSelectAndTest(id) {
    activeSurveyId = id;
    switchTab("kiosk");
  }
</script>

<div class="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden m-0 p-0 box-border">
  {#if isSidebarVisible}
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full">
      <div>
        <div class="p-5 h-16 border-b border-slate-800 flex items-center space-x-3 box-border">
          <div class="h-8 w-8 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-md">
            S
          </div>
          <span class="font-bold text-base tracking-tight text-white">Sdx DigitalSurvey</span>
        </div>

        <nav class="p-4 space-y-1">
          <button
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'surveys' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
            on:click={async () => {
              switchTab("surveys");
              await refreshDataLedger();
            }}
          >
            <span>📋</span> <span>Surveys Portal</span>
          </button>
          <button
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
            on:click={() => switchTab("builder")}
            disabled={surveysList.length === 0}
          >
            <span>🛠️</span>
            <span class={surveysList.length === 0 ? "opacity-40" : ""}>Form Designer</span>
          </button>
          <button
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'kiosk' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
            on:click={() => {
              activeSurveyId = "";
              switchTab("kiosk");
            }}
          >
            <span>📱</span>
            <span>Live Kiosk Mode</span>
          </button>
          <button
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all {activeTab === 'answers' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}"
            on:click={async () => {
              switchTab("answers");
              await refreshDataLedger();
            }}
          >
            <span>📥</span> <span>Answers Log</span>
          </button>
        </nav>
      </div>

      <div class="p-4 border-t border-slate-800 bg-slate-900/50 text-[11px] text-slate-500 font-medium tracking-wide">
        Target: <span class="text-slate-300 font-semibold">{activeSurvey?.title || "None Selected"}</span>
      </div>
    </aside>
  {/if}

  <div class="flex-1 flex flex-col h-full overflow-hidden">
    {#if !isDedicatedKioskMode}
      <header class="w-full h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 box-border shrink-0">
        <div class="flex items-center space-x-4">
          <button
            on:click={() => (isSidebarVisible = !isSidebarVisible)}
            class="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700/60 transition-all flex items-center justify-center focus:outline-none select-none active:scale-95"
            title={isSidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <span class="text-xl leading-none font-bold">☰</span>
          </button>

          {#if !isSidebarVisible}
            <div class="flex items-center space-x-2 animate-fade">
              <div class="h-6 w-6 rounded-md bg-cyan-600 flex items-center justify-center font-bold text-xs text-white">
                S
              </div>
              <span class="font-bold text-sm tracking-tight text-white">Sdx DigitalSurvey</span>
            </div>
          {/if}
        </div>

        <div class="flex items-center space-x-3 text-xs text-slate-400 font-mono">
          <span class="h-2 w-2 rounded-full {isOfflineMode ? 'bg-rose-500 shadow-rose-500/50' : 'bg-emerald-500 shadow-emerald-500/50'} shadow-sm"></span>
          <span class="hidden sm:inline">{isOfflineMode ? 'Database Link Offline (Local Mode)' : 'Operational Node Connection Online'}</span>
        </div>
      </header>
    {/if}

    <main class="flex-1 bg-slate-950 overflow-y-auto w-full box-border {isDedicatedKioskMode ? 'p-0' : 'p-6 md:p-8 lg:p-10'}">
      <div class="w-full h-full {isDedicatedKioskMode || activeTab === 'kiosk' ? '' : 'max-w-7xl mx-auto'}">
        {#if activeTab === "surveys"}
          <div class="w-full h-full">
            <Dashboard
              surveys={surveysList.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-"))}
              responseCount={validResponsesCount}
              onCreateSurvey={handleCreateNewSurvey}
              onDeleteSurvey={handleDeleteSurvey}
              onEditSurvey={handleSelectAndEdit}
              onTestSurvey={handleSelectAndTest}
            />
          </div>
        {:else if activeTab === "builder"}
          <div class="w-full h-full">
            <FormBuilder
              surveyTitle={activeSurvey.title}
              questions={activeSurvey.questions}
              surveys={surveysList}
              {activeSurveyId}
              onSelectSurvey={(id) => (activeSurveyId = id)}
              onCreateNewSurvey={handleCreateNewSurvey}
              onSaveSurvey={persistActiveSurveyState}
            />
          </div>
        {:else if activeTab === "kiosk"}
          <div class="w-full h-full flex items-center justify-center">
            <Kiosk
              surveyTitle={activeSurvey.title}
              questions={activeSurvey.questions}
              surveys={surveysList}
              {activeSurveyId}
              onSelectSurvey={(id) => (activeSurveyId = id)}
              onSubmitResponse={registerResponse}
            />
          </div>
        {:else if activeTab === "answers"}
          <div class="w-full h-full">
            <Answers 
              bind:responses 
              surveys={surveysList.filter(s => !s.isDraft && !String(s._id).startsWith("DRAFT-"))} 
              onRefreshData={refreshDataLedger}
            />
          </div>
        {/if}
      </div>
    </main>
  </div>
</div>